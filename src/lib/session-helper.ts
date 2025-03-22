import { getServerSession } from "next-auth";
import { authConfig } from "@/app/api/auth/[...nextauth]/route";

/**
 * Cette fonction récupère la session depuis getServerSession
 * NE PAS UTILISER DANS UN CONTEXTE CACHÉ (unstable_cache)
 */
export const getSession = () => getServerSession(authConfig);

/**
 * Récupère seulement l'ID utilisateur de la session
 * Pour utilisation dans unstable_cache
 */
export async function getUserIdFromSession() {
  const session = await getSession();
  return session?.user?.id || null;
} 