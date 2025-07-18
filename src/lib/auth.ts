import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import type { UserRole } from "@prisma/client"

const config = {
  adapter: PrismaAdapter(db), // Activer l'adapter pour synchroniser avec la DB
  trustHost: true, // Correction pour NextAuth v5
  experimental: {
    enableWebAuthn: false
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // [AUTH] authorize: start
        if (!credentials?.email || !credentials?.password) {
          // [AUTH] authorize: missing credentials
          return null;
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email as string
          },
          include: {
            profile: true,
            client: true,
            deliverer: true,
            merchant: true,
            provider: true,
            admin: true
          }
        });

        // [AUTH] authorize: user found?

        if (!user) {
          // [AUTH] authorize: user not found
          return null;
        }

        // Vérifier le mot de passe (si présent)
        if (user.password) {
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          // [AUTH] authorize: password valid?

          if (!isPasswordValid) {
            // [AUTH] authorize: invalid password
            return null;
          }
        }

        // Permettre la connexion même si email non vérifié
        // La vérification se fera côté frontend
        const roleSpecificValidationStatus = getRoleValidationStatus(user);
        const effectiveValidationStatus = roleSpecificValidationStatus || user.validationStatus;

        // [AUTH] authorize: returning user

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.profile?.firstName || user.email,
          image: user.image || user.profile?.avatar,
          role: user.role,
          isActive: user.isActive,
          validationStatus: effectiveValidationStatus,
          emailVerified: user.emailVerified,
          profileData: getProfileData(user)
        };
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 jours
  },
  pages: {
    signIn: "/fr/login",
    error: "/fr/auth/error",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Première connexion
      if (user) {
        token.sub = user.id // Forcer l'utilisation de l'ID réel de l'utilisateur
        token.role = user.role
        token.isActive = user.isActive
        token.validationStatus = user.validationStatus
        token.emailVerified = user.emailVerified
        token.profileData = user.profileData
      }

      // Mise à jour de session
      if (trigger === "update" && session) {
        token = { ...token, ...session }
      }

      return token
    },
    async session({ session, token }) {
      if (token && token.sub) {
        session.user.id = token.sub // Utiliser l'ID réel stocké dans sub
        session.user.role = token.role as UserRole
        
        // Détecter si on est dans un environnement edge (middleware)
        const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge'
        
        // Dans le middleware (edge runtime), utiliser uniquement les données du token
        if (isEdgeRuntime) {
          session.user.isActive = token.isActive as boolean
          session.user.validationStatus = token.validationStatus as string
          session.user.emailVerified = token.emailVerified as Date | null
          session.user.profileData = token.profileData
        } else {
          // Dans les autres contextes, TOUJOURS récupérer les données fraîches
          try {
            const freshUser = await db.user.findUnique({
              where: { id: token.sub },
              include: {
                profile: true,
                client: true,
                deliverer: true,
                merchant: true,
                provider: true,
                admin: true
              }
            })
            
            if (freshUser) {
              // Calculer le validationStatus effectif selon le rôle
              let effectiveValidationStatus = freshUser.validationStatus
              let effectiveIsActive = freshUser.isActive
              
              switch (freshUser.role) {
                case "DELIVERER":
                  effectiveValidationStatus = freshUser.deliverer?.validationStatus || freshUser.validationStatus
                  effectiveIsActive = freshUser.deliverer?.isActive || freshUser.isActive
                  break
                case "PROVIDER":
                  effectiveValidationStatus = freshUser.provider?.validationStatus || freshUser.validationStatus
                  effectiveIsActive = freshUser.provider?.isActive || freshUser.isActive
                  break
                case "MERCHANT":
                  effectiveValidationStatus = freshUser.merchant?.validationStatus || freshUser.validationStatus
                  effectiveIsActive = freshUser.merchant?.isActive || freshUser.isActive
                  break
                case "CLIENT":
                  effectiveValidationStatus = freshUser.client?.validationStatus || freshUser.validationStatus
                  effectiveIsActive = freshUser.client?.isActive || freshUser.isActive
                  break
                case "ADMIN":
                  effectiveValidationStatus = 'VALIDATED' // Admins toujours validés
                  effectiveIsActive = true
                  break
              }

              session.user.isActive = effectiveIsActive
              session.user.role = freshUser.role as UserRole
              session.user.emailVerified = freshUser.emailVerified
              session.user.validationStatus = effectiveValidationStatus
              session.user.profileData = getProfileData(freshUser)
              
              // Mettre à jour le token pour le middleware
              token.isActive = effectiveIsActive
              token.validationStatus = effectiveValidationStatus
              token.profileData = getProfileData(freshUser)
            } else {
              // Fallback vers les données du token si l'utilisateur n'existe plus
              session.user.isActive = token.isActive as boolean
              session.user.validationStatus = token.validationStatus as string
              session.user.emailVerified = token.emailVerified as Date | null
              session.user.profileData = token.profileData
            }
          } catch (error) {
            // En cas d'erreur DB, utiliser les données du token
            console.error('[AUTH SESSION] Erreur récupération données fraîches:', error)
            session.user.isActive = token.isActive as boolean
            session.user.validationStatus = token.validationStatus as string
            session.user.emailVerified = token.emailVerified as Date | null
            session.user.profileData = token.profileData
          }
        }
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // CORRECTION : Permettre la connexion, gestion côté frontend
      // [AUTH] Connexion autorisée
      
      // Mettre à jour la date de dernière connexion
      if (user.id) {
        try {
          await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          })
        } catch (error) {
          console.error('[AUTH] Erreur mise à jour lastLoginAt:', error)
        }
      }

      return true // Toujours autoriser la connexion
    }
  },
  events: {
    async signIn({ user, account, profile }) {
      // Connexion réussie
    }
  }
} satisfies NextAuthConfig

