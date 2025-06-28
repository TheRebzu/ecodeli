'use client'

import { useSession } from 'better-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Role, UserStatus } from '@/lib/auth/config'

export interface AuthUser {
  id: string
  email: string
  role: Role
  status: UserStatus
  firstName?: string
  lastName?: string
  phone?: string
  language?: string
  emailVerified?: boolean
  profile?: any
}

export interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  canAccess: (resource: string) => boolean
  needsAction: string[]
}

/**
 * Hook principal pour l'authentification Better-Auth
 * Gère l'état de l'utilisateur et les permissions
 */
export function useAuth(): AuthState {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [needsAction, setNeedsAction] = useState<string[]>([])

  // Fonction pour vérifier les permissions
  const canAccess = (resource: string): boolean => {
    if (!session?.user) return false
    
    // TODO: Implémenter la logique de permissions complète
    const userRole = session.user.role as Role
    
    // Logique de base - à enrichir avec la matrice de permissions
    switch (userRole) {
      case 'ADMIN':
        return true // Admin peut tout faire
      case 'CLIENT':
        return ['announcements', 'bookings', 'payments'].some(r => resource.includes(r))
      case 'DELIVERER':
        return ['deliveries', 'routes', 'earnings'].some(r => resource.includes(r))
      case 'MERCHANT':
        return ['products', 'orders', 'contracts'].some(r => resource.includes(r))
      case 'PROVIDER':
        return ['services', 'bookings', 'invoices'].some(r => resource.includes(r))
      default:
        return false
    }
  }

  // Vérifier les actions nécessaires selon le statut
  useEffect(() => {
    if (session?.user) {
      const actions: string[] = []
      
      if (!session.user.emailVerified) {
        actions.push('EMAIL_VERIFICATION')
      }

      switch (session.user.status) {
        case 'PENDING_DOCUMENTS':
          actions.push('DOCUMENT_UPLOAD')
          break
        case 'PENDING_VALIDATION':
          actions.push('ADMIN_VALIDATION')
          break
        case 'SUSPENDED':
          actions.push('ACCOUNT_SUSPENDED')
          break
      }

      // Actions spécifiques par rôle
      if (session.user.role === 'CLIENT' && session.user.profile?.tutorialCompleted === false) {
        actions.push('TUTORIAL_COMPLETION')
      }

      setNeedsAction(actions)
    }
  }, [session])

  return {
    user: session?.user as AuthUser | null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    canAccess,
    needsAction
  }
}