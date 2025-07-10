import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { auth } from '@/lib/auth'
import type { UserRole } from "@prisma/client"

const intlMiddleware = createIntlMiddleware({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'always'
})

// Fonction pour vérifier les permissions par rôle
function hasRequiredRole(userRole: string, pathname: string): boolean {
  const rolePermissions = {
    ADMIN: ['/admin/', '/client/', '/deliverer/', '/merchant/', '/provider/'],
    CLIENT: ['/client/'],
    DELIVERER: ['/deliverer/'],
    MERCHANT: ['/merchant/'],
    PROVIDER: ['/provider/']
  }

  const userAllowedPaths = rolePermissions[userRole as UserRole] || []
  
  // Extraire la partie après la locale (ex: /fr/client -> /client)
  const pathAfterLocale = pathname.replace(/^\/[a-z]{2}/, '')
  
  console.log('🔍 hasRequiredRole debug:', {
    userRole,
    pathname,
    pathAfterLocale,
    userAllowedPaths,
    result: userAllowedPaths.some(path => pathAfterLocale.includes(path))
  })
  
  return userAllowedPaths.some(path => pathAfterLocale.includes(path))
}

// Fonction pour vérifier si l'utilisateur est actif selon son rôle
function isUserActive(userRole: string, isActive: boolean): boolean {
  const requiresActiveStatus = ['DELIVERER', 'PROVIDER']
  
  if (requiresActiveStatus.includes(userRole)) {
    return isActive
  }
  
  return true // Les autres rôles n'ont pas besoin de validation active
}

