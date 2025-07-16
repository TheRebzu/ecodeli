import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { auth } from '@/lib/auth'
import { UserRole } from '@/types/entities'

const intlMiddleware = createIntlMiddleware({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
});

// Configuration des routes par rôle
const ROLE_ROUTES = {
  ADMIN: "/admin",
  CLIENT: "/client", 
  DELIVERER: "/deliverer",
  MERCHANT: "/merchant",
  PROVIDER: "/provider",
} as const;

// Fonction pour obtenir la route par défaut selon le rôle
function getDefaultRouteForRole(role: UserRole, locale: string = 'fr'): string {
  const basePath = ROLE_ROUTES[role] || '/home';
  return `/${locale}${basePath}`;
}

// Fonction pour vérifier les permissions par rôle
function hasRequiredRole(userRole: string, pathname: string): boolean {
  const rolePermissions = {
    ADMIN: [
      "/admin",
      "/client", 
      "/deliverer",
      "/merchant",
      "/provider",
    ],
    CLIENT: ["/client"],
    DELIVERER: ["/deliverer"],
    MERCHANT: ["/merchant"],
    PROVIDER: ["/provider"],
  };
  const userAllowedPaths = rolePermissions[userRole as UserRole] || [];
  const pathAfterLocale = pathname.replace(/^\/[a-z]{2}/, "");
  return userAllowedPaths.some((path) => pathAfterLocale.startsWith(path));
}

// Fonction pour vérifier si l'utilisateur est actif selon son rôle
function isUserActive(userRole: string, isActive: boolean): boolean {
  const requiresActiveStatus = ["DELIVERER", "PROVIDER"];
  
  if (requiresActiveStatus.includes(userRole)) {
    return isActive;
  }
  
  return true; // Les autres rôles n'ont pas besoin de validation active
}



// Fonction pour détecter si une route est protégée
function isProtectedRoute(pathname: string): boolean {
  const protectedPatterns = [
    /^\/[a-z]{2}\/client(\/|$)/,
    /^\/[a-z]{2}\/admin(\/|$)/,
    /^\/[a-z]{2}\/deliverer(\/|$)/,
    /^\/[a-z]{2}\/merchant(\/|$)/,
    /^\/[a-z]{2}\/provider(\/|$)/,
  ];
  return protectedPatterns.some((regex) => regex.test(pathname));
}

// Fonction pour détecter si l'utilisateur connecté devrait être redirigé vers son espace
function shouldRedirectToUserSpace(pathname: string, userRole: UserRole): boolean {
  const pathAfterLocale = pathname.replace(/^\/[a-z]{2}/, "");
  
  // Routes où les utilisateurs connectés devraient être redirigés vers leur espace
  const redirectRoutes = [
    "", // racine après locale (ex: /fr)
    "/",
    "/home",
    "/login", // si déjà connecté, ne pas rester sur login
    "/register", // si déjà connecté, ne pas rester sur register
  ];
  
  return redirectRoutes.includes(pathAfterLocale);
}

