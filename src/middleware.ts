import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rôles et leurs pages respectives
const rolePages = {
  ADMIN: "/admin",
  CUSTOMER: "/client",
  COURIER: "/livreur",
  MERCHANT: "/commercant",
  PROVIDER: "/prestataire",
};

// Pages qui ne nécessitent pas d'authentification
const publicPages = [
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/",
  "/faq",
  "/contact",
  "/about",
  "/terms",
  "/privacy",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vérifier si la page est publique
  if (publicPages.some(page => pathname.startsWith(page)) ||
      pathname.includes("_next") ||
      pathname.includes("api/auth") ||
      pathname.includes("favicon.ico") ||
      pathname.includes(".png") ||
      pathname.includes(".jpg") ||
      pathname.includes(".svg")) {
    return NextResponse.next();
  }

  // Vérifier le token d'authentification
  const token = await getToken({ req: request });

  // Rediriger vers la connexion si l'utilisateur n'est pas authentifié
  if (!token) {
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Récupérer le rôle de l'utilisateur
  const userRole = token.role as keyof typeof rolePages;

  // Vérifier si l'utilisateur a accès à la page
  // Par exemple, si un CUSTOMER essaie d'accéder à /livreur
  const rolePaths = Object.entries(rolePages).map(([role, path]) => path);

  if (rolePaths.some(path => pathname.startsWith(path))) {
    const userRolePath = rolePages[userRole];

    // Vérifier si l'utilisateur a accès à la page actuelle
    if (!pathname.startsWith(userRolePath)) {
      return NextResponse.redirect(new URL(userRolePath, request.url));
    }
  }

  // Continuer si tout est OK
  return NextResponse.next();
}

// Configurer les chemins auxquels ce middleware doit être appliqué
export const config = {
  matcher: [
    /*
     * Match all request paths except for les chemins mentionnés ci-dessus
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};