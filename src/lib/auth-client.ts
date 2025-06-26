'use client'

import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  fetchOptions: {
    credentials: "include",
  },
})

// Export des hooks et fonctions utiles
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  forgotPassword,
  resetPassword,
  verifyEmail,
  $Infer
} = authClient

// Types pour EcoDeli
export type UserRole = "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER" | "ADMIN"
export type ValidationStatus = "PENDING" | "PENDING_DOCUMENTS" | "PENDING_VALIDATION" | "VALIDATED" | "REJECTED"

export interface EcoDeliUser {
  id: string
  email: string
  name: string
  role: UserRole
  emailVerified: boolean
  isActive: boolean
  validationStatus: ValidationStatus
  profileId?: string
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

// Hook personnalisé pour l'authentification EcoDeli
export function useAuth() {
  const { data: session, isPending, error } = useSession()
  
  return {
    user: session?.user as EcoDeliUser | undefined,
    session: session,
    isAuthenticated: !!session,
    isLoading: isPending,
    error,
    role: session?.user?.role as UserRole | undefined,
    isActive: session?.user?.isActive ?? false,
    validationStatus: session?.user?.validationStatus as ValidationStatus | undefined,
  }
}

// Fonctions utilitaires pour les rôles
export function hasRole(session: EcoDeliSession | null, role: UserRole): boolean {
  return session?.user?.role === role
}

export function isAdmin(session: EcoDeliSession | null): boolean {
  return hasRole(session, "ADMIN")
}

export function canAccessRoute(userRole: UserRole | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false
  if (userRole === "ADMIN") return true
  return userRole === requiredRole
}

// Fonction pour obtenir l'URL de redirection selon le rôle
export function getRoleRedirectUrl(role: UserRole): string {
  const roleRoutes = {
    'CLIENT': '/client/dashboard',
    'DELIVERER': '/deliverer/dashboard',
    'MERCHANT': '/merchant/dashboard',
    'PROVIDER': '/provider/dashboard',
    'ADMIN': '/admin/dashboard'
  }
  
  return roleRoutes[role] || '/client/dashboard'
}

// Fonction pour les actions d'authentification EcoDeli
export async function signInEcoDeli(email: string, password: string) {
  try {
    const result = await signIn.email({
      email,
      password,
    })
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    return result
  } catch (error) {
    throw error
  }
}

export async function signUpEcoDeli(data: {
  email: string
  password: string
  name: string
  role: UserRole
}) {
  try {
    const result = await signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
      callbackURL: "/fr/login", // URL de redirection après inscription
      // Données additionnelles pour Better-Auth
      ...data,
    })
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    return result
  } catch (error) {
    throw error
  }
}

export async function signOutEcoDeli() {
  try {
    await signOut()
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error)
    throw error
  }
}

// Fonction pour vérifier le statut de validation
export function getValidationMessage(validationStatus: ValidationStatus): string {
  const messages = {
    PENDING: "Votre compte est en attente de validation",
    PENDING_DOCUMENTS: "Documents en attente de soumission",
    PENDING_VALIDATION: "Documents en cours de validation",
    VALIDATED: "Compte validé",
    REJECTED: "Validation refusée - Contactez le support"
  }
  
  return messages[validationStatus] || "Statut inconnu"
}

// Fonction pour vérifier si un utilisateur peut accéder à certaines fonctionnalités
export function canPerformAction(user: EcoDeliUser | undefined, action: string): boolean {
  if (!user || !user.isActive) return false
  
  switch (action) {
    case "create_announcement":
      return user.role === "CLIENT" && user.validationStatus === "VALIDATED"
    case "accept_delivery":
      return user.role === "DELIVERER" && user.validationStatus === "VALIDATED"
    case "manage_inventory":
      return user.role === "MERCHANT" && user.validationStatus === "VALIDATED"
    case "provide_service":
      return user.role === "PROVIDER" && user.validationStatus === "VALIDATED"
    case "admin_access":
      return user.role === "ADMIN"
    default:
      return false
  }
} 