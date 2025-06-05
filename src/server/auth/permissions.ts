import { TRPCError } from '@trpc/server';
import { db } from '../db';
import { UserRole } from '@prisma/client';

// Vérification spécifique pour les livreurs vérifiés
export const isVerifiedDeliverer = async (userId: string) => {
  const deliverer = await db.deliverer.findFirst({
    where: { userId, isVerified: true },
  });

  if (!deliverer) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Cette action nécessite un compte livreur vérifié.',
    });
  }

  return deliverer;
};

// Vérification spécifique pour les prestataires vérifiés
export const isVerifiedProvider = async (userId: string) => {
  const provider = await db.provider.findFirst({
    where: { userId, isVerified: true },
  });

  if (!provider) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Cette action nécessite un compte prestataire vérifié.',
    });
  }

  return provider;
};

// Vérification pour les actions sur les ressources possédées
export const ownsResource = async (resourceType: string, resourceId: string, userId: string) => {
  let resource: any = null;

  switch (resourceType) {
    case 'announcement':
      resource = await db.announcement.findUnique({
        where: { id: resourceId },
        select: { clientId: true, merchantId: true, delivererId: true },
      });
      break;
    case 'delivery':
      // Vérification pour livraison
      break;
    // Autres cas
  }

  if (!resource) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Ressource non trouvée',
    });
  }

  // Vérification de la propriété selon le type de ressource
  // ...

  return true;
};