// Fonction pour détecter si une route est protégée
function isProtectedRoute(pathname: string): boolean {
  // Protéger /fr/client, /fr/client/, /fr/client/xxx, etc.
  const protectedPatterns = [
    /^\/[a-z]{2}\/client(\/|$)/,
    /^\/[a-z]{2}\/admin(\/|$)/,
    /^\/[a-z]{2}\/deliverer(\/|$)/,
    /^\/[a-z]{2}\/merchant(\/|$)/,
    /^\/[a-z]{2}\/provider(\/|$)/,
  ];
  return protectedPatterns.some((regex) => regex.test(pathname));
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  console.log('🔍 Middleware: Vérification route:', pathname)
  
  // Rewrite legacy uploads URLs to API routes
  if (pathname.startsWith('/uploads/documents/')) {
    const filename = pathname.replace('/uploads/documents/', '')
    const newUrl = new URL(`/api/uploads/documents/${filename}`, request.url)
    return NextResponse.rewrite(newUrl)
  }
  
  // Skip middleware pour API routes et fichiers statiques
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots') ||
    pathname.startsWith('/sitemap')
  ) {
    return NextResponse.next()
  }

  // Éviter les doublons de locale AVANT l'internationalisation
  const localePattern = /^\/(fr|en)\/(fr|en)\//
  if (localePattern.test(pathname)) {
    const correctedPath = pathname.replace(localePattern, '/$1/')
    return NextResponse.redirect(new URL(correctedPath, request.url))
  }

  // Gérer l'internationalisation
  const intlResponse = intlMiddleware(request)
  
  // Si redirection i18n nécessaire, l'appliquer
  if (intlResponse?.status === 307 || intlResponse?.status === 302) {
    return intlResponse
  }
  
  // Routes publiques (incluant locales) - LOGIQUE STRICTE
  const publicRoutes = [
    "/fr",
    "/en", 
    "/fr/home",
    "/en/home",
    "/fr/partners",
    "/en/partners",
    "/fr/login",
    "/en/login",
    "/fr/register", 
    "/en/register",
    "/fr/forgot-password",
    "/en/forgot-password",
    "/fr/reset-password",
    "/en/reset-password",
    "/fr/verify-email",
    "/en/verify-email",
    "/fr/403",
    "/en/403",
    "/fr/about",
    "/en/about",
    "/fr/contact",
    "/en/contact",
    "/fr/services",
    "/en/services",
    "/fr/onboarding",
    "/en/onboarding"
  ]
  
  // Vérifier si c'est une route publique - LOGIQUE STRICTE
  const isPublicRoute = publicRoutes.includes(pathname)
  
  if (isPublicRoute) {
    console.log('✅ Middleware: Route publique autorisée:', pathname)
    return NextResponse.next()
  }
  
  // Vérifier si c'est une route protégée
  if (isProtectedRoute(pathname)) {
    console.log('🔒 Middleware: Route protégée détectée:', pathname)
    
    try {
      // Récupérer la session avec NextAuth v5
      const session = await auth()
      
      console.log('🔍 Middleware: Session récupérée:', session ? 'OUI' : 'NON')
      
      // Vérifier si l'utilisateur est connecté
      if (!session || !session.user) {
        console.log('🚨 Middleware: Utilisateur non connecté, redirection vers login')
        const locale = pathname.split('/')[1] || 'fr'
        const loginUrl = new URL(`/${locale}/login`, request.url)
        loginUrl.searchParams.set("redirect", pathname)
        return NextResponse.redirect(loginUrl)
      }
      
      // Vérifier que la session contient les informations nécessaires
      if (!session.user.id || !session.user.role) {
        console.log('🚨 Middleware: Session invalide - informations manquantes')
        const locale = pathname.split('/')[1] || 'fr'
        const loginUrl = new URL(`/${locale}/login`, request.url)
        loginUrl.searchParams.set("redirect", pathname)
        return NextResponse.redirect(loginUrl)
      }
      
      // Extraire les informations utilisateur de la session
      const user = {
        id: session.user.id,
        role: session.user.role as UserRole,
        isActive: session.user.isActive,
        validationStatus: session.user.validationStatus
      }

      console.log('🔍 Middleware: Vérification utilisateur', {
        id: user.id,
        role: user.role,
        isActive: user.isActive,
        pathname: pathname
      })

      // Vérifier si l'utilisateur a le rôle requis pour cette route
      if (!hasRequiredRole(user.role, pathname)) {
        console.log(`🚨 Middleware: Accès refusé - Rôle ${user.role} tente d'accéder à ${pathname}`)
        const locale = pathname.split('/')[1] || 'fr'
        
        // Redirection vers l'espace approprié selon le rôle
        let redirectPath = `/${locale}`
        switch (user.role) {
          case 'CLIENT':
            redirectPath = `/${locale}/client/`
            break
          case 'DELIVERER':
            redirectPath = `/${locale}/deliverer/`
            break
          case 'MERCHANT':
            redirectPath = `/${locale}/merchant/`
            break
          case 'PROVIDER':
            redirectPath = `/${locale}/provider/`
            break
          case 'ADMIN':
            redirectPath = `/${locale}/admin/`
            break
          default:
            redirectPath = `/${locale}/login`
        }
        
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }

      // Vérifier si le compte est actif selon le rôle
      if (!isUserActive(user.role, user.isActive)) {
        console.log(`🚨 Middleware: Compte inactif - Utilisateur ${user.role} (ID: ${user.id})`)
        const locale = pathname.split('/')[1] || 'fr'
        return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url))
      }

      // Vérifications spécifiques par rôle
      if (user.role === 'DELIVERER' || user.role === 'PROVIDER') {
        // Vérifier le statut de validation pour les livreurs et prestataires
        if (user.validationStatus !== 'APPROVED') {
          console.log(`🚨 Middleware: Validation en attente - ${user.role} (ID: ${user.id})`)
          const locale = pathname.split('/')[1] || 'fr'
          return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url))
        }
      }

      console.log('✅ Middleware: Accès autorisé', {
        role: user.role,
        pathname: pathname
      })
      
      // Si toutes les vérifications passent, autoriser l'accès
      return NextResponse.next()
      
    } catch (error) {
      console.error("❌ Erreur middleware auth:", error)
      const locale = pathname.split('/')[1] || 'fr'
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
  }

  // Si ce n'est pas une route protégée, autoriser l'accès
  console.log('✅ Middleware: Route non protégée autorisée:', pathname)
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Exclure explicitement toutes les API routes
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ]
}
