import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PaymentStatus, PaymentMethod, UserRole } from "@prisma/client";

/**
 * Router pour la gestion administrative des paiements
 * Surveillance, validation et réconciliation des transactions financières
 */

// Schémas de validation
const paymentFiltersSchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  userRole: z.nativeEnum(UserRole).optional(),
  amountRange: z
    .object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
    })
    .optional(),
  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .optional(),
  search: z.string().optional(), // Recherche par référence, email utilisateur
  sortBy: z
    .enum(["amount", "createdAt", "status", "method"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  // Filtres avancés
  hasIssues: z.boolean().optional(),
  requiresValidation: z.boolean().optional(),
  isRefunded: z.boolean().optional(),
});

const paymentValidationSchema = z.object({
  paymentId: z.string().cuid(),
  action: z.enum(["APPROVE", "REJECT", "REQUIRE_REVIEW"]),
  reason: z.string().min(10).max(500),
  validationNotes: z.string().max(1000).optional(),
  notifyUser: z.boolean().default(true),
});

const refundRequestSchema = z.object({
  paymentId: z.string().cuid(),
  amount: z.number().min(0.01),
  reason: z.string().min(10).max(500),
  refundType: z.enum(["FULL", "PARTIAL"]),
  processImmediately: z.boolean().default(false),
  notifyUser: z.boolean().default(true),
});

const bulkPaymentActionSchema = z.object({
  paymentIds: z.array(z.string().cuid()).min(1).max(50),
  action: z.enum(["APPROVE", "REJECT", "EXPORT", "RECONCILE"]),
  reason: z.string().min(10).max(500).optional(),
  notifyUsers: z.boolean().default(true),
});

