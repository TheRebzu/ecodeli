import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Définition des rôles utilisateur
enum UserRole {
  CLIENT = 'CLIENT',
  DELIVERER = 'DELIVERER',
  MERCHANT = 'MERCHANT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

// Groupes de routes dans l'application
const routeGroups = {
  public: [
    'about',
    'contact',
    'faq',
    'pricing',
    'services',
    'terms',
    'privacy',
    'shipping',
    'become-delivery',
  ],
  auth: [
    'login',
    'register',
    'register/client',
    'register/provider',
    'register/merchant',
    'register/deliverer',
    'forgot-password',
    'reset-password',
    'verify-email',
  ],
};

// Liste complète des chemins publics
const publicPaths = [
  'home',
  '', // route racine du locale
  ...routeGroups.public,
  ...routeGroups.auth,
];

// Créer le middleware next-intl
const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Vérifier d'abord si le chemin est ignoré pour l'internationalisation
  const pathname = request.nextUrl.pathname;

  // Ignorer les API routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/trpc/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Appliquer le middleware d'internationalisation
  const response = intlMiddleware(request);

  // Si la réponse est une redirection, la retourner directement
  if (response instanceof NextResponse && response.headers.get('Location')) {
    return response;
  }

  // Extraction de la locale et du reste du chemin
  const localeMatch = pathname.match(/^\/([^\/]+)(\/.*)?$/);
  if (!localeMatch) {
    return NextResponse.next();
  }

  const locale = localeMatch[1];
  const restOfPath = localeMatch[2] || '/';

  // Vérification pour la route home
  if (pathname.endsWith('/home') || pathname.includes('/home/')) {
    return NextResponse.next();
  }

  // Vérifier si le chemin est une route publique
  const isPublicPath = publicPaths.some(
    p => restOfPath === '/' + p || restOfPath.startsWith('/' + p + '/')
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Vérification d'authentification pour les routes protégées
  const token = await getToken({ req: request });
  if (!token) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(loginUrl);
  }

  // Vérifications des autorisations basées sur les rôles
  const role = token.role as UserRole;

  if (pathname.includes('/admin') && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  if (pathname.includes('/client') && role !== UserRole.CLIENT && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  if (pathname.includes('/deliverer') && role !== UserRole.DELIVERER && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  if (pathname.includes('/merchant') && role !== UserRole.MERCHANT && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  if (pathname.includes('/provider') && role !== UserRole.PROVIDER && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
};
