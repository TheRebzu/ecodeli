import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { UserRole, DocumentType, VerificationStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { VerificationService } from "@/server/services/auth/verification.service";
import { documentService } from "@/server/services/common/document.service";
import { NotificationService } from "@/lib/services/notification.service";
import { getUserPreferredLocale } from "@/lib/i18n/user-locale";
import { sendNotification } from "@/lib/services/notification.service";
import {
  verificationType,
  documentSchema,
  documentUploadSchema,
  merchantVerificationSubmitSchema,
  providerVerificationSubmitSchema,
  verificationProcessSchema,
} from "@/schemas/auth/verification.schema";
import { getUserDocumentsWithFullStatus } from "@/utils/document-utils";

const verificationService = new VerificationService();

export const verificationRouter = router({
  // Soumettre une vérification pour un marchand
  submitMerchantVerification: protectedProcedure
    .input(merchantVerificationSubmitSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      // Vérifier si l'utilisateur a les permissions
      if (
        _ctx.session.user.role !== "MERCHANT" &&
        _ctx.session.user.role !== "ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Vous n'avez pas l'autorisation de soumettre cette vérification",
        });
      }

      return verificationService.createMerchantVerification(input);
    }),

  // Soumettre une vérification pour un prestataire
  submitProviderVerification: protectedProcedure
    .input(providerVerificationSubmitSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      // Vérifier si l'utilisateur a les permissions
      if (
        _ctx.session.user.role !== "PROVIDER" &&
        _ctx.session.user.role !== "ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Vous n'avez pas l'autorisation de soumettre cette vérification",
        });
      }

      return verificationService.createProviderVerification(input);
    }),

  // Télécharger un document
  uploadDocument: protectedProcedure
    .input(documentUploadSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      return verificationService.uploadDocument(
        userId,
        input.type,
        input.file as File,
        userRole,
      );
    }),

  // Supprimer un document
  deleteDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      // Cette fonctionnalité n'est pas implémentée dans le service
      // Il faudrait l'implémenter ou utiliser documentService à la place
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Cette fonctionnalité n'est pas encore disponible",
      });
    }),

  // Obtenir le statut de vérification d'un commerçant
  getMerchantVerificationStatus: protectedProcedure
    .input(
      z.object({
        merchantId: z.string().optional(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      const merchantId = input.merchantId || ctx.session.user.id;

      // Vérifier les permissions
      if (
        merchantId !== _ctx.session.user.id &&
        _ctx.session.user.role !== "ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'avez pas l'autorisation de consulter ce statut",
        });
      }

      return verificationService.getMerchantVerificationStatus(merchantId);
    }),

  // Obtenir le statut de vérification d'un prestataire
  getProviderVerificationStatus: protectedProcedure
    .input(
      z.object({
        providerId: z.string().optional(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      const providerId = input.providerId || ctx.session.user.id;

      // Vérifier les permissions
      if (
        providerId !== _ctx.session.user.id &&
        _ctx.session.user.role !== "ADMIN"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'avez pas l'autorisation de consulter ce statut",
        });
      }

      return verificationService.getProviderVerificationStatus(providerId);
    }),

  // Pour les admins: traiter une vérification
  processVerification: adminProcedure
    .input(verificationProcessSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      // Récupérer le type de vérification depuis l'ID
      const verification = await verificationService.db.verification.findUnique(
        {
          where: { id: input.verificationId },
          select: { type: true },
        },
      );

      if (!verification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vérification non trouvée",
        });
      }

      if (verification.type === "MERCHANT") {
        return verificationService.processMerchantVerification(
          input.verificationId,
          _ctx.session.user.id,
          input.status,
          input.notes,
          input.rejectionReason,
        );
      } else if (verification.type === "PROVIDER") {
        return verificationService.processProviderVerification(
          input.verificationId,
          _ctx.session.user.id,
          input.status,
          input.notes,
          input.rejectionReason,
        );
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Type de vérification non supporté",
        });
      }
    }),

  // Pour les admins: lister toutes les vérifications en attente
  getPendingVerifications: adminProcedure
    .input(
      z.object({
        userRole: z.enum(["MERCHANT", "PROVIDER", "DELIVERER"]),
        limit: z.number().min(1).max(100).default(20),
        page: z.number().min(1).default(1),
      }),
    )
    .query(async ({ input: _input }) => {
      const { userRole: _userRole, limit: _limit, page: _page } = input;

      try {
        // Utiliser la méthode existante documentService.getPendingDocuments
        const documents = await documentService.getPendingDocuments(
          userRole as UserRole,
        );

        // Vérifier si documents est null ou undefined
        if (!documents || !Array.isArray(documents)) {
          return {
            data: [],
            meta: {
              total: 0,
              pages: 1,
              page,
              limit,
            },
          };
        }

        const totalCount = documents.length;

        // Appliquer la pagination manuellement
        const paginatedDocs = documents.slice((page - 1) * limit, page * limit);

        // Transformer les documents pour le format attendu par le component
        const data = paginatedDocs.map((doc) => ({
          id: doc.id,
          userId: doc.userId,
          type: doc.type,
          uploadedAt: doc.uploadedAt,
          user: doc.user,
          documents: [
            {
              id: doc.id,
              type: doc.type,
            },
          ],
        }));

        return {
          data,
          meta: {
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
            page,
            limit,
          },
        };
      } catch (_error) {
        console.error(
          "Erreur lors de la récupération des vérifications:",
          error,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Une erreur est survenue lors de la récupération des vérifications: " +
            (error instanceof Error ? error.message : String(error)),
        });
      }
    }),

  // Review a document (admin only)
  reviewDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        status: z.enum(["APPROVED", "REJECTED"]),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      const adminId = ctx.session.user.id;

      return await verificationService.reviewDocument(
        input.documentId,
        adminId,
        input.status as VerificationStatus,
        input.notes,
      );
    }),

  // Get verified and rejected documents
  getProcessedVerifications: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        status: z
          .enum([VerificationStatus.APPROVED, VerificationStatus.REJECTED])
          .optional(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      const { page: _page, limit: _limit, status: _status } = input;
      const skip = (page - 1) * limit;

      const whereClause = status
        ? { verificationStatus: status }
        : {
            verificationStatus: {
              in: [VerificationStatus.APPROVED, VerificationStatus.REJECTED],
            },
          };

      // Fetch verifications
      const verifications = await verificationService.db.verification.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          verifiedAt: "desc",
        },
        include: {
          document: true,
          submitter: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          verifier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Count total results
      const totalCount = await verificationService.db.verification.count({
        where: whereClause,
      });

      return {
        verifications,
        pagination: {
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
          current: page,
          perPage: limit,
        },
      };
    }), // Vérification automatique pour les livreurs
  verifyDelivererDocuments: protectedProcedure.mutation(async ({ _ctx }) => {
    try {
      const userId = ctx.session.user.id;

      if (_ctx.session.user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas un livreur",
        });
      }

      // Vérifier et mettre à jour le statut avec la nouvelle méthode plus complète
      const result = await verificationService.manualCheckAndUpdateVerification(
        userId,
        UserRole.DELIVERER,
      );

      return {
        success: true,
        isVerified:
          result.wasUpdated || result.currentStatus?.isVerified === true,
        message: result.message,
        details: result,
      };
    } catch (_error) {
      console.error("Erreur lors de la vérification:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Une erreur est survenue lors de la vérification",
      });
    }
  }),
  // Vérification automatique pour les marchands
  verifyMerchantDocuments: protectedProcedure.mutation(async ({ _ctx }) => {
    try {
      const userId = ctx.session.user.id;

      if (_ctx.session.user.role !== UserRole.MERCHANT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas un marchand",
        });
      }

      // Vérifier et mettre à jour le statut avec la nouvelle méthode plus complète
      const result = await verificationService.manualCheckAndUpdateVerification(
        userId,
        UserRole.MERCHANT,
      );

      return {
        success: true,
        isVerified:
          result.wasUpdated || result.currentStatus?.isVerified === true,
        message: result.message,
        details: result,
      };
    } catch (_error) {
      console.error("Erreur lors de la vérification:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Une erreur est survenue lors de la vérification",
      });
    }
  }),
  // Vérification automatique pour les prestataires
  verifyProviderDocuments: protectedProcedure.mutation(async ({ _ctx }) => {
    try {
      const userId = ctx.session.user.id;

      if (_ctx.session.user.role !== UserRole.PROVIDER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas un prestataire",
        });
      }

      // Vérifier et mettre à jour le statut avec la nouvelle méthode plus complète
      const result = await verificationService.manualCheckAndUpdateVerification(
        userId,
        UserRole.PROVIDER,
      );

      return {
        success: true,
        isVerified:
          result.wasUpdated || result.currentStatus?.isVerified === true,
        message: result.message,
        details: result,
      };
    } catch (_error) {
      console.error("Erreur lors de la vérification:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Une erreur est survenue lors de la vérification",
      });
    }
  }),

  // Approuver un document (admin seulement)
  approveDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        const adminId = ctx.session.user.id;

        // Utiliser la méthode reviewDocument avec le statut approuvé
        return await verificationService.reviewDocument(
          input.documentId,
          adminId,
          VerificationStatus.APPROVED,
          input.notes,
        );
      } catch (_error) {
        console.error("Erreur lors de l'approbation du document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Une erreur est survenue lors de l'approbation du document: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),

  // Rejeter un document (admin seulement)
  rejectDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        const adminId = ctx.session.user.id;

        // Utiliser la méthode reviewDocument avec le statut rejeté
        return await verificationService.reviewDocument(
          input.documentId,
          adminId,
          VerificationStatus.REJECTED,
          input.reason,
        );
      } catch (_error) {
        console.error("Erreur lors du rejet du document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Une erreur est survenue lors du rejet du document: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),

  // Obtenir le statut de vérification d'un utilisateur (avec la nouvelle logique alignée)
  getUserVerificationStatus: protectedProcedure.query(async ({ _ctx }) => {
    try {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role as UserRole;

      return await verificationService.getUserVerificationStatus(
        userId,
        userRole,
      );
    } catch (_error) {
      console.error(
        "Erreur lors de la récupération du statut de vérification:",
        error,
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erreur lors de la récupération du statut: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }),

  // Vérification manuelle et diagnostic (pour déboguer les problèmes de vérification automatique)
  manualCheckAndUpdateVerification: protectedProcedure.mutation(
    async ({ _ctx }) => {
      try {
        const userId = ctx.session.user.id;
        const userRole = ctx.session.user.role as UserRole;

        console.log(
          `🔧 Déclenchement vérification manuelle pour ${userId} (${userRole})`,
        );

        return await verificationService.manualCheckAndUpdateVerification(
          userId,
          userRole,
        );
      } catch (_error) {
        console.error("Erreur lors de la vérification manuelle:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erreur lors de la vérification manuelle: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
  ),

  // Obtenir les documents avec leur statut effectif de façon consistante
  getConsistentUserDocuments: protectedProcedure.query(async ({ _ctx }) => {
    try {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role as UserRole;

      // Utiliser la fonction utilitaire pour récupérer les documents avec statut complet
      return await getUserDocumentsWithFullStatus(userId, userRole);
    } catch (_error) {
      console.error("Erreur lors de la récupération des documents:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erreur lors de la récupération des documents: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }),

  // Vérifie et met à jour automatiquement le statut de vérification d'un livreur
  checkAndUpdateDelivererVerification: protectedProcedure.mutation(
    async ({ _ctx }) => {
      try {
        // Vérifier si l'utilisateur est un livreur
        if (_ctx.session.user.role !== UserRole.DELIVERER) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les livreurs peuvent utiliser cette fonction",
          });
        }

        const userId = ctx.session.user.id;
        // Obtenir le statut actuel et les détails de vérification
        const result =
          await verificationService.manualCheckAndUpdateVerification(
            userId,
            UserRole.DELIVERER,
          );

        return {
          isVerified:
            result.wasUpdated || result.currentStatus?.isVerified === true,
          message: result.message,
          details: result,
        };
      } catch (_error) {
        console.error(
          "Erreur lors de la vérification automatique du livreur:",
          error,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erreur lors de la vérification: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
  ),

  // Vérifie et met à jour automatiquement le statut de vérification d'un commerçant
  checkAndUpdateMerchantVerification: protectedProcedure.mutation(
    async ({ _ctx }) => {
      try {
        // Vérifier si l'utilisateur est un commerçant
        if (_ctx.session.user.role !== UserRole.MERCHANT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les commerçants peuvent utiliser cette fonction",
          });
        }

        const userId = ctx.session.user.id;
        // Obtenir le statut actuel et les détails de vérification
        const result =
          await verificationService.manualCheckAndUpdateVerification(
            userId,
            UserRole.MERCHANT,
          );

        return {
          isVerified:
            result.wasUpdated || result.currentStatus?.isVerified === true,
          message: result.message,
          details: result,
        };
      } catch (_error) {
        console.error(
          "Erreur lors de la vérification automatique du commerçant:",
          error,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erreur lors de la vérification: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
  ),

  // Vérifie et met à jour automatiquement le statut de vérification d'un prestataire
  checkAndUpdateProviderVerification: protectedProcedure.mutation(
    async ({ _ctx }) => {
      try {
        // Vérifier si l'utilisateur est un prestataire
        if (_ctx.session.user.role !== UserRole.PROVIDER) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les prestataires peuvent utiliser cette fonction",
          });
        }

        const userId = ctx.session.user.id;
        // Obtenir le statut actuel et les détails de vérification
        const result =
          await verificationService.manualCheckAndUpdateVerification(
            userId,
            UserRole.PROVIDER,
          );

        return {
          isVerified:
            result.wasUpdated || result.currentStatus?.isVerified === true,
          message: result.message,
          details: result,
        };
      } catch (_error) {
        console.error(
          "Erreur lors de la vérification automatique du prestataire:",
          error,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erreur lors de la vérification: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
  ),
});
