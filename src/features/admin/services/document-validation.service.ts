import { prisma } from '@/lib/db'
import { ValidationStatus, DocumentType } from '@prisma/client'

export interface DocumentValidationData {
  documentId: string
  status: ValidationStatus
  notes?: string
  adminId: string
}

export interface DocumentFilter {
  status?: ValidationStatus
  type?: DocumentType
  userId?: string
  userRole?: string
  dateFrom?: Date
  dateTo?: Date
}

export class DocumentValidationService {
  /**
   * Obtenir tous les documents en attente de validation
   */
  static async getPendingDocuments(filters: DocumentFilter = {}) {
    const where: any = {
      validationStatus: filters.status || 'PENDING'
    }

    if (filters.type) {
      where.type = filters.type
    }

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.userRole) {
      where.user = {
        role: filters.userRole
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
      if (filters.dateTo) where.createdAt.lte = filters.dateTo
    }

    return await prisma.document.findMany({
      where,
      include: {
        user: {
          include: {
            profile: true,
            deliverer: true,
            provider: true,
            merchant: true
          }
        },
        validator: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  /**
   * Valider un document
   */
  static async validateDocument(data: DocumentValidationData) {
    const { documentId, status, notes, adminId } = data

    // Vérifier que l'admin existe
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: { user: true }
    })

    if (!admin) {
      throw new Error('Administrateur non trouvé')
    }

    // Vérifier que le document existe
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          include: {
            deliverer: true,
            provider: true
          }
        }
      }
    })

    if (!document) {
      throw new Error('Document non trouvé')
    }

    if (document.validationStatus !== 'PENDING') {
      throw new Error('Ce document a déjà été traité')
    }

    return await prisma.$transaction(async (tx) => {
      // Mettre à jour le document
      const updatedDocument = await tx.document.update({
        where: { id: documentId },
        data: {
          validationStatus: status,
          validatedBy: adminId,
          validatedAt: new Date(),
          validationNotes: notes
        },
        include: {
          user: {
            include: {
              profile: true,
              deliverer: true,
              provider: true
            }
          }
        }
      })

      // Si c'est un livreur et que tous ses documents sont approuvés, l'activer
      if (document.user.deliverer && status === 'APPROVED') {
        const allDelivererDocs = await tx.document.findMany({
          where: { 
            userId: document.userId,
            type: { in: ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'VEHICLE_REGISTRATION'] }
          }
        })

        const allApproved = allDelivererDocs.every(doc => 
          doc.id === documentId || doc.validationStatus === 'APPROVED'
        )

        if (allApproved) {
          await tx.deliverer.update({
            where: { userId: document.userId },
            data: {
              validationStatus: 'APPROVED',
              activatedAt: new Date(),
              validatedById: adminId
            }
          })

          // Notification d'activation
          await tx.notification.create({
            data: {
              userId: document.userId,
              type: 'DELIVERER_ACTIVATED',
              title: 'Compte livreur activé',
              message: 'Félicitations ! Votre compte livreur a été validé et activé. Vous pouvez maintenant accepter des livraisons.',
              data: { activatedAt: new Date() }
            }
          })
        }
      }

      // Si c'est un prestataire et que tous ses documents sont approuvés, l'activer
      if (document.user.provider && status === 'APPROVED') {
        const allProviderDocs = await tx.document.findMany({
          where: { 
            userId: document.userId,
            type: { in: ['IDENTITY', 'CERTIFICATION'] }
          }
        })

        const allApproved = allProviderDocs.every(doc => 
          doc.id === documentId || doc.validationStatus === 'APPROVED'
        )

        if (allApproved) {
          await tx.provider.update({
            where: { userId: document.userId },
            data: {
              validationStatus: 'APPROVED',
              activatedAt: new Date(),
              validatedById: adminId
            }
          })

          // Notification d'activation
          await tx.notification.create({
            data: {
              userId: document.userId,
              type: 'PROVIDER_ACTIVATED',
              title: 'Compte prestataire activé',
              message: 'Félicitations ! Votre compte prestataire a été validé et activé. Vous pouvez maintenant proposer vos services.',
              data: { activatedAt: new Date() }
            }
          })
        }
      }

      // Notification à l'utilisateur
      const notificationTitle = status === 'APPROVED' ? 'Document approuvé' : 'Document rejeté'
      const notificationMessage = status === 'APPROVED' 
        ? `Votre document "${document.name}" a été approuvé.`
        : `Votre document "${document.name}" a été rejeté. ${notes || 'Veuillez le soumettre à nouveau.'}`

      await tx.notification.create({
        data: {
          userId: document.userId,
          type: status === 'APPROVED' ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
          title: notificationTitle,
          message: notificationMessage,
          data: { 
            documentId,
            documentType: document.type,
            notes
          }
        }
      })

      // Log d'activité
      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: 'VALIDATE_DOCUMENT',
          entityType: 'DOCUMENT',
          entityId: documentId,
          metadata: {
            status,
            documentType: document.type,
            userId: document.userId,
            notes
          }
        }
      })

      return updatedDocument
    })
  }

  /**
   * Valider plusieurs documents en lot
   */
  static async bulkValidateDocuments(
    documentIds: string[],
    status: ValidationStatus,
    adminId: string,
    notes?: string
  ) {
    const results = {
      success: [] as string[],
      errors: [] as { documentId: string; error: string }[]
    }

    for (const documentId of documentIds) {
      try {
        await this.validateDocument({
          documentId,
          status,
          notes,
          adminId
        })
        results.success.push(documentId)
      } catch (error) {
        results.errors.push({
          documentId,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    }

    return results
  }

  /**
   * Obtenir les statistiques de validation
   */
  static async getValidationStats(dateFrom?: Date, dateTo?: Date) {
    const where: any = {}
    
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = dateFrom
      if (dateTo) where.createdAt.lte = dateTo
    }

    const [total, pending, approved, rejected, byType] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.count({ where: { ...where, validationStatus: 'PENDING' } }),
      prisma.document.count({ where: { ...where, validationStatus: 'APPROVED' } }),
      prisma.document.count({ where: { ...where, validationStatus: 'REJECTED' } }),
      prisma.document.groupBy({
        by: ['type', 'validationStatus'],
        where,
        _count: true
      })
    ])

    const byTypeFormatted = byType.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = { total: 0, pending: 0, approved: 0, rejected: 0 }
      }
      acc[item.type].total += item._count
      acc[item.type][item.validationStatus.toLowerCase() as keyof typeof acc[typeof item.type]] = item._count
      return acc
    }, {} as Record<string, { total: number; pending: number; approved: number; rejected: number }>)

    return {
      total,
      pending,
      approved,
      rejected,
      approvalRate: total > 0 ? (approved / total * 100).toFixed(1) : '0',
      byType: byTypeFormatted
    }
  }

  /**
   * Obtenir l'historique de validation d'un utilisateur
   */
  static async getUserValidationHistory(userId: string) {
    return await prisma.document.findMany({
      where: { userId },
      include: {
        validator: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  /**
   * Forcer l'activation d'un livreur (bypass validation)
   */
  static async forceActivateDeliverer(delivererId: string, adminId: string, reason: string) {
    const deliverer = await prisma.deliverer.findUnique({
      where: { id: delivererId },
      include: { user: true }
    })

    if (!deliverer) {
      throw new Error('Livreur non trouvé')
    }

    return await prisma.$transaction(async (tx) => {
      // Activer le livreur
      await tx.deliverer.update({
        where: { id: delivererId },
        data: {
          validationStatus: 'APPROVED',
          activatedAt: new Date(),
          validatedById: adminId
        }
      })

      // Notification
      await tx.notification.create({
        data: {
          userId: deliverer.userId,
          type: 'DELIVERER_FORCE_ACTIVATED',
          title: 'Compte livreur activé',
          message: 'Votre compte livreur a été activé par un administrateur.',
          data: { reason, activatedAt: new Date() }
        }
      })

      // Log d'activité
      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: 'FORCE_ACTIVATE_DELIVERER',
          entityType: 'DELIVERER',
          entityId: delivererId,
          metadata: { reason, userId: deliverer.userId }
        }
      })

      return { success: true, message: 'Livreur activé avec succès' }
    })
  }
}