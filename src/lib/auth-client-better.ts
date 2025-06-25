'use client'

import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
})

// Export des hooks et fonctions utiles
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  $Infer
} = authClient

// Types pour EcoDeli
export type UserRole = "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER" | "ADMIN"

export interface EcoDeliUser {
  id: string
  email: string
  name: string
  role: UserRole
  emailVerified: boolean
  image?: string
  createdAt: Date
  updatedAt: Date
}

export interface EcoDeliSession {
  session: {
    id: string
    userId: string
    expiresAt: Date
  }
  user: EcoDeliUser
}

// Fonction utilitaire pour vérifier les rôles
export function hasRole(session: EcoDeliSession | null, role: UserRole): boolean {
  return session?.user?.role === role
}

// Fonction utilitaire pour vérifier les permissions admin
export function isAdmin(session: EcoDeliSession | null): boolean {
  return hasRole(session, "ADMIN")
}

// Fonction utilitaire pour obtenir l'URL de redirection selon le rôle
export function getRoleRedirectUrl(role: UserRole): string {
  const roleRoutes = {
    'CLIENT': '/client',
    'DELIVERER': '/deliverer',
    'MERCHANT': '/merchant',
    'PROVIDER': '/provider',
    'ADMIN': '/admin'
  }
  
  return roleRoutes[role] || '/client'
} 