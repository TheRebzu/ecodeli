import { UserRole } from '@prisma/client';

/**
 * Vérifie si un rôle a l'autorisation d'effectuer une action spécifique
 * @param userRole - Le rôle de l'utilisateur
 * @param allowedRoles - Les rôles autorisés pour cette action
 * @returns boolean - true si le rôle est autorisé
 */
export function isRoleAllowed(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Vérifie les droits d'accès aux paiements selon le rôle utilisateur
 * @param userRole - Le rôle de l'utilisateur
 * @param userId - L'ID de l'utilisateur
 * @param resourceOwnerId - L'ID du propriétaire de la ressource
 * @returns boolean - true si l'accès est autorisé
 */
export function checkPaymentAccessRights(
  userRole: UserRole, 
  userId: string, 
  resourceOwnerId?: string
): boolean {
  // Admin a accès à tout
  if (userRole === UserRole.ADMIN) {
    return true;
  }
  
  // Pour les autres rôles, ils ne peuvent accéder qu'à leurs propres données
  return userId === resourceOwnerId;
}

/**
 * Vérifie si l'utilisateur peut créer un paiement
 * @param userRole - Le rôle de l'utilisateur
 * @returns boolean - true si la création est autorisée
 */
export function canCreatePayment(userRole: UserRole): boolean {
  const allowedRoles = [UserRole.CLIENT, UserRole.MERCHANT, UserRole.PROVIDER];
  return isRoleAllowed(userRole, allowedRoles);
}

/**
 * Vérifie si l'utilisateur peut modifier un paiement
 * @param userRole - Le rôle de l'utilisateur
 * @returns boolean - true si la modification est autorisée
 */
export function canModifyPayment(userRole: UserRole): boolean {
  const allowedRoles = [UserRole.ADMIN, UserRole.MERCHANT];
  return isRoleAllowed(userRole, allowedRoles);
}

/**
 * Vérifie si l'utilisateur a accès à un document spécifique
 * @param userRole - Le rôle de l'utilisateur
 * @param userId - L'ID de l'utilisateur
 * @param documentOwnerId - L'ID du propriétaire du document
 * @returns boolean - true si l'accès est autorisé
 */
export function hasDocumentAccess(
  userRole: UserRole, 
  userId: string, 
  documentOwnerId?: string
): boolean {
  // Admin a accès à tous les documents
  if (userRole === UserRole.ADMIN) {
    return true;
  }
  
  // Pour les autres rôles, ils ne peuvent accéder qu'à leurs propres documents
  return userId === documentOwnerId;
} 