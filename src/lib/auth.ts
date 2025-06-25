// Configuration Better-Auth pour EcoDeli
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./db"

/**
 * Rôles utilisateurs EcoDeli
 */
export const USER_ROLES = {
  CLIENT: "CLIENT",
  DELIVERER: "DELIVERER", 
  MERCHANT: "MERCHANT",
  PROVIDER: "PROVIDER",
  ADMIN: "ADMIN"
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

/**
 * Statuts utilisateurs
 */
export const USER_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE", 
  SUSPENDED: "SUSPENDED",
  INACTIVE: "INACTIVE"
} as const

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]

/**
 * Configuration principale Better-Auth
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Désactivé pour le développement
    sendResetPassword: async ({ email, url }) => {
      // TODO: Implémenter l'envoi d'email de reset
      console.log(`Reset password for ${email}: ${url}`)
    },
    sendVerificationEmail: async ({ email, url }) => {
      // TODO: Implémenter l'envoi d'email de vérification
      console.log(`Verify email for ${email}: ${url}`)
    }
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: USER_ROLES.CLIENT
      },
      status: {
        type: "string", 
        required: true,
        defaultValue: USER_STATUS.PENDING
      },
      firstName: {
        type: "string",
        required: false
      },
      lastName: {
        type: "string",
        required: false
      },
      phone: {
        type: "string",
        required: false
      },
      language: {
        type: "string",
        required: true,
        defaultValue: "fr"
      }
    }
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // 1 jour
  },

  advanced: {
    generateId: () => {
      // Utilise cuid pour correspondre à Prisma
      return require("@paralleldrive/cuid2").createId()
    }
  },

  // Supprimer les hooks pour éviter l'erreur handler
  // Les profils seront créés directement lors de l'inscription via les API routes
})

/**
 * Créer le profil spécialisé selon le rôle utilisateur
 */
async function createUserProfile(userId: string, role: UserRole) {
  try {
    switch (role) {
      case USER_ROLES.CLIENT:
        await prisma.client.create({
          data: {
            userId,
            subscriptionPlan: "FREE",
            tutorialCompleted: false
          }
        })
        break

      case USER_ROLES.DELIVERER:
        await prisma.deliverer.create({
          data: {
            userId,
            validationStatus: "PENDING",
            maxWeight: 30.0,
            maxVolume: 50.0
          }
        })
        break

      case USER_ROLES.MERCHANT:
        await prisma.merchant.create({
          data: {
            userId,
            companyName: "", // À compléter lors de l'onboarding
            siret: "", // À compléter lors de l'onboarding
            contractStatus: "PENDING"
          }
        })
        break

      case USER_ROLES.PROVIDER:
        await prisma.provider.create({
          data: {
            userId,
            validationStatus: "PENDING",
            monthlyInvoiceDay: 30
          }
        })
        break

      default:
        // Admin n'a pas de profil spécialisé
        break
    }

    // Créer le profil général
    await prisma.profile.create({
      data: {
        userId
      }
    })

  } catch (error) {
    console.error(`Erreur création profil pour l'utilisateur ${userId}:`, error)
    throw error
  }
}

/**
 * Créer le wallet pour les rôles qui en ont besoin
 */
async function createUserWallet(userId: string) {
  try {
    await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        currency: "EUR"
      }
    })
  } catch (error) {
    console.error(`Erreur création wallet pour l'utilisateur ${userId}:`, error)
    throw error
  }
}

/**
 * Créer l'abonnement client gratuit par défaut
 */
async function createClientSubscription(userId: string) {
  // TODO: Implémenter la logique d'abonnement si nécessaire
  // Pour l'instant, le profil client suffit avec subscriptionPlan: "FREE"
}

/**
 * Types pour les sessions et utilisateurs
 */
export type AuthUser = {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  firstName?: string
  lastName?: string
  phone?: string
  language: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export type AuthSession = {
  user: AuthUser
  session: {
    id: string
    userId: string
    expiresAt: Date
    token: string
    ipAddress?: string
    userAgent?: string
  }
}

/**
 * Utilitaires pour vérifier les rôles
 */
export const roleUtils = {
  isClient: (role: string) => role === USER_ROLES.CLIENT,
  isDeliverer: (role: string) => role === USER_ROLES.DELIVERER,
  isMerchant: (role: string) => role === USER_ROLES.MERCHANT,
  isProvider: (role: string) => role === USER_ROLES.PROVIDER,
  isAdmin: (role: string) => role === USER_ROLES.ADMIN,
  
  hasAccess: (userRole: string, allowedRoles: UserRole[]) => {
    return allowedRoles.includes(userRole as UserRole)
  },
  
  canAccessDeliveries: (role: string) => {
    return [USER_ROLES.CLIENT, USER_ROLES.DELIVERER, USER_ROLES.ADMIN].includes(role as UserRole)
  },
  
  canManageUsers: (role: string) => {
    return role === USER_ROLES.ADMIN
  },
  
  needsDocumentVerification: (role: string) => {
    return [USER_ROLES.DELIVERER, USER_ROLES.MERCHANT, USER_ROLES.PROVIDER].includes(role as UserRole)
  }
}

export { prisma } from "./db" 