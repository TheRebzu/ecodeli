import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  generateVerificationToken,
  generatePasswordResetToken,
  verifyVerificationToken,
  verifyPasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { validatePassword } from "@/lib/auth/password";

// Schéma de validation commun pour tous les types d'inscription
const baseRegistrationSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez saisir une adresse email valide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role: z.enum(["CLIENT", "DELIVERER", "MERCHANT", "PROVIDER"]),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
});

// Schéma spécifique pour l'inscription des clients
const clientRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal("CLIENT"),
});

// Schéma spécifique pour l'inscription des livreurs
const delivererRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal("DELIVERER"),
  vehicleType: z.string().min(1, "Le type de véhicule est requis"),
  licenseNumber: z.string().optional(),
  idCardNumber: z.string().optional(),
  availability: z.array(z.string()).optional(),
});

// Schéma spécifique pour l'inscription des commerçants
const merchantRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal("MERCHANT"),
  storeName: z
    .string()
    .min(2, "Le nom du commerce doit contenir au moins 2 caractères"),
  storeType: z.string().min(1, "Le type de commerce est requis"),
  siret: z
    .string()
    .min(14, "Le numéro SIRET doit contenir 14 caractères")
    .max(14),
});

// Schéma spécifique pour l'inscription des prestataires
const providerRegistrationSchema = baseRegistrationSchema.extend({
  role: z.literal("PROVIDER"),
  serviceType: z.string().min(1, "Le type de service est requis"),
  experience: z.string().optional(),
  hourlyRate: z.string().optional(),
  serviceArea: z.number().optional(),
  description: z.string().optional(),
  siret: z.string().optional(),
});

// Union des schémas pour valider tous les types d'inscription
const registrationSchema = z.discriminatedUnion("role", [
  clientRegistrationSchema,
  delivererRegistrationSchema,
  merchantRegistrationSchema,
  providerRegistrationSchema,
]);

