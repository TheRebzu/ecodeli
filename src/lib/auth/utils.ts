import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

/**
 * Utilitaires d'authentification compatibles EcoDeli + NextAuth
 */

/**
 * Récupérer l'utilisateur depuis la session - API Routes NextAuth
 */
export async function getUserFromSession(request: NextRequest) {
  try {
    // Récupérer la session avec NextAuth
    const session = await auth()

    if (!session?.user) {
      return null
    }

    // Récupérer l'utilisateur complet depuis la base avec les relations
    const includeRelations: any = {
      profile: true
    }
    
    // Inclure la relation spécifique selon le rôle
    switch (session.user.role) {
      case 'CLIENT':
        includeRelations.client = true
        break
      case 'DELIVERER':
        includeRelations.deliverer = true
        break
      case 'MERCHANT':
        includeRelations.merchant = true
        break
      case 'PROVIDER':
        includeRelations.provider = true
        break
      case 'ADMIN':
        includeRelations.admin = true
        break
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: includeRelations
    })

    if (!user) {
      return null
    }

    return user
  } catch (error) {
    return null
  }
}

/**
 * Récupérer session côté serveur (RSC/Server Actions)
 */
export async function getServerSession() {
  try {
    const headersList = await headers()
    
    const session = await auth.api.getSession({
      headers: headersList
    })

    return session
  } catch (error) {
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

    const includeRelations: any = {
      profile: true
    }
    
    // Inclure la relation spécifique selon le rôle
    switch (session.user.role) {
      case 'CLIENT':
        includeRelations.client = true
        break
      case 'DELIVERER':
        includeRelations.deliverer = true
        break
      case 'MERCHANT':
        includeRelations.merchant = true
        break
      case 'PROVIDER':
        includeRelations.provider = true
        break
      case 'ADMIN':
        includeRelations.admin = true
        break
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: includeRelations
    })

    return user
  } catch (error) {
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
    const includeRelations: any = {
      profile: true
    }
    
    // Inclure la relation spécifique selon le rôle
    switch (userRole) {
      case 'CLIENT':
        includeRelations.client = true
        break
      case 'DELIVERER':
        includeRelations.deliverer = true
        break
      case 'MERCHANT':
        includeRelations.merchant = true
        break
      case 'PROVIDER':
        includeRelations.provider = true
        break
      case 'ADMIN':
        includeRelations.admin = true
        break
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: includeRelations
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

/**
 * Récupère l'utilisateur courant (compatible API route et RSC)
 * - Si request est fourni (API route), utilise les headers pour Better-Auth
 * - Sinon, utilise les headers du contexte serveur (RSC)
 */
export async function getCurrentUser(request?: Request) {
  try {
    let session
    if (request) {
      // API route
      session = await auth.api.getSession({ headers: request.headers })
    } else {
      // RSC/server
      const headersList = await headers()
      session = await auth.api.getSession({ headers: headersList })
    }

    if (!session?.user) {
      return null
    }

    // Récupérer l'utilisateur complet depuis la base avec les relations
    const includeRelations: any = {
      profile: true
    }
    
    // Inclure la relation spécifique selon le rôle
    switch (session.user.role) {
      case 'CLIENT':
        includeRelations.client = true
        break
      case 'DELIVERER':
        includeRelations.deliverer = true
        break
      case 'MERCHANT':
        includeRelations.merchant = true
        break
      case 'PROVIDER':
        includeRelations.provider = true
        break
      case 'ADMIN':
        includeRelations.admin = true
        break
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: includeRelations
    })

    if (!user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
} 