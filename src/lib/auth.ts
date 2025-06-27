import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"

export const config = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
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
        })

        if (!user) {
          return null
        }

        // Vérifier le mot de passe (si présent)
        if (user.password) {
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }
        }

        // Vérifier si l'utilisateur est actif
        if (!user.isActive && user.role !== "ADMIN") {
          throw new Error("Compte en attente de validation")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.profile?.firstName || user.email,
          image: user.image || user.profile?.avatar,
          role: user.role,
          isActive: user.isActive,
          validationStatus: user.validationStatus,
          profileData: getProfileData(user)
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 jours
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Première connexion
      if (user) {
        token.role = user.role
        token.isActive = user.isActive
        token.validationStatus = user.validationStatus
        token.profileData = user.profileData
      }

      // Mise à jour de session
      if (trigger === "update" && session) {
        token = { ...token, ...session }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as UserRole
        session.user.isActive = token.isActive as boolean
        session.user.validationStatus = token.validationStatus as string
        session.user.profileData = token.profileData
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Vérifier si l'utilisateur est actif
      if (!user.isActive && user.role !== "ADMIN") {
        return false
      }

      // Mettre à jour la date de dernière connexion
      if (user.id) {
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })
      }

      return true
    }
  },
  events: {
    async signIn({ user, account, profile }) {
      // Connexion réussie
    }
  }
} satisfies NextAuthConfig

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

export const { handlers, auth, signIn, signOut } = NextAuth(config)

// Types étendus pour NextAuth
declare module "next-auth" {
  interface User {
    role: UserRole
    isActive: boolean
    validationStatus: string
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
      profileData?: any
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    isActive: boolean
    validationStatus: string
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
  
  if (!session.user.isActive && session.user.role !== "ADMIN") {
    throw new Error("Account pending validation")
  }
  
  return session.user
}