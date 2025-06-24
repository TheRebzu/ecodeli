// Client Prisma pour EcoDeli
import { PrismaClient } from "@prisma/client"

/**
 * Instance globale Prisma avec optimisations
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ["query", "error", "warn"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// En développement, on garde l'instance en global pour éviter les reconnexions
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

/**
 * Extensions Prisma pour EcoDeli
 * Conditionnées pour éviter les erreurs Edge Runtime
 */
function createExtendedPrisma() {
  // Vérifier si on est dans l'Edge Runtime ou un environnement incompatible
  try {
    // Test si Prisma peut être étendu (échoue dans Edge Runtime)
    const testExtension = prisma.$extends({})
    
    // Si ça passe, on peut créer les extensions complètes
    return prisma.$extends({
      model: {
        user: {
          /**
           * Trouver un utilisateur avec son profil complet selon son rôle
           */
          async findWithProfile(userId: string) {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              include: {
                profile: true,
                clientProfile: true,
                delivererProfile: true,
                merchantProfile: true,
                providerProfile: true,
                wallet: true
              }
            })
            
            return user
          },

          /**
           * Rechercher des livreurs disponibles dans une zone
           */
          async findAvailableDeliverers(latitude: number, longitude: number, maxDistance: number = 50) {
            // TODO: Implémenter la recherche géographique
            return await prisma.user.findMany({
              where: {
                role: "DELIVERER",
                status: "ACTIVE",
                delivererProfile: {
                  isVerified: true,
                  isAvailable: true,
                  maxDistance: {
                    gte: maxDistance
                  }
                }
              },
              include: {
                delivererProfile: true,
                profile: true
              }
            })
          },

          /**
           * Rechercher des prestataires par spécialisation
           */
          async findProvidersBySpecialization(specialization: string, city?: string) {
            return await prisma.user.findMany({
              where: {
                role: "PROVIDER",
                status: "ACTIVE",
                providerProfile: {
                  specializations: {
                    has: specialization
                  }
                }
              },
              include: {
                providerProfile: {
                  include: {
                    availabilities: true,
                    skills: true
                  }
                },
                profile: true
              }
            })
          }
        },

        announcement: {
          /**
           * Rechercher des annonces avec matching pour un livreur
           */
          async findMatchingForDeliverer(delivererId: string) {
            const deliverer = await prisma.user.findUnique({
              where: { id: delivererId },
              include: {
                delivererProfile: {
                  include: {
                    plannedRoutes: true
                  }
                }
              }
            })

            if (!deliverer?.delivererProfile) return []

            // TODO: Implémenter l'algorithme de matching basé sur les trajets planifiés
            return await prisma.announcement.findMany({
              where: {
                status: "PUBLISHED",
                type: "PACKAGE" // Pour l'instant, seulement les colis
              },
              include: {
                user: {
                  include: {
                    profile: true
                  }
                },
                pickupAddress: true,
                deliveryAddress: true
              }
            })
          },

          /**
           * Obtenir les statistiques d'une annonce
           */
          async getAnnouncementStats(announcementId: string) {
            const applications = await prisma.deliveryApplication.count({
              where: { announcementId }
            })

            const announcement = await prisma.announcement.findUnique({
              where: { id: announcementId },
              include: {
                delivery: true,
                booking: true
              }
            })

            return {
              applicationsCount: applications,
              isMatched: !!announcement?.delivery || !!announcement?.booking,
              status: announcement?.status
            }
          }
        },

        delivery: {
          /**
           * Mettre à jour la position du livreur
           */
          async updateDelivererPosition(deliveryId: string, latitude: number, longitude: number) {
            // Mettre à jour la livraison
            const delivery = await prisma.delivery.update({
              where: { id: deliveryId },
              data: {
                currentLatitude: latitude,
                currentLongitude: longitude,
                updatedAt: new Date()
              }
            })

            // Créer un événement de tracking
            await prisma.trackingEvent.create({
              data: {
                deliveryId,
                event: "position_update",
                description: "Position mise à jour",
                latitude,
                longitude
              }
            })

            return delivery
          },

          /**
           * Valider une livraison avec code
           */
          async validateWithCode(deliveryId: string, validationCode: string) {
            const delivery = await prisma.delivery.findUnique({
              where: { id: deliveryId }
            })

            if (!delivery) {
              throw new Error("Livraison non trouvée")
            }

            if (delivery.validationCode !== validationCode) {
              throw new Error("Code de validation incorrect")
            }

            // Mettre à jour le statut
            return await prisma.delivery.update({
              where: { id: deliveryId },
              data: {
                status: "DELIVERED",
                completedAt: new Date()
              }
            })
          }
        },

        wallet: {
          /**
           * Effectuer une transaction sur le portefeuille
           */
          async processTransaction(walletId: string, amount: number, type: "credit" | "debit", description: string, reference?: string) {
            return await prisma.$transaction(async (tx) => {
              // Récupérer le portefeuille
              const wallet = await tx.wallet.findUnique({
                where: { id: walletId }
              })

              if (!wallet) {
                throw new Error("Portefeuille non trouvé")
              }

              // Calculer le nouveau solde
              const newBalance = type === "credit" 
                ? wallet.balance + amount 
                : wallet.balance - amount

              if (newBalance < 0) {
                throw new Error("Solde insuffisant")
              }

              // Mettre à jour le portefeuille
              const updatedWallet = await tx.wallet.update({
                where: { id: walletId },
                data: { balance: newBalance }
              })

              // Créer l'historique de transaction
              await tx.walletTransaction.create({
                data: {
                  walletId,
                  amount: type === "debit" ? -amount : amount,
                  type,
                  description,
                  reference,
                  balanceAfter: newBalance
                }
              })

              return updatedWallet
            })
          }
        }
      }
    })
  } catch (error) {
    // En cas d'erreur (Edge Runtime), retourner Prisma basique
    console.warn('Extensions Prisma désactivées (Edge Runtime)')
    return prisma as any
  }
}

export const extendedPrisma = createExtendedPrisma()

/**
 * Types utilitaires pour les requêtes courantes
 */
export type UserWithProfile = Awaited<ReturnType<typeof extendedPrisma.user.findWithProfile>>
export type AnnouncementWithDetails = Awaited<ReturnType<typeof prisma.announcement.findUnique>> & {
  user: { profile: any }
  pickupAddress: any
  deliveryAddress: any
}

/**
 * Fonctions utilitaires pour les requêtes complexes
 */
export const dbUtils = {
  /**
   * Générer un code de validation unique
   */
  generateValidationCode: () => {
    return Math.random().toString(36).substr(2, 8).toUpperCase()
  },

  /**
   * Générer un numéro de suivi unique
   */
  generateTrackingCode: () => {
    const prefix = "ED"
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substr(2, 4).toUpperCase()
    return `${prefix}${timestamp}${random}`
  },

  /**
   * Générer un numéro de facture unique
   */
  generateInvoiceNumber: () => {
    const year = new Date().getFullYear()
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
    const random = Math.random().toString(36).substr(2, 6).toUpperCase()
    return `ED-${year}${month}-${random}`
  },

  /**
   * Calculer la distance entre deux points (formule Haversine)
   */
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
}