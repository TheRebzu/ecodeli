<<<<<<< Updated upstream
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
=======
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// import { auth } from "./auth";
>>>>>>> Stashed changes

export async function middleware(request: NextRequest) {
  // Récupère le chemin de la requête
  const path = request.nextUrl.pathname;
  const url = request.nextUrl.clone();

<<<<<<< Updated upstream
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
=======
  // Logique de redirection pour le tableau de bord
  if (path === '/dashboard') {
    url.pathname = '/client/dashboard';
    return NextResponse.redirect(url);
  }

  // Logique de redirection pour /auth/signin vers /login
  if (path === '/auth/signin') {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Logique de redirection pour /(auth)/login vers /login
  if (path === '/(auth)/login') {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirection pour les sections client
  const clientPaths = [
    '/announcements', 
    '/cart', 
    '/shopping', 
    '/orders', 
    '/tracking', 
    '/services', 
    '/storage', 
    '/payments', 
    '/subscription', 
    '/help',
    '/foreign-purchases',
    '/cart-drops',
    '/insurance',
    '/reviews'
  ];
  
  // Vérifie si le chemin commence par l'un des chemins client
  for (const clientPath of clientPaths) {
    if (path === clientPath || path.startsWith(`${clientPath}/`)) {
      // Redirige vers le préfixe client
      url.pathname = `/client${path}`;
      return NextResponse.redirect(url);
    }
  }

  // Redirection pour les vues livreur (courier)
  const courierPaths = [
    '/deliveries', 
    '/schedule', 
    '/earnings', 
    '/profile', 
    '/vehicle', 
    '/settings'
  ];
  
  for (const courierPath of courierPaths) {
    if ((path === courierPath || path.startsWith(`${courierPath}/`)) && !path.includes('/provider/')) {
      url.pathname = `/courier${path}`;
      return NextResponse.redirect(url);
    }
  }

  // Redirection pour les vues commerçant (merchant)
  const merchantPaths = [
    '/products', 
    '/categories', 
    '/store', 
    '/promotions', 
    '/analytics'
  ];
  
  for (const merchantPath of merchantPaths) {
    if (path === merchantPath || path.startsWith(`${merchantPath}/`)) {
      url.pathname = `/merchant${path}`;
      return NextResponse.redirect(url);
    }
  }

  // Redirection pour les vues prestataire (provider)
  const providerPaths = [
    '/services', 
    '/requests'
  ];
  
  for (const providerPath of providerPaths) {
    if (path === providerPath || path.startsWith(`${providerPath}/`)) {
      url.pathname = `/provider${path}`;
      return NextResponse.redirect(url);
    }
  }

  // Pour les chemins partagés (comme /schedule, /earnings, etc.)
  const sharedPaths = [
    '/schedule', 
    '/earnings', 
    '/profile', 
    '/settings'
  ];
  
  for (const sharedPath of sharedPaths) {
    if (path === sharedPath || path.startsWith(`${sharedPath}/`)) {
      // Si c'est un chemin partagé et qu'il ne contient pas déjà courier ou provider
      if (!path.includes('/courier/') && !path.includes('/provider/')) {
        url.pathname = `/provider${path}`;
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirection pour les vues admin
  const adminPaths = [
    '/users', 
    '/verification', 
    '/reports', 
    '/logs'
  ];
  
  for (const adminPath of adminPaths) {
    if (path === adminPath || path.startsWith(`${adminPath}/`)) {
      url.pathname = `/admin${path}`;
      return NextResponse.redirect(url);
    }
  }

>>>>>>> Stashed changes
  return NextResponse.next();
}

// Configure les routes à intercepter
export const config = {
  matcher: [
<<<<<<< Updated upstream
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
=======
    // Chemins d'authentification
    "/auth/signin",
    "/(auth)/login",
    
    // Chemin de base
    "/dashboard",
    
    // Chemins client
    "/announcements", "/announcements/:path*",
    "/cart", "/cart/:path*",
    "/shopping", "/shopping/:path*", 
    "/orders", "/orders/:path*",
    "/tracking", "/tracking/:path*",
    "/services", "/services/:path*",
    "/storage", "/storage/:path*",
    "/payments", "/payments/:path*",
    "/subscription", "/subscription/:path*",
    "/help", "/help/:path*",
    "/foreign-purchases", "/foreign-purchases/:path*",
    "/cart-drops", "/cart-drops/:path*",
    "/insurance", "/insurance/:path*",
    "/reviews", "/reviews/:path*",
    
    // Chemins livreur
    "/deliveries", "/deliveries/:path*",
    "/schedule", "/schedule/:path*",
    "/earnings", "/earnings/:path*",
    "/profile", "/profile/:path*",
    "/vehicle", "/vehicle/:path*",
    "/settings", "/settings/:path*",
    
    // Chemins commerçant
    "/products", "/products/:path*",
    "/categories", "/categories/:path*",
    "/store", "/store/:path*",
    "/promotions", "/promotions/:path*",
    "/analytics", "/analytics/:path*",
    
    // Chemins admin
    "/users", "/users/:path*",
    "/verification", "/verification/:path*",
    "/reports", "/reports/:path*",
    "/logs", "/logs/:path*",
    
    // Chemins prestataire
    "/services", "/services/:path*",
    "/requests", "/requests/:path*",
>>>>>>> Stashed changes
  ],
}; 