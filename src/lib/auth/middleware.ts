/**
 * Middleware d'authentification compatible Edge Runtime
 * N'utilise pas PrismaClient directement pour éviter les erreurs Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

export type UserRole = 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export function withAuth(
  handler: (req: NextRequest & { auth: { user: AuthUser } }) => Promise<NextResponse>,
  allowedRoles?: UserRole[]
) {
  return async (req: NextRequest) => {
    try {
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const decoded = verify(token, process.env.JWT_SECRET!) as AuthUser;
      
      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      (req as any).auth = { user: decoded };
      return handler(req as NextRequest & { auth: { user: AuthUser } });
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  };
}

export function withRoles(...roles: UserRole[]) {
  return (handler: any) => withAuth(handler, roles);
}

/**
 * Vérifier l'authentification via les cookies/headers sans Prisma
 */
export async function getSessionFromRequest(request: NextRequest) {
  try {
    // Récupérer le token depuis les cookies
    const authCookie = request.cookies.get('better-auth.session_token')
    
    if (!authCookie?.value) {
      return null
    }

    // Faire un appel à l'API d'auth interne pour vérifier la session
    const baseUrl = request.nextUrl.origin
    const authResponse = await fetch(`${baseUrl}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'User-Agent': request.headers.get('user-agent') || '',
      },
      cache: 'no-store'
    })

    if (!authResponse.ok) {
      return null
    }

    const session = await authResponse.json()
    return session

  } catch (error) {
    console.error('Erreur vérification session middleware:', error)
    return null
  }
}

/**
 * Types pour le middleware
 */
export type MiddlewareSession = {
  user: {
    id: string
    email: string
    role: string
    status: string
    firstName?: string
    lastName?: string
    language: string
  }
  session: {
    id: string
    userId: string
    expiresAt: Date
  }
}
