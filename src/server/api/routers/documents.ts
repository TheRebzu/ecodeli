import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Define interfaces to fix type issues
interface DocumentWithUser {
  id: string;
  userId: string;
  documentType: string;
  status: string;
  createdAt: Date;
  fileUrl: string;
  description?: string;
  user: {
    id: string;
    name: string | null;
    role: string;
  };
}

interface Document {
  id: string;
  userId: string;
  documentType: string;
  status: string;
  createdAt: Date;
  fileUrl: string;
  description?: string;
}

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
  getPendingDocuments: adminProcedure.query(async ({ ctx }) => {
    const pendingDocuments = await ctx.prisma.document.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return pendingDocuments.map((doc: DocumentWithUser) => ({
      id: doc.id,
      userId: doc.userId,
      userName: doc.user.name || "Unknown User",
      userRole: doc.user.role,
      documentType: doc.documentType,
      status: doc.status,
      submittedAt: doc.createdAt.toISOString(),
      fileUrl: doc.fileUrl,
      description: doc.description,
    }));
  }),

  // Pour les administrateurs : vérifier un document
  verifyDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        reviewNote: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.prisma.document.findUnique({
        where: {
          id: input.documentId,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      if (document.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Document is not in pending status",
        });
      }

      // Update the document status
      const updatedDocument = await ctx.prisma.document.update({
        where: {
          id: input.documentId,
        },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedById: ctx.session.user.id,
          reviewNote: input.reviewNote,
        },
      });

      // Create an activity record
      await ctx.prisma.activity.create({
        data: {
          type: "DOCUMENT_VERIFIED",
          userId: document.userId,
          performedById: ctx.session.user.id,
          metadata: {
            documentId: document.id,
            documentType: document.documentType,
          },
        },
      });

      // Create a notification for the user
      await ctx.prisma.notification.create({
        data: {
          type: "DOCUMENT_VERIFIED",
          userId: document.userId,
          title: "Document Verified",
          content: `Your ${(document as Document).documentType.toLowerCase().replace(/_/g, " ")} has been verified.`,
          metadata: {
            documentId: document.id,
            documentType: (document as Document).documentType,
          },
        },
      });

      return updatedDocument;
    }),

  rejectDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        reviewNote: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.prisma.document.findUnique({
        where: {
          id: input.documentId,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      if (document.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Document is not in pending status",
        });
      }

      if (!input.reviewNote) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Review note is required for rejected documents",
        });
      }

      // Update the document status
      const updatedDocument = await ctx.prisma.document.update({
        where: {
          id: input.documentId,
        },
        data: {
          status: "REJECTED",
          verifiedAt: new Date(),
          verifiedById: ctx.session.user.id,
          reviewNote: input.reviewNote,
        },
      });

      // Create an activity record
      await ctx.prisma.activity.create({
        data: {
          type: "DOCUMENT_REJECTED",
          userId: document.userId,
          performedById: ctx.session.user.id,
          metadata: {
            documentId: document.id,
            documentType: (document as Document).documentType,
            reason: input.reviewNote,
          },
        },
      });

      // Create a notification for the user
      await ctx.prisma.notification.create({
        data: {
          type: "DOCUMENT_REJECTED",
          userId: document.userId,
          title: "Document Rejected",
          content: `Your ${(document as Document).documentType.toLowerCase().replace(/_/g, " ")} has been rejected. Please check the details and resubmit.`,
          metadata: {
            documentId: document.id,
            documentType: (document as Document).documentType,
            reason: input.reviewNote,
          },
        },
      });

      return updatedDocument;
    }),

  getUserDocuments: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.document.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  countPendingDocuments: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.document.count({
      where: {
        status: "PENDING",
      },
    });
  }),
});
