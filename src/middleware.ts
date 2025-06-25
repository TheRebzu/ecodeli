// Middleware Next.js pour EcoDeli - Gestion Auth + i18n
import { NextRequest, NextResponse } from "next/server"
import createIntlMiddleware from "next-intl/middleware"

/**
 * Configuration des locales supportées par EcoDeli
 */
export const locales = ["fr", "en"] as const
export const defaultLocale = "fr" as const

/**
 * Middleware internationalization
 */
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always", // URLs toujours préfixées (/fr/dashboard, /en/dashboard)
  localeDetection: true
})

/**
 * Routes publiques accessibles sans authentification
 */
const publicRoutes = [
  "/",
  "/about",
  "/services", 
  "/pricing",
  "/contact",
  "/legal",
  "/privacy",
  "/terms",
  "/faq",
  "/become-delivery",
  "/partners",
  "/blog"
]

/**
 * Routes d'authentification
 */
const authRoutes = [
  "/login",
  "/register",
  "/forgot-password", 
  "/reset-password",
  "/verify-email",
  "/two-factor"
]

/**
 * Routes d'administration (rôle ADMIN requis)
 */
const adminRoutes = [
  "/admin"
]

/**
 * Routes protégées par rôle
 */
const roleRoutes = {
  "/client": ["CLIENT"],
  "/deliverer": ["DELIVERER"], 
  "/merchant": ["MERCHANT"],
  "/provider": ["PROVIDER"],
  "/admin": ["ADMIN"]
}

/**
 * Vérifier si une route est publique
 */
function isPublicRoute(pathname: string): boolean {
  // Retirer le préfixe locale pour vérifier
  const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "") || "/"
  
  return publicRoutes.some(route => {
    if (route === "/") return pathnameWithoutLocale === "/"
    return pathnameWithoutLocale.startsWith(route)
  })
}

/**
 * Vérifier si une route est d'authentification
 */
function isAuthRoute(pathname: string): boolean {
  const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "") || "/"
  
  return authRoutes.some(route => pathnameWithoutLocale.startsWith(route))
}

/**
 * Obtenir le rôle requis pour une route
 */
function getRequiredRole(pathname: string): string[] | null {
  const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "") || "/"
  
  for (const [route, roles] of Object.entries(roleRoutes)) {
    if (pathnameWithoutLocale.startsWith(route)) {
      return roles
    }
  }
  
  return null
}

/**
 * Middleware principal combinant auth + i18n
 */
export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // 0. Nettoyer les URLs avec des locales en double AVANT tout traitement
  const pathParts = pathname.split('/')
  if (pathParts.length >= 2 && locales.includes(pathParts[1] as any)) {
    const locale = pathParts[1]
    let hasDoubleLocale = false
    
    // Vérifier s'il y a des locales en double
    for (let i = 2; i < pathParts.length; i++) {
      if (pathParts[i] === locale) {
        hasDoubleLocale = true
        break
      }
    }
    
    if (hasDoubleLocale) {
      // Supprimer toutes les occurrences en double de la locale
      const cleanParts = [pathParts[0], locale]
      
      for (let i = 2; i < pathParts.length; i++) {
        if (pathParts[i] !== locale) {
          cleanParts.push(pathParts[i])
        }
      }
      
      const cleanPath = cleanParts.join('/')
      console.log(`🧹 Nettoyage URL: ${pathname} -> ${cleanPath}`)
      
      return NextResponse.redirect(new URL(cleanPath + request.nextUrl.search, request.url))
    }
  }
  
  // 1. Appliquer d'abord le middleware i18n
  const intlResponse = intlMiddleware(request)
  
  // Si intl retourne une réponse (redirection), on l'utilise
  if (intlResponse.status !== 200) {
    return intlResponse
  }
  
  // 2. Gestion basique de l'authentification via cookies
  const authToken = request.cookies.get('auth-token')?.value
  
  // Debug: vérifier la présence du token
  if (authToken) {
    console.log(`🔑 Token trouvé pour ${pathname}`)
  } else {
    console.log(`❌ Pas de token pour ${pathname}`)
  }
  
  // Route publique -> Continuer
  if (isPublicRoute(pathname)) {
    return intlResponse
  }
  
  // Route d'auth + utilisateur connecté -> Rediriger vers dashboard par défaut
  if (isAuthRoute(pathname) && authToken) {
    const locale = pathname.split("/")[1]
    // Redirection par défaut vers client, sera ajustée côté serveur
    return NextResponse.redirect(new URL(`/${locale}/client`, request.url))
  }
  
  // Route d'auth + pas connecté -> Continuer
  if (isAuthRoute(pathname)) {
    return intlResponse
  }
  
  // Route protégée + pas connecté -> Rediriger vers login
  if (!authToken) {
    const locale = pathname.split("/")[1] || defaultLocale
    const loginUrl = `/${locale}/login`
    // Retirer la locale du pathname pour éviter les doubles locales dans callbackUrl
    const pathnameWithoutLocale = pathname.replace(/^\/[a-z]{2}/, "") || "/"
    const cleanCallbackUrl = `/${locale}${pathnameWithoutLocale}`
    const callbackUrl = encodeURIComponent(cleanCallbackUrl)
    
    console.log(`🔀 Middleware redirect: ${pathname} -> ${loginUrl}?callbackUrl=${callbackUrl}`)
    
    return NextResponse.redirect(new URL(`${loginUrl}?callbackUrl=${callbackUrl}`, request.url))
  }
  
  // Pour les routes protégées avec token, on laisse le serveur gérer les permissions
  // Les vérifications de rôle seront faites côté serveur avec accès à la DB
  
  return intlResponse
}

/**
 * Obtenir l'URL du dashboard selon le rôle
 */
function getDashboardUrl(role: string, locale: string): string {
  const baseDashboards = {
    CLIENT: "client",
    DELIVERER: "deliverer", 
    MERCHANT: "merchant",
    PROVIDER: "provider",
    ADMIN: "admin"
  }
  
  const dashboard = baseDashboards[role as keyof typeof baseDashboards] || "client"
  return `/${locale}/${dashboard}`
}

/**
 * Configuration du matcher pour Next.js
 * Exclut les fichiers statiques et API routes
 */
export const config = {
  matcher: [
    // Inclure toutes les routes sauf :
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.).*)"
  ]
}