'use client'

import { useAuth } from '../hooks/useAuth'
import { usePermissions } from '../hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { Role } from '@/lib/auth/config'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: Role | Role[]
  redirectTo?: string
  fallback?: ReactNode
  requireAllRoles?: boolean
}

/**
 * Guard pour protéger les routes selon les rôles
 * Vérifie que l'utilisateur a le bon rôle pour accéder au contenu
 */
export function RoleGuard({ 
  children, 
  allowedRoles,
  redirectTo = '/unauthorized',
  fallback,
  requireAllRoles = false
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { hasRole, hasAnyRole, hasAllRoles } = usePermissions()
  const router = useRouter()

  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  
  const hasRequiredRoles = requireAllRoles 
    ? hasAllRoles(rolesArray)
    : hasAnyRole(rolesArray)

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRequiredRoles) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, isLoading, hasRequiredRoles, router, redirectTo])

  // Si en cours de chargement, ne rien afficher
  if (isLoading) {
    return null
  }

  // Si non authentifié, AuthGuard doit déjà gérer la redirection
  if (!isAuthenticated) {
    return null
  }

  // Si n'a pas les rôles requis
  if (!hasRequiredRoles) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Accès non autorisé. Votre rôle ({user?.role}) ne permet pas d'accéder à cette page.
            <br />
            Rôles requis : {rolesArray.join(', ')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Afficher le contenu protégé
  return <>{children}</>
}