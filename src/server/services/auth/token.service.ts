import { db } from '../../db';
import { randomBytes, createHash } from 'crypto';
import { TRPCError } from '@trpc/server';
import { PrismaClient } from '@prisma/client';

/**
 * Service pour la gestion des tokens (vérification email, réinitialisation mot de passe)
 */
export class TokenService {
  private prisma: PrismaClient;

  constructor(prisma = db) {
    this.prisma = prisma;
  }

  /**
   * Durées de validité des tokens
   */
  private readonly TOKEN_EXPIRY = {
    EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 heures
    PASSWORD_RESET: 1 * 60 * 60 * 1000, // 1 heure
  };

  /**
   * Crée un token de vérification d'email
   */
  async createEmailVerificationToken(userId: string): Promise<string> {
    const token = this.generateToken();
    const hashedToken = this.hashToken(token);

    await this.db.verificationToken.create({
      data: {
        identifier: userId,
        token: hashedToken,
        expires: new Date(Date.now() + this.TOKEN_EXPIRY.EMAIL_VERIFICATION),
      },
    });

    return token;
  }

  /**
   * Crée un token de réinitialisation de mot de passe
   */
  async createPasswordResetToken(userId: string): Promise<string> {
    const token = this.generateToken();
    const hashedToken = this.hashToken(token);

    await this.db.verificationToken.create({
      data: {
        identifier: userId,
        token: hashedToken,
        expires: new Date(Date.now() + this.TOKEN_EXPIRY.PASSWORD_RESET),
      },
    });

    return token;
  }

  /**
   * Vérifie un token et retourne l'identifiant associé si valide
   */
  async verifyToken(token: string): Promise<string> {
    const hashedToken = this.hashToken(token);

    console.log('DEBUG: Token à vérifier (clair):', token);
    console.log('DEBUG: Token haché pour recherche:', hashedToken);

    const verificationToken = await this.db.verificationToken.findFirst({
      where: { token: hashedToken },
    });

    console.log('DEBUG: Token trouvé dans la BD:', verificationToken ? 'OUI' : 'NON');

    if (!verificationToken) {
      // En cas d'échec, essayer de trouver tous les tokens disponibles pour débogage
      const allTokens = await this.db.verificationToken.findMany({
        where: { used: false },
        take: 5,
      });

      console.log(
        'DEBUG: Tokens disponibles dans la BD:',
        allTokens.map(t => ({
          token: t.token.substring(0, 10) + '...',
          expires: t.expires,
          type: t.type,
        }))
      );

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Token invalide',
      });
    }

    if (verificationToken.expires < new Date()) {
      console.log('DEBUG: Token expiré, expirait le:', verificationToken.expires);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Token expiré',
      });
    }

    return verificationToken.identifier;
  }

  /**
   * Supprime un token après utilisation
   */
  async deleteToken(token: string): Promise<void> {
    const hashedToken = this.hashToken(token);

    await this.db.verificationToken.delete({
      where: { token: hashedToken },
    });
  }

  /**
   * Génère un token aléatoire
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Transforme un token en sa version hashée pour le stockage
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
