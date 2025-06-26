import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { db } from "@/lib/db"

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  
  // Configuration des méthodes d'authentification
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Désactivé temporairement pour les tests
  },

  // Configuration des sessions
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // Mise à jour après 24h
    cookieName: "ecodeli-session",
  },

  // Configuration des cookies
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    priority: "high",
  },

  // URL de base
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  
  // Secret pour la signature des tokens
  secret: process.env.BETTER_AUTH_SECRET || "ecodeli-secret-key-change-in-production",

  // Plugins Better-Auth (désactivés temporairement)
  // plugins: [],

  // Configuration avancée
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    }
  },

  // Configuration des rôles EcoDeli
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "CLIENT",
      },
      isActive: {
        type: "boolean",
        defaultValue: true, // Actif par défaut pour les tests
        required: true,
      },
      validationStatus: {
        type: "string",
        defaultValue: "VALIDATED", // Utiliser l'enum correct
        required: true,
      },
      profileId: {
        type: "string",
        required: false,
      },
    },
  },

  // Callbacks personnalisés pour EcoDeli
  callbacks: {
    user: {
      create: async ({ user }: { user: any }) => {
        console.log("Création utilisateur EcoDeli:", user.email, "- Rôle:", user.role)
        
        // Créer le profil selon le rôle
        try {
          switch (user.role) {
            case "CLIENT":
              await db.client.create({
                data: { 
                  userId: user.id,
                  subscriptionPlan: 'FREE',
                  tutorialCompleted: false,
                  termsAcceptedAt: new Date(),
                  emailNotifications: true,
                  pushNotifications: true,
                  smsNotifications: false
                }
              })
              console.log("✅ Profil CLIENT créé pour:", user.email)
              break
              
            case "DELIVERER":
              await db.deliverer.create({
                data: { 
                  userId: user.id,
                  validationStatus: 'PENDING',
                  isActive: false,
                  averageRating: 0,
                  totalDeliveries: 0
                }
              })
              // Créer aussi le wallet
              await db.wallet.create({
                data: {
                  userId: user.id,
                  balance: 0,
                  currency: 'EUR'
                }
              })
              console.log("✅ Profil DELIVERER créé pour:", user.email)
              break
              
            case "MERCHANT":
              await db.merchant.create({
                data: { 
                  userId: user.id,
                  companyName: 'À compléter',
                  siret: 'À compléter',
                  contractStatus: 'PENDING',
                  commissionRate: 0.15,
                  rating: 0
                }
              })
              console.log("✅ Profil MERCHANT créé pour:", user.email)
              break
              
            case "PROVIDER":
              await db.provider.create({
                data: { 
                  userId: user.id,
                  validationStatus: 'PENDING',
                  businessName: 'À compléter',
                  specialties: [],
                  hourlyRate: 0,
                  isActive: false,
                  averageRating: 0
                }
              })
              // Créer aussi le wallet
              await db.wallet.create({
                data: {
                  userId: user.id,
                  balance: 0,
                  currency: 'EUR'
                }
              })
              console.log("✅ Profil PROVIDER créé pour:", user.email)
              break
              
            case "ADMIN":
              await db.admin.create({
                data: { 
                  userId: user.id,
                  permissions: ['MANAGE_USERS', 'MANAGE_PLATFORM'],
                  department: 'GENERAL'
                }
              })
              console.log("✅ Profil ADMIN créé pour:", user.email)
              break
          }
        } catch (error) {
          console.error("❌ Erreur création profil:", error)
        }
        
        return user
      },
    },
    
    session: {
      create: async ({ session, user }: { session: any; user: any }) => {
        // Enrichir la session avec les données EcoDeli
        let profileData = null
        
        try {
          // Récupérer le Profile de base de l'utilisateur
          const userWithProfile = await db.user.findUnique({
            where: { id: user.id },
            include: { profile: true }
          })
          
          switch (user.role) {
            case "CLIENT":
              profileData = await db.client.findUnique({
                where: { userId: user.id }
              })
              break
              
            case "DELIVERER":
              profileData = await db.deliverer.findUnique({
                where: { userId: user.id }
              })
              break
              
            case "MERCHANT":
              profileData = await db.merchant.findUnique({
                where: { userId: user.id }
              })
              break
              
            case "PROVIDER":
              profileData = await db.provider.findUnique({
                where: { userId: user.id }
              })
              break
              
            case "ADMIN":
              profileData = await db.admin.findUnique({
                where: { userId: user.id }
              })
              break
          }
        } catch (error) {
          console.error("Erreur récupération profil:", error)
        }

        return {
          ...session,
          user: {
            ...session.user,
            role: user.role,
            isActive: user.isActive,
            validationStatus: user.validationStatus,
            profileData,
            profile: userWithProfile?.profile
          },
        }
      },
    },
    
    signIn: async ({ user, session }: { user: any; session: any }) => {
      console.log("Connexion EcoDeli:", user.email, "- Rôle:", user.role, "- Actif:", user.isActive)
      
      // Vérifier si l'utilisateur est actif
      if (!user.isActive && user.role !== "ADMIN") {
        throw new Error("Compte en attente de validation")
      }
      
      return session
    },
  },
})

