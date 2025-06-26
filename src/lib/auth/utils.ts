import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

/**
 * Utilitaires d'authentification compatibles EcoDeli + Better-Auth
 */

/**
 * Récupérer l'utilisateur depuis la session - API Routes
 */
export async function getUserFromSession(request: NextRequest) {
  try {
    console.log('🔍 [API] Vérification session Better-Auth...')

    // Convertir les headers NextRequest en format compatible Better-Auth
    const headersMap = new Headers()
    request.headers.forEach((value, key) => {
      headersMap.set(key, value)
    })

    // Récupérer la session avec Better-Auth
    const session = await auth.api.getSession({
      headers: headersMap
    })

    if (!session?.user) {
      console.log('[API] No valid session found')
      return null
    }

          console.log('[API] Valid session for:', session.user.email, '- Role:', session.user.role)

    // Récupérer l'utilisateur complet depuis la base avec les relations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        // Inclure tous les profils spécialisés
        client: session.user.role === 'CLIENT',
        deliverer: session.user.role === 'DELIVERER',
        merchant: session.user.role === 'MERCHANT', 
        provider: session.user.role === 'PROVIDER',
        admin: session.user.role === 'ADMIN'
      }
    })

    if (!user) {
              console.log('[API] User not found in database:', session.user.id)
      return null
    }

    return user
  } catch (error) {
          console.error('[API] Session retrieval error:', error)
    return null
  }
}

/**
 * Récupérer session côté serveur (RSC/Server Actions)
 */
export async function getServerSession() {
  try {
    console.log('🔍 [RSC] Récupération session serveur...')
    
    const headersList = await headers()
    
    const session = await auth.api.getSession({
      headers: headersList
    })

    if (session?.user) {
      console.log('✅ [RSC] Session valide pour:', session.user.email)
    } else {
      console.log('❌ [RSC] Aucune session trouvée')
    }

    return session
  } catch (error) {
    console.error('❌ [RSC] Erreur récupération session serveur:', error)
    return null
  }
}

/**
 * Récupérer l'utilisateur complet côté serveur
 */
export async function getServerUser() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        client: session.user.role === 'CLIENT',
        deliverer: session.user.role === 'DELIVERER',
        merchant: session.user.role === 'MERCHANT',
        provider: session.user.role === 'PROVIDER',
        admin: session.user.role === 'ADMIN'
      }
    })

    return user
  } catch (error) {
    console.error('❌ [RSC] Erreur récupération utilisateur serveur:', error)
    return null
  }
}

/**
 * Vérifier les permissions selon le rôle
 */
export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  if (!userRole || !requiredRoles?.length) {
    return false
  }
  
  // ADMIN a accès à tout
  if (userRole === 'ADMIN') {
    return true
  }
  
  return requiredRoles.includes(userRole)
}

/**
 * Vérifier si l'utilisateur peut accéder à une ressource
 */
export function canAccessResource(userRole: string, resourceOwner: string, userId: string): boolean {
  // ADMIN peut accéder à tout
  if (userRole === 'ADMIN') {
    return true
  }
  
  // Propriétaire de la ressource
  if (resourceOwner === userId) {
    return true
  }
  
  return false
}

/**
 * Middleware de vérification des rôles pour API routes
 */
export async function requireRole(request: NextRequest, allowedRoles: string[]) {
  // Vérifier les headers injectés par le middleware
  const userRole = request.headers.get('x-user-role')
  const userId = request.headers.get('x-user-id')
  
  if (userRole && userId && hasPermission(userRole, allowedRoles)) {
    // Récupérer l'utilisateur complet depuis la base
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        client: userRole === 'CLIENT',
        deliverer: userRole === 'DELIVERER',
        merchant: userRole === 'MERCHANT',
        provider: userRole === 'PROVIDER',
        admin: userRole === 'ADMIN'
      }
    })
    
    if (user) {
      return user
    }
  }

  // Fallback: récupération via session (plus lent)
  const user = await getUserFromSession(request)
  
  if (!user) {
    throw new Error('Non authentifié')
  }
  
  if (!hasPermission(user.role, allowedRoles)) {
    throw new Error(`Permissions insuffisantes. Rôle: ${user.role}, Requis: ${allowedRoles.join(', ')}`)
  }
  
  return user
}

/**
 * Middleware simplifié pour vérifier uniquement l'authentification
 */
export async function requireAuth(request: NextRequest) {
  return await requireRole(request, ['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN'])
}

/**
 * Types pour une meilleure intégration TypeScript
 */
export type UserWithProfile = {
  id: string
  email: string
  role: string
  isActive: boolean
  validationStatus: string
  profile: {
    firstName?: string
    lastName?: string
    phone?: string
    avatar?: string
  } | null
  client?: any
  deliverer?: any
  merchant?: any
  provider?: any
  admin?: any
}

/**
 * Constantes pour les rôles
 */
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT', 
  DELIVERER: 'DELIVERER',
  MERCHANT: 'MERCHANT',
  PROVIDER: 'PROVIDER'
} as const

export const VALIDATION_STATUS = {
  PENDING: 'PENDING',
  VALIDATED: 'VALIDATED', 
  REJECTED: 'REJECTED'
} as const 