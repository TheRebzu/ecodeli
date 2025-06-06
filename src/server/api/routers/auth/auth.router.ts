import { router, publicProcedure, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { AuthService } from '@/server/services/auth/auth.service';
import { DocumentService } from '@/server/services/common/document.service';
import {
  registrationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  twoFactorSchema,
  emailSchema,
  passwordSchema,
} from '@/schemas/validation';
import { accountVerificationSchema } from '@/schemas/auth/verification.schema';
import { createAdminSchema } from '@/schemas/admin/admin.schema';
import { z } from 'zod';
import { DocumentType, UserRole, VerificationStatus } from '@prisma/client';
import { DocumentStatus } from '@/server/db/enums';
import { TRPCError } from '@trpc/server';
import { authenticator } from 'otplib';
import { hashPassword, verifyPassword } from '@/lib/security/passwords';
import { sendEmailNotification } from '@/lib/services/email.service';
import { generateVerificationToken, generatePasswordResetToken } from '@/lib/security/tokens';
import { generateTOTPSecret, generateBackupCodes } from '@/lib/security/totp';
import { format } from 'date-fns';
import path from 'path';
import fs from 'fs/promises';
import { getUserDocumentsWithFullStatus } from '@/utils/document-utils';

const authService = new AuthService();
const documentService = new DocumentService();

// Schéma de validation pour l'inscription
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  role: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER']),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  siret: z.string().optional(),
  address: z.string().optional(),
});

