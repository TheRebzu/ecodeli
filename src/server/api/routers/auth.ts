import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { hash, compare } from 'bcrypt';
import { router, publicProcedure, protectedProcedure } from '@/lib/trpc';
import { prisma } from '@/lib/prisma';
import { generateVerificationToken, validateVerificationToken, generatePasswordResetToken, validatePasswordResetToken } from '@/lib/tokens';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '@/lib/email';

// Basic registration schema
const baseRegistrationSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez saisir une adresse email valide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une lettre minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  role: z.enum(["CLIENT", "DELIVERER", "MERCHANT", "PROVIDER"]),
  phone: z.string().optional(),
});

// Role-specific schemas
const clientSchema = baseRegistrationSchema;

const delivererSchema = baseRegistrationSchema.extend({
  vehicleType: z.string().min(1, "Le type de véhicule est requis"),
  licenseNumber: z.string().min(1, "Le numéro de permis est requis"),
  idCardNumber: z.string().min(1, "Le numéro de carte d'identité est requis"),
  address: z.string().min(5, "L'adresse doit contenir au moins 5 caractères"),
  city: z.string().min(2, "La ville doit contenir au moins 2 caractères"),
  postalCode: z.string().regex(/^\d{5}$/, "Le code postal doit contenir 5 chiffres"),
  availability: z.array(z.string()).optional(),
});

const merchantSchema = baseRegistrationSchema.extend({
  storeName: z.string().min(2, "Le nom du commerce doit contenir au moins 2 caractères"),
  storeType: z.string().min(1, "Le type de commerce est requis"),
  address: z.string().min(5, "L'adresse doit contenir au moins 5 caractères"),
  city: z.string().min(2, "La ville doit contenir au moins 2 caractères"),
  postalCode: z.string().regex(/^\d{5}$/, "Le code postal doit contenir 5 chiffres"),
  siret: z.string().regex(/^\d{14}$/, "Le numéro SIRET doit contenir 14 chiffres"),
});

const providerSchema = baseRegistrationSchema.extend({
  serviceType: z.string().min(1, "Le type de service est requis"),
  experience: z.string().optional(),
  address: z.string().min(5, "L'adresse doit contenir au moins 5 caractères"),
  city: z.string().min(2, "La ville doit contenir au moins 2 caractères"),
  postalCode: z.string().regex(/^\d{5}$/, "Le code postal doit contenir 5 chiffres"),
  serviceArea: z.number().optional(),
  description: z.string().optional(),
  hourlyRate: z.string().optional(),
  siret: z.string().optional(),
});

// Union of all registration schemas
const registrationSchema = z.discriminatedUnion('role', [
  clientSchema.extend({ role: z.literal('CLIENT') }),
  delivererSchema.extend({ role: z.literal('DELIVERER') }),
  merchantSchema.extend({ role: z.literal('MERCHANT') }),
  providerSchema.extend({ role: z.literal('PROVIDER') }),
]);