function getRoleValidationStatus(user: any): string | null {
  switch (user.role) {
    case "DELIVERER":
      return user.deliverer?.validationStatus || null
    case "PROVIDER":
      return user.provider?.validationStatus || null
    case "MERCHANT":
      return user.merchant?.validationStatus || null
    default:
      return null
  }
}

function getProfileData(user: any) {
  switch (user.role) {
    case "CLIENT":
      return user.client
    case "DELIVERER":
      return user.deliverer
    case "MERCHANT":
      return user.merchant
    case "PROVIDER":
      return user.provider
    case "ADMIN":
      return user.admin
    default:
      return null
  }
}

const { handlers, auth, signIn, signOut } = NextAuth(config)

export { handlers, auth, signIn, signOut }

// Types étendus pour NextAuth
declare module "next-auth" {
  interface User {
    role: UserRole
    isActive: boolean
    validationStatus: string
    emailVerified?: Date | null
    profileData?: any
  }
  
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: UserRole
      isActive: boolean
      validationStatus: string
      emailVerified?: Date | null
      profileData?: any
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    isActive: boolean
    validationStatus: string
    emailVerified?: Date | null
    profileData?: any
  }
}

// Fonctions utilitaires pour vérifier les rôles
export async function requireRole(requiredRole: UserRole) {
  const session = await auth()
  
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  if (session.user.role !== requiredRole) {
    throw new Error(`Forbidden - ${requiredRole} role required`)
  }
  
  return session.user
}

export async function requireAuth() {
  const session = await auth()
  
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  return session.user
}

export async function requireActiveUser() {
  const session = await auth()
  
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  
  // Règles de validation par rôle
  const requiresActiveStatus = ['DELIVERER', 'PROVIDER']
  
  if (!session.user.isActive && requiresActiveStatus.includes(session.user.role)) {
    throw new Error("Account pending validation")
  }
  
  return session.user
}

// Liste des rôles utilisateurs EcoDeli
export const USER_ROLES = [
  'CLIENT',
  'DELIVERER',
  'MERCHANT',
  'PROVIDER',
  'ADMIN'
] as const

// Export de la config NextAuth pour les routes API
export { config as authOptions }