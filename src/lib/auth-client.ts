import { createAuthClient } from "better-auth/client"

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' 
    ? process.env.NEXTAUTH_URL || 'https://yourdomain.com'
    : 'http://localhost:3000',
  
  // Configuration pour les API routes Next.js
  fetchOptions: {
    onError: (e) => {
      console.error("Auth client error:", e)
    }
  }
})

// Fonction helper pour vérifier les sessions côté serveur
export async function getServerSession() {
  try {
    const session = await authClient.getSession()
    return session
  } catch (error) {
    console.error("Error getting server session:", error)
    return null
  }
}

// Exporter les types
export type { Session, User } from "better-auth/types"