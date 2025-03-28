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
  "/api/auth",
  "/auth/forgot-password",
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
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Check if the path is a public route or static asset
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );
  const isStaticAsset = pathname.startsWith("/_next") || 
    pathname.startsWith("/favicon.ico") || 
    pathname.includes(".");
  
  // Allow access to public routes and static assets
  if (isPublicRoute || isStaticAsset) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!token) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("callbackUrl", encodeURI(pathname));
    return NextResponse.redirect(url);
  }

  // Role-based route protection
  const userRole = token.role as string;
  
  // Check if user is trying to access a role-specific route
  const roleRoutes = {
    client: "/client",
    livreur: "/livreur",
    commercant: "/commercant",
    prestataire: "/prestataire",
    admin: "/admin",
  };

  // Check for role-specific route access
  for (const [role, route] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route) && userRole?.toLowerCase() !== role) {
      // If user tries to access a route they don't have permission for,
      // redirect to their dashboard
      const dashboardUrl = roleRoutes[userRole?.toLowerCase() as keyof typeof roleRoutes] || "/dashboard";
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
  }

  // Allow access if authenticated and authorized
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}; 