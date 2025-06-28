import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export class ValidationCodeService {
  static async generateValidationCode(deliveryId: string): Promise<string> {
    try {
      const code = Math.random().toString().slice(2, 8).padStart(6, '0')
      
      await prisma.deliveryValidation.deleteMany({
        where: { deliveryId }
      })

      await prisma.deliveryValidation.create({
        data: {
          deliveryId,
          code,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          isUsed: false
        }
      })

      logger.info(`Code de validation généré pour la livraison ${deliveryId}: ${code}`)
      return code

    } catch (error) {
      logger.error('Erreur génération code validation:', error)
      throw new Error('Impossible de générer le code de validation')
    }
  }

  static async validateCode(deliveryId: string, code: string): Promise<boolean> {
    try {
      const validation = await prisma.deliveryValidation.findFirst({
        where: {
          deliveryId,
          code,
          isUsed: false,
          expiresAt: {
            gt: new Date()
          }
        }
      })

      if (!validation) {
        logger.warn(`Tentative de validation avec code invalide: ${code} pour livraison ${deliveryId}`)
        return false
      }

      await prisma.deliveryValidation.update({
        where: { id: validation.id },
        data: {
          isUsed: true,
          usedAt: new Date()
        }
      })

      await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DELIVERED',
          actualDeliveryDate: new Date()
        }
      })

      logger.info(`Code de validation utilisé avec succès pour la livraison ${deliveryId}`)
      return true

    } catch (error) {
      logger.error('Erreur validation code:', error)
      throw new Error('Erreur lors de la validation du code')
    }
  }

  static async isCodeValid(deliveryId: string, code: string): Promise<boolean> {
    try {
      const validation = await prisma.deliveryValidation.findFirst({
        where: {
          deliveryId,
          code,
          isUsed: false,
          expiresAt: {
            gt: new Date()
          }
        }
      })

      return !!validation

    } catch (error) {
      logger.error('Erreur vérification code:', error)
      return false
    }
  }

  static async getValidationInfo(deliveryId: string) {
    try {
      const validation = await prisma.deliveryValidation.findFirst({
        where: {
          deliveryId,
          isUsed: false,
          expiresAt: {
            gt: new Date()
          }
        },
        select: {
          code: true,
          expiresAt: true,
          createdAt: true
        }
      })

      if (!validation) {
        return null
      }

      return {
        code: validation.code,
        expiresAt: validation.expiresAt,
        createdAt: validation.createdAt,
        timeRemaining: validation.expiresAt.getTime() - Date.now()
      }

    } catch (error) {
      logger.error('Erreur récupération info validation:', error)
      return null
    }
  }

  static async cleanExpiredCodes(): Promise<number> {
    try {
      const result = await prisma.deliveryValidation.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          },
          isUsed: false
        }
      })

      logger.info(`${result.count} codes de validation expirés supprimés`)
      return result.count

    } catch (error) {
      logger.error('Erreur nettoyage codes expirés:', error)
      return 0
    }
  }
}