export const authRouter = router({
  signUp: publicProcedure
    .input(registrationSchema)
    .mutation(async ({ input }) => {
      const { email, password, firstName, lastName, role, ...roleSpecificData } = input;
      const name = `${firstName} ${lastName}`;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Un utilisateur avec cette adresse email existe déjà',
        });
      }

      // Hash password
      const hashedPassword = await hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: role,
        },
      });

      // Create role-specific profile
      if (role === 'MERCHANT' && 'storeName' in roleSpecificData && 'storeType' in roleSpecificData) {
        await prisma.store.create({
          data: {
            name: roleSpecificData.storeName,
            description: 'Description par défaut du commerce',
            type: roleSpecificData.storeType,
            siret: roleSpecificData.siret,
            address: roleSpecificData.address,
            city: roleSpecificData.city,
            postalCode: roleSpecificData.postalCode,
            phoneNumber: roleSpecificData.phone || '',
            merchantId: user.id,
          },
        });
      } else if (role === 'DELIVERER' && 'vehicleType' in roleSpecificData) {
        await prisma.delivererProfile.create({
          data: {
            userId: user.id,
            vehicleType: roleSpecificData.vehicleType,
            licenseNumber: roleSpecificData.licenseNumber,
            idCardNumber: roleSpecificData.idCardNumber,
            address: roleSpecificData.address,
            city: roleSpecificData.city,
            postalCode: roleSpecificData.postalCode,
            availability: roleSpecificData.availability,
            isVerified: false,
          },
        });
      } else if (role === 'PROVIDER' && 'serviceType' in roleSpecificData) {
        await prisma.serviceProvider.create({
          data: {
            userId: user.id,
            serviceType: roleSpecificData.serviceType,
            experience: roleSpecificData.experience,
            hourlyRate: roleSpecificData.hourlyRate,
            address: roleSpecificData.address,
            city: roleSpecificData.city,
            postalCode: roleSpecificData.postalCode,
            serviceArea: roleSpecificData.serviceArea,
            description: roleSpecificData.description,
            siret: roleSpecificData.siret,
            isVerified: false,
          },
        });
      } else if (role === 'CLIENT') {
        // Client profile with optional phone
        await prisma.clientProfile.create({
          data: {
            userId: user.id,
            phone: roleSpecificData.phone,
          },
        });
      }

      // Generate and store verification token
      const verificationToken = await generateVerificationToken(user.id);

      // Send verification email
      await sendVerificationEmail(
        user.email,
        user.name || 'Utilisateur',
        verificationToken
      );

      return {
        status: 201,
        message: 'Inscription réussie. Veuillez vérifier votre email pour activer votre compte.',
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const { token } = input;
      
      // Validate token
      const result = await validateVerificationToken(token);
      
      if (!result.valid || !result.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Le lien de vérification est invalide ou a expiré',
        });
      }
      
      // Update user
      const user = await prisma.user.update({
        where: { id: result.userId },
        data: { emailVerified: new Date() }
      });
      
      // Send welcome email
      await sendWelcomeEmail(user.email, user.name || 'Utilisateur');
      
      return {
        success: true,
        message: 'Votre adresse email a été vérifiée avec succès',
      };
    }),

  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const { email } = input;
      
      // Generate reset token (function handles finding the user)
      const token = await generatePasswordResetToken(email);
      
      if (token) {
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() }
        });
        
        if (user) {
          // Send reset email
          await sendPasswordResetEmail(
            user.email,
            user.name || 'Utilisateur',
            token
          );
        }
      }
      
      // Always return success to prevent email enumeration
      return {
        success: true,
        message: 'Si votre adresse est associée à un compte, un email de réinitialisation a été envoyé',
      };
    }),

  resetPassword: publicProcedure
    .input(z.object({ 
      token: z.string(),
      password: z.string()
        .min(8, "Le mot de passe doit contenir au moins 8 caractères")
        .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule")
        .regex(/[a-z]/, "Le mot de passe doit contenir au moins une lettre minuscule")
        .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
    }))
    .mutation(async ({ input }) => {
      const { token, password } = input;
      
      // Validate token
      const result = await validatePasswordResetToken(token);
      
      if (!result.valid || !result.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Le lien de réinitialisation est invalide ou a expiré',
        });
      }
      
      // Hash new password
      const hashedPassword = await hash(password, 12);
      
      // Update user
      await prisma.user.update({
        where: { id: result.userId },
        data: { password: hashedPassword }
      });
      
      return {
        success: true,
        message: 'Votre mot de passe a été réinitialisé avec succès',
      };
    }),

  validateSession: protectedProcedure.query(async ({ ctx }) => {
    return {
      user: ctx.session.user,
    };
  }),

  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string()
        .min(8, "Le mot de passe doit contenir au moins 8 caractères")
        .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule")
        .regex(/[a-z]/, "Le mot de passe doit contenir au moins une lettre minuscule")
        .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
    }))
    .mutation(async ({ ctx, input }) => {
      const { currentPassword, newPassword } = input;
      const userId = ctx.session.user.id;
      
      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });
      
      if (!user || !user.password) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Compte non valide pour cette opération',
        });
      }
      
      // Verify current password
      const passwordValid = await compare(currentPassword, user.password);
      
      if (!passwordValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Le mot de passe actuel est incorrect',
        });
      }
      
      // Hash and update new password
      const hashedPassword = await hash(newPassword, 12);
      
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });
      
      return {
        success: true,
        message: 'Votre mot de passe a été modifié avec succès',
      };
    }),
}); 