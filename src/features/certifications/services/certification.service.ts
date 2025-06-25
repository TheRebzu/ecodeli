import { prisma } from '@/lib/db'
import { NotificationService } from '@/features/notifications/services/notification.service'
import { generatePDF } from '@/lib/utils/pdf'

export interface CertificationEnrollment {
  entityType: 'provider' | 'deliverer'
  entityId: string
  certificationId: string
}

export interface ExamSubmission {
  answers: Record<string, any>
  timeSpent: number
}

export interface CertificationStats {
  totalCertifications: number
  activeCertifications: number
  completedCount: number
  inProgressCount: number
  averageScore: number
  expiringCount: number
}

export class CertificationService {
  /**
   * Inscrire un utilisateur à une certification
   */
  static async enrollInCertification(enrollment: CertificationEnrollment) {
    try {
      const certification = await prisma.certification.findUnique({
        where: { id: enrollment.certificationId },
        include: { modules: true }
      })

      if (!certification || !certification.isActive) {
        throw new Error('Certification non disponible')
      }

      // Vérifier si déjà inscrit
      const existingEnrollment = enrollment.entityType === 'provider'
        ? await prisma.providerCertification.findUnique({
            where: {
              providerId_certificationId: {
                providerId: enrollment.entityId,
                certificationId: enrollment.certificationId
              }
            }
          })
        : await prisma.delivererCertification.findUnique({
            where: {
              delivererId_certificationId: {
                delivererId: enrollment.entityId,
                certificationId: enrollment.certificationId
              }
            }
          })

      if (existingEnrollment) {
        throw new Error('Déjà inscrit à cette certification')
      }

      // Créer l'inscription
      const certificationRecord = enrollment.entityType === 'provider'
        ? await prisma.providerCertification.create({
            data: {
              providerId: enrollment.entityId,
              certificationId: enrollment.certificationId,
              status: 'ENROLLED'
            }
          })
        : await prisma.delivererCertification.create({
            data: {
              delivererId: enrollment.entityId,
              certificationId: enrollment.certificationId,
              status: 'ENROLLED'
            }
          })

      // Créer le progrès pour chaque module
      for (const module of certification.modules) {
        await prisma.moduleProgress.create({
          data: {
            moduleId: module.id,
            ...(enrollment.entityType === 'provider' 
              ? { providerCertificationId: certificationRecord.id }
              : { delivererCertificationId: certificationRecord.id }
            )
          }
        })
      }

      // Audit
      await this.createAuditLog({
        entityType: enrollment.entityType,
        entityId: enrollment.entityId,
        certificationId: enrollment.certificationId,
        action: 'ENROLLED',
        newStatus: 'ENROLLED'
      })

      // Notification
      await NotificationService.createNotification({
        recipientId: enrollment.entityId,
        type: 'CERTIFICATION_ENROLLED',
        title: `Inscription à la certification: ${certification.name}`,
        content: `Vous êtes maintenant inscrit à la certification "${certification.name}". Commencez votre formation dès maintenant !`,
        metadata: { certificationId: enrollment.certificationId }
      })

      return certificationRecord

    } catch (error) {
      console.error('Erreur lors de l\'inscription à la certification:', error)
      throw error
    }
  }

  /**
   * Démarrer une certification
   */
  static async startCertification(
    entityType: 'provider' | 'deliverer',
    entityId: string,
    certificationId: string
  ) {
    try {
      const updateData = {
        status: 'IN_PROGRESS' as const,
        startedAt: new Date()
      }

      const certificationRecord = entityType === 'provider'
        ? await prisma.providerCertification.update({
            where: {
              providerId_certificationId: {
                providerId: entityId,
                certificationId
              }
            },
            data: updateData
          })
        : await prisma.delivererCertification.update({
            where: {
              delivererId_certificationId: {
                delivererId: entityId,
                certificationId
              }
            },
            data: updateData
          })

      await this.createAuditLog({
        entityType,
        entityId,
        certificationId,
        action: 'STARTED',
        oldStatus: 'ENROLLED',
        newStatus: 'IN_PROGRESS'
      })

      return certificationRecord

    } catch (error) {
      console.error('Erreur lors du démarrage de la certification:', error)
      throw error
    }
  }

