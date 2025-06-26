import { db } from '@/lib/db'
import crypto from 'crypto'

interface ValidationCode {
  id: string
  code: string
  deliveryId: string
  announcementId: string
  isUsed: boolean
  expiresAt: Date
  createdAt: Date
  usedAt?: Date
  usedBy?: string
  metadata?: Record<string, any>
}

interface CodeValidationResult {
  isValid: boolean
  code?: ValidationCode
  error?: string
  delivery?: any
  announcement?: any
}

class ValidationCodeService {

  /**
   * Générer un code de validation à 6 chiffres unique
   */
  async generateValidationCode(
    deliveryId: string,
    announcementId: string,
    expirationHours: number = 24
  ): Promise<string> {
    try {
      let code: string
      let isUnique = false
      let attempts = 0
      const maxAttempts = 10

      // Générer un code unique
      while (!isUnique && attempts < maxAttempts) {
        code = this.generateSixDigitCode()
        
        // Vérifier unicité dans les codes non expirés
        const existingCode = await db.deliveryValidation.findFirst({
          where: {
            code,
            expiresAt: { gt: new Date() },
            isUsed: false
          }
        })
        
        if (!existingCode) {
          isUnique = true
        }
        attempts++
      }

      if (!isUnique) {
        throw new Error('Impossible de générer un code unique')
      }

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + expirationHours)

      // Enregistrer le code en base
      await db.deliveryValidation.create({
        data: {
          code: code!,
          deliveryId,
          announcementId,
          isUsed: false,
          expiresAt,
          createdAt: new Date(),
          metadata: {
            generatedBy: 'system',
            expirationHours,
            attempts
          }
        }
      })

      return code!

    } catch (error) {
      console.error('Error generating validation code:', error)
      throw new Error('Erreur lors de la génération du code de validation')
    }
  }

  /**
   * Valider un code de validation saisi
   */
  async validateCode(
    code: string,
    userId: string,
    location?: { latitude: number; longitude: number },
    metadata?: Record<string, any>
  ): Promise<CodeValidationResult> {
    try {
      // Rechercher le code
      const validationRecord = await db.deliveryValidation.findFirst({
        where: {
          code: code.trim().toUpperCase(),
          isUsed: false,
          expiresAt: { gt: new Date() }
        },
        include: {
          delivery: {
            include: {
              announcement: {
                include: {
                  author: {
                    select: { id: true, profile: { select: { firstName: true, lastName: true } } }
                  },
                  deliverer: {
                    select: { id: true, profile: { select: { firstName: true, lastName: true } } }
                  }
                }
              }
            }
          }
        }
      })

      if (!validationRecord) {
        return {
          isValid: false,
          error: 'Code invalide ou expiré'
        }
      }

      // Vérifier que l'utilisateur a le droit de valider
      const canValidate = 
        userId === validationRecord.delivery.announcement.authorId || // Client
        userId === validationRecord.delivery.announcement.delivererId || // Livreur
        await this.isAdminUser(userId) // Admin

      if (!canValidate) {
        return {
          isValid: false,
          error: 'Vous n\'êtes pas autorisé à valider cette livraison'
        }
      }

      // Marquer le code comme utilisé
      const updatedValidation = await db.$transaction(async (tx) => {
        // Mettre à jour le code de validation
        const updated = await tx.deliveryValidation.update({
          where: { id: validationRecord.id },
          data: {
            isUsed: true,
            usedAt: new Date(),
            usedBy: userId,
            metadata: {
              ...validationRecord.metadata,
              usedLocation: location,
              additionalData: metadata
            }
          }
        })

        // Mettre à jour le statut de la livraison
        await tx.delivery.update({
          where: { id: validationRecord.deliveryId },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
            validationCode: code,
            deliveryLocation: location ? {
              latitude: location.latitude,
              longitude: location.longitude
            } : undefined
          }
        })

        // Mettre à jour le statut de l'annonce
        await tx.announcement.update({
          where: { id: validationRecord.announcementId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        })

        return updated
      })

      // Déclencher les notifications post-validation
      await this.triggerPostValidationActions(validationRecord.announcementId, userId)

      return {
        isValid: true,
        code: updatedValidation as any,
        delivery: validationRecord.delivery,
        announcement: validationRecord.delivery.announcement
      }

    } catch (error) {
      console.error('Error validating code:', error)
      return {
        isValid: false,
        error: 'Erreur lors de la validation du code'
      }
    }
  }

  /**
   * Obtenir les informations d'un code de validation
   */
  async getCodeInfo(code: string): Promise<ValidationCode | null> {
    try {
      const validationRecord = await db.deliveryValidation.findFirst({
        where: { code: code.trim().toUpperCase() },
        include: {
          delivery: {
            include: {
              announcement: {
                select: {
                  id: true,
                  title: true,
                  pickupAddress: true,
                  deliveryAddress: true,
                  author: {
                    select: { profile: { select: { firstName: true, lastName: true } } }
                  }
                }
              }
            }
          }
        }
      })

      return validationRecord as any
    } catch (error) {
      console.error('Error getting code info:', error)
      return null
    }
  }

  /**
   * Révoquer un code de validation (en cas de problème)
   */
  async revokeCode(
    codeId: string,
    userId: string,
    reason: string
  ): Promise<boolean> {
    try {
      // Vérifier les permissions
      const isAdmin = await this.isAdminUser(userId)
      if (!isAdmin) {
        throw new Error('Seuls les administrateurs peuvent révoquer des codes')
      }

      await db.deliveryValidation.update({
        where: { id: codeId },
        data: {
          isUsed: true, // Marquer comme utilisé pour l'invalider
          usedAt: new Date(),
          usedBy: userId,
          metadata: {
            revoked: true,
            revokedBy: userId,
            revokedAt: new Date(),
            reason
          }
        }
      })

      return true
    } catch (error) {
      console.error('Error revoking code:', error)
      return false
    }
  }

  /**
   * Obtenir les statistiques des codes de validation
   */
  async getValidationStats(period: 'DAY' | 'WEEK' | 'MONTH' = 'DAY'): Promise<{
    totalGenerated: number
    totalUsed: number
    totalExpired: number
    averageValidationTime: number // en minutes
    usageRate: number // pourcentage
  }> {
    try {
      const periodStart = new Date()
      switch (period) {
        case 'DAY':
          periodStart.setDate(periodStart.getDate() - 1)
          break
        case 'WEEK':
          periodStart.setDate(periodStart.getDate() - 7)
          break
        case 'MONTH':
          periodStart.setDate(periodStart.getDate() - 30)
          break
      }

      const [totalGenerated, totalUsed, totalExpired] = await Promise.all([
        db.deliveryValidation.count({
          where: { createdAt: { gte: periodStart } }
        }),
        db.deliveryValidation.count({
          where: { 
            createdAt: { gte: periodStart },
            isUsed: true,
            usedAt: { not: null }
          }
        }),
        db.deliveryValidation.count({
          where: { 
            createdAt: { gte: periodStart },
            isUsed: false,
            expiresAt: { lte: new Date() }
          }
        })
      ])

      // Calculer le temps moyen de validation
      const usedCodes = await db.deliveryValidation.findMany({
        where: {
          createdAt: { gte: periodStart },
          isUsed: true,
          usedAt: { not: null }
        },
        select: { createdAt: true, usedAt: true }
      })

      const averageValidationTime = usedCodes.length > 0 ?
        usedCodes.reduce((sum, code) => {
          const timeDiff = code.usedAt!.getTime() - code.createdAt.getTime()
          return sum + timeDiff / (1000 * 60) // en minutes
        }, 0) / usedCodes.length : 0

      const usageRate = totalGenerated > 0 ? (totalUsed / totalGenerated) * 100 : 0

      return {
        totalGenerated,
        totalUsed,
        totalExpired,
        averageValidationTime: Math.round(averageValidationTime),
        usageRate: Math.round(usageRate * 100) / 100
      }

    } catch (error) {
      console.error('Error getting validation stats:', error)
      throw new Error('Erreur lors de la récupération des statistiques')
    }
  }

  /**
   * Nettoyer les codes expirés (tâche de maintenance)
   */
  async cleanupExpiredCodes(): Promise<number> {
    try {
      const result = await db.deliveryValidation.deleteMany({
        where: {
          isUsed: false,
          expiresAt: { lte: new Date() },
          createdAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Garder 7 jours pour audit
        }
      })

      console.log(`Cleaned up ${result.count} expired validation codes`)
      return result.count
    } catch (error) {
      console.error('Error cleaning up expired codes:', error)
      return 0
    }
  }

  // Méthodes privées

  /**
   * Générer un code à 6 chiffres
   */
  private generateSixDigitCode(): string {
    // Éviter les codes comme 000000, 111111, etc.
    let code: string
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString()
    } while (this.isWeakCode(code))
    
    return code
  }

  /**
   * Vérifier si un code est faible (trop prévisible)
   */
  private isWeakCode(code: string): boolean {
    // Éviter les suites (123456, 654321)
    const isSequential = this.isSequentialCode(code)
    
    // Éviter les répétitions (111111, 222222)
    const isRepeating = /^(\d)\1{5}$/.test(code)
    
    // Éviter les codes communs
    const commonCodes = ['123456', '654321', '000000', '999999', '111111']
    const isCommon = commonCodes.includes(code)
    
    return isSequential || isRepeating || isCommon
  }

  /**
   * Vérifier si un code est séquentiel
   */
  private isSequentialCode(code: string): boolean {
    const digits = code.split('').map(Number)
    
    // Vérifier séquence croissante
    let isAscending = true
    let isDescending = true
    
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== digits[i-1] + 1) isAscending = false
      if (digits[i] !== digits[i-1] - 1) isDescending = false
    }
    
    return isAscending || isDescending
  }

  /**
   * Vérifier si l'utilisateur est admin
   */
  private async isAdminUser(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    return user?.role === 'ADMIN'
  }

  /**
   * Déclencher les actions post-validation
   */
  private async triggerPostValidationActions(announcementId: string, validatedBy: string): Promise<void> {
    try {
      // Notifications aux parties prenantes
      // Déblocage du paiement Stripe
      // Mise à jour des statistiques
      // etc.
      
      console.log(`Post-validation actions triggered for announcement ${announcementId} by user ${validatedBy}`)
    } catch (error) {
      console.error('Error in post-validation actions:', error)
    }
  }
}

export const validationCodeService = new ValidationCodeService()