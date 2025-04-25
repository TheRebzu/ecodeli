import { db } from '../db';
import { hash, compare } from 'bcryptjs';
import { UserRole, UserStatus } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { TRPCError } from '@trpc/server';
import { LoginSchemaType } from '@/schemas/auth/login.schema';
import { RegisterSchemaType } from '@/schemas/auth/register.schema';

// Durées de validité des tokens
const TOKEN_EXPIRY = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 heures
  PASSWORD_RESET: 1 * 60 * 60 * 1000,      // 1 heure
};

// Types de tokens
export enum TokenType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TWO_FACTOR_AUTH = 'TWO_FACTOR_AUTH',
}

export const AuthService = {
  /**
   * Crée un nouvel utilisateur
   */
  async createUser(data: RegisterSchemaType) {
    const { email, password, name, role, phoneNumber } = data;
    
    // Vérification si l'email existe déjà
    const existingUser = await db.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }
    
    // Hachage du mot de passe
    const hashedPassword = await hash(password, 12);
    
    // Création de l'utilisateur
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        phoneNumber,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });
    
    // Création du profil spécifique au rôle
    switch (role) {
      case UserRole.CLIENT:
        await db.client.create({
          data: {
            userId: user.id,
            address: data.address as string,
            city: data.city as string,
            state: data.state as string,
            postalCode: data.postalCode as string,
            country: data.country as string,
          },
        });
        break;
        
      case UserRole.DELIVERER:
        await db.deliverer.create({
          data: {
            userId: user.id,
            // Récupérer les données spécifiques au livreur
          },
        });
        break;
        
      case UserRole.MERCHANT:
        await db.merchant.create({
          data: {
            userId: user.id,
            businessName: data.businessName as string,
            businessAddress: data.businessAddress as string,
            businessCity: data.businessCity as string,
            businessState: data.businessState as string,
            businessPostal: data.businessPostal as string,
            businessCountry: data.businessCountry as string,
            taxId: data.taxId as string,
            websiteUrl: data.websiteUrl as string,
          },
        });
        break;
        
      case UserRole.PROVIDER:
        await db.provider.create({
          data: {
            userId: user.id,
            serviceType: data.serviceType as string,
            description: data.description as string,
            availability: data.availability as string,
          },
        });
        break;
    }
    
    // Créer un token de vérification d'email
    const verificationToken = await this.createVerificationToken(user.id);
    
    return { user, verificationToken };
  },
  
  /**
   * Vérifie les identifiants de connexion
   */
  async verifyCredentials(data: LoginSchemaType) {
    const { email, password } = data;
    
    // Recherche de l'utilisateur
    const user = await db.user.findUnique({
      where: { email },
      include: {
        client: true,
        deliverer: true,
        merchant: true,
        provider: true,
        admin: true,
      },
    });
    
    if (!user || !user.password) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Identifiants invalides',
      });
    }
    
    // Vérification du mot de passe
    const isValidPassword = await compare(password, user.password);
    
    if (!isValidPassword) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Identifiants invalides',
      });
    }
    
    // Vérification du statut du compte
    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Ce compte a été désactivé ou suspendu',
      });
    }
    
    // Vérification de l'email pour les rôles autres qu'admin
    if (user.role !== UserRole.ADMIN && user.status === UserStatus.PENDING_VERIFICATION) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Veuillez vérifier votre email pour activer votre compte',
      });
    }
    
    // Vérification de la 2FA si activée
    if (user.twoFactorEnabled && !data.totp) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentification à deux facteurs requise',
        cause: 'REQUIRES_2FA',
      });
    }
    
    // Logique de vérification du code TOTP si présent
    if (user.twoFactorEnabled && data.totp) {
      const isValidTotp = await this.verifyTOTP(user.id, data.totp);
      
      if (!isValidTotp) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Code d\'authentification à deux facteurs invalide',
        });
      }
    }
    
    // Mise à jour de la date de dernière connexion
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profileId: 
        user.client?.id || 
        user.deliverer?.id || 
        user.merchant?.id || 
        user.provider?.id ||
        user.admin?.id
    };
  },
  
  /**
   * Crée un token de vérification pour l'email
   */
  async createVerificationToken(userId: string) {
    // Générer un token aléatoire
    const token = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(token).digest('hex');
    
    // Enregistrer le token en base
    await db.verificationToken.create({
      data: {
        identifier: userId,
        token: hashedToken,
        expires: new Date(Date.now() + TOKEN_EXPIRY.EMAIL_VERIFICATION),
      },
    });
    
    return token;
  },
  
  /**
   * Vérifie l'email d'un utilisateur avec le token
   */
  async verifyEmail(token: string) {
    // Hash du token pour la comparaison
    const hashedToken = createHash('sha256').update(token).digest('hex');
    
    // Recherche du token valide
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        token: hashedToken,
        expires: { gt: new Date() },
      },
    });
    
    if (!verificationToken) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Token invalide ou expiré',
      });
    }
    
    // Mise à jour du statut de l'utilisateur
    const user = await db.user.update({
      where: { id: verificationToken.identifier },
      data: {
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
      },
    });
    
    // Suppression du token utilisé
    await db.verificationToken.delete({
      where: {
        id: verificationToken.id,
      },
    });
    
    return user;
  },
  
  /**
   * Crée un token de réinitialisation de mot de passe
   */
  async createPasswordResetToken(email: string) {
    // Recherche de l'utilisateur
    const user = await db.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      // Ne pas révéler si l'email existe
      return null;
    }
    
    // Générer un token aléatoire
    const token = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(token).digest('hex');
    
    // Enregistrer le token en base
    await db.verificationToken.create({
      data: {
        identifier: user.id,
        token: hashedToken,
        expires: new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET),
      },
    });
    
    return token;
  },
  
  /**
   * Réinitialise le mot de passe avec le token
   */
  async resetPassword(token: string, newPassword: string) {
    // Hash du token pour la comparaison
    const hashedToken = createHash('sha256').update(token).digest('hex');
    
    // Recherche du token valide
    const resetToken = await db.verificationToken.findFirst({
      where: {
        token: hashedToken,
        expires: { gt: new Date() },
      },
    });
    
    if (!resetToken) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Token invalide ou expiré',
      });
    }
    
    // Hash du nouveau mot de passe
    const hashedPassword = await hash(newPassword, 12);
    
    // Mise à jour du mot de passe
    const user = await db.user.update({
      where: { id: resetToken.identifier },
      data: {
        password: hashedPassword,
      },
    });
    
    // Suppression du token utilisé
    await db.verificationToken.delete({
      where: {
        id: resetToken.id,
      },
    });
    
    return user;
  },
  
  /**
   * Vérifie un code TOTP pour l'authentification à deux facteurs
   */
  async verifyTOTP(userId: string, totp: string) {
    // Implémentation de la vérification TOTP
    // À compléter avec une bibliothèque comme 'otplib'
    return true; // Pour l'instant, on valide toujours
  },
  
  /**
   * Active l'authentification à deux facteurs pour un utilisateur
   */
  async enableTwoFactor(userId: string) {
    // Générer un secret TOTP pour l'utilisateur
    const secret = randomBytes(20).toString('hex');
    
    // Enregistrer le secret dans la base de données
    const user = await db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      },
    });
    
    return { secret };
  },
  
  /**
   * Désactive l'authentification à deux facteurs pour un utilisateur
   */
  async disableTwoFactor(userId: string) {
    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
    
    return { success: true };
  },
};