  /**
   * Compléter un module
   */
  static async completeModule(
    moduleId: string,
    entityType: 'provider' | 'deliverer',
    certificationRecordId: string,
    score?: number
  ) {
    try {
      const updateData = {
        status: 'COMPLETED' as const,
        completedAt: new Date(),
        ...(score && { score })
      }

      const progress = entityType === 'provider'
        ? await prisma.moduleProgress.updateMany({
            where: {
              moduleId,
              providerCertificationId: certificationRecordId
            },
            data: updateData
          })
        : await prisma.moduleProgress.updateMany({
            where: {
              moduleId,
              delivererCertificationId: certificationRecordId
            },
            data: updateData
          })

      // Vérifier si tous les modules sont terminés
      await this.checkCertificationCompletion(certificationRecordId, entityType)

      return progress

    } catch (error) {
      console.error('Erreur lors de la complétion du module:', error)
      throw error
    }
  }

  /**
   * Soumettre un examen
   */
  static async submitExam(
    certificationId: string,
    entityType: 'provider' | 'deliverer',
    entityId: string,
    submission: ExamSubmission
  ) {
    try {
      // Récupérer la certification et les questions
      const certification = await prisma.certification.findUnique({
        where: { id: certificationId }
      })

      if (!certification) {
        throw new Error('Certification non trouvée')
      }

      // Récupérer l'enregistrement de certification
      const certificationRecord = entityType === 'provider'
        ? await prisma.providerCertification.findUnique({
            where: {
              providerId_certificationId: {
                providerId: entityId,
                certificationId
              }
            }
          })
        : await prisma.delivererCertification.findUnique({
            where: {
              delivererId_certificationId: {
                delivererId: entityId,
                certificationId
              }
            }
          })

      if (!certificationRecord) {
        throw new Error('Inscription à la certification non trouvée')
      }

      if (certificationRecord.attempts >= certification.maxAttempts) {
        throw new Error('Nombre maximum de tentatives atteint')
      }

      // Calculer le score (simulation - à adapter selon la logique métier)
      const score = this.calculateExamScore(submission.answers)
      const isPassed = score >= certification.passScore

      // Créer la session d'examen
      const examSession = await prisma.examSession.create({
        data: {
          certificationId,
          ...(entityType === 'provider' 
            ? { providerCertificationId: certificationRecord.id }
            : { delivererCertificationId: certificationRecord.id }
          ),
          sessionNumber: certificationRecord.attempts + 1,
          completedAt: new Date(),
          timeLimit: 120, // 2 heures par défaut
          score,
          isPassed,
          answers: submission.answers,
          questions: {} // À adapter selon la logique métier
        }
      })

      // Mettre à jour l'enregistrement de certification
      const newStatus = isPassed ? 'COMPLETED' : 'FAILED'
      const updateData = {
        attempts: certificationRecord.attempts + 1,
        score: isPassed ? score : certificationRecord.score,
        status: newStatus as any,
        ...(isPassed && {
          completedAt: new Date(),
          expiresAt: certification.validityDuration 
            ? new Date(Date.now() + certification.validityDuration * 30 * 24 * 60 * 60 * 1000)
            : null,
          isValid: true
        })
      }

      const updatedRecord = entityType === 'provider'
        ? await prisma.providerCertification.update({
            where: { id: certificationRecord.id },
            data: updateData
          })
        : await prisma.delivererCertification.update({
            where: { id: certificationRecord.id },
            data: updateData
          })

      // Générer le certificat si réussi
      if (isPassed) {
        const certificateUrl = await this.generateCertificate(
          certificationRecord.id,
          entityType,
          certification.name,
          score
        )

        await (entityType === 'provider'
          ? prisma.providerCertification.update({
              where: { id: certificationRecord.id },
              data: { certificateUrl }
            })
          : prisma.delivererCertification.update({
              where: { id: certificationRecord.id },
              data: { certificateUrl }
            })
        )
      }

      // Audit
      await this.createAuditLog({
        entityType,
        entityId,
        certificationId,
        action: isPassed ? 'COMPLETED' : 'FAILED',
        newStatus: newStatus as any,
        metadata: { score, attempt: certificationRecord.attempts + 1 }
      })

      // Notification
      await NotificationService.createNotification({
        recipientId: entityId,
        type: isPassed ? 'CERTIFICATION_PASSED' : 'CERTIFICATION_FAILED',
        title: isPassed 
          ? `Certification réussie: ${certification.name}`
          : `Certification échouée: ${certification.name}`,
        content: isPassed
          ? `Félicitations ! Vous avez obtenu la certification "${certification.name}" avec un score de ${score}%.`
          : `Vous avez échoué à la certification "${certification.name}". Score obtenu: ${score}%. Vous pouvez retenter l'examen.`,
        metadata: { certificationId, score }
      })

      return {
        examSession,
        certificationRecord: updatedRecord,
        isPassed,
        score
      }

    } catch (error) {
      console.error('Erreur lors de la soumission de l\'examen:', error)
      throw error
    }
  }

