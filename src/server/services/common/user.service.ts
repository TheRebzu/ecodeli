import { db } from '../../db';
// import { UserBanAction } from '@/types/users/verification';

// Type local pour UserBanAction
type UserBanAction = 'BAN' | 'UNBAN' | 'SUSPEND' | 'ACTIVATE';

/**
 * Service pour la gestion des utilisateurs, incluant le bannissement
 */
export const userService = {
  /**
   * Change l'état d'activation d'un compte utilisateur
   * @param userId - ID de l'utilisateur à modifier
   * @param isActive - Nouvel état (true = actif, false = inactif)
   * @returns L'utilisateur mis à jour
   */
  async toggleUserActivation(userId: string, isActive: boolean) {
    return db.user.update({
      where: { id: userId },
      data: {
        status: isActive ? 'ACTIVE' : 'INACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        role: true,
      },
    });
  },

  /**
   * Récupère un utilisateur par son ID
   * @param userId - ID de l'utilisateur à récupérer
   */
  async getUserById(userId: string) {
    return db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        image: true,
      },
    });
  },

  /**
   * Bannit ou débannit un utilisateur
   * @param userId - ID de l'utilisateur à bannir/débannir
   * @param action - BAN ou UNBAN
   * @param reason - Raison du bannissement (obligatoire pour BAN)
   * @param adminId - ID de l'admin qui effectue l'action
   */
  async banOrUnbanUser(
    userId: string,
    action: UserBanAction,
    reason: string | undefined,
    adminId: string
  ) {
    if (action === UserBanAction.BAN) {
      return db.user.update({
        where: { id: userId },
        data: {
          status: 'SUSPENDED',
          notes: reason
            ? `BANNI par ${adminId} le ${new Date().toISOString()}: ${reason}`
            : 'BANNI: Raison non spécifiée',
        },
      });
    } else {
      return db.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE',
          notes: null,
        },
      });
    }
  },
};
