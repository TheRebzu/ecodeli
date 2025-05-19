import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/server/services/auth.service';

const authService = new AuthService();

/**
 * Route API pour vérifier l'email d'un utilisateur avec un token
 *
 * GET /api/auth/verify-email?token=xyz
 */
export async function GET(req: NextRequest) {
  try {
    // Récupérer le token depuis les paramètres de requête
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token manquant' }, { status: 400 });
    }

    // Vérifier le token et activer le compte
    const result = await authService.verifyEmail(token);

    // Rediriger vers la page de succès ou la page de connexion
    if (result) {
      // Redirection côté client gérée par la page verify-email
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, message: 'Échec de la vérification' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erreur de vérification email:', error);

    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