  /**
   * Vérifier les certifications expirées
   */
  static async checkExpiredCertifications() {
    try {
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      // Certifications expirant dans 30 jours
      const expiringCertifications = await prisma.$queryRaw`
        SELECT 
          'provider' as entityType,
          pc.providerId as entityId,
          pc.id as certificationRecordId,
          c.name as certificationName,
          pc.expiresAt
        FROM ProviderCertification pc
        JOIN Certification c ON pc.certificationId = c.id
        WHERE pc.expiresAt BETWEEN ${now} AND ${thirtyDaysFromNow}
          AND pc.isValid = true
          AND pc.renewalNotified = false
        
        UNION ALL
        
        SELECT 
          'deliverer' as entityType,
          dc.delivererId as entityId,
          dc.id as certificationRecordId,
          c.name as certificationName,
          dc.expiresAt
        FROM DelivererCertification dc
        JOIN Certification c ON dc.certificationId = c.id
        WHERE dc.expiresAt BETWEEN ${now} AND ${thirtyDaysFromNow}
          AND dc.isValid = true
          AND dc.renewalNotified = false
      `

      // Envoyer les notifications de renouvellement
      for (const cert of expiringCertifications as any[]) {
        await NotificationService.createNotification({
          recipientId: cert.entityId,
          type: 'CERTIFICATION_EXPIRING',
          title: `Certification expirant bientôt: ${cert.certificationName}`,
          content: `Votre certification "${cert.certificationName}" expire le ${new Date(cert.expiresAt).toLocaleDateString()}. Pensez à la renouveler.`,
          metadata: { certificationRecordId: cert.certificationRecordId }
        })

        // Marquer comme notifié
        if (cert.entityType === 'provider') {
          await prisma.providerCertification.update({
            where: { id: cert.certificationRecordId },
            data: { renewalNotified: true }
          })
        } else {
          await prisma.delivererCertification.update({
            where: { id: cert.certificationRecordId },
            data: { renewalNotified: true }
          })
        }
      }

      // Marquer les certifications expirées
      await prisma.providerCertification.updateMany({
        where: {
          expiresAt: { lt: now },
          isValid: true
        },
        data: {
          status: 'EXPIRED',
          isValid: false
        }
      })

      await prisma.delivererCertification.updateMany({
        where: {
          expiresAt: { lt: now },
          isValid: true
        },
        data: {
          status: 'EXPIRED',
          isValid: false
        }
      })

      return {
        notificationsCount: expiringCertifications.length,
        expiredCount: await prisma.providerCertification.count({
          where: { expiresAt: { lt: now }, status: 'EXPIRED' }
        }) + await prisma.delivererCertification.count({
          where: { expiresAt: { lt: now }, status: 'EXPIRED' }
        })
      }

    } catch (error) {
      console.error('Erreur lors de la vérification des certifications expirées:', error)
      throw error
    }
  }

  /**
   * Calculer le score d'un examen (simulation)
   */
  private static calculateExamScore(answers: Record<string, any>): number {
    // Logique de calcul à adapter selon le type d'examen
    // Pour l'instant, retourner un score aléatoire entre 60 et 100
    return Math.floor(Math.random() * 40) + 60
  }

  /**
   * Vérifier si une certification est complète
   */
  private static async checkCertificationCompletion(
    certificationRecordId: string,
    entityType: 'provider' | 'deliverer'
  ) {
    try {
      const whereClause = entityType === 'provider'
        ? { providerCertificationId: certificationRecordId }
        : { delivererCertificationId: certificationRecordId }

      const incompleteModules = await prisma.moduleProgress.count({
        where: {
          ...whereClause,
          status: { not: 'COMPLETED' }
        }
      })

      if (incompleteModules === 0) {
        // Tous les modules sont terminés, prêt pour l'examen
        const updateData = { status: 'IN_PROGRESS' as const }
        
        if (entityType === 'provider') {
          await prisma.providerCertification.update({
            where: { id: certificationRecordId },
            data: updateData
          })
        } else {
          await prisma.delivererCertification.update({
            where: { id: certificationRecordId },
            data: updateData
          })
        }
      }

    } catch (error) {
      console.error('Erreur lors de la vérification de la complétion:', error)
    }
  }

