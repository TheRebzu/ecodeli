import { prisma } from "@/lib/db"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"
import { 
  clientRegisterSchema,
  delivererRegisterSchema,
  merchantRegisterSchema,
  providerRegisterSchema,
  adminRegisterSchema,
  type ClientRegisterData,
  type DelivererRegisterData,
  type MerchantRegisterData,
  type ProviderRegisterData,
  type AdminRegisterData
} from "../schemas/auth.schema"

/**
 * Service d'authentification pour EcoDeli
 */
export class AuthService {
  
  /**
   * Créer un nouvel utilisateur CLIENT
   */
  static async registerClient(data: ClientRegisterData) {
    try {
      // Vérifier si l'email existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      })
      
      if (existingUser) {
        throw new Error("Cet email est déjà utilisé")
      }
      
      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(data.password, 10)
      
      // Créer l'utilisateur et ses profils en transaction
      const user = await prisma.$transaction(async (tx) => {
        // Créer l'utilisateur
        const newUser = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            role: UserRole.CLIENT,
            language: data.language || "fr",
            emailVerified: false
          }
        })
        
        // Créer le profil général
        await tx.profile.create({
          data: {
            userId: newUser.id,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            address: data.address,
            city: data.city,
            postalCode: data.postalCode,
            country: data.country || "FR"
          }
        })
        
        // Créer le profil client
        await tx.client.create({
          data: {
            userId: newUser.id,
            subscriptionPlan: data.subscriptionPlan || "FREE",
            tutorialCompleted: false,
            emailNotifications: data.acceptsEmailNotifications ?? true,
            pushNotifications: data.acceptsPushNotifications ?? true,
            smsNotifications: data.acceptsSmsNotifications ?? false
          }
        })
        
        // Créer le portefeuille
        await tx.wallet.create({
          data: {
            userId: newUser.id,
            balance: 0,
            currency: "EUR"
          }
        })
        
        return newUser
      })
      
      // TODO: Envoyer email de bienvenue
      
      return { user, message: "Inscription réussie" }
    } catch (error) {
      console.error("Erreur inscription client:", error)
      throw error
    }
  }
  
  /**
   * Créer un nouvel utilisateur DELIVERER
   */
  static async registerDeliverer(data: DelivererRegisterData) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      })
      
      if (existingUser) {
        throw new Error("Cet email est déjà utilisé")
      }
      
      const hashedPassword = await bcrypt.hash(data.password, 10)
      
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            role: UserRole.DELIVERER,
            language: data.language || "fr",
            emailVerified: false
          }
        })
        
        await tx.profile.create({
          data: {
            userId: newUser.id,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone
          }
        })
        
        await tx.deliverer.create({
          data: {
            userId: newUser.id,
            validationStatus: "PENDING",
            vehicleType: data.vehicleType,
            licensePlate: data.licensePlate,
            maxWeight: data.maxWeight,
            maxVolume: data.maxVolume,
            isActive: false // Inactif jusqu'à validation des documents
          }
        })
        
        await tx.wallet.create({
          data: {
            userId: newUser.id,
            balance: 0,
            currency: "EUR"
          }
        })
        
        // Créer une notification pour les admins
        await tx.notification.create({
          data: {
            userId: newUser.id,
            type: "VALIDATION",
            title: "Nouveau livreur à valider",
            message: `${data.firstName} ${data.lastName} s'est inscrit comme livreur`
          }
        })
        
        return newUser
      })
      
      return { user, message: "Inscription réussie. Votre compte sera activé après validation de vos documents." }
    } catch (error) {
      console.error("Erreur inscription livreur:", error)
      throw error
    }
  }
  
  /**
   * Créer un nouvel utilisateur MERCHANT
   */
  static async registerMerchant(data: MerchantRegisterData) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      })
      
      if (existingUser) {
        throw new Error("Cet email est déjà utilisé")
      }
      
      const existingMerchant = await prisma.merchant.findFirst({
        where: { siret: data.siret }
      })
      
      if (existingMerchant) {
        throw new Error("Ce SIRET est déjà enregistré")
      }
      
      const hashedPassword = await bcrypt.hash(data.password, 10)
      
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            role: UserRole.MERCHANT,
            language: data.language || "fr",
            emailVerified: false
          }
        })
        
        await tx.profile.create({
          data: {
            userId: newUser.id,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            address: data.address,
            city: data.city,
            postalCode: data.postalCode,
            country: data.country || "FR"
          }
        })
        
        await tx.merchant.create({
          data: {
            userId: newUser.id,
            companyName: data.companyName,
            siret: data.siret,
            vatNumber: data.vatNumber,
            contractStatus: "PENDING",
            commissionRate: 0.15 // Taux par défaut, sera négocié
          }
        })
        
        // Créer la configuration lâcher de chariot si demandé
        if (data.acceptsCartDrop) {
          await tx.cartDropConfig.create({
            data: {
              merchantId: newUser.id,
              isActive: false,
              deliveryZones: [],
              timeSlots: [],
              maxOrdersPerSlot: 10
            }
          })
        }
        
        return newUser
      })
      
      return { user, message: "Inscription réussie. Un contrat vous sera proposé prochainement." }
    } catch (error) {
      console.error("Erreur inscription commerçant:", error)
      throw error
    }
  }
  
  /**
   * Créer un nouvel utilisateur PROVIDER
   */
  static async registerProvider(data: ProviderRegisterData) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      })
      
      if (existingUser) {
        throw new Error("Cet email est déjà utilisé")
      }
      
      if (data.siret) {
        const existingProvider = await prisma.provider.findFirst({
          where: { siret: data.siret }
        })
        
        if (existingProvider) {
          throw new Error("Ce SIRET est déjà enregistré")
        }
      }
      
      const hashedPassword = await bcrypt.hash(data.password, 10)
      
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            role: UserRole.PROVIDER,
            language: data.language || "fr",
            emailVerified: false
          }
        })
        
        await tx.profile.create({
          data: {
            userId: newUser.id,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone
          }
        })
        
        await tx.provider.create({
          data: {
            userId: newUser.id,
            validationStatus: "PENDING",
            businessName: data.businessName,
            siret: data.siret,
            specialties: data.specialties,
            hourlyRate: data.hourlyRate,
            description: data.description,
            monthlyInvoiceDay: data.monthlyInvoiceDay || 30,
            zone: {
              radius: data.serviceZone.radius,
              city: data.serviceZone.city,
              postalCode: data.serviceZone.postalCode
            },
            isActive: false // Inactif jusqu'à validation
          }
        })
        
        await tx.wallet.create({
          data: {
            userId: newUser.id,
            balance: 0,
            currency: "EUR"
          }
        })
        
        // Notification pour validation
        await tx.notification.create({
          data: {
            userId: newUser.id,
            type: "VALIDATION",
            title: "Nouveau prestataire à valider",
            message: `${data.firstName} ${data.lastName} s'est inscrit comme prestataire`
          }
        })
        
        return newUser
      })
      
      return { user, message: "Inscription réussie. Votre compte sera activé après validation de vos certifications." }
    } catch (error) {
      console.error("Erreur inscription prestataire:", error)
      throw error
    }
  }
  
  /**
   * Créer un nouvel utilisateur ADMIN (usage interne)
   */
  static async registerAdmin(data: AdminRegisterData, creatorId?: string) {
    try {
      // Vérifier la clé secrète
      if (data.secretKey !== process.env.ADMIN_SECRET_KEY) {
        throw new Error("Clé secrète invalide")
      }
      
      // Si un créateur est spécifié, vérifier qu'il est admin
      if (creatorId) {
        const creator = await prisma.user.findUnique({
          where: { id: creatorId }
        })
        
        if (!creator || creator.role !== UserRole.ADMIN) {
          throw new Error("Seul un admin peut créer un autre admin")
        }
      }
      
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      })
      
      if (existingUser) {
        throw new Error("Cet email est déjà utilisé")
      }
      
      const hashedPassword = await bcrypt.hash(data.password, 12) // Plus fort pour les admins
      
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            role: UserRole.ADMIN,
            language: data.language || "fr",
            emailVerified: true // Les admins sont pré-vérifiés
          }
        })
        
        await tx.profile.create({
          data: {
            userId: newUser.id,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            isVerified: true
          }
        })
        
        await tx.admin.create({
          data: {
            userId: newUser.id,
            department: data.department,
            permissions: data.permissions || []
          }
        })
        
        // Log de création admin
        await tx.activityLog.create({
          data: {
            userId: creatorId || newUser.id,
            action: "CREATE_ADMIN",
            entityType: "USER",
            entityId: newUser.id,
            metadata: {
              email: data.email,
              department: data.department
            }
          }
        })
        
        return newUser
      })
      
      return { user, message: "Compte admin créé avec succès" }
    } catch (error) {
      console.error("Erreur création admin:", error)
      throw error
    }
  }
  
  /**
   * Obtenir l'utilisateur connecté avec son profil complet (pour NextAuth)
   */
  static async getCurrentUser(userId: string) {
    try {
      if (!userId) {
        return null
      }
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          client: {
            include: {
              storageBoxes: {
                where: { endDate: null },
                include: { storageBox: true }
              }
            }
          },
          deliverer: {
            include: {
              routes: { where: { isActive: true } },
              NFCCard: true
            }
          },
          merchant: {
            include: {
              contract: true,
              cartDropConfig: true
            }
          },
          provider: {
            include: {
              services: { where: { isActive: true } },
              Certification: { where: { isVerified: true } }
            }
          },
          admin: true,
          wallet: true,
          notifications: {
            where: { isRead: false },
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      })
      
      return user
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error)
      return null
    }
  }
  
  /**
   * Valider un utilisateur (ADMIN seulement)
   */
  static async validateUser(userId: string, adminId: string) {
    try {
      // Vérifier que l'admin a les droits
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      })
      
      if (!admin || admin.role !== "ADMIN") {
        throw new Error("Accès refusé")
      }
      
      // Mettre à jour le statut de l'utilisateur
      const user = await prisma.user.update({
        where: { id: userId },
        data: { 
          emailVerified: true,
          emailVerifiedAt: new Date()
        },
        include: {
          deliverer: true,
          provider: true
        }
      })
      
      // Actions spécifiques selon le rôle
      if (user.role === "DELIVERER" && user.deliverer) {
        // Générer une carte NFC pour le livreur
        const nfcCardNumber = this.generateNfcCardId()
        
        await prisma.deliverer.update({
          where: { userId },
          data: {
            validationStatus: "APPROVED",
            isActive: true,
            activatedAt: new Date()
          }
        })
        
        // Créer la carte NFC
        await prisma.nFCCard.create({
          data: {
            delivererId: user.deliverer.id,
            cardNumber: nfcCardNumber,
            isActive: true
          }
        })
        
        // TODO: Déclencher génération physique de la carte NFC
        
        // Notification de validation
        await prisma.notification.create({
          data: {
            userId,
            type: "VALIDATION",
            title: "Compte validé",
            message: "Votre compte livreur a été validé. Votre carte NFC sera expédiée sous 7 jours."
          }
        })
        
        return { ...user, nfcCardNumber }
      }
      
      if (user.role === "PROVIDER" && user.provider) {
        await prisma.provider.update({
          where: { userId },
          data: {
            validationStatus: "APPROVED",
            isActive: true,
            activatedAt: new Date()
          }
        })
        
        await prisma.notification.create({
          data: {
            userId,
            type: "VALIDATION",
            title: "Compte validé",
            message: "Votre compte prestataire a été validé. Vous pouvez maintenant créer vos services."
          }
        })
      }
      
      return user
    } catch (error) {
      console.error("Erreur validation utilisateur:", error)
      throw error
    }
  }
  
  /**
   * Rejeter un utilisateur (ADMIN seulement)
   */
  static async rejectUser(userId: string, adminId: string, reason: string) {
    try {
      // Vérifier que l'admin a les droits
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      })
      
      if (!admin || admin.role !== "ADMIN") {
        throw new Error("Accès refusé")
      }
      
      // Mettre à jour le statut selon le rôle
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { deliverer: true, provider: true }
      })
      
      if (!user) {
        throw new Error("Utilisateur non trouvé")
      }
      
      // Mettre à jour le statut de validation
      if (user.role === "DELIVERER" && user.deliverer) {
        await prisma.deliverer.update({
          where: { id: user.deliverer.id },
          data: { validationStatus: "REJECTED" }
        })
      } else if (user.role === "PROVIDER" && user.provider) {
        await prisma.provider.update({
          where: { id: user.provider.id },
          data: { validationStatus: "REJECTED" }
        })
      }
      
      // Créer une notification pour l'utilisateur
      await prisma.notification.create({
        data: {
          userId,
          title: "Inscription rejetée",
          message: `Votre inscription a été rejetée: ${reason}`,
          type: "VALIDATION"
        }
      })
      
      // TODO: Envoyer email de notification
      
      return user
    } catch (error) {
      console.error("Erreur rejet utilisateur:", error)
      throw error
    }
  }
  
  /**
   * Suspendre un utilisateur
   */
  static async suspendUser(userId: string, adminId: string, reason: string) {
    try {
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      })
      
      if (!admin || admin.role !== "ADMIN") {
        throw new Error("Accès refusé")
      }
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { deliverer: true, provider: true }
      })
      
      if (!user) {
        throw new Error("Utilisateur non trouvé")
      }
      
      // Suspendre selon le rôle
      if (user.role === "DELIVERER" && user.deliverer) {
        await prisma.deliverer.update({
          where: { id: user.deliverer.id },
          data: { 
            validationStatus: "SUSPENDED",
            isActive: false 
          }
        })
      } else if (user.role === "PROVIDER" && user.provider) {
        await prisma.provider.update({
          where: { id: user.provider.id },
          data: { 
            validationStatus: "SUSPENDED",
            isActive: false 
          }
        })
      }
      
      await prisma.notification.create({
        data: {
          userId,
          title: "Compte suspendu", 
          message: `Votre compte a été suspendu: ${reason}`,
          type: "VALIDATION"
        }
      })
      
      return user
    } catch (error) {
      console.error("Erreur suspension utilisateur:", error)
      throw error
    }
  }
  
  /**
   * Vérifier les permissions d'un utilisateur
   */
  static async checkPermissions(userId: string, requiredRole: UserRole[]): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          deliverer: true,
          provider: true
        }
      })
      
      if (!user || !user.emailVerified) {
        return false
      }
      
      // Vérifier le statut selon le rôle
      if (user.role === "DELIVERER" && user.deliverer) {
        if (user.deliverer.validationStatus !== "APPROVED" || !user.deliverer.isActive) {
          return false
        }
      } else if (user.role === "PROVIDER" && user.provider) {
        if (user.provider.validationStatus !== "APPROVED" || !user.provider.isActive) {
          return false
        }
      }
      
      return requiredRole.includes(user.role as UserRole)
    } catch (error) {
      console.error("Erreur vérification permissions:", error)
      return false
    }
  }
  
  /**
   * Obtenir les utilisateurs en attente de validation
   */
  static async getPendingUsers() {
    try {
      const deliverers = await prisma.deliverer.findMany({
        where: { validationStatus: "PENDING" },
        include: {
          user: {
            include: {
              profile: true,
              documents: {
                where: { validationStatus: "PENDING" }
              }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      })
      
      const providers = await prisma.provider.findMany({
        where: { validationStatus: "PENDING" },
        include: {
          user: {
            include: {
              profile: true,
              documents: {
                where: { validationStatus: "PENDING" }
              }
            }
          },
          Certification: true
        },
        orderBy: { createdAt: "asc" }
      })
      
      return {
        deliverers,
        providers,
        total: deliverers.length + providers.length
      }
    } catch (error) {
      console.error("Erreur récupération utilisateurs en attente:", error)
      throw error
    }
  }
  
  /**
   * Compléter le tutoriel client
   */
  static async completeTutorial(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { client: true }
      })
      
      if (!user || user.role !== "CLIENT" || !user.client) {
        throw new Error("Utilisateur non trouvé ou rôle incorrect")
      }
      
      await prisma.client.update({
        where: { id: user.client.id },
        data: { tutorialCompleted: true }
      })
      
      // Créer un log d'activité
      await prisma.activityLog.create({
        data: {
          userId,
          action: "TUTORIAL_COMPLETED",
          entityType: "USER",
          entityId: userId
        }
      })
      
      return true
    } catch (error) {
      console.error("Erreur completion tutoriel:", error)
      throw error
    }
  }
  
  /**
   * Générer un ID de carte NFC unique
   */
  private static generateNfcCardId(): string {
    const prefix = "ECODELI"
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substr(2, 4).toUpperCase()
    return `${prefix}_${timestamp}_${random}`
  }
  
  /**
   * Statistiques des utilisateurs pour l'admin
   */
  static async getUserStats() {
    try {
      const stats = await prisma.user.groupBy({
        by: ['role'],
        _count: true
      })
      
      const totalUsers = await prisma.user.count()
      const verifiedUsers = await prisma.user.count({
        where: { emailVerified: true }
      })
      
      const pendingDeliverers = await prisma.deliverer.count({
        where: { validationStatus: "PENDING" }
      })
      
      const pendingProviders = await prisma.provider.count({
        where: { validationStatus: "PENDING" }
      })
      
      const activeDeliverers = await prisma.deliverer.count({
        where: { 
          validationStatus: "APPROVED",
          isActive: true 
        }
      })
      
      const activeProviders = await prisma.provider.count({
        where: { 
          validationStatus: "APPROVED",
          isActive: true 
        }
      })
      
      return {
        total: totalUsers,
        verified: verifiedUsers,
        pendingValidation: {
          deliverers: pendingDeliverers,
          providers: pendingProviders,
          total: pendingDeliverers + pendingProviders
        },
        active: {
          deliverers: activeDeliverers,
          providers: activeProviders
        },
        byRole: stats
      }
    } catch (error) {
      console.error("Erreur statistiques utilisateurs:", error)
      throw error
    }
  }
} 