'use client'

import { useAuth as useBetterAuth } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { signInEcoDeli, signUpEcoDeli, signOutEcoDeli, getRoleRedirectUrl } from '@/lib/auth-client'
import type { UserRole } from '@/lib/auth-client'

export function useAuthBetter() {
  const auth = useBetterAuth()
  const router = useRouter()

  const login = async (email: string, password: string) => {
    try {
      const result = await signInEcoDeli(email, password)
      
      if (result.data?.user) {
        const redirectUrl = getRoleRedirectUrl(result.data.user.role as UserRole)
        toast.success('Connexion réussie')
        router.push(redirectUrl)
        return result
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de connexion'
      toast.error(message)
      throw error
    }
  }

  const register = async (data: {
    email: string
    password: string
    name: string
    role: UserRole
  }) => {
    try {
      const result = await signUpEcoDeli(data)
      
      if (result.data?.user) {
        toast.success('Inscription réussie - Vérifiez votre email')
        router.push('/fr/verify-email')
        return result
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur d\'inscription'
      toast.error(message)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOutEcoDeli()
      toast.success('Déconnexion réussie')
      router.push('/fr/login')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de déconnexion'
      toast.error(message)
      throw error
    }
  }

  const redirectToRole = () => {
    if (auth.role) {
      const redirectUrl = getRoleRedirectUrl(auth.role)
      router.push(redirectUrl)
    }
  }

  return {
    // État de l'authentification
    user: auth.user,
    session: auth.session,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    role: auth.role,
    isActive: auth.isActive,
    validationStatus: auth.validationStatus,
    
    // Actions
    login,
    register,
    logout,
    redirectToRole,
    
    // Utilitaires
    isAdmin: auth.role === 'ADMIN',
    isClient: auth.role === 'CLIENT',
    isDeliverer: auth.role === 'DELIVERER',
    isMerchant: auth.role === 'MERCHANT',
    isProvider: auth.role === 'PROVIDER',
  }
}