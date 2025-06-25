import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  
  // Configuration des méthodes d'authentification
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Désactivé pour simplifier le développement
  },

  // Configuration des sessions
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // 1 jour
  },

  // URL de base
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  
  // Secret pour la signature des tokens
  secret: process.env.BETTER_AUTH_SECRET || "your-secret-key-here",

  // Configuration avancée
  advanced: {
    generateId: () => crypto.randomUUID(),
  },

  // Callbacks personnalisés
  callbacks: {
    async signUp({ user }) {
      console.log("Nouvel utilisateur inscrit:", user.email)
      return user
    },
    
    async signIn({ user, session }) {
      console.log("Connexion utilisateur:", user.email, "avec rôle:", user.role)
      return session
    }
  },

  // Configuration des rôles EcoDeli
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "CLIENT",
        validator: (value: string) => {
          const validRoles = ["CLIENT", "DELIVERER", "MERCHANT", "PROVIDER", "ADMIN"]
          return validRoles.includes(value)
        }
      }
    }
  }
})

export type Session = typeof auth.$Infer.Session 