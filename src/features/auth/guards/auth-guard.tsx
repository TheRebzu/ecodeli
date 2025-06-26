'use client'

import { useAuth } from '../hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: ReactNode
  redirectTo?: string
  fallback?: ReactNode
}

/**
 * Guard pour protéger les routes nécessitant une authentification
 * Redirige vers la page de connexion si non authentifié
 */
export function AuthGuard({ 
  children, 
  redirectTo = '/login', 
  fallback 
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  // Affichage du loader pendant la vérification
  if (isLoading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">
            Vérification de l'authentification...
          </p>
        </div>
      </div>
    )
  }

  // Si non authentifié, ne rien afficher (redirection en cours)
  if (!isAuthenticated) {
    return null
  }

  // Afficher le contenu protégé
  return <>{children}</>
}