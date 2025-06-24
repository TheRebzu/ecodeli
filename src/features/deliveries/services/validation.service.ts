// Service de validation des livraisons avec code à 6 chiffres
import { prisma } from '@/lib/prisma'

export interface ValidationCodeData {
  deliveryId: string
  code: string
  expiresAt: Date
  isUsed: boolean
}

export class DeliveryValidationService {
  /**
   * Génère un code de validation unique à 6 chiffres
   */
  static generateValidationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Crée un code de validation pour une livraison
   */
  static async createValidationCode(deliveryId: string): Promise<ValidationCodeData> {
    // Vérifier que la livraison existe et est au bon statut
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { announcement: true }
    })

    if (!delivery) {
      throw new Error('Livraison introuvable')
    }

    if (!['CONFIRMED', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status)) {
      throw new Error('La livraison n\'est pas dans un état valide pour générer un code')
    }

    // Générer un code unique
    let code: string
    let isUnique = false
    let attempts = 0

    do {
      code = this.generateValidationCode()
      const existing = await prisma.deliveryValidation.findUnique({
        where: { 
          code,
          isUsed: false,
          expiresAt: { gte: new Date() }
        }
      })
      isUnique = !existing
      attempts++
    } while (!isUnique && attempts < 10)

    if (!isUnique) {
      throw new Error('Impossible de générer un code unique. Réessayez.')
    }

    // Invalider les anciens codes pour cette livraison
    await prisma.deliveryValidation.updateMany({
      where: { 
        deliveryId,
        isUsed: false 
      },
      data: { isUsed: true }
    })

    // Créer le nouveau code (valide 2 heures)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
    
    const validationCode = await prisma.deliveryValidation.create({
      data: {
        deliveryId,
        code,
        expiresAt,
        isUsed: false
      }
    })

    return {
      deliveryId,
      code,
      expiresAt,
      isUsed: false
    }
  }

  /**
   * Valide un code de validation
   */
  static async validateCode(deliveryId: string, code: string, delivererId: string): Promise<{
    success: boolean
    message: string
    delivery?: any
  }> {
    try {
      // Vérifier que la livraison existe et appartient au livreur
      const delivery = await prisma.delivery.findFirst({
        where: {
          id: deliveryId,
          delivererId
        },
        include: {
          announcement: {
            include: {
              client: true
            }
          },
          deliverer: true
        }
      })

      if (!delivery) {
        return {
          success: false,
          message: 'Livraison introuvable ou vous n\'êtes pas autorisé'
        }
      }

      // Vérifier le statut de la livraison
      if (delivery.status === 'DELIVERED') {
        return {
          success: false,
          message: 'Cette livraison a déjà été validée'
        }
      }

      if (!['CONFIRMED', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status)) {
        return {
          success: false,
          message: 'La livraison n\'est pas dans un état valide pour validation'
        }
      }

      // Vérifier le code de validation
      const validationCode = await prisma.deliveryValidation.findFirst({
        where: {
          deliveryId,
          code,
          isUsed: false,
          expiresAt: { gte: new Date() }
        }
      })

      if (!validationCode) {
        // Vérifier si le code existe mais est expiré ou utilisé
        const expiredCode = await prisma.deliveryValidation.findFirst({
          where: {
            deliveryId,
            code
          }
        })

        if (expiredCode) {
          if (expiredCode.isUsed) {
            return {
              success: false,
              message: 'Ce code a déjà été utilisé'
            }
          }
          if (expiredCode.expiresAt < new Date()) {
            return {
              success: false,
              message: 'Ce code a expiré. Demandez un nouveau code au client.'
            }
          }
        }

        return {
          success: false,
          message: 'Code de validation incorrect'
        }
      }

      // Code valide : marquer la livraison comme terminée dans une transaction
      const result = await prisma.$transaction(async (tx) => {
        // Marquer le code comme utilisé
        await tx.deliveryValidation.update({
          where: { id: validationCode.id },
          data: { 
            isUsed: true,
            usedAt: new Date()
          }
        })

        // Mettre à jour le statut de la livraison
        const updatedDelivery = await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date()
          },
          include: {
            announcement: {
              include: {
                client: true
              }
            },
            deliverer: true
          }
        })

        // Créer l'historique de validation
        await tx.deliveryHistory.create({
          data: {
            deliveryId,
            status: 'DELIVERED',
            notes: `Livraison validée avec le code ${code}`,
            createdAt: new Date()
          }
        })

        return updatedDelivery
      })

      return {
        success: true,
        message: 'Livraison validée avec succès !',
        delivery: result
      }

    } catch (error) {
      console.error('Erreur validation code:', error)
      return {
        success: false,
        message: 'Erreur lors de la validation. Réessayez.'
      }
    }
  }

  /**
   * Récupère le code de validation actif pour une livraison
   */
  static async getCurrentValidationCode(deliveryId: string, clientId: string): Promise<ValidationCodeData | null> {
    // Vérifier que la livraison appartient au client
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        announcement: {
          clientId
        }
      }
    })

    if (!delivery) {
      return null
    }

    // Récupérer le code actif
    const validationCode = await prisma.deliveryValidation.findFirst({
      where: {
        deliveryId,
        isUsed: false,
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!validationCode) {
      return null
    }

    return {
      deliveryId,
      code: validationCode.code,
      expiresAt: validationCode.expiresAt,
      isUsed: validationCode.isUsed
    }
  }

  /**
   * Vérifie si un code de validation est requis pour une livraison
   */
  static async isValidationRequired(deliveryId: string): Promise<boolean> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { announcement: true }
    })

    if (!delivery) {
      return false
    }

    // La validation est requise pour les livraisons en cours
    return ['CONFIRMED', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status)
  }

  /**
   * Génère un nouveau code si l'ancien a expiré
   */
  static async refreshValidationCode(deliveryId: string, clientId: string): Promise<ValidationCodeData | null> {
    // Vérifier que la livraison appartient au client
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        announcement: {
          clientId
        }
      }
    })

    if (!delivery) {
      throw new Error('Livraison introuvable')
    }

    // Vérifier qu'un refresh est nécessaire
    const currentCode = await this.getCurrentValidationCode(deliveryId, clientId)
    if (currentCode) {
      // Un code valide existe déjà
      return currentCode
    }

    // Générer un nouveau code
    return await this.createValidationCode(deliveryId)
  }
}