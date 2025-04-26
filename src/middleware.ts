import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

// Définition des rôles utilisateur
enum UserRole {
  CLIENT = 'CLIENT',
  DELIVERER = 'DELIVERER',
  MERCHANT = 'MERCHANT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN'
}

/**
 * Middleware pour protéger les routes de l'application
 * Vérifie l'authentification et les autorisations d'accès aux routes protégées
 */
export async function middleware(request: NextRequest) {
  // On récupère le token d'authentification
  const token = await getToken({ req: request });
  
  // Chemin de la requête
  const path = request.nextUrl.pathname;
  
  // Accès public (routes publiques)
  const publicPaths = [
    '/login',
    '/register',
    '/fr/register',
    '/en/register',
    '/register/client',
    '/register/provider',
    '/register/merchant',
    '/register/deliverer',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/about',
    '/contact',
    '/pricing',
    '/services',
    '/terms',
    '/privacy',
    '/faq',
    '/shipping',
    '/become-delivery',
    '/',
    '/home',
    '/api/auth',
    '/api/trpc',
  ];
  
  // Vérification des routes publiques
  for (const publicPath of publicPaths) {
    if (path.startsWith(publicPath) || path.match(/^\/(fr|en)\/[^/]*(\/.*)?$/)) {
      return NextResponse.next();
    }
  }
  
  // Si l'utilisateur n'est pas authentifié, redirection vers la page de connexion
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(loginUrl);
  }
  
  // Ici l'utilisateur est authentifié, reste à vérifier les autorisations selon les rôles
  
  // Extraire les chemins pour vérifier les autorisations
  const role = token.role as UserRole;
  
  // Vérifier les autorisations
  if (path.includes('/admin') && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  if (path.includes('/client') && role !== UserRole.CLIENT && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  if (path.includes('/deliverer') && role !== UserRole.DELIVERER && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  if (path.includes('/merchant') && role !== UserRole.MERCHANT && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  if (path.includes('/provider') && role !== UserRole.PROVIDER && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Si tout est en ordre, on laisse passer la requête
  return NextResponse.next();
}

// Configuration : spécifier les chemins auxquels le middleware s'applique
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/webhooks routes (pour les webhooks Stripe, etc.)
     * 2. /_next (fichiers statiques/assets de Next.js)
     * 3. /fonts, /icons, /images (dossiers publics)
     * 4. /favicon.ico, /robots.txt, /sitemap.xml (fichiers publics)
     */
    '/((?!api/webhooks|_next|fonts|icons|images|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};