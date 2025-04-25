import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";

export const documentsRouter = createTRPCRouter({
  // Récupérer la liste des documents de l'utilisateur connecté
  getMyDocuments: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const documents = await ctx.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return documents;
  }),

  // Récupérer le statut de vérification de l'utilisateur connecté
  getVerificationStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const userRole = ctx.session.user.role;

    // Vérifier si l'utilisateur a un rôle qui nécessite une vérification
    if (!["DELIVERER", "MERCHANT", "PROVIDER"].includes(userRole)) {
      return {
        requiresVerification: false,
        isVerified: true,
        status: "NOT_REQUIRED",
        requiredDocuments: [],
        uploadedDocuments: [],
      };
    }

    // Récupérer les documents téléchargés par l'utilisateur
    const uploadedDocuments = await ctx.prisma.document.findMany({
      where: { userId },
    });

    // Définir les documents requis en fonction du rôle
    let requiredDocuments: string[] = [];
    let isVerified = false;

    switch (userRole) {
      case "DELIVERER":
        // Vérifier si le profil du livreur est vérifié
        const delivererProfile = await ctx.prisma.delivererProfile.findUnique({
          where: { userId },
        });
        isVerified = delivererProfile?.isVerified || false;
        requiredDocuments = ["ID_CARD", "DRIVER_LICENSE", "INSURANCE"];
        break;

      case "MERCHANT":
        // Vérifier si le commerce est vérifié
        const store = await ctx.prisma.store.findFirst({
          where: { merchantId: userId },
        });
        isVerified = store?.isVerified || false;
        requiredDocuments = ["BUSINESS_REGISTRATION", "INSURANCE", "ID_CARD"];
        break;

      case "PROVIDER":
        // Vérifier si le prestataire est vérifié
        const serviceProvider = await ctx.prisma.serviceProvider.findUnique({
          where: { userId },
        });
        isVerified = serviceProvider?.isVerified || false;
        requiredDocuments = ["ID_CARD", "QUALIFICATION", "INSURANCE"];
        break;
    }

    // Vérifier si tous les documents requis ont été téléchargés
    const uploadedDocumentTypes = uploadedDocuments.map((doc) => doc.type);
    const missingDocuments = requiredDocuments.filter(
      (docType) => !uploadedDocumentTypes.includes(docType),
    );

    // Déterminer le statut de vérification
    let status = "PENDING";
    if (isVerified) {
      status = "VERIFIED";
    } else if (missingDocuments.length > 0) {
      status = "INCOMPLETE";
    } else if (uploadedDocuments.some((doc) => doc.status === "REJECTED")) {
      status = "REJECTED";
    }

    return {
      requiresVerification: true,
      isVerified,
      status,
      requiredDocuments,
      uploadedDocuments,
      missingDocuments,
    };
  }),

  // Supprimer un document
  deleteDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier si le document appartient à l'utilisateur
      const document = await ctx.prisma.document.findUnique({
        where: { id: input.documentId },
      });

      if (!document || document.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à supprimer ce document",
        });
      }

      // Supprimer le document
      await ctx.prisma.document.delete({
        where: { id: input.documentId },
      });

      return {
        success: true,
        message: "Document supprimé avec succès",
      };
    }),

  // Pour les administrateurs : récupérer les documents en attente de vérification
  getPendingDocuments: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
        role: z.enum(["DELIVERER", "MERCHANT", "PROVIDER"]).optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Vérifier si l'utilisateur est un administrateur
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder à cette ressource",
        });
      }

      // Construire la requête
      const where: any = {};
      if (input.status) {
        where.status = input.status;
      }

      if (input.role) {
        where.user = {
          role: input.role,
        };
      }

      // Calculer le nombre total de documents
      const totalCount = await ctx.prisma.document.count({ where });

      // Récupérer les documents paginés
      const documents = await ctx.prisma.document.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      });

      return {
        documents,
        pagination: {
          total: totalCount,
          page: input.page,
          limit: input.limit,
          pages: Math.ceil(totalCount / input.limit),
        },
      };
    }),

  // Pour les administrateurs : vérifier un document
  verifyDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        status: z.enum(["VERIFIED", "REJECTED"]),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Vérifier si l'utilisateur est un administrateur
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à effectuer cette action",
        });
      }

      // Mettre à jour le statut du document
      const document = await ctx.prisma.document.update({
        where: { id: input.documentId },
        data: {
          status: input.status,
          adminComment: input.comment,
          verifiedAt: input.status === "VERIFIED" ? new Date() : null,
          verifiedBy: input.status === "VERIFIED" ? ctx.session.user.id : null,
        },
        include: {
          user: true,
        },
      });

      // Si tous les documents requis sont vérifiés, mettre à jour le statut de vérification de l'utilisateur
      if (input.status === "VERIFIED") {
        const userId = document.userId;
        const userRole = document.user.role as UserRole;

        // Définir les documents requis en fonction du rôle
        let requiredDocuments: string[] = [];

        switch (userRole) {
          case "DELIVERER":
            requiredDocuments = ["ID_CARD", "DRIVER_LICENSE", "INSURANCE"];
            break;
          case "MERCHANT":
            requiredDocuments = [
              "BUSINESS_REGISTRATION",
              "INSURANCE",
              "ID_CARD",
            ];
            break;
          case "PROVIDER":
            requiredDocuments = ["ID_CARD", "QUALIFICATION", "INSURANCE"];
            break;
        }

        // Vérifier si tous les documents requis sont vérifiés
        const verifiedDocuments = await ctx.prisma.document.findMany({
          where: {
            userId,
            status: "VERIFIED",
          },
        });

        const verifiedDocumentTypes = verifiedDocuments.map((doc) => doc.type);
        const allRequiredDocumentsVerified = requiredDocuments.every(
          (docType) => verifiedDocumentTypes.includes(docType),
        );

        // Mettre à jour le statut de vérification de l'utilisateur
        if (allRequiredDocumentsVerified) {
          switch (userRole) {
            case "DELIVERER":
              await ctx.prisma.delivererProfile.update({
                where: { userId },
                data: { isVerified: true },
              });
              break;
            case "MERCHANT":
              await ctx.prisma.store.updateMany({
                where: { merchantId: userId },
                data: { isVerified: true },
              });
              break;
            case "PROVIDER":
              await ctx.prisma.serviceProvider.update({
                where: { userId },
                data: { isVerified: true },
              });
              break;
          }
        }
      }

      return {
        success: true,
        message:
          input.status === "VERIFIED"
            ? "Document vérifié avec succès"
            : "Document rejeté",
        document,
      };
    }),
});
