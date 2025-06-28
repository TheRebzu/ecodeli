'use client'

import { useAuth } from './useAuth'
import { ROLE_PERMISSIONS } from '@/lib/auth/permissions'
import { Role } from '@/lib/auth/config'

export interface PermissionCheck {
  hasPermission: (permission: string) => boolean
  hasRole: (role: Role | Role[]) => boolean
  hasAnyRole: (roles: Role[]) => boolean
  hasAllRoles: (roles: Role[]) => boolean
  canAccess: (resource: string, action?: string) => boolean
}

/**
 * Hook pour vérifier les permissions granulaires
 * Utilise la matrice de permissions définie dans auth/permissions.ts
 */
export function usePermissions(): PermissionCheck {
  const { user, isAuthenticated } = useAuth()

  const hasPermission = (permission: string): boolean => {
    if (!isAuthenticated || !user) return false

    const userRole = user.role as Role
    const rolePermissions = ROLE_PERMISSIONS[userRole] || []

    // Vérifier si l'utilisateur a la permission spécifique
    return rolePermissions.includes(permission) || rolePermissions.includes('*')
  }

  const hasRole = (role: Role | Role[]): boolean => {
    if (!isAuthenticated || !user) return false

    if (Array.isArray(role)) {
      return role.includes(user.role as Role)
    }

    return user.role === role
  }

  const hasAnyRole = (roles: Role[]): boolean => {
    if (!isAuthenticated || !user) return false
    return roles.includes(user.role as Role)
  }

  const hasAllRoles = (roles: Role[]): boolean => {
    if (!isAuthenticated || !user) return false
    // Un utilisateur ne peut avoir qu'un seul rôle, donc impossible d'avoir tous les rôles
    return roles.length === 1 && roles[0] === user.role
  }

  const canAccess = (resource: string, action: string = 'read'): boolean => {
    if (!isAuthenticated || !user) return false

    const permission = `${resource}:${action}`
    return hasPermission(permission)
  }

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    canAccess
  }
}