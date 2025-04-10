import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { UserRole } from "./lib/auth-utils";

export interface AuthJWT {
  name: string;
  email: string;
  sub: string;
  id: string;
  role: UserRole;
  iat: number;
  exp: number;
  jti: string;
}

export async function middleware(request: NextRequest) {
  // Récupère le chemin de la requête
  const path = request.nextUrl.pathname;
  const url = request.nextUrl.clone();

  // Vérifier l'authentification via le cookie de session
  const authCookie = request.cookies.get("next-auth.session-token") || 
                    request.cookies.get("__Secure-next-auth.session-token");
  const isAuthenticated = !!authCookie;

  // Vérifier si on est dans une boucle de redirection d'authentification
  const fromAuth = request.nextUrl.searchParams.has('fromAuth');
  const isLoginPage = path === '/login';
  
  // Si nous sommes sur la page de login avec le paramètre fromAuth, c'est que nous venons d'être redirigés.
  // Dans ce cas, on doit laisser passer pour éviter une boucle de redirection
  if (isLoginPage && fromAuth) {
    console.log('[middleware] Détection tentative de boucle de redirection, laissant passer...');
    return NextResponse.next();
  }

  // Essayer de récupérer le rôle de l'utilisateur à partir du cookie, si disponible
  let userRole: UserRole | undefined;

  if (authCookie?.value) {
    try {
      // Décodage simple du JWT (sans vérification de signature)
      // Nous n'utilisons cela que pour la navigation, pas pour l'autorisation sécurisée
      // L'autorisation réelle se fait du côté serveur
      const token = authCookie.value;
      
      if (token.startsWith('{"')) {
        // Si notre token est en format JSON brut
        const payload = JSON.parse(token);
        userRole = payload.role;
      } else if (token.includes('.')) {
        // C'est un JWT standard
        const [, base64Payload] = token.split('.');
        // Ajout de padding si nécessaire
        const normalized = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
        const paddedBase64 = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=');
        
        try {
          const payload = JSON.parse(Buffer.from(paddedBase64, 'base64').toString());
          userRole = payload.role;
        } catch (e) {
          console.error('Erreur décodage JWT payload', e);
        }
      }
    } catch (e) {
      // Si nous ne pouvons pas décoder le token, nous continuons sans le rôle
      console.error('Erreur décodage token', e);
    }
  }

  // Routes qui nécessitent une authentification
  const protectedRoutes = [
    '/dashboard',
    '/profile',
    '/settings',
    '/client/',
    '/courier/',
    '/merchant/',
    '/provider/',
    '/admin/'
  ];
  
  // Routes protégées par rôle
  const roleProtectedRoutes = {
    [UserRole.ADMIN]: ['/admin'],
    [UserRole.CLIENT]: ['/client'],
    [UserRole.COURIER]: ['/courier'],
    [UserRole.MERCHANT]: ['/merchant'],
    [UserRole.PROVIDER]: ['/provider'],
  };
  
  // Vérifie si la route actuelle nécessite une authentification
  const requiresAuth = protectedRoutes.some(route => path.startsWith(route));
  
  // Ajouter des logs pour comprendre les redirections
  console.log(`[middleware] Path: ${path}, Auth: ${isAuthenticated}, Role: ${userRole || 'none'}`);
  
  // Liste des routes à ne pas rediriger automatiquement (gérées par les composants client)
  const clientHandledRoutes = ['/client/dashboard'];
  const shouldSkipRedirect = clientHandledRoutes.some(route => path === route);
  
  // Rediriger vers la page de connexion si l'utilisateur n'est pas authentifié
  if (requiresAuth && !isAuthenticated && !shouldSkipRedirect) {
    // Vérifier si cette URL a déjà été redirigée pour éviter les boucles
    // Ajouter une limite basée sur le header de redirection de NextJS
    const redirectsCount = parseInt(request.headers.get('Next-Redirect-Count') || '0');
    
    if (redirectsCount > 5) {
      console.log(`[middleware] Trop de redirections (${redirectsCount}), arrêt de la boucle pour ${path}`);
      return NextResponse.next();
    }
    
    url.pathname = '/login';
    url.search = `?callbackUrl=${encodeURIComponent(request.url)}&fromAuth=1`;
    console.log(`[middleware] Redirection vers login avec fromAuth: ${url.toString()}`);
    return NextResponse.redirect(url);
  }
  
  // Si l'utilisateur est authentifié et tente d'accéder à /login, le rediriger vers son dashboard
  if (isAuthenticated && path === '/login') {
    console.log(`[middleware] Utilisateur authentifié tente d'accéder à /login, redirection vers dashboard`);
    
    // Déterminer le dashboard approprié en fonction du rôle
    if (userRole) {
      const dashboardPath = `/${userRole.toLowerCase()}/dashboard`;
      console.log(`[middleware] Rôle détecté: ${userRole}, redirection vers ${dashboardPath}`);
      url.pathname = dashboardPath;
      return NextResponse.redirect(url);
    }
    
    // Si pas de rôle détecté, rediriger vers le dashboard générique
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  
  // Vérifier les restrictions d'accès par rôle
  if (isAuthenticated && userRole) {
    // Vérifier si l'utilisateur tente d'accéder à une route qui nécessite un rôle spécifique
    for (const [role, routes] of Object.entries(roleProtectedRoutes)) {
      for (const route of routes) {
        if (path.startsWith(route) && userRole !== role) {
          // L'utilisateur a un rôle différent, le rediriger vers le tableau de bord de son rôle
          const dashboardPath = roleProtectedRoutes[userRole as UserRole]?.[0];
          if (dashboardPath) {
            url.pathname = `${dashboardPath}/dashboard`;
            return NextResponse.redirect(url);
          }
          
          // Fallback pour les rôles non gérés
          url.pathname = '/dashboard';
          return NextResponse.redirect(url);
        }
      }
    }
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
    '/vehicle', 
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

  // Pour les chemins partagés (comme /profile, /settings)
  const sharedPaths = [
    '/profile', 
    '/settings'
  ];
  
  // Les chemins profile et settings peuvent être accédés directement s'ils sont authentifiés
  if (isAuthenticated && sharedPaths.some(p => path === p || path.startsWith(`${p}/`))) {
    // Laisser passer ces requêtes directement si l'utilisateur est authentifié
    return NextResponse.next();
  }

  // Pour les chemins partagés entre courier et provider (comme /schedule, /earnings)
  const courierProviderSharedPaths = [
    '/schedule', 
    '/earnings'
  ];
  
  // Si le chemin est partagé entre courier et provider et que l'utilisateur
  // est authentifié avec un rôle COURIER ou PROVIDER, laisser passer
  if (isAuthenticated && 
      (userRole === UserRole.COURIER || userRole === UserRole.PROVIDER) && 
      courierProviderSharedPaths.some(p => path === p || path.startsWith(`${p}/`))) {
    // Laisser passer ces requêtes directement
    return NextResponse.next();
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

  return NextResponse.next();
}

// Configurer les routes qui doivent être traitées par le middleware
export const config = {
  matcher: [
    // Exclure les routes Next.js internes, des API, des ressources statiques
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 