export const authRouter = router({
  // Méthode pour l'inscription utilisateur (tous rôles)
  register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
    const { email, password, name, role } = input;

    try {
      // Vérification si l'email existe déjà
      const existingUser = await ctx.db.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cet email est déjà utilisé',
        });
      }

      // Hashage du mot de passe
      const hashedPassword = await hashPassword(password);

      // Création de l'utilisateur sans les relations pour simplifier
      const user = await ctx.db.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          emailVerified: null,
        },
      });

      // Note: En attendant de corriger le modèle Prisma, nous ne créons pas les profils spécifiques
      // pour chaque rôle. À implémenter une fois le modèle corrigé.

      return {
        success: true,
        userId: user.id,
        role: user.role,
      };
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Une erreur est survenue lors de l'inscription",
      });
    }
  }),

  // Vérification de l'email
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { token } = input;

      try {
        // Utiliser le service AuthService pour vérifier le token
        const authService = new AuthService(ctx.db);
        const success = await authService.verifyEmail(token);

        if (!success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Token de vérification invalide ou expiré',
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Erreur lors de la vérification de l'email:", error);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Token de vérification invalide ou expiré',
        });
      }
    }),

  // Demande de réinitialisation de mot de passe
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { email } = input;

      const user = await ctx.db.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Ne pas indiquer si l'email existe ou non (sécurité)
        return { success: true };
      }

      const resetTokenData = await generatePasswordResetToken();
      const resetToken = resetTokenData.token; // Extraire juste la chaîne
      const expiresAt = resetTokenData.expiresAt;

      await ctx.db.passwordResetToken.create({
        data: {
          token: resetToken,
          expiresAt,
          userId: user.id,
        },
      });

      // Envoi de l'email de réinitialisation
      await sendPasswordResetEmail(user.email, user.name, resetToken);

      return { success: true };
    }),

  // Réinitialisation de mot de passe
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { token, password } = input;

      const resetToken = await ctx.db.passwordResetToken.findFirst({
        where: {
          token,
          expiresAt: {
            gt: new Date(),
          },
          usedAt: null,
        },
        include: {
          user: true,
        },
      });

      if (!resetToken) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Token invalide ou expiré',
        });
      }

      // Hashage du nouveau mot de passe
      const hashedPassword = await hashPassword(password);

      // Mise à jour du mot de passe
      await ctx.db.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
        },
      });

      // Marquage du token comme utilisé
      await ctx.db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          usedAt: new Date(),
        },
      });

      return { success: true };
    }),

  // Renvoyer l'email de vérification
  resendVerificationEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { email } = input;

      // On utilise le service d'authentification pour gérer l'envoi de l'email
      const authService = new AuthService(ctx.db);

      try {
        // Vérifier si l'email existe et n'est pas déjà vérifié
        const user = await ctx.db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            emailVerified: true,
          },
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

        // Générer un nouveau token et envoyer l'email via le service
        const locale = ctx.locale || 'fr';
        await authService.resendVerificationEmail(email, locale);

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erreur lors de l'envoi de l'email de vérification",
        });
      }
    }),

  // Upload de document de vérification
  uploadDocument: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(DocumentType),
        fileData: z.string(), // Base64
        fileName: z.string(),
        mimeType: z.string(),
        expiryDate: z.date().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { type, fileData, fileName, mimeType, expiryDate, description } = input;

      console.log(
        `Début de l'upload de document: ${type} pour l'utilisateur ${user.id} (${user.role})`
      );
      console.log(
        `Le document a une date d'expiration: ${expiryDate ? format(expiryDate, 'yyyy-MM-dd') : 'Non'}`
      );

      // Vérifier si l'utilisateur est autorisé à uploader des documents
      if (!['DELIVERER', 'MERCHANT', 'PROVIDER'].includes(user.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à uploader des documents",
        });
      }

      try {
        // Créer un nom de fichier unique
        const uniqueFilename = `${user.id}_${Date.now()}_${fileName.replace(/[^a-z0-9.]/gi, '_')}`;

        // Définir le chemin du répertoire utilisateur
        const userUploadDir = path.join(process.cwd(), 'public', 'uploads', user.id);

        // S'assurer que le répertoire utilisateur existe
        try {
          await fs.mkdir(userUploadDir, { recursive: true });
          console.log(`Répertoire créé ou vérifié: ${userUploadDir}`);
        } catch (dirError) {
          console.error(`Erreur lors de la création du répertoire: ${userUploadDir}`, dirError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Impossible de créer le répertoire de stockage',
          });
        }

        // Chemin complet du fichier
        const filePath = path.join(userUploadDir, uniqueFilename);

        // URL relative pour accéder au fichier depuis le web
        const fileUrl = `/uploads/${user.id}/${uniqueFilename}`;

        // Extraire les données du base64
        let fileBuffer: Buffer;
        try {
          // Extraire le contenu réel du base64 (supprimer le préfixe data:image/jpeg;base64,)
          const base64Data = fileData.split(',')[1] || fileData;
          fileBuffer = Buffer.from(base64Data, 'base64');
        } catch (base64Error) {
          console.error('Erreur lors du décodage base64:', base64Error);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Format de fichier invalide',
          });
        }

        // Écrire le fichier sur le disque
        try {
          await fs.writeFile(filePath, fileBuffer);
          console.log(`Fichier écrit avec succès: ${filePath} (${fileBuffer.length} octets)`);
        } catch (writeError) {
          console.error("Erreur lors de l'écriture du fichier:", writeError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: "Erreur lors de l'enregistrement du fichier",
          });
        }

        // Taille réelle du fichier
        const fileSize = fileBuffer.length;

        // Création du document avec les données minimales requises
        const documentData = {
          userId: user.id,
          userRole: user.role,
          type,
          filename: uniqueFilename,
          fileUrl,
          mimeType,
          fileSize,
          uploadedAt: new Date(),
          isVerified: false,
          verificationStatus: VerificationStatus.PENDING,
        };

        // Ajouter les champs optionnels si présents
        if (expiryDate) {
          console.log(`Date d'expiration définie: ${format(expiryDate, 'yyyy-MM-dd')}`);
          // @ts-ignore - Ignorer l'erreur TypeScript ici car nous savons que le champ existe
          documentData.expiryDate = expiryDate;
        }

        if (description) {
          // @ts-ignore - Ignorer l'erreur TypeScript ici car nous savons que le champ existe
          documentData.notes = description;
        }

        console.log('Création du document avec les données:', {
          ...documentData,
          fileData: '[CONTENU REDACTÉ]',
        });

        // Créer le document
        const document = await ctx.db.document.create({
          data: documentData,
        });

        // Créer une demande de vérification pour ce document
        await ctx.db.verification.create({
          data: {
            submitterId: user.id,
            documentId: document.id,
            status: VerificationStatus.PENDING,
            requestedAt: new Date(),
          },
        });

        console.log(`Document créé avec succès: ${document.id}`);
        return document;
      } catch (error) {
        console.error(`Erreur lors de l'upload du document:`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erreur lors de l'upload du document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Récupérer les documents de l'utilisateur avec le statut consistant
  getUserDocuments: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    // Utiliser la fonction utilitaire pour récupérer les documents avec statut complet
    const documents = await getUserDocumentsWithFullStatus(user.id, user.role);

    // Map uploadedAt to createdAt for frontend compatibility
    // Also handle SELFIE documents stored as OTHER with notes containing "SELFIE"
    return documents.map(doc => ({
      ...doc,
      createdAt: doc.uploadedAt,
      // If document is OTHER type but has notes containing "SELFIE" (case insensitive), correct the type for frontend
      type:
        doc.type === 'OTHER' && doc.notes && doc.notes.toLowerCase().includes('selfie')
          ? 'SELFIE'
          : doc.type,
    }));
  }),

  // Vérifier un document (pour admin)
  verifyDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        status: z.enum(['APPROVED', 'REJECTED']),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { documentId, status, notes } = input;

      // Vérifier si l'utilisateur est admin
      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à vérifier des documents",
        });
      }

      const document = await ctx.db.document.findUnique({
        where: { id: documentId },
        include: {
          user: true,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document non trouvé',
        });
      }

      // Créer une entrée dans l'historique des vérifications
      await ctx.db.documentVerification.create({
        data: {
          documentId,
          verifierId: user.id,
          status: status as VerificationStatus,
          notes,
        },
      });

      // Mettre à jour le statut du document
      const updatedDocument = await ctx.db.document.update({
        where: { id: documentId },
        data: {
          status,
          rejectionReason: status === 'REJECTED' ? notes : null,
        },
      });

      // Si tous les documents requis sont approuvés, mettre à jour le statut du profil
      if (status === 'APPROVED') {
        const userDocuments = await ctx.db.document.findMany({
          where: {
            userId: document.userId,
          },
        });

        const requiredDocumentsApproved =
          document.userRole === 'DELIVERER'
            ? userDocuments.filter(
                doc =>
                  ['ID_CARD', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION', 'INSURANCE'].includes(
                    doc.type
                  ) && doc.status === 'APPROVED'
              ).length >= 4
            : document.userRole === 'PROVIDER'
              ? userDocuments.filter(
                  doc =>
                    [
                      'ID_CARD',
                      'QUALIFICATION_CERTIFICATE',
                      'PROOF_OF_ADDRESS',
                      'INSURANCE',
                    ].includes(doc.type) && doc.status === 'APPROVED'
                ).length >= 4
              : document.userRole === 'MERCHANT'
                ? userDocuments.filter(
                    doc =>
                      ['ID_CARD', 'BUSINESS_REGISTRATION', 'PROOF_OF_ADDRESS'].includes(doc.type) &&
                      doc.status === 'APPROVED'
                  ).length >= 3
                : false;

        if (requiredDocumentsApproved) {
          // Mettre à jour le statut de vérification du profil spécifique
          if (document.userRole === 'DELIVERER') {
            await ctx.db.delivererProfile.updateMany({
              where: { profileId: document.profileId },
              data: { verificationStatus: 'VERIFIED' },
            });
          } else if (document.userRole === 'PROVIDER') {
            await ctx.db.providerProfile.updateMany({
              where: { profileId: document.profileId },
              data: { verificationStatus: 'VERIFIED' },
            });
          } else if (document.userRole === 'MERCHANT') {
            await ctx.db.merchantProfile.updateMany({
              where: { profileId: document.profileId },
              data: { verificationStatus: 'VERIFIED' },
            });
          }
        }
      }

      return updatedDocument;
    }),

  // Configuration de l'authentification à deux facteurs
  setupTwoFactor: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    const userWithTwoFactor = await ctx.db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!userWithTwoFactor) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Si 2FA est déjà activé, générer de nouveaux codes de secours
    if (userWithTwoFactor.twoFactorEnabled) {
      const backupCodes = await ctx.db.twoFactorBackupCode.findMany({
        where: { userId: user.id },
        select: { code: true },
      });

      return {
        isEnabled: true,
        backupCodes: backupCodes.map(bc => bc.code),
      };
    }

    // Générer un nouveau secret TOTP
    const secret = generateTOTPSecret();
    const otpauth = authenticator.keyuri(user.email, 'EcoDeli', secret);

    // Stocker temporairement le secret non vérifié
    await ctx.db.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      },
    });

    return {
      isEnabled: false,
      secret,
      qrCodeUrl: `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauth)}`,
    };
  }),

  // Vérification du code TOTP lors de la configuration
  verifyTwoFactor: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { token } = input;
      const { user } = ctx.session;

      const userWithSecret = await ctx.db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          twoFactorSecret: true,
        },
      });

      if (!userWithSecret?.twoFactorSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Secret TOTP non configuré',
        });
      }

      // Vérifier le code TOTP
      const isValid = authenticator.verify({
        token,
        secret: userWithSecret.twoFactorSecret,
      });

      if (!isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Code de vérification invalide',
        });
      }

      // Générer des codes de secours
      const backupCodes = generateBackupCodes();

      // Activer 2FA et enregistrer les codes de secours
      await ctx.db.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
        },
      });

      // Supprimer les anciens codes de secours si existants
      await ctx.db.twoFactorBackupCode.deleteMany({
        where: { userId: user.id },
      });

      // Enregistrer les nouveaux codes de secours
      await Promise.all(
        backupCodes.map(code =>
          ctx.db.twoFactorBackupCode.create({
            data: {
              userId: user.id,
              code,
              used: false,
            },
          })
        )
      );

      return true;
    }),

  // Désactiver l'authentification à deux facteurs
  disableTwoFactor: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx.session;

    await ctx.db.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    // Supprimer les codes de secours
    await ctx.db.twoFactorBackupCode.deleteMany({
      where: { userId: user.id },
    });

    return { success: true };
  }),

  // Vérifier si l'utilisateur a complété son profil
  checkProfileCompletion: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    // Vérifier si l'utilisateur a un profil
    const profile = await ctx.db.profile.findUnique({
      where: { userId: user.id },
      include: {
        client: true,
        deliverer: true,
        merchant: true,
        provider: true,
      },
    });

    if (!profile) {
      return { isComplete: false, missingFields: ['profile'] };
    }

    const missingFields: string[] = [];

    // Récupérer tous les documents de l'utilisateur avec statut complet
    const documents = await getUserDocumentsWithFullStatus(user.id, user.role);

    // Helper pour vérifier la présence d'un type de document
    const hasDoc = (type: string) => documents.some(doc => doc.type === type);

    // Vérifier selon le rôle de l'utilisateur
    switch (user.role) {
      case 'CLIENT':
        if (!profile.client?.phone) missingFields.push('phone');
        break;
      case 'DELIVERER':
        if (!profile.deliverer?.phone) missingFields.push('phone');
        if (!hasDoc('ID_CARD')) missingFields.push('ID_CARD');
        if (!hasDoc('DRIVING_LICENSE')) missingFields.push('DRIVING_LICENSE');
        if (!hasDoc('VEHICLE_REGISTRATION')) missingFields.push('VEHICLE_REGISTRATION');
        if (!hasDoc('INSURANCE')) missingFields.push('INSURANCE');
        break;
      case 'MERCHANT':
        if (!profile.merchant?.companyName) missingFields.push('companyName');
        if (!profile.merchant?.siret) missingFields.push('siret');
        if (!profile.merchant?.address) missingFields.push('address');
        if (!hasDoc('ID_CARD')) missingFields.push('ID_CARD');
        if (!hasDoc('BUSINESS_REGISTRATION')) missingFields.push('BUSINESS_REGISTRATION');
        if (!hasDoc('PROOF_OF_ADDRESS')) missingFields.push('PROOF_OF_ADDRESS');
        break;
      case 'PROVIDER':
        if (!profile.provider?.companyName) missingFields.push('companyName');
        if (!profile.provider?.siret) missingFields.push('siret');
        if (!profile.provider?.address) missingFields.push('address');
        if (!hasDoc('ID_CARD')) missingFields.push('ID_CARD');
        if (!hasDoc('QUALIFICATION_CERTIFICATE')) missingFields.push('QUALIFICATION_CERTIFICATE');
        if (!hasDoc('PROOF_OF_ADDRESS')) missingFields.push('PROOF_OF_ADDRESS');
        if (!hasDoc('INSURANCE')) missingFields.push('INSURANCE');
        break;
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields,
      verificationStatus: getUserVerificationStatus(user.role, profile),
    };
  }),

  // Vérification d'un compte livreur (admin uniquement)
  verifyDelivererAccount: adminProcedure
    .input(accountVerificationSchema)
    .mutation(async ({ ctx, input }) => {
      const adminId = ctx.session.user.id;
      return await authService.verifyDelivererAccount(
        input.profileId,
        adminId,
        input.approved,
        input.notes
      );
    }),

  // Vérification d'un compte commerçant (admin uniquement)
  verifyMerchantAccount: adminProcedure
    .input(accountVerificationSchema)
    .mutation(async ({ ctx, input }) => {
      const adminId = ctx.session.user.id;
      return await authService.verifyMerchantAccount(
        input.profileId,
        adminId,
        input.approved,
        input.notes
      );
    }),

  // Vérification d'un compte prestataire (admin uniquement)
  verifyProviderAccount: adminProcedure
    .input(accountVerificationSchema)
    .mutation(async ({ ctx, input }) => {
      const adminId = ctx.session.user.id;
      return await authService.verifyProviderAccount(
        input.profileId,
        adminId,
        input.approved,
        input.notes
      );
    }),

  // Création d'un administrateur (super-admin uniquement)
  createAdmin: adminProcedure.input(createAdminSchema).mutation(async ({ ctx, input }) => {
    const superAdminId = ctx.session.user.id;
    return await authService.createAdmin(superAdminId, input);
  }),

  // Récupération des informations de session
  getSession: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;
    return await authService.getSession(user.id);
  }),
});

// Fonction pour déterminer le statut de vérification selon le rôle
function getUserVerificationStatus(userRole: string, profile: any) {
  if (userRole === 'CLIENT') return 'VERIFIED'; // Les clients n'ont pas besoin de vérification

  if (userRole === 'DELIVERER' && profile.deliverer) {
    return profile.deliverer.verificationStatus;
  }

  if (userRole === 'MERCHANT' && profile.merchant) {
    return profile.merchant.verificationStatus;
  }

  if (userRole === 'PROVIDER' && profile.provider) {
    return profile.provider.verificationStatus;
  }

  return 'PENDING';
}
