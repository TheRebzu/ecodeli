import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

/**
 * Middleware EcoDeli simplifié sans réécriture d'URLs
 */

// Routes qui ne nécessitent jamais d'authentification
const ALWAYS_PUBLIC_ROUTES = [
  '/',
  '/home',
  '/about',
  '/services',
  '/pricing',
  '/contact',
  '/faq',
  '/legal',
  '/privacy',
  '/terms',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/403',
  '/become-delivery'
]

/**
 * Middleware d'internationalisation simplifié
 */
const intlMiddleware = createMiddleware(routing)

/**
 * Vérifier si une route est publique (avec ou sans locale)
 */
function isAlwaysPublic(pathname: string): boolean {
  // Enlever le locale pour vérifier
  const withoutLocale = pathname.replace(/^\/[a-z]{2}/, '') || '/'
  
  return ALWAYS_PUBLIC_ROUTES.some(route => 
    pathname === route || 
    pathname.startsWith(route + '/') ||
    withoutLocale === route || 
    withoutLocale.startsWith(route + '/')
  )
}

/**
 * Middleware principal - sans réécriture d'URLs
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. Toujours laisser passer les fichiers statiques et API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }
  
  // 2. Pour toutes les routes de pages, appliquer seulement l'internationalisation basique
  return intlMiddleware(request)
}

/**
 * Configuration du matcher - très restrictive pour éviter les boucles
 */
export const config = {
  matcher: [
    // Uniquement les routes de pages (pas d'API)
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
} 