// Routes publiques (autorisées sans connexion)
const PUBLIC_ROUTES = [
  "/about",
  "/contact", 
  "/services",
  "/partners",
  "/pricing",
  "/legal",
  "/legal/cgu",
  "/legal/cgv",
  "/privacy",
  "/faq",
  "/developers",
  "/developers/api-docs",
  "/developers/api-keys", 
  "/developers/api-manual",
  "/blog",
  "/terms",
  "/shipping",
  "/become-delivery",
  "/partners/merchants",
  "/partners/providers",
  "/login",
  "/register",
  "/register/client",
  "/register/deliverer", 
  "/register/merchant",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/validate-user",
  "/403",
  "/unauthorized",
  "/payment-success",
  "/home", // Nouvelle page d'accueil
];

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Rewrite legacy uploads URLs to API routes
  if (pathname.startsWith("/uploads/documents/")) {
    const filename = pathname.replace("/uploads/documents/", "");
    const newUrl = new URL(`/api/uploads/documents/${filename}`, request.url);
    return NextResponse.rewrite(newUrl);
  }

  // Skip middleware pour API routes et fichiers statiques
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap")
  ) {
    return NextResponse.next();
  }

  // Éviter les doublons de locale AVANT l'internationalisation
  const localePattern = /^\/(fr|en)\/(fr|en)\//;
  if (localePattern.test(pathname)) {
    const correctedPath = pathname.replace(localePattern, "/$1/");
    return NextResponse.redirect(new URL(correctedPath, request.url));
  }

  // Redirection de la racine vers /home
  if (pathname === "/" || pathname === "") {
    return NextResponse.redirect(new URL("/fr/home", request.url));
  }

  // Gérer l'internationalisation
  const intlResponse = intlMiddleware(request);
  
  // Si redirection i18n nécessaire, l'appliquer
  if (intlResponse?.status === 307 || intlResponse?.status === 302) {
    return intlResponse;
  }

  // Extraire la locale et la route sans locale
  const locale = pathname.split("/")[1] || "fr";
  const pathAfterLocale = pathname.replace(/^\/[a-z]{2}/, "") || "/";
  
  // Vérifier si c'est une route publique
  const isPublicRoute = PUBLIC_ROUTES.includes(pathAfterLocale);
  
  try {
    // Récupérer la session avec NextAuth v5
    const session = await auth();
    const isLoggedIn = !!(session?.user?.id && session?.user?.role);
    
    // LOGIQUE PRINCIPALE DE REDIRECTION
    
    // 1. Utilisateur NON connecté
    if (!isLoggedIn) {
      if (isProtectedRoute(pathname)) {
        // Tentative d'accès à une route protégée -> redirection vers login
        return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
      }
      
      // Route publique -> autoriser l'accès
      return NextResponse.next();
    }

    // 2. Utilisateur CONNECTÉ
    const user = {
      id: session.user.id,
      role: session.user.role as UserRole,
      isActive: session.user.isActive,
      validationStatus: session.user.validationStatus,
    };

    // DEBUG: Log complet de la session pour le débogage
    console.log('🔍 [MIDDLEWARE DEBUG] Session utilisateur:', {
      sessionExists: !!session,
      sessionUser: session.user,
      extractedUser: user,
      pathname: pathname
    });

    // Vérifier si l'utilisateur devrait être redirigé vers son espace
    if (shouldRedirectToUserSpace(pathname, user.role)) {
      const defaultRoute = getDefaultRouteForRole(user.role, locale);
      return NextResponse.redirect(new URL(defaultRoute, request.url));
    }

    // Route protégée -> vérifier les permissions
    if (isProtectedRoute(pathname)) {
      // Vérifier si l'utilisateur a le rôle requis pour cette route
      if (!hasRequiredRole(user.role, pathname)) {
        const defaultRoute = getDefaultRouteForRole(user.role, locale);
        return NextResponse.redirect(new URL(defaultRoute, request.url));
      }

      // Vérifier si le compte est actif selon le rôle
      if (!isUserActive(user.role, user.isActive)) {
        return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url));
      }

      // Vérifications spécifiques par rôle
      if (user.role === 'DELIVERER') {
        // Utiliser le validationStatus du profil deliverer si disponible
        const delivererValidationStatus = session.user.profileData?.validationStatus || user.validationStatus;
        
        // DEBUG: Logs pour identifier le problème de redirection
        console.log('🔍 [MIDDLEWARE DEBUG] Livreur validation check:', {
          userId: user.id,
          userValidationStatus: user.validationStatus,
          delivererValidationStatus: delivererValidationStatus,
          isActive: user.isActive,
          pathname: pathname,
          shouldRedirect: delivererValidationStatus !== 'APPROVED' && delivererValidationStatus !== 'VALIDATED'
        });
        
        // Vérifier le statut de validation pour les livreurs (utiliser le profil deliverer)
        if (delivererValidationStatus !== 'APPROVED' && delivererValidationStatus !== 'VALIDATED') {
          console.log('❌ [MIDDLEWARE] Statut validation deliverer non approuvé:', delivererValidationStatus);
          
          // Permettre l'accès aux pages de validation et documents
          if (pathname.includes('/deliverer/validation') || 
              pathname.includes('/deliverer/documents') || 
              pathname.includes('/deliverer/recruitment')) {
            console.log('✅ [MIDDLEWARE] Accès autorisé à la page de validation/recruitment');
            return NextResponse.next();
          }
          
          // Rediriger vers la page de recrutement avec sync check
          const redirectUrl = new URL(`/${locale}/deliverer/recruitment`, request.url);
          redirectUrl.searchParams.set('sync-validation', 'true');
          return NextResponse.redirect(redirectUrl);
        } else {
          console.log('✅ [MIDDLEWARE] Livreur validé - accès autorisé, delivererValidationStatus:', delivererValidationStatus);
        }
      }
      
      if (user.role === 'PROVIDER') {
        // Utiliser le validationStatus du profil provider si disponible
        const providerValidationStatus = session.user.profileData?.validationStatus || user.validationStatus;
        
        if (providerValidationStatus !== 'APPROVED' && providerValidationStatus !== 'VALIDATED') {
          // Permettre l'accès aux pages de validation pour les prestataires
          if (pathname.includes('/provider/validation') || 
              pathname.includes('/provider/documents') || 
              pathname.includes('/provider/recruitment')) {
            return NextResponse.next();
          }
          
          // Rediriger vers la page de recrutement prestataire
          return NextResponse.redirect(new URL(`/${locale}/provider/recruitment`, request.url));
        }
      }

      return NextResponse.next();
    }

    // Route publique avec utilisateur connecté -> autoriser l'accès
    return NextResponse.next();

  } catch (error) {
    // En cas d'erreur, rediriger vers login (pas home pour éviter les boucles)
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }
}

export const config = {
  matcher: [
    // Match all routes except API, _next, and static files
    "/((?!api|_next|.*\\..*).*)",
  ],
};
