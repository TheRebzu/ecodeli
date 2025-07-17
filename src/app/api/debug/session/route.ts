import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Récupérer la session
    const session = await auth();
    
    // Récupérer les cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = cookieHeader.split(';').map(cookie => {
      const [name, ...rest] = cookie.split('=');
      return {
        name: name?.trim(),
        value: rest.join('=').trim(),
        // Ne pas exposer la valeur complète pour les cookies sensibles
        isSensitive: name?.trim().includes('session') || name?.trim().includes('token')
      };
    });
    
    // Filtrer les cookies sensibles
    const safeCookies = cookies.map(cookie => {
      if (cookie.isSensitive) {
        return {
          name: cookie.name,
          exists: !!cookie.value,
          length: cookie.value.length,
          preview: cookie.value.substring(0, 5) + '...'
        };
      }
      return {
        name: cookie.name,
        value: cookie.value
      };
    });
    
    // Retourner les informations de session et cookies
    return NextResponse.json({
      sessionExists: !!session,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        isActive: session.user.isActive,
        validationStatus: session.user.validationStatus
      } : null,
      cookies: {
        count: cookies.length,
        list: safeCookies
      },
      headers: {
        userAgent: request.headers.get('user-agent'),
        accept: request.headers.get('accept'),
        acceptLanguage: request.headers.get('accept-language')
      }
    });
  } catch (error) {
    console.error('❌ [DEBUG] Erreur lors de la vérification de la session:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de la session' },
      { status: 500 }
    );
  }
} 