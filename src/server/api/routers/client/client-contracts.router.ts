import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";

/**
 * Router pour la gestion des contrats clients
 * Mission 1 - CLIENT - Gestion des contrats
 */
export const clientContractsRouter = router({
  // Récupérer les contrats d'un client
  getClientContracts: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est un client
        if (ctx.session.user.role !== UserRole.CLIENT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les clients peuvent accéder à leurs contrats",
          });
        }

        const skip = (input.page - 1) * input.limit;
        const where: any = {
          clientId: ctx.session.user.id,
        };

        // Filtrer par statut si spécifié
        if (input.status && input.status !== "all") {
          where.status = input.status;
        }

        // Récupérer les contrats avec pagination
        const [contracts, total] = await Promise.all([
          ctx.db.contract.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: input.limit,
            include: {
              provider: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              client: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          }),
          ctx.db.contract.count({ where }),
        ]);

        return {
          contracts,
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la récupération des contrats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des contrats",
        });
      }
    }),

  // Récupérer un contrat spécifique
  getContractById: protectedProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const contract = await ctx.db.contract.findUnique({
          where: { id: input.contractId },
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
              },
            },
            client: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
              },
            },
            services: {
              include: {
                category: true,
              },
            },
          },
        });

        if (!contract) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contrat non trouvé",
          });
        }

        // Vérifier que l'utilisateur peut accéder à ce contrat
        const isAuthorized =
          contract.clientId === ctx.session.user.id ||
          contract.providerId === ctx.session.user.id ||
          ctx.session.user.role === UserRole.ADMIN;

        if (!isAuthorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous n'avez pas accès à ce contrat",
          });
        }

        return contract;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la récupération du contrat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération du contrat",
        });
      }
    }),

  // Signer un contrat (signature électronique)
  signContract: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        signature: z.string().optional(), // Signature électronique encodée
        acceptedTerms: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!input.acceptedTerms) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous devez accepter les termes du contrat",
          });
        }

        const contract = await ctx.db.contract.findUnique({
          where: { id: input.contractId },
        });

        if (!contract) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contrat non trouvé",
          });
        }

        // Vérifier que l'utilisateur peut signer ce contrat
        if (contract.clientId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous ne pouvez pas signer ce contrat",
          });
        }

        // Vérifier que le contrat est en attente de signature
        if (contract.status !== "PENDING_SIGNATURE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ce contrat ne peut pas être signé dans son état actuel",
          });
        }

        // Mettre à jour le contrat avec la signature
        const updatedContract = await ctx.db.contract.update({
          where: { id: input.contractId },
          data: {
            status: "ACTIVE",
            clientSignature: input.signature || "DIGITAL_SIGNATURE",
            clientSignedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        return updatedContract;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la signature du contrat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la signature du contrat",
        });
      }
    }),

  // Télécharger un contrat en PDF
  downloadContract: protectedProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const contract = await ctx.db.contract.findUnique({
          where: { id: input.contractId },
          include: {
            provider: true,
            client: true,
            services: {
              include: {
                category: true,
              },
            },
          },
        });

        if (!contract) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contrat non trouvé",
          });
        }

        // Vérifier les autorisations
        const isAuthorized =
          contract.clientId === ctx.session.user.id ||
          contract.providerId === ctx.session.user.id ||
          ctx.session.user.role === UserRole.ADMIN;

        if (!isAuthorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous n'avez pas accès à ce contrat",
          });
        }

        // Construire l'URL de téléchargement directe depuis le stockage
        const downloadUrl = contract.documentUrl;

        return {
          downloadUrl,
          filename: `contrat-${contract.id}.pdf`,
          contractId: contract.id,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors du téléchargement du contrat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du téléchargement du contrat",
        });
      }
    }),

  // Renouveler un contrat (créer un nouveau contrat basé sur l'ancien)
  renewContract: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        newEndDate: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const originalContract = await ctx.db.contract.findUnique({
          where: { id: input.contractId },
          include: {
            services: true,
          },
        });

        if (!originalContract) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contrat original non trouvé",
          });
        }

        // Vérifier les autorisations
        if (originalContract.clientId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous ne pouvez pas renouveler ce contrat",
          });
        }

        // Vérifier que le contrat peut être renouvelé
        if (originalContract.status !== "ACTIVE" && originalContract.status !== "COMPLETED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ce contrat ne peut pas être renouvelé dans son état actuel",
          });
        }

        // Créer un nouveau contrat basé sur l'ancien
        const newEndDate = input.newEndDate
          ? new Date(input.newEndDate)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // +1 an par défaut

        const renewedContract = await ctx.db.contract.create({
          data: {
            title: `${originalContract.title} (Renouvellement)`,
            description: originalContract.description,
            clientId: originalContract.clientId,
            providerId: originalContract.providerId,
            startDate: new Date(),
            endDate: newEndDate,
            value: originalContract.value,
            status: "PENDING_SIGNATURE",
            notes: input.notes,
            originalContractId: originalContract.id,
          },
        });

        return renewedContract;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors du renouvellement du contrat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du renouvellement du contrat",
        });
      }
    }),

  // Annuler un contrat
  cancelContract: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        reason: z.string().min(10, "La raison d'annulation doit faire au moins 10 caractères"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const contract = await ctx.db.contract.findUnique({
          where: { id: input.contractId },
        });

        if (!contract) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contrat non trouvé",
          });
        }

        // Vérifier les autorisations
        if (contract.clientId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous ne pouvez pas annuler ce contrat",
          });
        }

        // Vérifier que le contrat peut être annulé
        if (contract.status === "CANCELLED" || contract.status === "COMPLETED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ce contrat ne peut pas être annulé dans son état actuel",
          });
        }

        // Annuler le contrat
        const cancelledContract = await ctx.db.contract.update({
          where: { id: input.contractId },
          data: {
            status: "CANCELLED",
            cancelReason: input.reason,
            cancelledAt: new Date(),
            updatedAt: new Date(),
          },
        });

        return cancelledContract;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de l'annulation du contrat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation du contrat",
        });
      }
    }),

  // Obtenir les statistiques des contrats client
  getContractStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session.user.id;

      const [
        totalCount,
        activeCount,
        pendingCount,
        completedCount,
        cancelledCount,
        totalValue,
      ] = await Promise.all([
        ctx.db.contract.count({
          where: { clientId: userId },
        }),
        ctx.db.contract.count({
          where: { clientId: userId, status: "ACTIVE" },
        }),
        ctx.db.contract.count({
          where: { clientId: userId, status: "PENDING_SIGNATURE" },
        }),
        ctx.db.contract.count({
          where: { clientId: userId, status: "COMPLETED" },
        }),
        ctx.db.contract.count({
          where: { clientId: userId, status: "CANCELLED" },
        }),
        ctx.db.contract.aggregate({
          where: {
            clientId: userId,
            status: { in: ["ACTIVE", "COMPLETED"] },
            value: { not: null },
          },
          _sum: { value: true },
        }),
      ]);

      return {
        totalCount,
        activeCount,
        pendingCount,
        completedCount,
        cancelledCount,
        totalValue: totalValue._sum.value || 0,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }),
});