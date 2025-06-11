import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Définition des enums si non exportés par Prisma
enum UserRole {
  CLIENT = 'CLIENT',
  DELIVERER = 'DELIVERER',
  MERCHANT = 'MERCHANT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

// Locales supportées par l'application
const VALID_LOCALES = ['fr', 'en'];
const DEFAULT_LOCALE = 'fr';

// Définir les chemins publics qui ne nécessitent pas d'authentification
const publicPaths = [
  '/',
  '/about',
  '/contact',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/pricing',
  '/faq',
  '/terms',
  '/privacy',
  '/services',
  '/become-delivery',
  '/shipping',
  '/home',
  // Chemins de debug pour le développement
  '/debug',
  '/test',
];

// Chemins spéciaux pour les états utilisateur particuliers
const specialStatusPaths = {
  [UserStatus.SUSPENDED]: ['/account-suspended'],
  [UserStatus.INACTIVE]: ['/account-inactive'],
};

// Définir les chemins accessibles en fonction du rôle
const roleBasedPaths: Record<UserRole, string[]> = {
  CLIENT: ['/client'],
  DELIVERER: ['/deliverer'],
  MERCHANT: ['/merchant'],
  PROVIDER: ['/provider'],
  ADMIN: ['/admin'],
};

// Chemins autorisés même pour les utilisateurs non vérifiés
const allowedNonVerifiedPaths: Record<UserRole, string[]> = {
  DELIVERER: ['/deliverer/documents', '/api/upload', '/api/trpc/document', '/api/documents'], // Ajout des chemins API pour le téléchargement
  MERCHANT: [
    '/merchant/documents',
    '/merchant/verification',
    '/merchant/profile',
    '/api/upload',
    '/api/trpc/document',
    '/api/documents',
  ],
  PROVIDER: [
    '/provider/documents',
    '/provider/verification',
    '/provider/profile',
    '/api/upload',
    '/api/trpc/document',
    '/api/documents',
  ],
  CLIENT: [], // Les clients n'ont pas besoin de vérification
  ADMIN: [], // Les admins n'ont pas besoin de vérification
};



export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Ignorer les fichiers statiques, API routes, et les ressources Next.js
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/static') ||
      pathname.includes('.') // fichiers avec extensions
    ) {
      return NextResponse.next();
    }

    // Vérifier si le chemin est exactement /{locale}
    const isLocaleRoot = VALID_LOCALES.some(locale => pathname === `/${locale}`);

    // Si c'est la racine d'une locale, rediriger vers /{locale}/home
    if (isLocaleRoot) {
      const locale = pathname.slice(1); // Enlever le '/' initial
      return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
    }

    // Vérifier si le chemin contient une locale valide
    const pathnameHasValidLocale = VALID_LOCALES.some(
      locale => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
    );

    // Si le chemin n'a pas de locale valide et n'est pas la racine, rediriger vers la locale par défaut
    if (!pathnameHasValidLocale && pathname !== '/') {
      // Extraire le premier segment du chemin (potentiellement une locale invalide)
      const segments = pathname.split('/').filter(Boolean);
      const firstSegment = segments[0];

      // Construire le nouveau chemin avec la locale par défaut
      // Si le premier segment est une "fausse locale" (comme 'login'), le réutiliser comme partie du chemin
      const newPathname = firstSegment
        ? `/${DEFAULT_LOCALE}/${segments.join('/')}`
        : `/${DEFAULT_LOCALE}${pathname}`;

      return NextResponse.redirect(new URL(newPathname, request.url));
    }

    // A ce stade, soit pathname contient une locale valide, soit c'est '/'
    // Si c'est '/', le comportement existant de la page.tsx gérera la redirection

    // Extraire la locale du chemin ou utiliser la locale par défaut
    const locale =
      VALID_LOCALES.find(
        locale => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
      ) || DEFAULT_LOCALE;

    // Supprimer la locale du chemin pour les vérifications suivantes
    const pathWithoutLocale = pathname.replace(`/${locale}`, '').replace(/^\/\//, '/') || '/';

    // Vérifier si le chemin est public (accessible sans authentification)
    const isPublicPath = publicPaths.some(
      publicPath =>
        pathWithoutLocale === publicPath || pathWithoutLocale.startsWith(`${publicPath}/`)
    );

    // Pour les chemins publics, autoriser l'accès sans vérification
    if (isPublicPath) {
      return NextResponse.next();
    }

    // Récupérer le token pour vérifier l'authentification
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
    if (!token) {
      const redirectUrl = new URL(`/${locale}/login`, request.url);
      redirectUrl.searchParams.set('callbackUrl', encodeURI(request.url));
      return NextResponse.redirect(redirectUrl);
    }

    // Récupérer les informations du token avec des valeurs par défaut pour éviter les erreurs
    const userRole = (token.role as UserRole) || UserRole.CLIENT;
    const isVerified = !!token.isVerified;
    const userStatus = (token.status as UserStatus) || UserStatus.ACTIVE;

    console.log(
      `Middleware - User ${token.email || token.id} - Role: ${userRole}, isVerified: ${isVerified}, Status: ${userStatus}, Path: ${pathname}`
    );

    // Vérification du statut de l'utilisateur
    if (userStatus === UserStatus.SUSPENDED) {
      // Vérifier si l'utilisateur est déjà sur une page autorisée pour son statut
      const isSpecialStatusPath = specialStatusPaths[UserStatus.SUSPENDED].some(
        path => pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)
      );

      if (isSpecialStatusPath) {
        // Laisser passer la requête si l'utilisateur est déjà sur la page account-suspended
        return NextResponse.next();
      }

      // Rediriger vers une page expliquant que le compte est suspendu
      return NextResponse.redirect(new URL(`/${locale}/account-suspended`, request.url));
    }

    if (userStatus === UserStatus.INACTIVE) {
      // Vérifier si l'utilisateur est déjà sur une page autorisée pour son statut
      const isSpecialStatusPath = specialStatusPaths[UserStatus.INACTIVE].some(
        path => pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)
      );

      if (isSpecialStatusPath) {
        // Laisser passer la requête si l'utilisateur est déjà sur la page account-inactive
        return NextResponse.next();
      }

      // Rediriger vers une page expliquant que le compte est inactif
      return NextResponse.redirect(new URL(`/${locale}/account-inactive`, request.url));
    }

    // Vérifier si l'utilisateur a accès au chemin demandé en fonction de son rôle
    const hasRoleAccess = Object.entries(roleBasedPaths).some(([role, paths]) => {
      return (
        role === userRole &&
        paths.some(path => pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`))
      );
    });

    // Si l'utilisateur n'a pas accès à ce chemin, rediriger vers son dashboard
    if (!hasRoleAccess) {
      const dashboardPath = getDashboardPathForRole(userRole, locale);
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }

    // Pour les utilisateurs non vérifiés (hors clients et admins)
    if (
      userRole !== UserRole.CLIENT &&
      userRole !== UserRole.ADMIN &&
      !isVerified &&
      userStatus === UserStatus.PENDING_VERIFICATION
    ) {
      // Vérifier si le chemin actuel est autorisé pour les utilisateurs non vérifiés
      const isAllowedPath = allowedNonVerifiedPaths[userRole].some(
        path => pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)
      );

      console.log(
        `Middleware - Path Check - Role: ${userRole}, Path: ${pathWithoutLocale}, isAllowedPath: ${isAllowedPath}`
      );
      console.log(
        `Allowed Paths for ${userRole}: ${JSON.stringify(allowedNonVerifiedPaths[userRole])}`
      );

      if (!isAllowedPath) {
        // Rediriger vers la page de vérification appropriée en fonction du rôle
        let verificationPath;
        switch (userRole) {
          case UserRole.DELIVERER:
            verificationPath = `/${locale}/deliverer/documents`;
            break;
          case UserRole.MERCHANT:
            verificationPath = `/${locale}/merchant/documents`;
            break;
          case UserRole.PROVIDER:
            verificationPath = `/${locale}/provider/documents`;
            break;
          default:
            verificationPath = `/${locale}/login`;
        }

        // Ajouter un paramètre pour indiquer qu'une vérification automatique est requise
        const redirectUrl = new URL(verificationPath, request.url);
        redirectUrl.searchParams.set('verification_required', 'true');
        redirectUrl.searchParams.set('auto_check', 'true');

        console.log(`Middleware - Redirecting to verification path: ${verificationPath}`);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Temporarily disabled rate limiting until environment variables are configured
    /*
    // Si les limiteurs de taux ne sont pas configurés, passer à la suite
    if (!authLimiter || !apiLimiter) {
      return NextResponse.next();
    }

    // Récupérer l'adresse IP ou utiliser un fallback
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'anonymous';
    
    try {
      // Vérifier s'il s'agit d'une route d'authentification
      if (pathWithoutLocale.startsWith('/api/auth') || pathWithoutLocale.startsWith('/login') || pathWithoutLocale.startsWith('/register')) {
        const { success, limit, remaining, reset } = await authLimiter.limit(ip);
        
        if (!success) {
          return new NextResponse(
            JSON.stringify({
              error: 'Too many requests',
              limit,
              remaining,
              reset: reset - Date.now(),
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
              },
            }
          );
        }
      } 
      // Vérifier s'il s'agit d'une route API (mais pas d'authentification)
      else if (pathWithoutLocale.startsWith('/api/')) {
        const { success, limit, remaining, reset } = await apiLimiter.limit(ip);
        
        if (!success) {
          return new NextResponse(
            JSON.stringify({
              error: 'Too many requests',
              limit,
              remaining,
              reset: reset - Date.now(),
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
              },
            }
          );
        }
      }
    } catch (error) {
      console.error('Error in rate limiting middleware:', error);
      // En cas d'erreur, permettre la requête
    }
    */

    // Si toutes les vérifications sont passées, autoriser la requête
    return NextResponse.next();
  } catch (error) {
    console.error('Error in middleware:', error);
    // En cas d'erreur, rediriger vers la page d'accueil
    return NextResponse.redirect(new URL('/', request.url));
  }
}

// Fonction pour récupérer le chemin de tableau de bord en fonction du rôle
function getDashboardPathForRole(role: UserRole, locale: string = 'fr'): string {
  switch (role) {
    case UserRole.CLIENT:
      return `/${locale}/client`;
    case UserRole.DELIVERER:
      return `/${locale}/deliverer`;
    case UserRole.MERCHANT:
      return `/${locale}/merchant`;
    case UserRole.PROVIDER:
      return `/${locale}/provider`;
    case UserRole.ADMIN:
      return `/${locale}/admin`;
    default:
      return `/${locale}/login`;
  }
}

// Configuration du middleware pour qu'il s'exécute sur toutes les routes pertinentes
export const config = {
  matcher: [
    '/((?!api/trpc|api/documents|api/upload|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
