'use client'

import { createAuthClient } from 'better-auth/react'
import { Role } from './auth/config'
import { ReactNode } from 'react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession
} = authClient

// Types étendus pour l'utilisateur EcoDeli
export interface EcoDeliUser {
  id: string
  email: string
  role: Role
  status: string
  firstName?: string
  lastName?: string
  phone?: string
  language?: string
  emailVerified?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface EcoDeliSession {
  user: EcoDeliUser
  expires: string
}

// Fonctions utilitaires pour l'authentification
export const authUtils = {
  /**
   * Inscription avec rôle spécifique EcoDeli
   */
  async registerWithRole(email: string, password: string, role: Role, additionalData: Record<string, any> = {}) {
    return await signUp.email({
      email,
      password,
      ...additionalData,
      role // Sera géré par Better-Auth
    })
  },

  /**
   * Connexion avec gestion des erreurs EcoDeli
   */
  async loginWithErrorHandling(email: string, password: string) {
    try {
      const result = await signIn.email({
        email,
        password
      })

      if (!result.data) {
        throw new Error(result.error?.message || 'Erreur de connexion')
      }

      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Erreur de connexion:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
    }
  },

  /**
   * Déconnexion sécurisée
   */
  async secureLogout() {
    try {
      await signOut()
      // Nettoyer le localStorage si nécessaire
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-state')
        localStorage.removeItem('user-preferences')
      }
      return { success: true }
    } catch (error) {
      console.error('❌ Erreur de déconnexion:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erreur de déconnexion' }
    }
  },

  /**
   * Vérifier le statut de l'utilisateur
   */
  async checkUserStatus(email: string) {
    try {
      const response = await fetch('/api/auth/check-user-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        throw new Error('Erreur de vérification du statut')
      }

      return await response.json()
    } catch (error) {
      console.error('❌ Erreur vérification statut:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
    }
  },

  /**
   * Obtenir le profil complet de l'utilisateur
   */
  async getUserProfile() {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Erreur de récupération du profil')
      }

      const data = await response.json()
      return { success: true, user: data.user }
    } catch (error) {
      console.error('❌ Erreur profil utilisateur:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
    }
  },

  /**
   * Mettre à jour le profil utilisateur
   */
  async updateUserProfile(updates: Partial<EcoDeliUser>) {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Erreur de mise à jour du profil')
      }

      const data = await response.json()
      return { success: true, user: data.user }
    } catch (error) {
      console.error('❌ Erreur mise à jour profil:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
    }
  }
}

// AuthProvider pour l'application EcoDeli
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <>{children}</>
}

export default authClient