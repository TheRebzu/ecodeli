'use client'

import { useAuth } from '@/hooks/use-auth'

type Role = 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN'

// Permissions par rôle - simplifié pour corriger l'erreur
const rolePermissions: Record<Role, string[]> = {
  CLIENT: ['announcements:read', 'announcements:create', 'bookings:read', 'bookings:create', 'payments:read'],
  DELIVERER: ['deliveries:read', 'deliveries:create', 'deliveries:update', 'routes:read', 'routes:create'],
  MERCHANT: ['products:read', 'products:create', 'orders:read', 'contracts:read'],
  PROVIDER: ['services:read', 'services:create', 'bookings:read', 'invoices:read'],
  ADMIN: ['*'] // Tous les droits
}

export interface PermissionCheck {
  hasPermission: (permission: string) => boolean
  hasRole: (role: Role | Role[]) => boolean
  hasAnyRole: (roles: Role[]) => boolean
  hasAllRoles: (roles: Role[]) => boolean
  canAccess: (resource: string, action?: string) => boolean
}

/**
 * Hook pour vérifier les permissions granulaires
 * Utilise la matrice de permissions définie localement
 */
export function usePermissions(): PermissionCheck {
  const { user, isAuthenticated } = useAuth()

  const hasPermission = (permission: string): boolean => {
    if (!isAuthenticated || !user) return false

    const userRole = user.role as Role
    const userPermissions = rolePermissions[userRole] || []

    // Admin a tous les droits
    if (userPermissions.includes('*')) return true

    // Vérifier si l'utilisateur a la permission spécifique
    return userPermissions.includes(permission)
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