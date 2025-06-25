import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NotificationService } from '@/features/notifications/services/notification.service'

// Schema pour validation de document
const validateDocumentSchema = z.object({
  documentId: z.string().cuid(),
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
  notes: z.string().optional()
})

// Schema pour validation en lot
const batchValidateSchema = z.object({
  documentIds: z.array(z.string().cuid()),
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional()
})

/**
 * GET - Liste des documents en attente de validation
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || 'PENDING'
    const userRole = searchParams.get('userRole') // DELIVERER, PROVIDER
    const documentType = searchParams.get('type') // IDENTITY, DRIVING_LICENSE, etc.

    // Construire les filtres
    const where: any = {
      status
    }

    if (documentType) {
      where.type = documentType
    }

    // Filtre par rôle utilisateur
    if (userRole) {
      where.profile = {
        user: {
          role: userRole
        }
      }
    }

    // Récupérer les documents avec leurs utilisateurs
    const documents = await prisma.document.findMany({
      where,
      include: {
        profile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                createdAt: true
              }
            },
            deliverer: {
              select: {
                id: true,
                validationStatus: true,
                vehicleType: true
              }
            },
            provider: {
              select: {
                id: true,
                status: true,
                specialties: true
              }
            }
          }
        },
        validatedBy: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    // Compter le total
    const total = await prisma.document.count({ where })

    // Statistiques pour le dashboard admin
    const stats = await prisma.document.groupBy({
      by: ['status', 'type'],
      _count: true,
      where: {
        profile: userRole ? {
          user: { role: userRole }
        } : undefined
      }
    })

    return NextResponse.json({
      success: true,
      data: documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats
    })

  } catch (error) {
    console.error('Erreur récupération documents validation:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * POST - Valider/rejeter un document
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = validateDocumentSchema.parse(body)

    // Vérifier que le document existe et est en attente
    const document = await prisma.document.findUnique({
      where: { id: validatedData.documentId },
      include: {
        profile: {
          include: {
            user: true,
            deliverer: true,
            provider: true
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document introuvable' },
        { status: 404 }
      )
    }

    if (document.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Ce document a déjà été traité' },
        { status: 400 }
      )
    }

    // Mettre à jour le document
    const updatedDocument = await prisma.document.update({
      where: { id: validatedData.documentId },
      data: {
        status: validatedData.status,
        validatedBy: session.user.id,
        validatedAt: new Date(),
        rejectionReason: validatedData.rejectionReason,
        validationNotes: validatedData.notes
      }
    })

    // Vérifier si tous les documents requis sont maintenant approuvés
    const userRole = document.profile.user.role
    let allRequiredDocumentsApproved = false

    if (userRole === 'DELIVERER') {
      // Vérifier documents livreur (identité, permis, assurance)
      const requiredTypes = ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE']
      const approvedDocs = await prisma.document.count({
        where: {
          profileId: document.profileId,
          type: { in: requiredTypes },
          status: 'APPROVED'
        }
      })
      allRequiredDocumentsApproved = approvedDocs === requiredTypes.length

      // Mettre à jour le statut du livreur si nécessaire
      if (allRequiredDocumentsApproved && validatedData.status === 'APPROVED') {
        await prisma.deliverer.update({
          where: { id: document.profile.deliverer?.id },
          data: {
            validationStatus: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: session.user.id
          }
        })

        // Génération carte NFC (simulation)
        await generateNFCCard(document.profile.deliverer?.id!)

        // Notification approbation complète
        await NotificationService.sendNotification({
          userId: document.profile.user.id,
          title: '🎉 Validation complète !',
          message: 'Tous vos documents ont été approuvés. Votre compte livreur est maintenant actif !',
          type: 'ACCOUNT_APPROVED',
          priority: 'HIGH'
        })
      }

    } else if (userRole === 'PROVIDER') {
      // Vérifier documents prestataire (identité, certifications)
      const requiredTypes = ['IDENTITY']
      const approvedDocs = await prisma.document.count({
        where: {
          profileId: document.profileId,
          type: { in: requiredTypes },
          status: 'APPROVED'
        }
      })
      allRequiredDocumentsApproved = approvedDocs >= requiredTypes.length

      // Mettre à jour le statut du prestataire
      if (allRequiredDocumentsApproved && validatedData.status === 'APPROVED') {
        await prisma.provider.update({
          where: { id: document.profile.provider?.id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: session.user.id
          }
        })

        // Notification approbation
        await NotificationService.sendNotification({
          userId: document.profile.user.id,
          title: '✅ Prestataire approuvé',
          message: 'Votre profil prestataire a été approuvé. Vous pouvez maintenant proposer vos services !',
          type: 'PROVIDER_APPROVED',
          priority: 'HIGH'
        })
      }
    }

    // Notification de validation du document
    await NotificationService.sendDocumentValidationResult(
      document.profile.user.id,
      document.type,
      validatedData.status === 'APPROVED'
    )

    // Log de l'action admin
    await prisma.adminAction.create({
      data: {
        adminId: session.user.id,
        action: 'DOCUMENT_VALIDATION',
        targetId: validatedData.documentId,
        targetType: 'DOCUMENT',
        details: {
          documentType: document.type,
          userId: document.profile.user.id,
          userRole: document.profile.user.role,
          status: validatedData.status,
          rejectionReason: validatedData.rejectionReason
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedDocument,
      allRequiredDocumentsApproved,
      message: validatedData.status === 'APPROVED' 
        ? 'Document approuvé avec succès' 
        : 'Document rejeté'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erreur validation document:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Validation en lot de documents
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = batchValidateSchema.parse(body)

    // Vérifier que tous les documents existent et sont en attente
    const documents = await prisma.document.findMany({
      where: {
        id: { in: validatedData.documentIds },
        status: 'PENDING'
      },
      include: {
        profile: {
          include: {
            user: true
          }
        }
      }
    })

    if (documents.length !== validatedData.documentIds.length) {
      return NextResponse.json(
        { error: 'Certains documents sont introuvables ou déjà traités' },
        { status: 400 }
      )
    }

    // Mettre à jour tous les documents
    const results = await prisma.$transaction(async (tx) => {
      const updates = []
      
      for (const document of documents) {
        const updated = await tx.document.update({
          where: { id: document.id },
          data: {
            status: validatedData.status,
            validatedBy: session.user.id,
            validatedAt: new Date(),
            rejectionReason: validatedData.rejectionReason
          }
        })
        updates.push(updated)

        // Notification individuelle
        await NotificationService.sendDocumentValidationResult(
          document.profile.user.id,
          document.type,
          validatedData.status === 'APPROVED'
        )

        // Log admin
        await tx.adminAction.create({
          data: {
            adminId: session.user.id,
            action: 'BATCH_DOCUMENT_VALIDATION',
            targetId: document.id,
            targetType: 'DOCUMENT',
            details: {
              batchSize: documents.length,
              status: validatedData.status
            }
          }
        })
      }

      return updates
    })

    return NextResponse.json({
      success: true,
      data: results,
      processed: results.length,
      message: `${results.length} documents traités avec succès`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erreur validation en lot:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

// ============ FONCTIONS UTILITAIRES ============

/**
 * Génération simulée de carte NFC pour livreur
 */
async function generateNFCCard(delivererId: string) {
  try {
    // Générer un identifiant unique pour la carte NFC
    const nfcId = `NFC-${Date.now()}-${delivererId.slice(-6).toUpperCase()}`
    
    // Créer l'enregistrement de carte NFC
    await prisma.nfcCard.create({
      data: {
        delivererId,
        nfcId,
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 an
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0'
        }
      }
    })

    console.log(`🆔 Carte NFC générée pour livreur ${delivererId}: ${nfcId}`)

    // TODO: Intégrer avec système NFC réel
    // - Programmer puce NFC physique
    // - Envoyer données chiffrées vers fabricant cartes
    // - Mettre à jour statut fabrication

  } catch (error) {
    console.error('Erreur génération carte NFC:', error)
  }
} 