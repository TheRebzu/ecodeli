import { prisma } from '@/lib/db'

export interface ValidationResult {
  success: boolean
  message: string
  delivery?: any
  earnings?: number
}

export interface ValidationData {
  deliveryId: string
  validationCode: string
  location?: {
    address: string
    lat?: number
    lng?: number
  }
  proofPhotos?: string[]
  notes?: string
}

/**
 * Service de validation des livraisons avec code 6 chiffres
 */
export class DeliveryValidationService {
  
  /**
   * Génère un code de validation unique à 6 chiffres
   */
  static generateValidationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Valide une livraison avec le code 6 chiffres
   */
  static async validateDelivery(
    delivererId: string, 
    validationData: ValidationData
  ): Promise<ValidationResult> {
    try {
      // Vérifier que la livraison existe et appartient au livreur
      const delivery = await prisma.delivery.findUnique({
        where: { id: validationData.deliveryId },
        include: {
          announcement: {
            include: {
              client: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      profile: {
                        select: {
                          firstName: true,
                          lastName: true,
                          phone: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          payment: true
        }
      })

      if (!delivery) {
        return {
          success: false,
          message: 'Livraison non trouvée'
        }
      }

      if (delivery.delivererId !== delivererId) {
        return {
          success: false,
          message: 'Cette livraison ne vous est pas assignée'
        }
      }

      if (delivery.status !== 'IN_TRANSIT') {
        return {
          success: false,
          message: `Impossible de valider une livraison avec le statut: ${delivery.status}`
        }
      }

      // Vérifier le code de validation
      if (delivery.validationCode !== validationData.validationCode) {
        // Log tentative invalide
        await prisma.deliveryLog.create({
          data: {
            deliveryId: delivery.id,
            action: 'VALIDATION_FAILED',
            details: `Code invalide tenté: ${validationData.validationCode}`,
            performedBy: delivererId
          }
        })

        return {
          success: false,
          message: 'Code de validation incorrect. Vérifiez le code à 6 chiffres fourni par le client.'
        }
      }

      // Validation réussie - transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Mettre à jour la livraison
        const updatedDelivery = await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            status: 'DELIVERED',
            completedAt: new Date(),
            deliveryLocation: validationData.location?.address,
            deliveryLat: validationData.location?.lat,
            deliveryLng: validationData.location?.lng,
            deliveryNotes: validationData.notes
          }
        })

        // 2. Créer preuve de livraison si photos
        if (validationData.proofPhotos && validationData.proofPhotos.length > 0) {
          await tx.proofOfDelivery.create({
            data: {
              deliveryId: delivery.id,
              photos: validationData.proofPhotos,
              location: validationData.location?.address || '',
              timestamp: new Date(),
              validatedBy: delivererId
            }
          })
        }

        // 3. Finaliser le paiement
        if (delivery.payment) {
          await tx.payment.update({
            where: { id: delivery.payment.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date()
            }
          })
        }

        // 4. Mettre à jour les stats du livreur
        await tx.deliverer.update({
          where: { id: delivererId },
          data: {
            totalDeliveries: { increment: 1 },
            totalEarnings: { 
              increment: delivery.payment?.amount || 0 
            }
          }
        })

        // 5. Log de validation
        await tx.deliveryLog.create({
          data: {
            deliveryId: delivery.id,
            action: 'VALIDATED',
            details: `Livraison validée avec succès`,
            performedBy: delivererId
          }
        })

        return {
          delivery: updatedDelivery,
          earnings: delivery.payment?.amount || 0
        }
      })

      return {
        success: true,
        message: 'Livraison validée avec succès',
        delivery: result.delivery,
        earnings: result.earnings
      }

    } catch (error) {
      console.error('Erreur lors de la validation:', error)
      return {
        success: false,
        message: 'Erreur lors de la validation de la livraison'
      }
    }
  }

  /**
   * Récupère l'historique des validations d'un livreur
   */
  static async getValidationHistory(delivererId: string, limit: number = 20) {
    try {
      const validations = await prisma.deliveryLog.findMany({
        where: {
          performedBy: delivererId,
          action: { in: ['VALIDATED', 'VALIDATION_FAILED'] }
        },
        include: {
          delivery: {
            include: {
              announcement: {
                select: {
                  id: true,
                  title: true,
                  pickupAddress: true,
                  deliveryAddress: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      return validations
    } catch (error) {
      console.error('Erreur récupération historique:', error)
      return []
    }
  }

  /**
   * Vérifie si un code de validation est encore valide (pas expiré)
   */
  static async isValidationCodeValid(deliveryId: string): Promise<boolean> {
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: { 
          status: true, 
          scheduledAt: true,
          validationCode: true 
        }
      })

      if (!delivery || !delivery.validationCode) {
        return false
      }

      // Vérifier que la livraison est en cours
      if (delivery.status !== 'IN_TRANSIT') {
        return false
      }

      // Vérifier que la date de livraison n'est pas trop ancienne (24h max)
      const maxValidationTime = new Date(delivery.scheduledAt)
      maxValidationTime.setHours(maxValidationTime.getHours() + 24)

      return new Date() <= maxValidationTime
    } catch (error) {
      console.error('Erreur vérification code:', error)
      return false
    }
  }

  /**
   * Met à jour le statut d'une livraison (pickup, en transit, etc.)
   */
  static async updateDeliveryStatus(
    deliveryId: string,
    delivererId: string,
    status: 'PICKED_UP' | 'IN_TRANSIT',
    location?: { address: string; lat?: number; lng?: number }
  ) {
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId }
      })

      if (!delivery || delivery.delivererId !== delivererId) {
        return {
          success: false,
          message: 'Livraison non trouvée ou non autorisée'
        }
      }

      const updatedDelivery = await prisma.$transaction(async (tx) => {
        // Mettre à jour le statut
        const updated = await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            status,
            ...(status === 'PICKED_UP' && { 
              pickedUpAt: new Date(),
              pickupLocation: location?.address,
              pickupLat: location?.lat,
              pickupLng: location?.lng
            }),
            ...(status === 'IN_TRANSIT' && { 
              inTransitAt: new Date() 
            })
          }
        })

        // Log de l'action
        await tx.deliveryLog.create({
          data: {
            deliveryId,
            action: status,
            details: `Status changed to ${status}${location ? ` at ${location.address}` : ''}`,
            performedBy: delivererId
          }
        })

        return updated
      })

      return {
        success: true,
        message: `Statut mis à jour: ${status}`,
        delivery: updatedDelivery
      }
    } catch (error) {
      console.error('Erreur mise à jour statut:', error)
      return {
        success: false,
        message: 'Erreur lors de la mise à jour du statut'
      }
    }
  }
}