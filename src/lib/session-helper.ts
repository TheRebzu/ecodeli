import { getServerSession } from "next-auth";
import { authConfig } from "@/app/api/auth/[...nextauth]/route";

// Type pour l'utilisateur dans la session
export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
  status: string;
}

// Type pour la session avec l'utilisateur
export interface Session {
  user: SessionUser;
}

/**
 * Cette fonction récupère la session depuis getServerSession
 * NE PAS UTILISER DANS UN CONTEXTE CACHÉ (unstable_cache)
 */
export async function getSession(): Promise<Session | null> {
  const session = await getServerSession(authConfig);
  return session as Session | null;
}

/**
 * Récupère seulement l'ID utilisateur de la session
 * Pour utilisation dans unstable_cache
 */
export async function getUserIdFromSession() {
  const session = await getSession();
  return session?.user?.id || null;
}

// Vérifier si l'utilisateur est connecté
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

// Vérifier si l'utilisateur a un rôle spécifique
export async function hasRole(role: string | string[]): Promise<boolean> {
  const session = await getSession();
  
  if (!session) {
    return false;
  }
  
  if (Array.isArray(role)) {
    return role.includes(session.user.role);
  }
  
  return session.user.role === role;
} 