import { db } from '../db';
import { hash, compare } from 'bcryptjs';
import { UserRole, UserStatus } from '../db/enums';
import { randomBytes } from 'crypto';
import { TRPCError } from '@trpc/server';
import { LoginSchemaType } from '@/schemas/auth/login.schema';
import { PrismaClient } from '@prisma/client';
import { EmailService } from './email.service';
import { TokenService } from './token.service';

type RegisterBaseParams = {
  email: string;
  password: string;
  name: string;
};

type UserResult = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileId?: string;
};

/**
 * Service pour l'authentification et la gestion des utilisateurs
 */
export class AuthService {
  private prisma: PrismaClient;
  private emailService: EmailService;
  private tokenService: TokenService;

  constructor(prisma = db) {
    this.prisma = prisma;
    this.emailService = new EmailService();
    this.tokenService = new TokenService(prisma);
  }

  /**
   * Vérifie si un utilisateur existe déjà avec cet email
   */
  async userExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return !!user;
  }

  /**
   * Crée un utilisateur de base
   */
  private async createBaseUser(data: RegisterBaseParams, roleValue: string) {
    const userExists = await this.userExists(data.email);
    if (userExists) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    const hashedPassword = await hash(data.password, 12);

    // Création de l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: roleValue,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });

    // Création et envoi du token de vérification
    const verificationToken = await this.tokenService.createEmailVerificationToken(user.id);
    if (user.email) {
      await this.emailService.sendVerificationEmail(user.email, verificationToken);
    }

    return user;
  }

  /**
   * Inscription d'un client
   */
  async registerClient(data: RegisterBaseParams) {
    return await this.createBaseUser(data, 'CLIENT');
  }

  /**
   * Inscription d'un livreur
   */
  async registerDeliverer(data: RegisterBaseParams) {
    return await this.createBaseUser(data, 'DELIVERER');
  }

  /**
   * Inscription d'un commerçant
   */
  async registerMerchant(data: RegisterBaseParams) {
    return await this.createBaseUser(data, 'MERCHANT');
  }

  /**
   * Inscription d'un prestataire
   */
  async registerProvider(data: RegisterBaseParams) {
    return await this.createBaseUser(data, 'PROVIDER');
  }

  /**
   * Vérification de l'email d'un utilisateur
   */
  async verifyEmail(token: string): Promise<boolean> {
    // Vérification du token et récupération de l'ID utilisateur
    const userId = await this.tokenService.verifyToken(token);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    await this.tokenService.deleteToken(token);

    // Envoi d'email de confirmation d'activation
    if (user.email) {
      await this.emailService.sendAccountActivationNotification(user.email);
    }

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
    const resetToken = await this.tokenService.createPasswordResetToken(user.id);

    // Envoi de l'email de réinitialisation
    if (user.email) {
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    }

    return true;
  }

  /**
   * Réinitialisation du mot de passe
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Vérification du token et récupération de l'ID utilisateur
    const userId = await this.tokenService.verifyToken(token);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
    await this.tokenService.deleteToken(token);

    return true;
  }

  /**
   * Vérifie les identifiants de connexion
   */
  async verifyCredentials(data: LoginSchemaType): Promise<UserResult> {
    const { email, password } = data;

    // Recherche de l'utilisateur
    const user = await this.prisma.user.findUnique({
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
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Ce compte a été désactivé ou suspendu',
      });
    }

    // Vérification de l'email pour les rôles autres qu'admin
    if (user.role !== 'ADMIN' && user.status === 'PENDING_VERIFICATION') {
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
          message: "Code d'authentification à deux facteurs invalide",
        });
      }
    }

    // Mise à jour de la date de dernière connexion
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Convert role from string to UserRole enum
    let userRole: UserRole;
    switch (user.role) {
      case 'CLIENT':
        userRole = UserRole.CLIENT;
        break;
      case 'DELIVERER':
        userRole = UserRole.DELIVERER;
        break;
      case 'MERCHANT':
        userRole = UserRole.MERCHANT;
        break;
      case 'PROVIDER':
        userRole = UserRole.PROVIDER;
        break;
      case 'ADMIN':
        userRole = UserRole.ADMIN;
        break;
      default:
        userRole = UserRole.CLIENT; // fallback
    }

    return {
      id: user.id,
      email: user.email || '',
      name: user.name || '',
      role: userRole,
      profileId:
        user.client?.id ||
        user.deliverer?.id ||
        user.merchant?.id ||
        user.provider?.id ||
        user.admin?.id,
    };
  }

  /**
   * Vérifie un code TOTP pour l'authentification à deux facteurs
   */
  async verifyTOTP(userId: string, totp: string): Promise<boolean> {
    // Implémentation temporaire - à remplacer par une vraie logique TOTP
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "La configuration 2FA n'est pas activée",
      });
    }

    // Vérification simple pour le développement
    return totp === '123456';
  }

  /**
   * Active l'authentification à deux facteurs pour un utilisateur
   */
  async enableTwoFactor(userId: string) {
    // Générer un secret temporaire
    const secret = randomBytes(20).toString('hex');

    // Enregistrer le secret dans la base de données
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      },
    });

    return { secret };
  }

  /**
   * Désactive l'authentification à deux facteurs pour un utilisateur
   */
  async disableTwoFactor(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return { success: true };
  }

  /**
   * Configure l'authentification à deux facteurs pour un utilisateur
   */
  async setupTwoFactor(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Générer un secret temporaire
    const secret = randomBytes(20).toString('hex');

    // Update user with secret
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return secret;
  }

  /**
   * Vérifie et active l'authentification à deux facteurs
   */
  async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user?.twoFactorSecret) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "La configuration 2FA n'est pas activée",
      });
    }

    // Vérification simple pour le développement
    const isValid = token === '123456';

    if (isValid) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      });
    }

    return isValid;
  }
}
