import { router, publicProcedure, protectedProcedure, adminProcedure } from "../trpc";
import { AuthService } from "../../services/auth.service";
import { DocumentService } from "../../services/document.service";
import { 
  clientRegisterSchema,
  delivererRegisterSchema,
  merchantRegisterSchema,
  providerRegisterSchema,
  verifyEmailSchema,
  forgotPasswordSchema, 
  resetPasswordSchema,
} from "../../../schemas/auth";
import { z } from "zod";
import { DocumentType } from "@prisma/client";
import { DocumentStatus } from "../../db/enums";
import { TRPCError } from "@trpc/server";

const authService = new AuthService();
const documentService = new DocumentService();

export const authRouter = router({
  // Inscription d'un client
  registerClient: publicProcedure
    .input(clientRegisterSchema)
    .mutation(async ({ input }) => {
      return await authService.registerClient(input);
    }),

  // Inscription d'un livreur
  registerDeliverer: publicProcedure
    .input(delivererRegisterSchema)
    .mutation(async ({ input }) => {
      // Mapper les données du schéma aux paramètres attendus par le service
      const delivererData = {
        email: input.email,
        password: input.password,
        name: input.name,
        address: input.address || "", // Garantir que l'adresse n'est jamais undefined
        phone: input.phone,
        vehicleType: input.vehicleType,
        licensePlate: input.licensePlate
      };
      
      return await authService.registerDeliverer(delivererData);
    }),
  
  // Inscription d'un commerçant
  registerMerchant: publicProcedure
    .input(merchantRegisterSchema)
    .mutation(async ({ input }) => {
      return await authService.registerMerchant(input);
    }),
  
  // Inscription d'un prestataire
  registerProvider: publicProcedure
    .input(providerRegisterSchema)
    .mutation(async ({ input }) => {
      return await authService.registerProvider(input);
    }),
  
  // Vérification d'email
  verifyEmail: publicProcedure
    .input(verifyEmailSchema)
    .mutation(async ({ input }) => {
      return await authService.verifyEmail(input.token);
    }),
  
  // Demande de réinitialisation de mot de passe
  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ input }) => {
      return await authService.forgotPassword(input.email);
    }),
  
  // Réinitialisation de mot de passe
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input }) => {
      return await authService.resetPassword(input.token, input.password);
    }),
  
  // Configuration de l'authentification à deux facteurs
  setupTwoFactor: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour effectuer cette action",
        });
      }
      return await authService.setupTwoFactor(userId);
    }),

  // Vérification du code d'authentification à deux facteurs
  verifyTwoFactor: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour effectuer cette action",
        });
      }
      return await authService.verifyTwoFactor(userId, input.token);
    }),

  // Désactivation de l'authentification à deux facteurs
  disableTwoFactor: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour effectuer cette action",
        });
      }
      return await authService.disableTwoFactor(userId);
    }),

  // Téléchargement d'un document pour vérification
  uploadDocument: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(DocumentType),
        file: z.any(), // En pratique, géré par le middleware de chargement de fichiers
        expiryDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour effectuer cette action",
        });
      }
      
      // Simuler un fichier pour l'exemple (à remplacer par le vrai fichier en production)
      const mockFile = {
        buffer: Buffer.from("fichier simulé"),
        filename: "document.pdf",
        mimetype: "application/pdf",
      };
      return await documentService.uploadDocument(
        userId,
        input.type,
        mockFile,
        input.expiryDate
      );
    }),

  // Obtenir les documents d'un utilisateur
  getUserDocuments: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour effectuer cette action",
        });
      }
      return await documentService.getUserDocuments(userId);
    }),
  
  // Vérification d'un document (admin uniquement)
  verifyDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        status: z.enum(["APPROVED", "REJECTED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const adminId = ctx.session?.user?.id;
      if (!adminId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté en tant qu'administrateur pour effectuer cette action",
        });
      }
      
      let docStatus: DocumentStatus;
      if (input.status === "APPROVED") {
        docStatus = DocumentStatus.APPROVED;
      } else {
        docStatus = DocumentStatus.REJECTED;
      }
      
      return await documentService.verifyDocument({
        documentId: input.documentId,
        status: docStatus,
        adminId,
        rejectionReason: input.notes
      });
    }),
  
  // Obtenir l'utilisateur actuel (session)
  getSession: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour effectuer cette action",
        });
      }
      
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          image: true,
          emailVerified: true,
          phoneNumber: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          client: true,
          deliverer: true,
          merchant: true,
          provider: true,
          admin: true,
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
});