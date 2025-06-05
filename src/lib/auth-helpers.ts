/**
 * Fonctions helpers pour la vérification des droits d'accès et des rôles
 */

import { UserRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';

/**
 * Vérifie si un rôle spécifique est autorisé pour une action donnée
 * @param userRole Le rôle de l'utilisateur actuel
 * @param allowedRoles Liste des rôles autorisés
 * @returns Vrai si le rôle est autorisé, faux sinon
 */
export function isRoleAllowed(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  // L'administrateur a toujours accès à tout
  if (userRole === 'ADMIN') return true;

  // Pour les autres rôles, vérifier s'ils sont dans la liste des rôles autorisés
  return allowedRoles.includes(userRole);
}

/**
 * Vérifie si l'utilisateur a le droit d'accéder à un paiement
 * @param db Instance de la base de données Prisma
 * @param payment L'objet paiement à vérifier
 * @param userId L'ID de l'utilisateur qui tente d'accéder au paiement
 * @param userRole Le rôle de l'utilisateur
 * @returns Une promesse résolue si l'accès est autorisé, sinon lève une erreur TRPCError
 */
export async function checkPaymentAccessRights(
  db: any,
  payment: any,
  userId: string,
  userRole: string
): Promise<void> {
  // L'administrateur a toujours accès
  if (userRole === 'ADMIN') return;

  // Le propriétaire du paiement a toujours accès
  if (payment.userId === userId) return;

  // Pour les paiements de livraison, le livreur associé a également accès
  if (payment.deliveryId) {
    const delivery = await db.delivery.findUnique({
      where: { id: payment.deliveryId },
      select: { delivererId: true },
    });

    if (delivery && delivery.delivererId === userId) return;
  }

  // Pour les paiements de service, le prestataire associé a également accès
  if (payment.serviceId) {
    const service = await db.service.findUnique({
      where: { id: payment.serviceId },
      select: { providerId: true },
    });

    if (service && service.providerId === userId) return;
  }

  // Pour les marchands, vérifier si le paiement est associé à leur boutique
  if (userRole === 'MERCHANT' && payment.merchantId === userId) return;

  // Pour les modérateurs, donner accès aux paiements de leur zone
  if (userRole === 'MODERATOR') {
    const moderatorZones = await db.moderatorZone.findMany({
      where: { moderatorId: userId },
      select: { zoneId: true },
    });

    const zoneIds = moderatorZones.map((mz: any) => mz.zoneId);

    // Vérifier si le paiement est lié à une ressource dans une zone dont l'utilisateur est modérateur
    if (payment.deliveryId) {
      const delivery = await db.delivery.findUnique({
        where: { id: payment.deliveryId },
        select: { zoneId: true },
      });

      if (delivery && zoneIds.includes(delivery.zoneId)) return;
    }
  }

  // Si aucune condition n'est remplie, l'accès est refusé
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: "Vous n'êtes pas autorisé à accéder à ce paiement",
  });
}

/**
 * Vérifie si un utilisateur a accès à un document particulier
 * @param document Le document à vérifier
 * @param userId L'ID de l'utilisateur qui tente d'accéder au document
 * @param userRole Le rôle de l'utilisateur
 * @returns Vrai si l'accès est autorisé, faux sinon
 */
export function hasDocumentAccess(document: any, userId: string, userRole: string): boolean {
  // L'administrateur a toujours accès
  if (userRole === 'ADMIN') return true;

  // Le propriétaire du document a toujours accès
  if (document.userId === userId) return true;

  // Pour les documents publics, tout le monde a accès
  if (document.isPublic) return true;

  // Pour les documents partagés, vérifier si l'utilisateur est dans la liste des utilisateurs partagés
  if (document.sharedWith && Array.isArray(document.sharedWith)) {
    if (document.sharedWith.includes(userId)) return true;
  }

  // Par défaut, refuser l'accès
  return false;
}
