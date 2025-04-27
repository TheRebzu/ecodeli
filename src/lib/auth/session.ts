import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/server/auth/next-auth';
import { UserRole } from '@prisma/client';

/**
 * Récupère la session de l'utilisateur actuel côté serveur
 * @returns La session utilisateur ou null si non authentifié
 */
export async function getCurrentSession() {
  return await getServerSession(authOptions);
}

/**
 * Vérifie si l'utilisateur est authentifié (côté serveur)
 * @returns true si l'utilisateur est authentifié, false sinon
 */
export async function isAuthenticated() {
  const session = await getCurrentSession();
  return !!session?.user;
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique (côté serveur)
 * @param role Le rôle à vérifier
 * @returns true si l'utilisateur a le rôle spécifié, false sinon
 */
export async function hasRole(role: UserRole) {
  const session = await getCurrentSession();
  return session?.user?.role === role;
}

/**
 * Vérifie si l'utilisateur a l'un des rôles spécifiés (côté serveur)
 * @param roles Les rôles à vérifier
 * @returns true si l'utilisateur a l'un des rôles spécifiés, false sinon
 */
export async function hasAnyRole(roles: UserRole[]) {
  const session = await getCurrentSession();
  return !!session?.user?.role && roles.includes(session.user.role);
}

/**
 * Récupère l'ID de l'utilisateur actuel (côté serveur)
 * @returns L'ID de l'utilisateur ou null si non authentifié
 */
export async function getCurrentUserId() {
  const session = await getCurrentSession();
  return session?.user?.id || null;
}
