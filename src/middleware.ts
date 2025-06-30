import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { auth } from "@/lib/auth"

const intlMiddleware = createIntlMiddleware({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'always'
})

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
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
  
  // Routes publiques (incluant locales)
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
    "/en/services"
  ]
  
  // Vérifier si c'est une route publique
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // Routes protégées - vérifier l'authentification
  if (pathname.includes('/(protected)/') || 
      pathname.includes('/client/') ||
      pathname.includes('/admin/') ||
      pathname.includes('/deliverer/') ||
      pathname.includes('/merchant/') ||
      pathname.includes('/provider/')) {
    
    try {
      const session = await auth()
      
      if (!session?.user) {
        // Extraire la locale de l'URL
        const locale = pathname.split('/')[1] || 'fr'
        const loginUrl = new URL(`/${locale}/login`, request.url)
        loginUrl.searchParams.set("redirect", pathname)
        return NextResponse.redirect(loginUrl)
      }
      
      const user = session.user
      
      // Vérifier les permissions selon le rôle (Mission 1)
      const roleChecks = [
        { path: '/admin/', allowedRoles: ['ADMIN'] },
        { path: '/client/', allowedRoles: ['CLIENT', 'ADMIN'] },
        { path: '/deliverer/', allowedRoles: ['DELIVERER', 'ADMIN'] },
        { path: '/merchant/', allowedRoles: ['MERCHANT', 'ADMIN'] },
        { path: '/provider/', allowedRoles: ['PROVIDER', 'ADMIN'] }
      ]
      
      for (const check of roleChecks) {
        if (pathname.includes(check.path) && !check.allowedRoles.includes(user.role)) {
          console.log(`🚨 Accès refusé: Utilisateur ${user.role} tente d'accéder à ${pathname}`)
          const locale = pathname.split('/')[1] || 'fr'
          // Redirection vers l'espace du rôle de l'utilisateur
          return NextResponse.redirect(new URL(`/${locale}/${user.role.toLowerCase()}/`, request.url))
        }
      }
      
      // Vérifier si le compte est actif (Mission 1)
      if (!user.isActive && user.role !== 'ADMIN') {
        const locale = pathname.split('/')[1] || 'fr'
        return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url))
      }
      
    } catch (error) {
      console.error("Erreur middleware auth:", error)
      const locale = pathname.split('/')[1] || 'fr'
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Exclure explicitement toutes les API routes
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ]
}
