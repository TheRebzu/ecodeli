import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

/**
 * Récupérer l'utilisateur depuis la session
 */
export async function getUserFromSession(request: NextRequest) {
  try {
    // Récupérer le token de session depuis les cookies
    const sessionToken = request.cookies.get('better-auth.session_token')?.value
    
    if (!sessionToken) {
      return null
    }

    // Vérifier la session avec Better-Auth
    const session = await auth.api.getSession({
      headers: {
        'cookie': `better-auth.session_token=${sessionToken}`
      }
    })

    if (!session.data?.user) {
      return null
    }

    // Récupérer l'utilisateur complet depuis la base
    const user = await prisma.user.findUnique({
      where: { id: session.data.user.id },
      include: {
        profile: true
      }
    })

    return user
  } catch (error) {
    console.error('Erreur récupération session:', error)
    return null
  }
}

/**
 * Vérifier les permissions selon le rôle
 */
export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

/**
 * Middleware de vérification des rôles
 */
export async function requireRole(request: NextRequest, allowedRoles: string[]) {
  const user = await getUserFromSession(request)
  
  if (!user) {
    throw new Error('Non authentifié')
  }
  
  if (!hasPermission(user.role, allowedRoles)) {
    throw new Error('Permissions insuffisantes')
  }
  
  return user
} 