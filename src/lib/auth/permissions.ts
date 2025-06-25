import { auth } from '@/lib/auth'

// Types pour les rôles et permissions
export type UserRole = 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN'

export type Permission = 
  | 'read:announcements'
  | 'create:announcements'
  | 'update:announcements'
  | 'delete:announcements'
  | 'read:deliveries'
  | 'create:deliveries'
  | 'update:deliveries'
  | 'read:services'
  | 'create:services'
  | 'update:services'
  | 'delete:services'
  | 'read:payments'
  | 'create:payments'
  | 'read:admin'
  | 'create:admin'
  | 'update:admin'
  | 'delete:admin'

// Mapping des rôles vers leurs permissions
export const rolePermissions: Record<UserRole, Permission[]> = {
  CLIENT: [
    'read:announcements',
    'create:announcements',
    'update:announcements',
    'delete:announcements',
    'read:deliveries',
    'read:services',
    'read:payments',
    'create:payments'
  ],
  DELIVERER: [
    'read:announcements',
    'read:deliveries',
    'create:deliveries',
    'update:deliveries',
    'read:services',
    'create:services',
    'update:services',
    'delete:services',
    'read:payments'
  ],
  MERCHANT: [
    'read:announcements',
    'read:deliveries',
    'read:services',
    'create:services',
    'update:services',
    'delete:services',
    'read:payments'
  ],
  PROVIDER: [
    'read:services',
    'create:services',
    'update:services',
    'delete:services',
    'read:payments'
  ],
  ADMIN: [
    'read:announcements',
    'create:announcements', 
    'update:announcements',
    'delete:announcements',
    'read:deliveries',
    'create:deliveries',
    'update:deliveries',
    'read:services',
    'create:services',
    'update:services',
    'delete:services',
    'read:payments',
    'create:payments',
    'read:admin',
    'create:admin',
    'update:admin',
    'delete:admin'
  ]
}

// Dashboards par rôle
export const roleDashboards: Record<UserRole, string> = {
  CLIENT: '/client',
  DELIVERER: '/deliverer',
  MERCHANT: '/merchant', 
  PROVIDER: '/provider',
  ADMIN: '/admin'
}

// Vérifier si un utilisateur a une permission
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return rolePermissions[userRole]?.includes(permission) ?? false
}

// Vérifier si un utilisateur peut accéder à une route
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  // L'admin a accès à tout
  if (userRole === 'ADMIN') return true
  
  // Vérifier les routes spécifiques au rôle
  const roleRoute = roleDashboards[userRole]
  return route.startsWith(roleRoute)
}

// Obtenir la session utilisateur côté serveur
export async function getServerSession() {
  try {
    const session = await auth.api.getSession({
      headers: await import('next/headers').then(mod => mod.headers())
    })
    return session
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}

// Vérifier l'authentification côté serveur
export async function requireAuth() {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Authentication required')
  }
  return session
}

// Vérifier un rôle spécifique côté serveur
export async function requireRole(requiredRole: UserRole) {
  const session = await requireAuth()
  if (session.user.role !== requiredRole && session.user.role !== 'ADMIN') {
    throw new Error(`Role ${requiredRole} required`)
  }
  return session
}

// Vérifier une permission spécifique côté serveur
export async function requirePermission(permission: Permission) {
  const session = await requireAuth()
  const userRole = session.user.role as UserRole
  
  if (!hasPermission(userRole, permission)) {
    throw new Error(`Permission ${permission} required`)
  }
  return session
}

// Helper pour rediriger vers le dashboard approprié
export function getRedirectPath(userRole: UserRole, locale: string = 'fr'): string {
  const dashboard = roleDashboards[userRole]
  return `/${locale}${dashboard}`
}

// Vérifier si l'utilisateur peut accéder à une route d'API
export function canAccessApiRoute(userRole: UserRole, apiRoute: string): boolean {
  if (userRole === 'ADMIN') return true
  
  const roleApiMappings = {
    '/api/client/': 'CLIENT',
    '/api/deliverer/': 'DELIVERER',
    '/api/merchant/': 'MERCHANT', 
    '/api/provider/': 'PROVIDER',
    '/api/admin/': 'ADMIN'
  }
  
  for (const [pattern, requiredRole] of Object.entries(roleApiMappings)) {
    if (apiRoute.startsWith(pattern)) {
      return userRole === requiredRole
    }
  }
  
  return false
} 