  /**
   * Générer un certificat PDF
   */
  private static async generateCertificate(
    certificationRecordId: string,
    entityType: 'provider' | 'deliverer',
    certificationName: string,
    score: number
  ): Promise<string> {
    try {
      // Récupérer les données nécessaires
      const record = entityType === 'provider'
        ? await prisma.providerCertification.findUnique({
            where: { id: certificationRecordId },
            include: {
              provider: {
                include: {
                  user: { include: { profile: true } }
                }
              }
            }
          })
        : await prisma.delivererCertification.findUnique({
            where: { id: certificationRecordId },
            include: {
              deliverer: {
                include: {
                  user: { include: { profile: true } }
                }
              }
            }
          })

      if (!record) {
        throw new Error('Enregistrement de certification non trouvé')
      }

      // Récupérer le template de certificat
      const template = await prisma.certificationTemplate.findFirst({
        where: { isDefault: true, isActive: true }
      })

      const user = entityType === 'provider' 
        ? (record as any).provider.user
        : (record as any).deliverer.user

      // Données pour le certificat
      const certificateData = {
        recipientName: `${user.profile?.firstName} ${user.profile?.lastName}`,
        certificationName,
        score: `${score}%`,
        completionDate: new Date().toLocaleDateString('fr-FR'),
        certificateId: certificationRecordId.slice(-8).toUpperCase()
      }

      // Générer le PDF
      const fileName = `certificate-${certificationRecordId}.pdf`
      const filePath = await generatePDF({
        template: template?.template || this.getDefaultCertificateTemplate(),
        data: certificateData,
        fileName
      })

      return filePath

    } catch (error) {
      console.error('Erreur lors de la génération du certificat:', error)
      return ''
    }
  }

  /**
   * Template de certificat par défaut
   */
  private static getDefaultCertificateTemplate(): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .certificate { border: 5px solid #0066cc; padding: 50px; margin: 20px; }
            .title { font-size: 36px; font-weight: bold; color: #0066cc; margin-bottom: 30px; }
            .recipient { font-size: 24px; margin: 20px 0; }
            .certification { font-size: 20px; font-style: italic; margin: 20px 0; }
            .score { font-size: 18px; margin: 20px 0; }
            .date { font-size: 16px; margin-top: 40px; }
            .id { font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="title">CERTIFICAT DE FORMATION</div>
            <div class="recipient">Décerné à<br><strong>{{recipientName}}</strong></div>
            <div class="certification">pour avoir complété avec succès la formation<br><strong>{{certificationName}}</strong></div>
            <div class="score">Score obtenu: {{score}}</div>
            <div class="date">Délivré le {{completionDate}}</div>
            <div class="id">ID: {{certificateId}}</div>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Créer un log d'audit
   */
  private static async createAuditLog(data: {
    entityType: string
    entityId: string
    certificationId: string
    action: string
    oldStatus?: any
    newStatus: any
    performedBy?: string
    reason?: string
    metadata?: any
  }) {
    try {
      await prisma.certificationAudit.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          certificationId: data.certificationId,
          action: data.action,
          oldStatus: data.oldStatus,
          newStatus: data.newStatus,
          performedBy: data.performedBy,
          reason: data.reason,
          metadata: data.metadata
        }
      })
    } catch (error) {
      console.error('Erreur lors de la création du log d\'audit:', error)
    }
  }

  /**
   * Obtenir les statistiques de certification pour un utilisateur
   */
  static async getCertificationStats(
    entityType: 'provider' | 'deliverer',
    entityId: string
  ): Promise<CertificationStats> {
    try {
      const whereClause = entityType === 'provider'
        ? { providerId: entityId }
        : { delivererId: entityId }

      const table = entityType === 'provider' 
        ? prisma.providerCertification
        : prisma.delivererCertification

      const [
        totalCertifications,
        activeCertifications,
        completedCount,
        inProgressCount,
        avgScore,
        expiringCount
      ] = await Promise.all([
        table.count({ where: whereClause }),
        table.count({ where: { ...whereClause, isValid: true } }),
        table.count({ where: { ...whereClause, status: 'COMPLETED' } }),
        table.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
        table.aggregate({
          where: { ...whereClause, score: { not: null } },
          _avg: { score: true }
        }),
        table.count({
          where: {
            ...whereClause,
            expiresAt: {
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            isValid: true
          }
        })
      ])

      return {
        totalCertifications,
        activeCertifications,
        completedCount,
        inProgressCount,
        averageScore: avgScore._avg.score || 0,
        expiringCount
      }

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error)
      throw error
    }
  }
}