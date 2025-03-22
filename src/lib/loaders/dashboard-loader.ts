import { cache } from 'react';
import { getUserDashboardData, getCurrentUser } from '@/lib/actions/user-actions';
import { Role } from '@prisma/client';
import { getSession } from '../session-helper';

/**
 * Loader pour les données de base du tableau de bord
 * Utilise le pattern de React cache pour optimiser les chargements
 * Cette fonction n'est pas mise en cache par unstable_cache car elle utilise getSession
 */
export const loadDashboardData = cache(async () => {
  return getUserDashboardData();
});

/**
 * Loader pour les informations de l'utilisateur actuel
 * Cette fonction n'est pas mise en cache par unstable_cache car elle utilise getSession
 */
export const loadCurrentUser = cache(async () => {
  return getCurrentUser();
});

/**
 * Vérifie l'autorisation d'accès selon le rôle de l'utilisateur
 * Cette fonction utilise getSession donc ne doit pas être mise en cache avec unstable_cache
 */
export const checkRoleAccess = cache(async (allowedRoles: Role[]) => {
  const session = await getSession();
  
  if (!session || !session.user) {
    return false;
  }
  
  const userRole = session.user.role as Role;
  return allowedRoles.includes(userRole);
});

/**
 * Récupère le rôle de l'utilisateur actuel
 * Cette fonction utilise getSession donc ne doit pas être mise en cache avec unstable_cache
 */
export const getCurrentUserRole = cache(async (): Promise<Role | null> => {
  const session = await getSession();
  
  if (!session || !session.user) {
    return null;
  }
  
  return session.user.role as Role;
});

/**
 * Loader pour les données du tableau de bord avec gestion d'erreur intégrée
 * Cette fonction utilise getUserDashboardData qui a été modifiée pour éviter l'utilisation de headers dans unstable_cache
 */
export const loadDashboardDataSafe = cache(async () => {
  try {
    return await getUserDashboardData();
  } catch (error) {
    console.error('Erreur lors du chargement des données du tableau de bord:', error);
    return null;
  }
}); 