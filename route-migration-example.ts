
// Exemple d'utilisation des services partagés dans une route spécifique

import { NextRequest } from 'next/server';
import { withRoles } from '@/lib/auth/middleware';
import { ApiResponse } from '@/lib/utils/api-response';

// Import du service partagé
import { ProfileService } from '@/lib/services/profile';
import { PaymentService } from '@/lib/services/payment';

async function handler(req: NextRequest) {
  const user = req.auth.user;
  
  // Utiliser le service partagé avec le contexte du rôle
  const profile = await ProfileService.getProfile(user.id, user.role);
  
  return ApiResponse.success(profile);
}

// Restreindre l'accès aux rôles spécifiques
export const GET = withRoles('CLIENT', 'DELIVERER')(handler);
