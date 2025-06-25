"use client"

import { createAuthClient } from "better-auth/react"
import { createSessionsClient } from "better-auth/client/plugins"
import { UserRole } from "@/types/entities"

// Configuration du client Better-Auth pour EcoDeli
export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession
} = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
})

// Hook personnalisé pour l'authentification avec typage EcoDeli
export function useAuth() {
  const session = useSession()
  
  return {
    user: session.data?.user,
    session: session.data,
    isAuthenticated: !!session.data?.user,
    isLoading: session.isPending,
    error: session.error
  }
}

// Fonction helper pour l'inscription avec rôle
export async function registerWithRole(data: {
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
      // Note: Le rôle sera géré côté serveur dans le hook signUp
    })
    
    return result
  } catch (error) {
    console.error('Registration error:', error)
    throw error
  }
}

// Fonction helper pour la connexion avec redirection
export async function loginWithRedirect(credentials: {
  email: string
  password: string
  redirectTo?: string
}) {
  try {
    const result = await signIn.email({
      email: credentials.email,
      password: credentials.password,
      callbackURL: credentials.redirectTo || '/'
    })
    
    return result
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

// Hook pour obtenir l'utilisateur avec son rôle
export function useUser() {
  const { user } = useAuth()
  
  return {
    user,
    // Note: Le rôle sera géré via les relations Prisma plutôt que directement sur l'objet user
    // role: session?.user?.role as UserRole | undefined
    isClient: user?.role === 'CLIENT',
    isDeliverer: user?.role === 'DELIVERER', 
    isMerchant: user?.role === 'MERCHANT',
    isProvider: user?.role === 'PROVIDER',
    isAdmin: user?.role === 'ADMIN'
  }
}

// Types étendus pour EcoDeli (sans conflits avec Better-Auth)
declare module "better-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      emailVerified: boolean
      image?: string | null
      createdAt: Date
      updatedAt: Date
      role?: UserRole
    }
  }
  
  interface User {
    role?: UserRole
  }
} 