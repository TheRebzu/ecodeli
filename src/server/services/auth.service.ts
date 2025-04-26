import { db } from '../db';
import { hash, compare } from 'bcryptjs';
import { UserRole, UserStatus } from '../db/enums';
import { randomBytes, createHash } from 'crypto';
import { TRPCError } from '@trpc/server';
import { LoginSchemaType } from '@/schemas/auth/login.schema';
import type { z } from 'zod';
import type { clientRegisterSchema, delivererRegisterSchema, merchantRegisterSchema, providerRegisterSchema } from '@/schemas/auth/user.schema';
import { PrismaClient } from "@prisma/client";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/emails/auth-emails";

// Types pour les schémas d'inscription
type RegisterSchemaType = 
  | z.infer<typeof clientRegisterSchema>
  | z.infer<typeof delivererRegisterSchema>
  | z.infer<typeof merchantRegisterSchema>
  | z.infer<typeof providerRegisterSchema>;

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

type RegisterClientParams = {
  email: string;
  password: string;
  name: string;
  address?: string;
  phone?: string;
  preferences?: Record<string, any>;
};

type RegisterDelivererParams = {
  email: string;
  password: string;
  name: string;
  address: string;
  phone: string;
  vehicleType: string;
  licensePlate: string;
};

type RegisterMerchantParams = {
  email: string;
  password: string;
  name: string;
  companyName: string;
  address: string;
  phone: string;
  businessType?: string;
  vatNumber?: string;
};

type RegisterProviderParams = {
  email: string;
  password: string;
  name: string;
  companyName?: string;
  address: string;
  phone: string;
  services: string[];
};

/**
 * Service pour l'authentification et la gestion des utilisateurs
 */
export class AuthService {
  private prisma: PrismaClient;
  
  constructor(prisma = db) {
    this.prisma = prisma;
  }

  /**
   * Vérifie si un utilisateur existe déjà avec cet email
   */
  async userExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });
    return !!user;
  }

  /**
   * Inscription d'un client
   */
  async registerClient(data: RegisterClientParams): Promise<User> {
    const userExists = await this.userExists(data.email);
    if (userExists) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    const hashedPassword = await hash(data.password, 12);
    
    const user = await this.prisma.$transaction(async (tx) => {
      // Création de l'utilisateur
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: UserRole.CLIENT,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });

      // Création du profil client
      await tx.client.create({
        data: {
          userId: user.id,
          address: data.address,
          phone: data.phone,
          preferences: data.preferences,
        },
      });

      // Création du token de vérification
      const verificationToken = await tx.verificationToken.create({
        data: {
          identifier: user.email,
          token: crypto.randomBytes(32).toString('hex'),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 heures
        },
      });

      // Envoi de l'email de vérification
      await sendVerificationEmail(user.email, verificationToken.token);

      return user;
    });

    return user;
  }

  /**
   * Inscription d'un livreur
   */
  async registerDeliverer(data: RegisterDelivererParams): Promise<User> {
    const userExists = await this.userExists(data.email);
    if (userExists) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    const hashedPassword = await hash(data.password, 12);
    
    const user = await this.prisma.$transaction(async (tx) => {
      // Création de l'utilisateur
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: UserRole.DELIVERER,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });

      // Création du profil livreur
      await tx.deliverer.create({
        data: {
          userId: user.id,
          address: data.address,
          phone: data.phone,
          vehicleType: data.vehicleType,
          licensePlate: data.licensePlate,
        },
      });

      // Création du token de vérification
      const verificationToken = await tx.verificationToken.create({
        data: {
          identifier: user.email,
          token: crypto.randomBytes(32).toString('hex'),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 heures
        },
      });

      // Envoi de l'email de vérification
      await sendVerificationEmail(user.email, verificationToken.token);

      return user;
    });

    return user;
  }

  /**
   * Inscription d'un commerçant
   */
  async registerMerchant(data: RegisterMerchantParams): Promise<User> {
    const userExists = await this.userExists(data.email);
    if (userExists) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    const hashedPassword = await hash(data.password, 12);
    
    const user = await this.prisma.$transaction(async (tx) => {
      // Création de l'utilisateur
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: UserRole.MERCHANT,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });

      // Création du profil commerçant
      await tx.merchant.create({
        data: {
          userId: user.id,
          companyName: data.companyName,
          address: data.address,
          phone: data.phone,
          businessType: data.businessType,
          vatNumber: data.vatNumber,
        },
      });

      // Création du token de vérification
      const verificationToken = await tx.verificationToken.create({
        data: {
          identifier: user.email,
          token: crypto.randomBytes(32).toString('hex'),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 heures
        },
      });

      // Envoi de l'email de vérification
      await sendVerificationEmail(user.email, verificationToken.token);

      return user;
    });

    return user;
  }

  /**
   * Inscription d'un prestataire
   */
  async registerProvider(data: RegisterProviderParams): Promise<User> {
    const userExists = await this.userExists(data.email);
    if (userExists) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    const hashedPassword = await hash(data.password, 12);
    
    const user = await this.prisma.$transaction(async (tx) => {
      // Création de l'utilisateur
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: UserRole.PROVIDER,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });

      // Création du profil prestataire
      await tx.provider.create({
        data: {
          userId: user.id,
          companyName: data.companyName,
          address: data.address,
          phone: data.phone,
          services: data.services,
        },
      });

      // Création du token de vérification
      const verificationToken = await tx.verificationToken.create({
        data: {
          identifier: user.email,
          token: crypto.randomBytes(32).toString('hex'),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 heures
        },
      });

      // Envoi de l'email de vérification
      await sendVerificationEmail(user.email, verificationToken.token);

      return user;
    });

    return user;
  }

  /**
   * Vérification de l'email d'un utilisateur
   */
  async verifyEmail(token: string): Promise<boolean> {
    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Token de vérification invalide',
      });
    }

    if (verificationToken.expires < new Date()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Token de vérification expiré',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Mise à jour de l'utilisateur
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        status: UserStatus.ACTIVE,
      },
    });

    // Suppression du token de vérification
    await this.prisma.verificationToken.delete({
      where: { token },
    });

    return true;
  }

  /**
   * Demande de réinitialisation de mot de passe
   */
  async forgotPassword(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
      return true;
    }

    // Création du token de réinitialisation
    const resetToken = await this.prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: crypto.randomBytes(32).toString('hex'),
        expires: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 heure
      },
    });

    // Envoi de l'email de réinitialisation
    await sendPasswordResetEmail(user.email, resetToken.token);

    return true;
  }

  /**
   * Réinitialisation du mot de passe
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const resetToken = await this.prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Token de réinitialisation invalide',
      });
    }

    if (resetToken.expires < new Date()) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Token de réinitialisation expiré',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { email: resetToken.identifier },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Mise à jour du mot de passe
    const hashedPassword = await hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    // Suppression du token de réinitialisation
    await this.prisma.verificationToken.delete({
      where: { token },
    });

    return true;
  }

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
}