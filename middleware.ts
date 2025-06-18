import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Déclaration TypeScript pour le store de rate limiting global
declare global {
  var rateLimitStore: Map<string, { count: number; resetTime: number }> | undefined;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Sécurité: Headers de protection
  const response = NextResponse.next();
  
  // Protection contre les attaques XSS
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com wss: ws:;"
  );

  // Protection des routes API sensibles
  if (pathname.startsWith('/api/')) {
    // Vérifier l'authentification pour les routes protégées
    if (pathname.startsWith('/api/admin/') || 
        pathname.startsWith('/api/trpc/') ||
        pathname.startsWith('/api/webhooks/')) {
      
      // Exceptions: health check et webhooks Stripe
      if (pathname === '/api/health' || pathname.startsWith('/api/webhooks/stripe')) {
        return response;
      }

      // Vérifier le token pour les autres routes API protégées
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      });

      if (!token && !pathname.startsWith('/api/auth/')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    // Rate limiting fonctionnel avec Map en mémoire
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `${ip}:${pathname}`;
    
    // Configuration du rate limiting par type de route
    const rateLimits = {
      '/api/auth/': { limit: 10, window: 60000 }, // 10 tentatives par minute pour l'auth
      '/api/trpc/': { limit: 60, window: 60000 }, // 60 requêtes par minute pour tRPC
      '/api/admin/': { limit: 30, window: 60000 }, // 30 requêtes par minute pour admin
      default: { limit: 100, window: 60000 } // 100 requêtes par minute par défaut
    };
    
    // Déterminer la limite applicable
    let appliedLimit = rateLimits.default;
    for (const [path, limit] of Object.entries(rateLimits)) {
      if (pathname.startsWith(path)) {
        appliedLimit = limit;
        break;
      }
    }
    
    // Récupérer ou créer l'état du rate limiting
    const now = Date.now();
    const rateLimitData = globalThis.rateLimitStore?.get(rateLimitKey) || { count: 0, resetTime: now + appliedLimit.window };
    
    // Réinitialiser si la fenêtre est expirée
    if (now > rateLimitData.resetTime) {
      rateLimitData.count = 0;
      rateLimitData.resetTime = now + appliedLimit.window;
    }
    
    // Vérifier la limite
    if (rateLimitData.count >= appliedLimit.limit) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000) },
        { status: 429 }
      );
    }
    
    // Incrémenter le compteur
    rateLimitData.count++;
    
    // Sauvegarder dans le store global
    if (!globalThis.rateLimitStore) {
      globalThis.rateLimitStore = new Map();
    }
    globalThis.rateLimitStore.set(rateLimitKey, rateLimitData);
    
    // Ajouter les headers informatifs
    response.headers.set('X-RateLimit-Limit', appliedLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', (appliedLimit.limit - rateLimitData.count).toString());
    response.headers.set('X-RateLimit-Reset', rateLimitData.resetTime.toString());
  }

  // Protection des routes de l'interface utilisateur
  if (pathname.startsWith('/(protected)/')) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};