export type Session = typeof auth.$Infer.Session

/**
 * Fonction helper pour vérifier les rôles utilisateur (version API route)
 */
export async function requireRole(requiredRole: string, request?: Request) {
  try {
    let session;
    
    if (request) {
      // Version pour API routes avec contexte HTTP
      // Utiliser la méthode correcte pour récupérer la session
      const response = await auth.api.getSession({
        headers: request.headers
      })
      
      console.log('🔍 Response getSession:', response)
      
      if (response && response.user) {
        session = response
        console.log('✅ Session trouvée via response directe')
      } else {
        // Essayer une approche alternative avec les cookies
        const cookies = request.headers.get('cookie')
        console.log('🔍 Cookies reçus:', cookies ? 'Oui' : 'Non')
        
        if (cookies) {
          // Essayer de récupérer la session via une requête interne
          try {
            const sessionResponse = await fetch(`${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/get-session`, {
              headers: {
                cookie: cookies
              }
            })
            
            if (sessionResponse.ok) {
              session = await sessionResponse.json()
              console.log('✅ Session récupérée via fetch interne')
            }
          } catch (e) {
            console.log('❌ Erreur fetch interne:', e)
          }
        }
        
        if (!session) {
          console.log('❌ Aucune session trouvée')
          throw new Error('Unauthorized')
        }
      }
    } else {
      // Version pour contexte serveur (sans headers)
      const response = await auth.api.getSession()
      
      if (response && response.user) {
        session = response
      } else {
        throw new Error('Unauthorized')
      }
    }
    
    console.log('Session récupérée:', session ? 'Oui' : 'Non')
    
    if (!session?.user) {
      console.log('Aucun utilisateur dans la session')
      throw new Error('Unauthorized')
    }
    
    console.log('Utilisateur trouvé:', session.user.email, session.user.role)
    
    if (session.user.role !== requiredRole) {
      console.log(`Rôle requis: ${requiredRole}, rôle actuel: ${session.user.role}`)
      throw new Error(`Forbidden - ${requiredRole} role required`)
    }
    
    return session.user
  } catch (error) {
    console.error('Erreur requireRole:', error)
    throw new Error('Unauthorized')
  }
}

/**
 * Fonction helper pour vérifier les rôles utilisateur (version simple)
 */
export async function requireRoleSimple(requiredRole: string) {
  try {
    const session = await auth.api.getSession()
    
    if (!session?.user) {
      throw new Error('Unauthorized')
    }
    
    if (session.user.role !== requiredRole) {
      throw new Error(`Forbidden - ${requiredRole} role required`)
    }
    
    return session.user
  } catch (error) {
    console.error('Erreur requireRoleSimple:', error)
    throw new Error('Unauthorized')
  }
} 