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
    generateId: () => crypto.randomUUID(),
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
        defaultValue: false,
        required: true,
      },
      validationStatus: {
        type: "string",
        defaultValue: "PENDING",
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
      create: async ({ user }) => {
        console.log("Création utilisateur EcoDeli:", user.email, "- Rôle:", user.role)
        
        // Créer le profil selon le rôle
        try {
          switch (user.role) {
            case "CLIENT":
              await db.client.create({
                data: { 
                  userId: user.id,
                }
              })
              break
              
            case "DELIVERER":
              await db.deliverer.create({
                data: { 
                  userId: user.id,
                  vehicleInfo: "",
                  isAvailable: false,
                }
              })
              break

              
            case "MERCHANT":
              await db.merchant.create({
                data: { 
                  userId: user.id,
                  businessName: "",
                  siret: "",
                }
              })
              break
              
            case "PROVIDER":
              await db.provider.create({
                data: { 
                  userId: user.id,
                  businessName: "",
                }
              })
              break
              
            case "ADMIN":
              await db.admin.create({
                data: { 
                  userId: user.id,
                }
              })
              break
          }
        } catch (error) {
          console.error("Erreur création profil:", error)
        }
        
        return user
      },
    },
    
    session: {
      create: async ({ session, user }) => {
        // Enrichir la session avec les données EcoDeli
        let profileData = null
        
        try {
          switch (user.role) {
            case "CLIENT":
              profileData = await db.client.findUnique({
                where: { userId: user.id },
                include: { profile: true }
              })
              break
              
            case "DELIVERER":
              profileData = await db.deliverer.findUnique({
                where: { userId: user.id },
                include: { profile: true }
              })
              break
              
            case "MERCHANT":
              profileData = await db.merchant.findUnique({
                where: { userId: user.id },
                include: { profile: true }
              })
              break
              
            case "PROVIDER":
              profileData = await db.provider.findUnique({
                where: { userId: user.id },
                include: { profile: true }
              })
              break
              
            case "ADMIN":
              profileData = await db.admin.findUnique({
                where: { userId: user.id },
                include: { profile: true }
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
          },
        }
      },
    },
    
    signIn: async ({ user, session }) => {
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
export type User = typeof auth.$Infer.User 