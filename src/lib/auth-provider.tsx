'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { type UserRole } from './auth-client'

interface EcoDeliUser {
  id: string
  email: string
  name?: string
  role: string
  emailVerified: boolean
  isActive: boolean
  validationStatus: string
}

// Context pour l'authentification EcoDeli
interface AuthContextType {
  user: EcoDeliUser | undefined
  isAuthenticated: boolean
  isLoading: boolean
  role: UserRole | undefined
  isActive: boolean
  canAccess: (requiredRole: UserRole) => boolean
  canPerform: (action: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider pour l'authentification
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  
  const canAccess = (requiredRole: UserRole): boolean => {
    if (!auth.role) return false
    if (auth.role === "ADMIN") return true
    return auth.role === requiredRole
  }
  
  const canPerform = (action: string): boolean => {
    if (!auth.user || !auth.isActive) return false
    
    switch (action) {
      case "create_announcement":
        return auth.role === "CLIENT" && auth.validationStatus === "VALIDATED"
      case "accept_delivery":
        return auth.role === "DELIVERER" && auth.validationStatus === "VALIDATED"
      case "manage_inventory":
        return auth.role === "MERCHANT" && auth.validationStatus === "VALIDATED"
      case "provide_service":
        return auth.role === "PROVIDER" && auth.validationStatus === "VALIDATED"
      case "admin_access":
        return auth.role === "ADMIN"
      default:
        return false
    }
  }
  
  return (
    <AuthContext.Provider value={{
      user: auth.user,
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      role: auth.role,
      isActive: auth.isActive,
      canAccess,
      canPerform,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook pour utiliser le contexte d'authentification
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

// Composant de protection de route
interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: UserRole
  fallback?: ReactNode
  requireActive?: boolean
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback = <div>Accès non autorisé</div>,
  requireActive = true 
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, role, isActive, canAccess } = useAuthContext()
  
  if (isLoading) {
    return <div>Chargement...</div>
  }
  
  if (!isAuthenticated) {
    return fallback
  }
  
  if (requireActive && !isActive) {
    return <div>Compte non activé</div>
  }
  
  if (requiredRole && !canAccess(requiredRole)) {
    return fallback
  }
  
  return <>{children}</>
}

// Composant pour afficher du contenu selon le rôle
interface RoleBasedContentProps {
  allowedRoles: UserRole[]
  children: ReactNode
  fallback?: ReactNode
}

export function RoleBasedContent({ 
  allowedRoles, 
  children, 
  fallback = null 
}: RoleBasedContentProps) {
  const { role } = useAuthContext()
  
  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Composant pour afficher du contenu selon les permissions
interface PermissionBasedContentProps {
  action: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionBasedContent({ 
  action, 
  children, 
  fallback = null 
}: PermissionBasedContentProps) {
  const { canPerform } = useAuthContext()
  
  if (!canPerform(action)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}