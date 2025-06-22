import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { startOfMonth, endOfMonth, subMonths, format, parseISO, startOfDay, endOfDay } from "date-fns";

/**
 * Routeur de gestion des gains des livreurs
 * 
 * Fonctionnalités selon Mission 1 :
 * - Gestion des paiements
 * - Suivi des gains et revenus
 * - Historique des paiements
 * - Factures et documents
 */

// Schémas de validation
const earningsFiltersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
  deliveryType: z.enum(["STANDARD", "EXPRESS", "SCHEDULED"]).optional()
});

const monthlyEarningsSchema = z.object({
  year: z.number().min(2020).max(2030),
  month: z.number().min(1).max(12)
});

const paymentRequestSchema = z.object({
  amount: z.number().min(10).max(10000), // Montant en euros
  paymentMethod: z.enum(["BANK_TRANSFER", "PAYPAL", "STRIPE"]),
  notes: z.string().optional()
});

export const delivererEarningsRouter = router({
  /**
   * Obtenir le résumé des gains du livreur
   */
  getEarningsSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder aux gains"
        });
      }

      try {
        const currentMonth = new Date();
        const lastMonth = subMonths(currentMonth, 1);
        
        const [
          totalEarnings,
          currentMonthEarnings,
          lastMonthEarnings,
          pendingPayments,
          completedDeliveries,
          averageDeliveryValue
        ] = await Promise.all([
          // Total des gains
          ctx.db.deliveryPayment.aggregate({
            where: {
              delivererId: user.id,
              status: "PAID"
            },
            _sum: { amount: true }
          }),
          
          // Gains du mois en cours
          ctx.db.deliveryPayment.aggregate({
            where: {
              delivererId: user.id,
              status: "PAID",
              createdAt: {
                gte: startOfMonth(currentMonth),
                lte: endOfMonth(currentMonth)
              }
            },
            _sum: { amount: true }
          }),
          
          // Gains du mois dernier
          ctx.db.deliveryPayment.aggregate({
            where: {
              delivererId: user.id,
              status: "PAID",
              createdAt: {
                gte: startOfMonth(lastMonth),
                lte: endOfMonth(lastMonth)
              }
            },
            _sum: { amount: true }
          }),
          
          // Paiements en attente
          ctx.db.deliveryPayment.aggregate({
            where: {
              delivererId: user.id,
              status: "PENDING"
            },
            _sum: { amount: true }
          }),
          
          // Nombre de livraisons complétées
          ctx.db.delivery.count({
            where: {
              delivererId: user.id,
              status: "COMPLETED"
            }
          }),
          
          // Valeur moyenne par livraison
          ctx.db.deliveryPayment.aggregate({
            where: {
              delivererId: user.id,
              status: "PAID"
            },
            _avg: { amount: true }
          })
        ]);

                 return {
           totalEarnings: totalEarnings._sum.amount ?? 0,
           currentMonthEarnings: currentMonthEarnings._sum.amount ?? 0,
           lastMonthEarnings: lastMonthEarnings._sum.amount ?? 0,
           pendingPayments: pendingPayments._sum.amount ?? 0,
           completedDeliveries,
           averageDeliveryValue: Math.round((averageDeliveryValue._avg.amount ?? 0) * 100) / 100,
           growthRate: lastMonthEarnings._sum.amount 
             ? Math.round(((currentMonthEarnings._sum.amount ?? 0) - (lastMonthEarnings._sum.amount ?? 0)) / (lastMonthEarnings._sum.amount ?? 1) * 100)
             : 0
         };

      } catch (error) {
        console.error("Erreur lors de la récupération du résumé des gains:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération du résumé des gains"
        });
      }
    }),

  /**
   * Obtenir l'historique des paiements
   */
  getPaymentHistory: protectedProcedure
    .input(earningsFiltersSchema.optional())
    .query(async ({ ctx, input = {} }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder à l'historique des paiements"
        });
      }

      try {
        const skip = ((input.page ?? 1) - 1) * (input.limit ?? 10);
        const where: any = {
          delivererId: user.id
        };

        // Filtres optionnels
        if (input.status) {
          where.status = input.status;
        }

        if (input.startDate) {
          where.createdAt = {
            gte: parseISO(input.startDate)
          };
        }

        if (input.endDate) {
          where.createdAt = {
            ...where.createdAt,
            lte: parseISO(input.endDate)
          };
        }

        if (input.deliveryType) {
          where.delivery = {
            type: input.deliveryType
          };
        }

        const [payments, total] = await Promise.all([
          ctx.db.deliveryPayment.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: input.limit ?? 10,
            include: {
              delivery: {
                select: {
                  id: true,
                  type: true,
                  pickupAddress: true,
                  deliveryAddress: true,
                  status: true,
                  createdAt: true
                }
              },
              announcement: {
                select: {
                  id: true,
                  title: true,
                  client: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          }),
          ctx.db.deliveryPayment.count({ where })
        ]);

        return {
          payments,
          total,
          page: input.page ?? 1,
          limit: input.limit ?? 10,
          totalPages: Math.ceil(total / (input.limit ?? 10))
        };

      } catch (error) {
        console.error("Erreur lors de la récupération de l'historique des paiements:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de l'historique des paiements"
        });
      }
    }),

  /**
   * Obtenir les gains mensuels détaillés
   */
  getMonthlyEarnings: protectedProcedure
    .input(monthlyEarningsSchema.optional())
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder aux gains mensuels"
        });
      }

      try {
        // Utiliser le mois en cours si non spécifié
        const currentDate = new Date();
        const targetYear = input?.year ?? currentDate.getFullYear();
        const targetMonth = input?.month ?? currentDate.getMonth() + 1;
        
        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = endOfMonth(startDate);

        const [
          monthlyPayments,
          deliveryStats,
          dailyBreakdown
        ] = await Promise.all([
          // Paiements du mois
          ctx.db.deliveryPayment.findMany({
            where: {
              delivererId: user.id,
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            },
            include: {
              delivery: {
                select: {
                  type: true,
                  distance: true,
                  status: true
                }
              }
            }
          }),
          
          // Statistiques des livraisons
          ctx.db.delivery.groupBy({
            by: ['type', 'status'],
            where: {
              delivererId: user.id,
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            },
            _count: true,
            _avg: {
              distance: true
            }
          }),
          
          // Répartition par jour
          ctx.db.$queryRaw`
            SELECT 
              DATE(created_at) as date,
              COUNT(*) as deliveries,
              SUM(amount) as earnings
            FROM delivery_payments 
            WHERE deliverer_id = ${user.id}
              AND created_at >= ${startDate}
              AND created_at <= ${endDate}
              AND status = 'PAID'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
          `
        ]);

        // Calculer les totaux
        const totalEarnings = monthlyPayments
          .filter(p => p.status === "PAID")
          .reduce((sum, payment) => sum + payment.amount, 0);

        const totalPending = monthlyPayments
          .filter(p => p.status === "PENDING")
          .reduce((sum, payment) => sum + payment.amount, 0);

        return {
          month: targetMonth,
          year: targetYear,
          totalEarnings,
          totalPending,
          totalDeliveries: monthlyPayments.length,
          payments: monthlyPayments,
          deliveryStats,
          dailyBreakdown,
          averageEarningsPerDay: totalEarnings / new Date(targetYear, targetMonth, 0).getDate()
        };

      } catch (error) {
        console.error("Erreur lors de la récupération des gains mensuels:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des gains mensuels"
        });
      }
    }),

  /**
   * Demander un paiement (retrait)
   */
  requestPayment: protectedProcedure
    .input(paymentRequestSchema.optional())
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent demander un paiement"
        });
      }

      if (!input) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Les données de demande de paiement sont requises"
        });
      }

      try {
        // Vérifier le solde disponible
        const availableBalance = await ctx.db.deliveryPayment.aggregate({
          where: {
            delivererId: user.id,
            status: "PAID"
          },
          _sum: { amount: true }
        });

        const paidOut = await ctx.db.paymentRequest.aggregate({
          where: {
            delivererId: user.id,
            status: { in: ["APPROVED", "COMPLETED"] }
          },
          _sum: { amount: true }
        });

        const availableAmount = (availableBalance._sum.amount || 0) - (paidOut._sum.amount || 0);

        if (input.amount > availableAmount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Montant indisponible. Solde disponible: ${availableAmount}€`
          });
        }

        // Créer la demande de paiement
        const paymentRequest = await ctx.db.paymentRequest.create({
          data: {
            delivererId: user.id,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            notes: input.notes,
            status: "PENDING",
            requestedAt: new Date()
          }
        });

        // TODO: Notifier les administrateurs de la nouvelle demande
        // await notificationService.notifyAdmins('NEW_PAYMENT_REQUEST', paymentRequest);

        return {
          success: true,
          data: paymentRequest,
          message: "Demande de paiement créée avec succès"
        };

      } catch (error) {
        console.error("Erreur lors de la création de la demande de paiement:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la demande de paiement"
        });
      }
    }),

  /**
   * Obtenir les demandes de paiement
   */
  getPaymentRequests: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(10),
      status: z.enum(["PENDING", "APPROVED", "COMPLETED", "REJECTED"]).optional()
    }).optional())
    .query(async ({ ctx, input = {} }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder aux demandes de paiement"
        });
      }

      try {
        const skip = ((input.page ?? 1) - 1) * (input.limit ?? 10);
        const where: any = {
          delivererId: user.id
        };

        if (input.status) {
          where.status = input.status;
        }

        const [requests, total] = await Promise.all([
          ctx.db.paymentRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: input.limit ?? 10
          }),
          ctx.db.paymentRequest.count({ where })
        ]);

        return {
          requests,
          total,
          page: input.page ?? 1,
          limit: input.limit ?? 10,
          totalPages: Math.ceil(total / (input.limit ?? 10))
        };

      } catch (error) {
        console.error("Erreur lors de la récupération des demandes de paiement:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des demandes de paiement"
        });
      }
    }),

  /**
   * Obtenir les statistiques des gains par période
   */
  getEarningsAnalytics: protectedProcedure
    .input(z.object({
      period: z.enum(["WEEK", "MONTH", "QUARTER", "YEAR"]).default("MONTH"),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional()
    }).optional())
    .query(async ({ ctx, input = {} }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder aux analytics des gains"
        });
      }

      try {
        const currentDate = new Date();
        let startDate: Date;
        let endDate: Date = currentDate;

        // Définir la période selon le paramètre
        switch (input.period) {
          case "WEEK":
            startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "QUARTER":
            startDate = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3, 1);
            break;
          case "YEAR":
            startDate = new Date(currentDate.getFullYear(), 0, 1);
            break;
          default: // MONTH
            startDate = startOfMonth(currentDate);
        }

        // Utiliser les dates personnalisées si fournies
        if (input.startDate) startDate = parseISO(input.startDate);
        if (input.endDate) endDate = parseISO(input.endDate);

        const [
          earningsOverTime,
          deliveryTypeBreakdown,
          performanceMetrics
        ] = await Promise.all([
          // Évolution des gains dans le temps
          ctx.db.$queryRaw`
            SELECT 
              DATE_TRUNC('day', created_at) as date,
              COUNT(*) as deliveries,
              SUM(amount) as earnings,
              AVG(amount) as avg_earnings
            FROM delivery_payments 
            WHERE deliverer_id = ${user.id}
              AND created_at >= ${startDate}
              AND created_at <= ${endDate}
              AND status = 'PAID'
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY date ASC
          `,
          
          // Répartition par type de livraison
          ctx.db.deliveryPayment.groupBy({
            by: ['delivery'],
            where: {
              delivererId: user.id,
              status: "PAID",
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            },
            _count: true,
            _sum: { amount: true },
            _avg: { amount: true }
          }),
          
          // Métriques de performance
          ctx.db.delivery.aggregate({
            where: {
              delivererId: user.id,
              createdAt: {
                gte: startDate,
                lte: endDate
              }
            },
            _avg: {
              distance: true,
              deliveryTime: true
            },
            _count: true
          })
        ]);

        return {
          period: input.period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          earningsOverTime,
          deliveryTypeBreakdown,
          performanceMetrics,
          totalEarnings: earningsOverTime.reduce((sum: number, day: any) => sum + (day.earnings || 0), 0),
          totalDeliveries: earningsOverTime.reduce((sum: number, day: any) => sum + (day.deliveries || 0), 0)
        };

      } catch (error) {
        console.error("Erreur lors de la récupération des analytics des gains:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des analytics des gains"
        });
      }
    })
});