export const authRouter = createTRPCRouter({
  // Procédure d'inscription
  register: publicProcedure
    .input(registrationSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        email,
        password,
        firstName,
        lastName,
        role,
        ...roleSpecificData
      } = input;
      const name = `${firstName} ${lastName}`;

      // Validation du mot de passe
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordValidation.message || "Mot de passe invalide",
        });
      }

      // Vérification si l'utilisateur existe déjà
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Un utilisateur avec cette adresse email existe déjà",
        });
      }

      // Hachage du mot de passe
      const hashedPassword = await hashPassword(password);

      // Création de l'utilisateur
      const user = await ctx.prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role,
        },
      });

      // Création du profil spécifique au rôle
      switch (role) {
        case "CLIENT":
          await ctx.prisma.clientProfile.create({
            data: {
              userId: user.id,
              phone: roleSpecificData.phone,
              address: roleSpecificData.address,
              city: roleSpecificData.city,
              postalCode: roleSpecificData.postalCode,
            },
          });
          break;

        case "DELIVERER":
          const delivererData = roleSpecificData as z.infer<
            typeof delivererRegistrationSchema
          >;
          await ctx.prisma.delivererProfile.create({
            data: {
              userId: user.id,
              vehicleType: delivererData.vehicleType,
              licenseNumber: delivererData.licenseNumber,
              idCardNumber: delivererData.idCardNumber,
              address: delivererData.address || "",
              city: delivererData.city || "",
              postalCode: delivererData.postalCode || "",
              availability: delivererData.availability || [],
              isVerified: false,
            },
          });
          break;

        case "MERCHANT":
          const merchantData = roleSpecificData as z.infer<
            typeof merchantRegistrationSchema
          >;
          await ctx.prisma.store.create({
            data: {
              name: merchantData.storeName,
              type: merchantData.storeType,
              description: "Description par défaut du commerce",
              siret: merchantData.siret,
              address: merchantData.address || "",
              city: merchantData.city || "",
              postalCode: merchantData.postalCode || "",
              phoneNumber: merchantData.phone || "",
              merchantId: user.id,
            },
          });
          break;

        case "PROVIDER":
          const providerData = roleSpecificData as z.infer<
            typeof providerRegistrationSchema
          >;
          await ctx.prisma.serviceProvider.create({
            data: {
              userId: user.id,
              serviceType: providerData.serviceType,
              experience: providerData.experience,
              hourlyRate: providerData.hourlyRate,
              address: providerData.address || "",
              city: providerData.city || "",
              postalCode: providerData.postalCode || "",
              serviceArea: providerData.serviceArea,
              description: providerData.description,
              siret: providerData.siret,
              isVerified: false,
            },
          });
          break;
      }

      // Génération et stockage du token de vérification
      const verificationToken = await generateVerificationToken(user.id);

      // Envoi de l'email de vérification
      await sendVerificationEmail(
        user.email,
        user.name || "Utilisateur",
        verificationToken,
      );

      return {
        success: true,
        message:
          "Inscription réussie. Veuillez vérifier votre email pour activer votre compte.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  // Procédure de vérification d'email
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await verifyVerificationToken(input.token);

      if (!userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le token de vérification est invalide ou a expiré",
        });
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilisateur non trouvé",
        });
      }

      return {
        success: true,
        message: "Votre adresse email a été vérifiée avec succès",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  // Procédure de demande de réinitialisation de mot de passe
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const token = await generatePasswordResetToken(input.email);

      if (!token) {
        // Ne pas révéler si l'email existe ou non pour des raisons de sécurité
        return {
          success: true,
          message:
            "Si cette adresse email est associée à un compte, un email de réinitialisation a été envoyé",
        };
      }

      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (user) {
        await sendPasswordResetEmail(
          user.email,
          user.name || "Utilisateur",
          token,
        );
      }

      return {
        success: true,
        message:
          "Si cette adresse email est associée à un compte, un email de réinitialisation a été envoyé",
      };
    }),

  // Procédure de réinitialisation de mot de passe
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validation du mot de passe
      const passwordValidation = validatePassword(input.password);
      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordValidation.message || "Mot de passe invalide",
        });
      }

      const userId = await verifyPasswordResetToken(input.token);

      if (!userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le token de réinitialisation est invalide ou a expiré",
        });
      }

      // Hachage du nouveau mot de passe
      const hashedPassword = await hashPassword(input.password);

      // Mise à jour du mot de passe
      await ctx.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Consommation du token
      await consumePasswordResetToken(input.token);

      return {
        success: true,
        message: "Votre mot de passe a été réinitialisé avec succès",
      };
    }),

  // Procédure pour obtenir le profil de l'utilisateur connecté
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        emailVerified: true,
        clientProfile: true,
        delivererProfile: true,
        serviceProvider: true,
        stores: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Utilisateur non trouvé",
      });
    }

    return user;
  }),

  // Procédure pour mettre à jour le profil de l'utilisateur connecté
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      // Mise à jour des informations de base de l'utilisateur
      const updatedUser = await ctx.prisma.user.update({
        where: { id: userId },
        data: {
          name: input.name,
          image: input.image,
        },
      });

      // Mise à jour des informations spécifiques au rôle
      switch (userRole) {
        case "CLIENT":
          await ctx.prisma.clientProfile.upsert({
            where: { userId },
            update: {
              phone: input.phone,
              address: input.address,
              city: input.city,
              postalCode: input.postalCode,
            },
            create: {
              userId,
              phone: input.phone,
              address: input.address,
              city: input.city,
              postalCode: input.postalCode,
            },
          });
          break;

        case "DELIVERER":
          await ctx.prisma.delivererProfile.update({
            where: { userId },
            data: {
              address: input.address,
              city: input.city,
              postalCode: input.postalCode,
            },
          });
          break;

        case "PROVIDER":
          await ctx.prisma.serviceProvider.update({
            where: { userId },
            data: {
              address: input.address,
              city: input.city,
              postalCode: input.postalCode,
            },
          });
          break;
      }

      return {
        success: true,
        message: "Profil mis à jour avec succès",
        user: updatedUser,
      };
    }),

  // Procédure pour changer le mot de passe de l'utilisateur connecté
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: {
          password: true,
        },
      });

      if (!user || !user.password) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "Utilisateur non trouvé ou connecté via un fournisseur externe",
        });
      }

      // Vérification du mot de passe actuel
      const isValid = await verifyPassword(
        input.currentPassword,
        user.password,
      );

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Mot de passe actuel incorrect",
        });
      }

      // Validation du nouveau mot de passe
      const passwordValidation = validatePassword(input.newPassword);
      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            passwordValidation.message || "Nouveau mot de passe invalide",
        });
      }

      // Hachage et mise à jour du nouveau mot de passe
      const hashedPassword = await hashPassword(input.newPassword);

      await ctx.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return {
        success: true,
        message: "Mot de passe changé avec succès",
      };
    }),
});
