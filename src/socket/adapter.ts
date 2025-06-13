/**
 * Adaptateur Socket.IO qui détermine l'environnement (client/serveur)
 * et charge les modules appropriés
 */

// Détection de l'environnement
export const isClient = typeof window !== "undefined";
export const isServer = !isClient;

/**
 * Obtient l'instance du client Socket.IO côté navigateur uniquement
 * @returns L'instance socket ou null si non initialisée
 */
export async function getClientSocket() {
  if (!isClient) {
    // Dans un environnement serveur, retourner null
    return null;
  }

  try {
    // Import dynamique côté client uniquement
    const { getSocket } = await import("./socket-client-browser");
    return getSocket();
  } catch (error) {
    console.error("Erreur lors de l'import du client socket:", error);
    return null;
  }
}

/**
 * Initialise une connexion Socket.IO côté client uniquement
 * @param token Token d'authentification
 * @returns La socket initialisée ou null en cas d'erreur
 */
export async function initializeClientSocket(token: string) {
  if (!isClient) {
    // Dans un environnement serveur, ne rien faire
    return null;
  }

  try {
    // Import dynamique côté client uniquement
    const { initializeSocket } = await import("./socket-client-browser");
    return initializeSocket(token);
  } catch (error) {
    console.error("Erreur lors de l'initialisation du socket:", error);
    return null;
  }
}

/**
 * Ferme la connexion Socket.IO côté client uniquement
 */
export async function closeClientSocket() {
  if (!isClient) {
    // Dans un environnement serveur, ne rien faire
    return;
  }

  try {
    // Import dynamique côté client uniquement
    const { closeSocket } = await import("./socket-client-browser");
    closeSocket();
  } catch (error) {
    console.error("Erreur lors de la fermeture du socket:", error);
  }
}

/**
 * Obtient l'instance du serveur Socket.IO (côté serveur uniquement)
 * @returns L'instance du serveur Socket.IO ou null si indisponible
 */
export async function getSocketServer() {
  if (!isServer) {
    // Dans un environnement client, retourner null
    return null;
  }

  try {
    // Import dynamique côté serveur uniquement
    const serverModule = await import("./server");

    // Utiliser la fonction getSocketServer si elle existe
    // Cette fonction a été ajoutée dans server.ts
    if ("getSocketServer" in serverModule) {
      return serverModule.getSocketServer();
    }

    // Si la fonction n'est pas disponible
    console.warn("Fonction getSocketServer non trouvée dans le module serveur");
    return null;
  } catch (error) {
    console.error("Erreur lors de l'import du serveur socket:", error);
    return null;
  }
}
