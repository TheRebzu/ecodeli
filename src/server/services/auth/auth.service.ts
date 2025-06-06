import { db } from '@/server/db';
import { hash, compare } from 'bcryptjs';
import { UserRole, UserStatus } from '@/server/db/enums';
import { randomBytes } from 'crypto';
import { TRPCError } from '@trpc/server';
import { LoginSchemaType } from '@/schemas/auth/login.schema';
import { PrismaClient } from '@prisma/client';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/services/email.service';
import { EmailService } from '@/server/services/common/email.service';
import { TokenService } from '@/server/services/auth/token.service';
import {
  ClientRegisterSchemaType,
  DelivererRegisterSchemaType,
  MerchantRegisterSchemaType,
  ProviderRegisterSchemaType,
} from '@/schemas/validation';
import { VerificationStatus } from '@prisma/client';
import { DocumentService } from '@/server/services/common/document.service';
import { NotificationService } from '@/lib/services/notification.service';
import { SupportedLanguage } from '@/types/i18n/translation';

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
  private db: PrismaClient;
  private tokenService: TokenService;
  private documentService: DocumentService;
  private emailService: EmailService;

  constructor(prisma = db) {
    this.db = prisma;
    this.tokenService = new TokenService(prisma);
    this.documentService = new DocumentService(prisma);
    this.emailService = new EmailService();
  }

  /**
   * Vérifie si un utilisateur existe déjà avec cet email
   */
  async userExists(email: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { email },
    });
    return !!user;
  }

  /**
   * Récupère un utilisateur par son email
   */
  async getUserByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email },
    });
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
    const user = await this.db.user.create({
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
   * Inscription d'un client (processus simplifié)
   */
  async registerClient(data: ClientRegisterSchemaType) {
    // Vérifier si l'email est déjà utilisé
    const existingUser = await this.db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await hash(data.password, 12);

    // Créer l'utilisateur et le profil client
    const user = await this.db.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: UserRole.CLIENT,
        status: UserStatus.PENDING_VERIFICATION,
        client: {
          create: {
            address: data.address,
            phone: data.phone,
          },
        },
      },
    });

    // Créer un token de vérification d'email
    const token = await this.tokenService.createEmailVerificationToken(user.id);

    // Envoyer l'email de vérification
    await this.emailService.sendVerificationEmail(user.email, token);

    return {
      success: true,
      message: 'Compte client créé. Veuillez vérifier votre email.',
      userId: user.id,
    };
  }

  /**
   * Inscription d'un livreur (processus en deux phases)
   */
  async registerDeliverer(data: DelivererRegisterSchemaType) {
    // Vérifier si l'email est déjà utilisé
    const existingUser = await this.db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await hash(data.password, 12);

    // Créer l'utilisateur et le profil livreur
    const user = await this.db.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: UserRole.DELIVERER,
        status: UserStatus.PENDING_VERIFICATION,
        deliverer: {
          create: {
            address: data.address,
            phone: data.phone,
            vehicleType: data.vehicleType,
            licensePlate: data.licensePlate,
            isActive: false,
            isVerified: false,
          },
        },
      },
    });

    // Créer un token de vérification d'email
    const token = await this.tokenService.createEmailVerificationToken(user.id);

    // Envoyer l'email de vérification
    await this.emailService.sendVerificationEmail(user.email, token);

    return {
      success: true,
      message: "Compte livreur créé. Veuillez vérifier votre email pour passer à l'étape suivante.",
      userId: user.id,
    };
  }

  /**
   * Inscription d'un commerçant
   */
  async registerMerchant(data: MerchantRegisterSchemaType) {
    // Vérifier si l'email est déjà utilisé
    const existingUser = await this.db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await hash(data.password, 12);

    // Créer l'utilisateur et le profil commerçant
    const user = await this.db.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: UserRole.MERCHANT,
        status: UserStatus.PENDING_VERIFICATION,
        merchant: {
          create: {
            companyName: data.companyName,
            address: data.address,
            phone: data.phone,
            businessType: data.businessType,
            vatNumber: data.vatNumber,
            isVerified: false,
          },
        },
      },
    });

    // Créer un token de vérification d'email
    const token = await this.tokenService.createEmailVerificationToken(user.id);

    // Envoyer l'email de vérification
    await this.emailService.sendVerificationEmail(user.email, token);

    return {
      success: true,
      message: 'Compte commerçant créé. Veuillez vérifier votre email.',
      userId: user.id,
    };
  }

  /**
   * Inscription d'un prestataire de services
   */
  async registerProvider(data: ProviderRegisterSchemaType) {
    // Vérifier si l'email est déjà utilisé
    const existingUser = await this.db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await hash(data.password, 12);

    // Préparer les services (convertir de la string ou tableau vers tableau)
    const services = Array.isArray(data.services)
      ? data.services
      : data.services
        ? [data.services]
        : [];

    // Créer l'utilisateur et le profil prestataire
    const user = await this.db.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: UserRole.PROVIDER,
        status: UserStatus.PENDING_VERIFICATION,
        provider: {
          create: {
            companyName: data.companyName,
            address: data.address,
            phone: data.phone,
            services,
            isVerified: false,
            serviceType: data.serviceType,
            description: data.description,
            availability: data.availability ? JSON.stringify(data.availability) : null,
          },
        },
      },
    });

    // Créer un token de vérification d'email
    const token = await this.tokenService.createEmailVerificationToken(user.id);

    // Envoyer l'email de vérification
    await this.emailService.sendVerificationEmail(user.email, token);

    return {
      success: true,
      message: 'Compte prestataire créé. Veuillez vérifier votre email.',
      userId: user.id,
    };
  }

  /**
   * Vérification de l'email d'un utilisateur
   */
  async verifyEmail(token: string) {
    try {
      // Utiliser le TokenService pour vérifier le token
      const userId = await this.tokenService.verifyToken(token);

      // Trouver l'utilisateur correspondant
      const user = await this.db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Mettre à jour l'utilisateur
      await this.db.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
        },
      });

      // Supprimer le token utilisé
      await this.tokenService.deleteToken(token);

      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Token de vérification invalide ou expiré',
      });
    }
  }

  /**
   * Demande de réinitialisation de mot de passe
   */
  async forgotPassword(email: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
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

    const user = await this.db.user.findUnique({
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
    await this.db.user.update({
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
    const user = await this.db.user.findUnique({
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
    await this.db.user.update({
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
    const user = await this.db.user.findUnique({
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
    await this.db.user.update({
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
    await this.db.user.update({
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
    const user = await this.db.user.findUnique({
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
    await this.db.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return secret;
  }

  /**
   * Vérifie et active l'authentification à deux facteurs
   */
  async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
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
      await this.db.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      });
    }

    return isValid;
  }

  /**
   * Vérification du compte d'un livreur par un administrateur
   */
  async verifyDelivererAccount(
    delivererId: string,
    adminId: string,
    approved: boolean,
    notes?: string
  ) {
    // Vérifier que l'administrateur existe
    const admin = await this.db.user.findUnique({
      where: { id: adminId, role: UserRole.ADMIN },
    });

    if (!admin) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Seul un administrateur peut effectuer cette action',
      });
    }

    // Trouver le livreur
    const deliverer = await this.db.deliverer.findUnique({
      where: { id: delivererId },
      include: { user: true },
    });

    if (!deliverer) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Livreur non trouvé',
      });
    }

    if (approved) {
      // Approuver le compte livreur
      await this.db.deliverer.update({
        where: { id: delivererId },
        data: {
          isVerified: true,
          verificationDate: new Date(),
        },
      });

      // Envoyer un email d'approbation
      await this.emailService.sendAccountApprovalNotification(deliverer.user.email);
    } else {
      // Rejeter avec un message
      await this.db.deliverer.update({
        where: { id: delivererId },
        data: {
          isVerified: false,
        },
      });

      // Envoyer un email de rejet avec les notes
      await this.emailService.sendAccountRejectionNotification(
        deliverer.user.email,
        notes || 'Aucune raison spécifiée'
      );
    }

    return {
      success: true,
      message: approved ? 'Compte livreur approuvé' : 'Compte livreur rejeté',
    };
  }

  /**
   * Vérification du compte d'un commerçant par un administrateur
   */
  async verifyMerchantAccount(
    merchantId: string,
    adminId: string,
    approved: boolean,
    notes?: string
  ) {
    // Vérifier que l'administrateur existe
    const admin = await this.db.user.findUnique({
      where: { id: adminId, role: UserRole.ADMIN },
    });

    if (!admin) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Seul un administrateur peut effectuer cette action',
      });
    }

    // Trouver le commerçant
    const merchant = await this.db.merchant.findUnique({
      where: { id: merchantId },
      include: { user: true },
    });

    if (!merchant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Commerçant non trouvé',
      });
    }

    if (approved) {
      // Approuver le compte commerçant
      await this.db.merchant.update({
        where: { id: merchantId },
        data: {
          isVerified: true,
          verificationDate: new Date(),
        },
      });

      // Envoyer un email d'approbation
      await this.emailService.sendAccountApprovalNotification(merchant.user.email);
    } else {
      // Rejeter avec un message
      await this.db.merchant.update({
        where: { id: merchantId },
        data: {
          isVerified: false,
        },
      });

      // Envoyer un email de rejet avec les notes
      await this.emailService.sendAccountRejectionNotification(
        merchant.user.email,
        notes || 'Aucune raison spécifiée'
      );
    }

    return {
      success: true,
      message: approved ? 'Compte commerçant approuvé' : 'Compte commerçant rejeté',
    };
  }

  /**
   * Vérification du compte d'un prestataire par un administrateur
   */
  async verifyProviderAccount(
    providerId: string,
    adminId: string,
    approved: boolean,
    notes?: string
  ) {
    // Vérifier que l'administrateur existe
    const admin = await this.db.user.findUnique({
      where: { id: adminId, role: UserRole.ADMIN },
    });

    if (!admin) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Seul un administrateur peut effectuer cette action',
      });
    }

    // Trouver le prestataire
    const provider = await this.db.provider.findUnique({
      where: { id: providerId },
      include: { user: true },
    });

    if (!provider) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Prestataire non trouvé',
      });
    }

    if (approved) {
      // Approuver le compte prestataire
      await this.db.provider.update({
        where: { id: providerId },
        data: {
          isVerified: true,
          verificationDate: new Date(),
        },
      });

      // Envoyer un email d'approbation
      await this.emailService.sendAccountApprovalNotification(provider.user.email);
    } else {
      // Rejeter avec un message
      await this.db.provider.update({
        where: { id: providerId },
        data: {
          isVerified: false,
        },
      });

      // Envoyer un email de rejet avec les notes
      await this.emailService.sendAccountRejectionNotification(
        provider.user.email,
        notes || 'Aucune raison spécifiée'
      );
    }

    return {
      success: true,
      message: approved ? 'Compte prestataire approuvé' : 'Compte prestataire rejeté',
    };
  }

  /**
   * Création d'un administrateur par un super-admin
   */
  async createAdmin(
    superAdminId: string,
    data: {
      email: string;
      name: string;
      password: string;
      permissions: string[];
      department?: string;
    }
  ) {
    // Vérifier que le super-admin existe
    const superAdmin = await this.db.user.findUnique({
      where: { id: superAdminId, role: UserRole.ADMIN },
      include: { admin: true },
    });

    if (!superAdmin || !superAdmin.admin?.permissions.includes('SUPER_ADMIN')) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Seul un super-administrateur peut effectuer cette action',
      });
    }

    // Vérifier si l'email est déjà utilisé
    const existingUser = await this.db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await hash(data.password, 12);

    // Créer l'utilisateur et le profil admin
    const user = await this.db.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(), // Admin n'a pas besoin de vérifier son email
        admin: {
          create: {
            permissions: data.permissions,
            department: data.department,
            twoFactorEnabled: true, // Active 2FA par défaut pour les admins
          },
        },
      },
    });

    // Générer un token temporaire pour la configuration initiale
    const tempToken = await this.tokenService.createPasswordResetToken(user.id);

    // Envoyer l'email d'invitation avec le lien de configuration
    await this.emailService.sendAdminInvitation(data.email, tempToken);

    return {
      success: true,
      message: 'Compte administrateur créé.',
      userId: user.id,
    };
  }

  // Inscription d'un nouvel utilisateur
  async registerUser(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    locale: SupportedLanguage;
  }) {
    const { name, email, password, role, locale } = data;

    const hashedPassword = await hash(password, 12);

    // Créer l'utilisateur
    const user = await this.db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        emailVerified: null,
        isVerified: role === UserRole.CLIENT, // Les clients sont vérifiés par défaut
      },
    });

    // Créer le profil spécifique selon le rôle
    await this.createRoleSpecificProfile(user.id, role);

    // Générer un token de vérification via TokenService
    const verificationToken = await this.tokenService.createEmailVerificationToken(user.id);

    // Envoyer l'email de vérification
    await this.emailService.sendVerificationEmail(user.email, verificationToken, locale);

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  // Créer le profil spécifique au rôle
  private async createRoleSpecificProfile(userId: string, role: UserRole) {
    switch (role) {
      case UserRole.DELIVERER:
        await this.db.deliverer.create({
          data: {
            userId,
            isVerified: false,
          },
        });
        break;
      case UserRole.MERCHANT:
        await this.db.merchant.create({
          data: {
            userId,
            isVerified: false,
          },
        });
        break;
      case UserRole.PROVIDER:
        await this.db.provider.create({
          data: {
            userId,
            isVerified: false,
          },
        });
        break;
      case UserRole.CLIENT:
        await this.db.client.create({
          data: {
            userId,
          },
        });
        break;
      default:
        break;
    }
  }

  // Demande de réinitialisation de mot de passe
  async requestPasswordReset(email: string, locale: SupportedLanguage) {
    const user = await this.db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Ne pas indiquer si l'utilisateur existe pour des raisons de sécurité
      return true;
    }

    // Générer le token de réinitialisation
    const resetToken = await this.tokenService.createPasswordResetToken(user.id);
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Expire après 1h

    // Sauvegarder le token
    await this.db.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires: expires,
      },
    });

    // Envoyer l'email de réinitialisation
    await this.emailService.sendPasswordResetEmail(user.email, resetToken, locale);

    return true;
  }

  // Réinitialiser le mot de passe
  async resetPassword(token: string, newPassword: string) {
    // Trouver l'utilisateur par token
    const user = await this.db.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Token de réinitialisation invalide ou expiré',
      });
    }

    // Crypter le nouveau mot de passe
    const hashedPassword = await hash(newPassword, 12);

    // Mettre à jour l'utilisateur
    await this.db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return true;
  }

  // Vérifier le statut de vérification de l'utilisateur
  async checkVerificationStatus(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Vérifier si l'utilisateur est un client (pas besoin de vérification)
    if (user.role === UserRole.CLIENT) {
      return { isVerified: true, requiredDocuments: [] };
    }

    // Récupérer les types de documents requis pour ce rôle
    const requiredDocuments = this.documentService.getRequiredDocumentTypesByRole(user.role);

    // Récupérer les documents approuvés de l'utilisateur
    const approvedDocuments = await this.db.document.findMany({
      where: { userId, isVerified: true },
    });

    // Déterminer quels documents sont manquants
    const approvedDocumentTypes = approvedDocuments.map(doc => doc.type);
    const missingDocuments = requiredDocuments.filter(
      type => !approvedDocumentTypes.includes(type)
    );

    // L'utilisateur est vérifié si tous les documents requis sont approuvés
    const isVerified = missingDocuments.length === 0;

    return {
      isVerified,
      requiredDocuments,
      approvedDocuments,
      missingDocuments,
    };
  }

  /**
   * Met à jour le statut de vérification d'un utilisateur
   */
  async updateUserVerificationStatus(
    userId: string,
    status: VerificationStatus,
    notes: string | null,
    locale: SupportedLanguage
  ) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        client: true,
        deliverer: true,
        merchant: true,
        provider: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Mettre à jour le statut
    await this.db.user.update({
      where: { id: userId },
      data: {
        status: status === 'APPROVED' ? 'ACTIVE' : 'REJECTED',
      },
    });

    // Mettre à jour le profil spécifique au rôle
    switch (user.role) {
      case UserRole.DELIVERER:
        if (user.deliverer) {
          await this.db.deliverer.update({
            where: { id: user.deliverer.id },
            data: {
              isVerified: status === 'APPROVED',
              verificationNotes: notes,
            },
          });
        }
        break;
      case UserRole.MERCHANT:
        if (user.merchant) {
          await this.db.merchant.update({
            where: { id: user.merchant.id },
            data: {
              isVerified: status === 'APPROVED',
              verificationNotes: notes,
            },
          });
        }
        break;
      case UserRole.PROVIDER:
        if (user.provider) {
          await this.db.provider.update({
            where: { id: user.provider.id },
            data: {
              isVerified: status === 'APPROVED',
              verificationNotes: notes,
            },
          });
        }
        break;
    }

    // Envoyer notification à l'utilisateur
    if (status === 'APPROVED') {
      await NotificationService.sendNotification({
        userId,
        title: 'Compte vérifié',
        content:
          'Votre compte a été approuvé. Vous pouvez maintenant utiliser toutes les fonctionnalités.',
        type: 'ACCOUNT',
      });
      await this.emailService.sendAccountVerifiedEmail(user.email, user.name || '', locale);
    } else {
      await NotificationService.sendNotification({
        userId,
        title: 'Vérification du compte',
        content: `Votre compte a été refusé${notes ? ': ' + notes : '.'}`,
        type: 'ACCOUNT',
      });
      await this.emailService.sendAccountRejectedEmail(
        user.email,
        user.name || '',
        notes || '',
        locale
      );
    }

    return {
      success: true,
      status,
    };
  }

  /**
   * Récupère les informations de session pour un utilisateur
   */
  async getSession(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        image: true,
        status: true,
        client: {
          select: {
            id: true,
          },
        },
        deliverer: {
          select: {
            id: true,
            isVerified: true,
          },
        },
        merchant: {
          select: {
            id: true,
            isVerified: true,
            companyName: true,
          },
        },
        provider: {
          select: {
            id: true,
            isVerified: true,
            companyName: true,
          },
        },
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Déterminer le profileId en fonction du rôle
    let profileId = null;
    let additionalInfo = {};

    switch (user.role) {
      case UserRole.CLIENT:
        profileId = user.client?.id || null;
        break;
      case UserRole.DELIVERER:
        profileId = user.deliverer?.id || null;
        additionalInfo = {
          isVerified: user.deliverer?.isVerified || false,
        };
        break;
      case UserRole.MERCHANT:
        profileId = user.merchant?.id || null;
        additionalInfo = {
          isVerified: user.merchant?.isVerified || false,
          companyName: user.merchant?.companyName || '',
        };
        break;
      case UserRole.PROVIDER:
        profileId = user.provider?.id || null;
        additionalInfo = {
          isVerified: user.provider?.isVerified || false,
          serviceName: user.provider?.companyName || '',
        };
        break;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      image: user.image,
      status: user.status,
      profileId,
      ...additionalInfo,
    };
  }

  // Renvoyer l'email de vérification
  async resendVerificationEmail(email: string, locale: SupportedLanguage = 'fr'): Promise<boolean> {
    // Trouver l'utilisateur
    const user = await this.db.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    if (user.emailVerified) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cet email est déjà vérifié',
      });
    }

    // Générer un nouveau token de vérification
    const verificationToken = await this.tokenService.createEmailVerificationToken(user.id);

    // Envoyer l'email de vérification
    await this.emailService.sendVerificationEmail(user.email, verificationToken, locale);

    return true;
  }
}
