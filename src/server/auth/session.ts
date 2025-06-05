import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/db';
import { getServerSession } from 'next-auth';
import { authOptions } from './next-auth';

const prisma = db;

/**
 * Vérifie un token de socket et retourne la session associée si valide
 * @param token Le token à vérifier
 * @returns Les données de session ou null si invalide
 */
export async function verifyToken(token: string) {
  try {
    // Si le token est un token nextauth (utilisé pour les sockets),
    // vérifier la session directement
    if (token.startsWith('nextauth:')) {
      const sessionToken = token.replace('nextauth:', '');
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: {
          user: true,
        },
      });

      if (!session || new Date(session.expires) < new Date()) {
        return null;
      }

      return {
        user: {
          id: session.user.id,
          role: session.user.role,
          email: session.user.email,
        },
      };
    }

    // Sinon, on pourrait appeler le service de token
    // Mais pour l'instant, on refuse les autres types de tokens
    return null;
  } catch (error) {
    console.error('Erreur lors de la vérification du token socket:', error);
    return null;
  }
}
