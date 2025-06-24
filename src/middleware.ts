import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { getSessionFromRequest } from '@/lib/auth/middleware'
import { routing } from '@/i18n/routing'

// Configuration du middleware i18n avec la nouvelle structure
const intlMiddleware = createIntlMiddleware(routing)

// Routes publiques qui ne nécessitent pas d'authentification
const publicRoutes = [
  '/',
  '/home',
  '/about',
  '/services',
  '/pricing',
  '/contact',
  '/blog',
  '/faq',
  '/legal',
  '/privacy',
  '/terms',
  '/partners',
  '/developers',
  '/shipping',
  '/tracking',
  '/become-delivery',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/onboarding',
  '/test',
  '/test-simple'
]

// Routes d'API publiques
const publicApiRoutes = [
  '/api/auth',
  '/api/public',
  '/api/health',
  '/api/upload',
  '/api/webhooks'
]

// Routes par rôle
const roleRoutes = {
  CLIENT: ['/client'],
  DELIVERER: ['/deliverer'],
  MERCHANT: ['/merchant'],
  PROVIDER: ['/provider'],
  ADMIN: ['/admin']
}

// Fonction pour vérifier si une route est publique
function isPublicRoute(pathname: string): boolean {
  // Retirer la locale du pathname pour la vérification
  const pathWithoutLocale = pathname.replace(new RegExp(`^/(${routing.locales.join('|')})`), '') || '/'
  
  return publicRoutes.some(route => {
    if (route === '/') {
      return pathWithoutLocale === '/' || pathWithoutLocale === ''
    }
    return pathWithoutLocale.startsWith(route)
  })
}

// Fonction pour vérifier si une route d'API est publique
function isPublicApiRoute(pathname: string): boolean {
  return publicApiRoutes.some(route => pathname.startsWith(route))
}

// Fonction pour extraire la locale du pathname
function getLocaleFromPathname(pathname: string): string | null {
  const segments = pathname.split('/')
  const potentialLocale = segments[1]
  return routing.locales.includes(potentialLocale as any) ? potentialLocale : null
}

// Fonction pour vérifier les permissions de rôle
function hasRolePermission(userRole: string, pathname: string): boolean {
  const pathWithoutLocale = pathname.replace(new RegExp(`^/(${routing.locales.join('|')})`), '') || '/'
  
  // L'admin a accès à tout
  if (userRole === 'ADMIN') {
    return true
  }
  
  // Vérifier les routes spécifiques au rôle
  const allowedRoutes = roleRoutes[userRole as keyof typeof roleRoutes] || []
  return allowedRoutes.some(route => pathWithoutLocale.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. Gérer les routes d'API publiques d'abord
  if (isPublicApiRoute(pathname)) {
    return NextResponse.next()
  }
  
  // 2. Gérer les routes d'API protégées
  if (pathname.startsWith('/api/')) {
    try {
      const session = await getSessionFromRequest(request)
      
      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
      
      // Vérifier les permissions pour les routes admin
      if (pathname.startsWith('/api/admin/') && session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        )
      }
      
      // Vérifier les permissions pour les routes par rôle
      const roleApiPatterns = {
        '/api/client/': 'CLIENT',
        '/api/deliverer/': 'DELIVERER', 
        '/api/merchant/': 'MERCHANT',
        '/api/provider/': 'PROVIDER'
      }
      
      for (const [pattern, requiredRole] of Object.entries(roleApiPatterns)) {
        if (pathname.startsWith(pattern) && session.user.role !== requiredRole && session.user.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Forbidden', message: `${requiredRole} access required` },
            { status: 403 }
          )
        }
      }
      
      return NextResponse.next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Authentication service unavailable' },
        { status: 500 }
      )
    }
  }
  
  // 3. Gérer les routes publiques avec i18n
  if (isPublicRoute(pathname)) {
    return intlMiddleware(request)
  }
  
  // 4. Gérer l'authentification pour les routes protégées
  try {
    const session = await getSessionFromRequest(request)
    
    if (!session) {
      // Obtenir la locale pour la redirection
      const locale = getLocaleFromPathname(pathname) || routing.defaultLocale
      
      // Rediriger vers la page de login avec la locale
      const loginUrl = new URL(`/${locale}/login`, request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Vérifier les permissions de rôle pour les routes protégées
    if (!hasRolePermission(session.user.role, pathname)) {
      // Obtenir la locale pour la redirection
      const locale = getLocaleFromPathname(pathname) || routing.defaultLocale
      
      // Rediriger vers le dashboard approprié selon le rôle
      const dashboardUrl = new URL(`/${locale}/${session.user.role.toLowerCase()}`, request.url)
      return NextResponse.redirect(dashboardUrl)
    }
    
    // Appliquer l'internationalisation
    return intlMiddleware(request)
    
  } catch (error) {
    console.error('Auth middleware error:', error)
    
    // En cas d'erreur d'auth, rediriger vers login
    const locale = getLocaleFromPathname(pathname) || routing.defaultLocale
    const loginUrl = new URL(`/${locale}/login`, request.url)
    loginUrl.searchParams.set('error', 'auth_error')
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  // Matcher pour appliquer le middleware
  matcher: [
    // Inclure toutes les routes sauf les fichiers statiques
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Inclure toutes les routes API
    '/api/(.*)'
  ]
} 