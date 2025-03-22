import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Gestion CORS pour les requêtes d'API
  if (pathname.startsWith("/api")) {
    // Permet l'accès depuis n'importe quelle origine en mode développement
    const origin = request.headers.get("origin") || "*";
    
    // Gestion des requêtes preflight OPTIONS
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    
    // Nous laissons passer les requêtes API et ajoutons les headers CORS
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    return response;
  }
  
  // Récupération du token d'authentification
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  const isAuthenticated = !!token;
  const userRole = token?.role as string | undefined;
  
  // Routes publiques accessibles à tous
  const publicRoutes = ["/", "/login", "/register", "/about", "/contact", "/services"];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith("/shop"));
  
  // Routes du dashboard et leurs rôles autorisés
  const roleBasedRoutes = [
    { path: "/dashboard/client", roles: ["CLIENT"] },
    { path: "/dashboard/merchant", roles: ["MERCHANT"] },
    { path: "/dashboard/courier", roles: ["COURIER"] },
    { path: "/dashboard/provider", roles: ["PROVIDER"] },
    { path: "/dashboard/admin", roles: ["ADMIN"] },
  ];
  
  // Vérifier si l'utilisateur accède à une route protégée par rôle
  const matchedRoleRoute = roleBasedRoutes.find(route => pathname.startsWith(route.path));
  const hasRoleAccess = matchedRoleRoute ? matchedRoleRoute.roles.includes(userRole || "") : true;
  
  // Redirection basée sur l'authentification et les rôles
  if (pathname.startsWith("/dashboard")) {
    // Rediriger vers login si non authentifié
    if (!isAuthenticated) {
      const url = new URL(`/login`, request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    
    // Si l'utilisateur est sur la route générique du dashboard, 
    // rediriger vers son dashboard spécifique selon son rôle
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      if (userRole) {
        const dashboardRedirect = {
          "CLIENT": "/dashboard/client",
          "MERCHANT": "/dashboard/merchant",
          "COURIER": "/dashboard/courier",
          "PROVIDER": "/dashboard/provider",
          "ADMIN": "/dashboard/admin",
        }[userRole];
        
        if (dashboardRedirect) {
          return NextResponse.redirect(new URL(dashboardRedirect, request.url));
        }
      }
    }
    
    // Si l'utilisateur n'a pas accès à la route basée sur son rôle
    if (matchedRoleRoute && !hasRoleAccess) {
      // Rediriger vers son propre dashboard
      if (userRole) {
        const dashboardRedirect = {
          "CLIENT": "/dashboard/client",
          "MERCHANT": "/dashboard/merchant",
          "COURIER": "/dashboard/courier",
          "PROVIDER": "/dashboard/provider",
          "ADMIN": "/dashboard/admin",
        }[userRole];
        
        if (dashboardRedirect) {
          return NextResponse.redirect(new URL(dashboardRedirect, request.url));
        }
      }
      
      // Si pas de rôle spécifique, rediriger vers la page d'accueil
      return NextResponse.redirect(new URL("/", request.url));
    }
  } else if (isPublicRoute && isAuthenticated) {
    // Si l'utilisateur est déjà authentifié sur une route publique,
    // rediriger vers son dashboard (sauf shop qui reste accessible)
    if (pathname === "/login" || pathname === "/register") {
      if (userRole) {
        const dashboardRedirect = {
          "CLIENT": "/dashboard/client",
          "MERCHANT": "/dashboard/merchant",
          "COURIER": "/dashboard/courier",
          "PROVIDER": "/dashboard/provider",
          "ADMIN": "/dashboard/admin",
        }[userRole];
        
        if (dashboardRedirect) {
          return NextResponse.redirect(new URL(dashboardRedirect, request.url));
        }
      }
      
      // Redirection par défaut
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }
  
  return NextResponse.next();
}

// Spécifier les routes sur lesquelles le middleware doit s'exécuter
export const config = {
  matcher: [
    // Routes publiques
    "/",
    "/login",
    "/register",
    "/about",
    "/contact",
    "/services",
    "/shop/:path*", 
    
    // Routes du dashboard
    "/dashboard/:path*",
    
    // Routes d'API
    "/api/:path*",
  ],
}; 