export const adminPaymentsRouter = router({
  /**
   * Obtenir tous les paiements avec filtres avancés
   */
  getAllPayments: protectedProcedure
    .input(paymentFiltersSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent consulter les paiements",
        });
      }

      try {
        // Construire les filtres
        const where: any = {};

        if (input.status) {
          where.status = input.status;
        }

        if (input.method) {
          where.method = input.method;
        }

        if (input.userRole) {
          where.user = { role: input.userRole };
        }

        if (input.amountRange) {
          where.amount = {};
          if (input.amountRange.min) {
            where.amount.gte = input.amountRange.min;
          }
          if (input.amountRange.max) {
            where.amount.lte = input.amountRange.max;
          }
        }

        if (input.dateRange) {
          where.createdAt = {};
          if (input.dateRange.from) {
            where.createdAt.gte = input.dateRange.from;
          }
          if (input.dateRange.to) {
            where.createdAt.lte = input.dateRange.to;
          }
        }

        if (input.search) {
          where.OR = [
            { reference: { contains: input.search, mode: "insensitive" } },
            {
              stripePaymentIntentId: {
                contains: input.search,
                mode: "insensitive",
              },
            },
            {
              user: {
                OR: [
                  { email: { contains: input.search, mode: "insensitive" } },
                  { name: { contains: input.search, mode: "insensitive" } },
                ],
              },
            },
          ];
        }

        if (input.hasIssues) {
          where.OR = [
            { status: "FAILED" },
            { disputeStatus: { not: null } },
            { requiresManualReview: true },
          ];
        }

        if (input.requiresValidation) {
          where.requiresManualReview = true;
        }

        if (input.isRefunded) {
          where.refunds = { some: {} };
        }

        const orderBy: any = {};
        orderBy[input.sortBy] = input.sortOrder;

        const [payments, totalCount] = await Promise.all([
          ctx.db.payment.findMany({
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
              refunds: {
                select: {
                  amount: true,
                  status: true,
                  createdAt: true,
                },
              },
              // Relations selon le contexte
              announcement: {
                select: {
                  title: true,
                  id: true,
                },
              },
              serviceBooking: {
                select: {
                  id: true,
                  service: {
                    select: { name: true },
                  },
                },
              },
            },
            orderBy,
            skip: input.offset,
            take: input.limit,
          }),
          ctx.db.payment.count({ where }),
        ]);

        // Enrichir les données avec des informations calculées
        const enrichedPayments = payments.map((payment) => ({
          ...payment,
          totalRefunded: payment.refunds.reduce(
            (sum, refund) =>
              refund.status === "COMPLETED" ? sum + refund.amount : sum,
            0,
          ),
          hasDispute: !!payment.disputeStatus,
          daysSinceCreation: Math.floor(
            (new Date().getTime() - payment.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
          riskLevel: calculateRiskLevel(payment),
          isHighValue: payment.amount > 500,
        }));

        return {
          success: true,
          data: enrichedPayments,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des paiements",
        });
      }
    }),

  /**
   * Obtenir les statistiques des paiements
   */
  getPaymentStats: protectedProcedure
    .input(
      z.object({
        period: z.enum(["WEEK", "MONTH", "QUARTER", "YEAR"]).default("MONTH"),
        includeComparison: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const { startDate, endDate } = calculatePeriodDates(input.period);

        const [
          totalPayments,
          successfulPayments,
          failedPayments,
          pendingPayments,
          totalVolume,
          averageAmount,
          paymentsByMethod,
          refundStats,
          highValuePayments,
          suspiciousPayments,
        ] = await Promise.all([
          // Total des paiements
          ctx.db.payment.count({
            where: { createdAt: { gte: startDate, lte: endDate } },
          }),

          // Paiements réussis
          ctx.db.payment.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              status: "COMPLETED",
            },
          }),

          // Paiements échoués
          ctx.db.payment.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              status: "FAILED",
            },
          }),

          // Paiements en attente
          ctx.db.payment.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              status: "PENDING",
            },
          }),

          // Volume total
          ctx.db.payment.aggregate({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              status: "COMPLETED",
            },
            _sum: { amount: true },
          }),

          // Montant moyen
          ctx.db.payment.aggregate({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              status: "COMPLETED",
            },
            _avg: { amount: true },
          }),

          // Répartition par méthode
          ctx.db.payment.groupBy({
            by: ["method"],
            where: {
              createdAt: { gte: startDate, lte: endDate },
              status: "COMPLETED",
            },
            _sum: { amount: true },
            _count: true,
          }),

          // Statistiques des remboursements
          ctx.db.refund.aggregate({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              status: "COMPLETED",
            },
            _sum: { amount: true },
            _count: true,
          }),

          // Paiements de forte valeur (>500€)
          ctx.db.payment.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              amount: { gte: 500 },
              status: "COMPLETED",
            },
          }),

          // Paiements suspects (nécessitant une révision)
          ctx.db.payment.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              requiresManualReview: true,
            },
          }),
        ]);

        const successRate =
          totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;
        const refundRate =
          successfulPayments > 0
            ? ((refundStats._count || 0) / successfulPayments) * 100
            : 0;

        return {
          success: true,
          data: {
            period: { type: input.period, startDate, endDate },
            overview: {
              totalPayments,
              successfulPayments,
              failedPayments,
              pendingPayments,
              totalVolume: totalVolume._sum.amount || 0,
              averageAmount: averageAmount._avg.amount || 0,
              successRate: Math.round(successRate * 100) / 100,
              refundRate: Math.round(refundRate * 100) / 100,
            },
            breakdown: {
              byMethod: paymentsByMethod.map((method) => ({
                method: method.method,
                amount: method._sum.amount || 0,
                count: method._count,
                percentage: totalVolume._sum.amount
                  ? ((method._sum.amount || 0) /
                      (totalVolume._sum.amount || 1)) *
                    100
                  : 0,
              })),
            },
            risks: {
              highValuePayments,
              suspiciousPayments,
              refundedAmount: refundStats._sum.amount || 0,
              refundCount: refundStats._count || 0,
            },
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques",
        });
      }
    }),

  /**
   * Valider ou rejeter un paiement
   */
  validatePayment: protectedProcedure
    .input(paymentValidationSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent valider les paiements",
        });
      }

      try {
        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
          include: { user: true },
        });

        if (!payment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Paiement non trouvé",
          });
        }

        let newStatus: PaymentStatus;
        switch (input.action) {
          case "APPROVE":
            newStatus = "COMPLETED";
            break;
          case "REJECT":
            newStatus = "FAILED";
            break;
          case "REQUIRE_REVIEW":
            newStatus = payment.status; // Garde le statut actuel mais marque pour révision
            break;
        }

        const updatedPayment = await ctx.db.$transaction(async (tx) => {
          // Mettre à jour le paiement
          const updated = await tx.payment.update({
            where: { id: input.paymentId },
            data: {
              status: newStatus,
              adminValidatedById: user.id,
              adminValidatedAt: new Date(),
              adminNotes: input.validationNotes,
              requiresManualReview: input.action === "REQUIRE_REVIEW",
            },
          });

          // Créer un log d'audit
          await tx.auditLog.create({
            data: {
              entityType: "PAYMENT",
              entityId: input.paymentId,
              action: `PAYMENT_${input.action}`,
              performedById: user.id,
              details: {
                previousStatus: payment.status,
                newStatus,
                reason: input.reason,
                validationNotes: input.validationNotes,
              },
            },
          });

          return updated;
        });

        // Envoyer une notification si nécessaire
        if (input.notifyUser) {
          // TODO: Implémenter l'envoi de notification
        }

        return {
          success: true,
          data: updatedPayment,
          message: `Paiement ${input.action.toLowerCase()} avec succès`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la validation du paiement",
        });
      }
    }),

  /**
   * Initier un remboursement
   */
  initiateRefund: protectedProcedure
    .input(refundRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Seuls les administrateurs peuvent initier des remboursements",
        });
      }

      try {
        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
          include: {
            user: true,
            refunds: true,
          },
        });

        if (!payment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Paiement non trouvé",
          });
        }

        if (payment.status !== "COMPLETED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Seuls les paiements complétés peuvent être remboursés",
          });
        }

        // Vérifier le montant disponible pour remboursement
        const totalRefunded = payment.refunds
          .filter((r) => r.status === "COMPLETED")
          .reduce((sum, r) => sum + r.amount, 0);

        const availableAmount = payment.amount - totalRefunded;

        if (input.amount > availableAmount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Montant de remboursement supérieur au disponible (${availableAmount}€)`,
          });
        }

        const refund = await ctx.db.$transaction(async (tx) => {
          // Créer le remboursement
          const newRefund = await tx.refund.create({
            data: {
              paymentId: input.paymentId,
              amount: input.amount,
              reason: input.reason,
              status: input.processImmediately ? "COMPLETED" : "PENDING",
              requestedById: user.id,
              processedAt: input.processImmediately ? new Date() : null,
            },
          });

          // Créer un log d'audit
          await tx.auditLog.create({
            data: {
              entityType: "REFUND",
              entityId: newRefund.id,
              action: "REFUND_INITIATED",
              performedById: user.id,
              details: {
                paymentId: input.paymentId,
                amount: input.amount,
                reason: input.reason,
                processImmediately: input.processImmediately,
              },
            },
          });

          return newRefund;
        });

        // TODO: Si processImmediately, déclencher le processus de remboursement avec Stripe

        // Envoyer une notification si nécessaire
        if (input.notifyUser) {
          // TODO: Implémenter l'envoi de notification
        }

        return {
          success: true,
          data: refund,
          message: "Remboursement initié avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'initiation du remboursement",
        });
      }
    }),

  /**
   * Actions en lot sur les paiements
   */
  bulkActions: protectedProcedure
    .input(bulkPaymentActionSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Seuls les administrateurs peuvent effectuer des actions en lot",
        });
      }

      try {
        const payments = await ctx.db.payment.findMany({
          where: { id: { in: input.paymentIds } },
          include: { user: true },
        });

        if (payments.length !== input.paymentIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Certains paiements n'existent pas",
          });
        }

        let results: any[] = [];

        switch (input.action) {
          case "APPROVE":
          case "REJECT":
            results = await ctx.db.$transaction(
              payments.map((payment) =>
                ctx.db.payment.update({
                  where: { id: payment.id },
                  data: {
                    status: input.action === "APPROVE" ? "COMPLETED" : "FAILED",
                    adminValidatedById: user.id,
                    adminValidatedAt: new Date(),
                    adminNotes: input.reason,
                  },
                }),
              ),
            );
            break;

          case "EXPORT":
            // TODO: Générer un export CSV/Excel des paiements
            results = payments;
            break;

          case "RECONCILE":
            // TODO: Marquer les paiements comme réconciliés
            results = await ctx.db.$transaction(
              payments.map((payment) =>
                ctx.db.payment.update({
                  where: { id: payment.id },
                  data: {
                    reconciledAt: new Date(),
                    reconciledById: user.id,
                  },
                }),
              ),
            );
            break;
        }

        return {
          success: true,
          data: {
            processedCount: results.length,
            action: input.action,
          },
          message: `${results.length} paiement(s) traité(s) avec succès`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du traitement en lot",
        });
      }
    }),
});

// Helper functions
function calculateRiskLevel(payment: any): "LOW" | "MEDIUM" | "HIGH" {
  let riskScore = 0;

  // Montant élevé
  if (payment.amount > 1000) riskScore += 2;
  else if (payment.amount > 500) riskScore += 1;

  // Paiement récent d'un nouvel utilisateur
  const userAge = new Date().getTime() - payment.user?.createdAt?.getTime();
  if (userAge < 7 * 24 * 60 * 60 * 1000) riskScore += 2; // Moins de 7 jours

  // Nécessite une révision manuelle
  if (payment.requiresManualReview) riskScore += 3;

  // Dispute en cours
  if (payment.disputeStatus) riskScore += 3;

  if (riskScore >= 5) return "HIGH";
  if (riskScore >= 3) return "MEDIUM";
  return "LOW";
}

function calculatePeriodDates(period: string): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  let startDate: Date, endDate: Date;

  switch (period) {
    case "WEEK":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case "MONTH":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case "QUARTER":
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      break;
    default: // YEAR
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
  }

  return { startDate, endDate };
}
