import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { User } from "@prisma/client";

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
  const session = await getServerSession(authOptions);
  return session as Session | null;
}

/**
 * Récupère l'utilisateur courant complet depuis la base de données
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    return user;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }
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