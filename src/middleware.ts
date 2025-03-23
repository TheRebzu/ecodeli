import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Types d'utilisateurs supportés
export type UserRole = "ADMIN" | "CLIENT" | "COURIER" | "MERCHANT" | "PROVIDER";

// Définir les routes publiques qui ne nécessitent pas d'authentification
const publicRoutes = [
  "/",
  "/home",
  "/auth/login",
  "/auth/register",
  "/login",
  "/register",
  "/about",
  "/services",
  "/pricing",
  "/contact",
  "/legal/terms",
  "/legal/privacy",
  "/api/webhook",
  "/api/auth"
];

// Routes statiques (images, etc.)
const staticRoutes = [
  "/_next",
  "/favicon.ico",
  "/images",
  "/fonts"
];

// Routes dashboard spécifiques par rôle
const dashboardRoutes: Record<UserRole, string> = {
  ADMIN: "/admin",
  CLIENT: "/dashboard/client",
  COURIER: "/dashboard/courier",
  MERCHANT: "/dashboard/merchant",
  PROVIDER: "/dashboard/provider"
};

// Mappings des routes protégées par rôle
const protectedRoutes: Record<UserRole, string[]> = {
  ADMIN: ["/admin"],
  CLIENT: ["/dashboard/client"],
  COURIER: ["/dashboard/courier"],
  MERCHANT: ["/dashboard/merchant"],
  PROVIDER: ["/dashboard/provider"]
};

// Vérification des routes statiques
function isStaticRoute(pathname: string): boolean {
  return staticRoutes.some(route => pathname.startsWith(route));
}

// Vérification des routes publiques
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

// Vérification si l'utilisateur a accès à une route protégée
function canAccessRoute(pathname: string, userRole?: string): boolean {
  if (!userRole) return false;
  
  const role = userRole as UserRole;
  
  // Les admins ont accès à toutes les routes protégées
  if (role === "ADMIN") return true;
  
  // Vérifier si la route appartient aux routes accessibles pour ce rôle
  return protectedRoutes[role]?.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  ) || false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Autoriser les routes statiques sans vérification d'auth
  if (isStaticRoute(pathname)) {
    return NextResponse.next();
  }
  
  // Autoriser les routes d'API pour CORS
  if (pathname.startsWith('/api/')) {
    // Gérer la requête CORS preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return handleCorsPreflightRequest();
    }
    
    // Pour les autres requêtes API, continuer tout en ajoutant les headers CORS
    const response = NextResponse.next();
    addCorsHeaders(response);
    return response;
  }

  // Récupérer la session utilisateur
  const token = await getToken({ req: request });
  const userRole = token?.role as UserRole | undefined;
  const isAuthenticated = !!token;

  // ---- 1. Gestion des routes publiques ----
  if (isPublicRoute(pathname)) {
    // Si l'utilisateur est déjà authentifié et essaye d'accéder à login/register, rediriger vers son dashboard
    if (isAuthenticated && (
      pathname.startsWith('/auth/login') || 
      pathname.startsWith('/auth/register') ||
      pathname.startsWith('/login') || 
      pathname.startsWith('/register')
    )) {
      const redirectUrl = new URL(dashboardRoutes[userRole as UserRole] || '/', request.url);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Sinon pour les autres routes publiques, autoriser l'accès
    return NextResponse.next();
  }

  // ---- 2. Gestion des routes protégées ----
  
  // Si l'utilisateur n'est pas authentifié sur une route protégée
  if (!isAuthenticated) {
    // Rediriger vers la page de login pour les routes protégées
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(redirectUrl);
  }
  
  // Vérifier les autorisations pour les routes protégées
  if (!canAccessRoute(pathname, userRole)) {
    // Rediriger vers le dashboard approprié à leur rôle
    const redirectUrl = new URL(dashboardRoutes[userRole as UserRole] || '/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Si tout est en ordre, autoriser l'accès
  return NextResponse.next();
}

// Gérer les requêtes CORS preflight
function handleCorsPreflightRequest() {
  const response = new NextResponse(null, { status: 204 });
  addCorsHeaders(response);
  return response;
}

// Ajouter des headers CORS à la réponse
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// Configuration du middleware pour toutes les routes sauf les assets statiques
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 