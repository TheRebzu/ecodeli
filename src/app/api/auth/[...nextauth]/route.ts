import NextAuth from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';

// Configuration de l'API route de NextAuth
const handler = NextAuth(authOptions);

// Export les gestionnaires de requêtes pour les routes NextAuth
export { handler as GET, handler as POST };
