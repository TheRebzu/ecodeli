import { z } from 'zod';
import { router as router, adminProcedure, protectedProcedure } from '@/server/api/trpc';
import { billingService } from '@/server/services/shared/billing.service';
import { TRPCError } from '@trpc/server';
import { format, subMonths } from 'date-fns';
import { BillingService } from '@/server/services/shared/billing.service';
import { billingSettingsSchema } from '@/schemas/payment/billing.schema';
import { db } from '@/server/db';
import { Decimal } from '@prisma/client/runtime/library';

// Initialiser le service de facturation
const billingServiceInstance = new BillingService();

const createBillingCycleSchema = z.object({
  merchantId: z.string().optional(),
  providerId: z.string().optional(),
  periodStart: z.date(),
  periodEnd: z.date(),
  scheduledRunDate: z.date().default(() => new Date()),
});

/**
 * Router pour la gestion de la facturation automatique
 * Permet d'administrer les cycles de facturation, de planifier et lancer la facturation mensuelle
 */
export const billingRouter = router({
  // Procédures admin pour gérer la facturation

  /**
   * Lance la facturation mensuelle manuellement
   */
  runMonthlyBilling: adminProcedure.mutation(async () => {
    try {
      const result = await billingService.runMonthlyBilling();
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Erreur lors de l'exécution de la facturation mensuelle: ${error.message}`,
      });
    }
  }),

  /**
   * Planifie les cycles de facturation mensuelle
   */
  scheduleMonthlyCycles: adminProcedure
    .input(
      z.object({
        scheduledDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await billingService.scheduleMonthlyCycles(input.scheduledDate);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erreur lors de la planification des cycles: ${error.message}`,
        });
      }
    }),

  /**
   * Exécute les cycles de facturation planifiés pour aujourd'hui
   */
  executeScheduledCycles: adminProcedure.mutation(async () => {
    try {
      const result = await billingService.executeScheduledCycles();
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Erreur lors de l'exécution des cycles planifiés: ${error.message}`,
      });
    }
  }),

  /**
   * Crée un cycle de facturation personnalisé
   */
  createBillingCycle: adminProcedure.input(createBillingCycleSchema).mutation(async ({ input }) => {
    try {
      const result = await billingService.createBillingCycle(input);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Erreur lors de la création du cycle: ${error.message}`,
      });
    }
  }),

  /**
   * Réexécute un cycle de facturation échoué
   */
  retryCycle: adminProcedure
    .input(z.object({ billingCycleId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const result = await billingService.retryCycle(input.billingCycleId);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erreur lors de la réexécution du cycle: ${error.message}`,
        });
      }
    }),

  /**
   * Traite les virements automatiques pour les portefeuilles éligibles
   */
  processAutomaticPayouts: adminProcedure.mutation(async () => {
    try {
      const result = await billingService.processAutomaticPayouts();
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Erreur lors du traitement des virements automatiques: ${error.message}`,
      });
    }
  }),

  /**
   * Envoie les rappels pour les factures impayées
   */
  sendPaymentReminders: adminProcedure.mutation(async () => {
    try {
      const result = await billingService.sendPaymentReminders();
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Erreur lors de l'envoi des rappels: ${error.message}`,
      });
    }
  }),

  /**
   * Récupère les statistiques de facturation
   */
  getBillingStats: adminProcedure
    .input(
      z.object({
        period: z.enum(['MONTH', 'QUARTER', 'YEAR']).default('MONTH'),
      })
    )
    .query(async ({ input }) => {
      try {
        const stats = await billingService.getBillingStats(input.period);
        return stats;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erreur lors de la récupération des statistiques: ${error.message}`,
        });
      }
    }),

  /**
   * Génère les factures mensuelles pour un prestataire spécifique
   */
  generateProviderInvoice: adminProcedure
    .input(
      z.object({
        providerId: z.string(),
        month: z.number().min(1).max(12).optional(),
        year: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const now = new Date();
        const year = input.year || now.getFullYear();
        const month = input.month || now.getMonth();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const result = await billingService.generateProviderInvoice(
          input.providerId,
          startDate,
          endDate
        );

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erreur lors de la génération de la facture: ${error.message}`,
        });
      }
    }),

  /**
   * Génère les factures mensuelles pour un commerçant spécifique
   */
  generateMerchantInvoice: adminProcedure
    .input(
      z.object({
        merchantId: z.string(),
        month: z.number().min(1).max(12).optional(),
        year: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const now = new Date();
        const year = input.year || now.getFullYear();
        const month = input.month || now.getMonth();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const result = await billingService.generateMerchantInvoice(
          input.merchantId,
          startDate,
          endDate
        );

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erreur lors de la génération de la facture: ${error.message}`,
        });
      }
    }),

  /**
   * Récupère les paramètres de facturation
   */
  getBillingSettings: adminProcedure.query(async ({ ctx }) => {
    try {
      // Récupérer les paramètres de facturation globaux
      const settings = await ctx.db.billingSettings.findFirst({
        where: { isDefault: true },
      });

      return {
        settings: settings || {
          companyName: 'EcoDeli SAS',
          address: '123 Avenue de la République',
          city: 'Paris',
          postalCode: '75011',
          country: 'France',
          email: 'facturation@ecodeli.fr',
          website: 'https://ecodeli.fr',
          defaultCurrency: 'EUR',
          defaultPaymentTerms: 'À régler sous 30 jours',
          defaultTaxRate: 20,
          invoicePrefix: 'ECO-',
          invoiceNumberFormat: 'YYYY-MM-[N]',
          isDefault: true,
        },
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Erreur lors de la récupération des paramètres de facturation',
        cause: error,
      });
    }
  }),

  /**
   * Met à jour les paramètres de facturation
   */
  updateBillingSettings: adminProcedure
    .input(billingSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;

        // Récupérer les paramètres actuels
        const currentSettings = await ctx.db.billingSettings.findFirst({
          where: { isDefault: true },
        });

        // Mettre à jour ou créer les paramètres
        const settings = await ctx.db.billingSettings.upsert({
          where: {
            id: currentSettings?.id || 'default-settings',
          },
          update: {
            ...input,
            updatedById: adminId,
          },
          create: {
            ...input,
            isDefault: true,
            createdById: adminId,
            id: 'default-settings',
          },
        });

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'BILLING_SETTINGS',
            entityId: settings.id,
            performedById: adminId,
            action: 'UPDATE_BILLING_SETTINGS',
            changes: {
              companyName: input.companyName,
              taxRate: String(input.defaultTaxRate),
              currency: input.defaultCurrency,
            },
          },
        });

        return {
          success: true,
          settings,
          message: 'Paramètres de facturation mis à jour avec succès',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la mise à jour des paramètres de facturation',
          cause: error,
        });
      }
    }),

  /**
   * Récupère les taux de commission par type d'entité
   */
  getCommissionRates: adminProcedure.query(async ({ ctx }) => {
    try {
      // Récupérer les taux de commission
      const commissionRates = await ctx.db.commissionRate.findMany();

      // Si aucun taux n'est défini, retourner les taux par défaut
      if (commissionRates.length === 0) {
        return {
          rates: [
            { entityType: 'MERCHANT', rate: 10, isPercentage: true, isActive: true },
            { entityType: 'DELIVERER', rate: 15, isPercentage: true, isActive: true },
            { entityType: 'PROVIDER', rate: 12, isPercentage: true, isActive: true },
          ],
        };
      }

              return {
          rates: commissionRates,
        };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Erreur lors de la récupération des taux de commission',
        cause: error,
      });
    }
  }),

  /**
   * Met à jour un taux de commission
   */
  updateCommissionRate: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        entityType: z.enum(['MERCHANT', 'DELIVERER', 'PROVIDER']),
        rate: z.number().min(0).max(100),
        isPercentage: z.boolean().default(true),
        isActive: z.boolean().default(true),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { id, ...data } = input;

        // Mettre à jour ou créer le taux de commission
        let commissionRate;

        if (id) {
          // Mise à jour
          commissionRate = await ctx.db.commissionRate.update({
            where: { id },
            data: {
              ...data,
              updatedById: adminId,
              updatedAt: new Date(),
            },
          });
        } else {
          // Rechercher si un taux existe déjà pour ce type d'entité
          const existingRate = await ctx.db.commissionRate.findFirst({
            where: { entityType: data.entityType },
          });

          if (existingRate) {
            // Mise à jour du taux existant
            commissionRate = await ctx.db.commissionRate.update({
              where: { id: existingRate.id },
              data: {
                ...data,
                updatedById: adminId,
                updatedAt: new Date(),
              },
            });
          } else {
            // Création d'un nouveau taux
            commissionRate = await ctx.db.commissionRate.create({
              data: {
                ...data,
                createdById: adminId,
              },
            });
          }
        }

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'COMMISSION_RATE',
            entityId: commissionRate.id,
            performedById: adminId,
            action: id ? 'UPDATE_COMMISSION_RATE' : 'CREATE_COMMISSION_RATE',
            changes: {
              entityType: data.entityType,
              rate: String(data.rate),
              isPercentage: String(data.isPercentage),
              isActive: String(data.isActive),
            },
          },
        });

        return {
          success: true,
          commissionRate,
          message: id
            ? 'Taux de commission mis à jour avec succès'
            : 'Taux de commission créé avec succès',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la mise à jour du taux de commission',
          cause: error,
        });
      }
    }),

  /**
   * Génère des factures de commission pour une période
   */
  generateCommissionInvoices: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        entityTypes: z.array(z.enum(['MERCHANT', 'DELIVERER', 'PROVIDER'])).optional(),
        dryRun: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { startDate, endDate, entityTypes, dryRun } = input;

        // Utiliser le mois en cours par défaut
        const period = {
          start: startDate || startOfMonth(new Date()),
          end: endDate || endOfMonth(new Date()),
        };

        // Simuler ou générer les factures
        const result = await billingService.generateCommissionInvoices({
          startDate: period.start,
          endDate: period.end,
          entityTypes: entityTypes || ['MERCHANT', 'DELIVERER', 'PROVIDER'],
          dryRun,
        });

        // Enregistrer dans les logs d'audit si ce n'est pas une simulation
        if (!dryRun) {
          await ctx.db.auditLog.create({
            data: {
              entityType: 'BILLING_TASK',
              entityId: 'commission-invoices',
              performedById: adminId,
              action: 'GENERATE_COMMISSION_INVOICES',
              changes: {
                periodStart: period.start.toISOString(),
                periodEnd: period.end.toISOString(),
                entityTypes: entityTypes?.join(',') || 'ALL',
                generatedCount: String(result.results?.length || 0),
              },
            },
          });
        }

        return {
          success: result.success,
          message: dryRun
            ? `Simulation: ${result.results?.length || 0} factures de commission seraient générées`
            : `${result.results?.filter(r => r.success).length || 0} factures de commission générées avec succès`,
          invoices: result.results,
          dryRun,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la génération des factures de commission',
          cause: error,
        });
      }
    }),

  /**
   * Crée un cycle de facturation
   */
  createBillingCycle: adminProcedure
    .input(
      z.object({
        name: z.string().min(3),
        description: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
        invoiceDueDate: z.date().optional(),
        status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PLANNED'),
        entityTypes: z.array(z.enum(['MERCHANT', 'DELIVERER', 'PROVIDER', 'CLIENT'])),
        autoGenerateInvoices: z.boolean().default(true),
        sendEmailNotifications: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;

        // Vérifier que les dates sont cohérentes
        if (input.endDate < input.startDate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'La date de fin doit être postérieure à la date de début',
          });
        }

        // Définir la date d'échéance par défaut si non spécifiée
        const dueDate = input.invoiceDueDate || addDays(input.endDate, 15);

        // Créer le cycle de facturation
        const billingCycle = await ctx.db.billingCycle.create({
          data: {
            ...input,
            invoiceDueDate: dueDate,
            createdById: adminId,
          },
        });

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'BILLING_CYCLE',
            entityId: billingCycle.id,
            performedById: adminId,
            action: 'CREATE_BILLING_CYCLE',
            changes: {
              name: input.name,
              startDate: input.startDate.toISOString(),
              endDate: input.endDate.toISOString(),
              entityTypes: input.entityTypes.join(','),
            },
          },
        });

        return {
          success: true,
          billingCycle,
          message: 'Cycle de facturation créé avec succès',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la création du cycle de facturation',
          cause: error,
        });
      }
    }),

  /**
   * Récupère les cycles de facturation
   */
  getBillingCycles: adminProcedure
    .input(
      z.object({
        status: z.enum(['ALL', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { status, page, limit } = input;

        // Construire le filtre
        const where: any = {};
        if (status && status !== 'ALL') {
          where.status = status;
        }

        // Récupérer les cycles de facturation
        const [billingCycles, total] = await Promise.all([
          ctx.db.billingCycle.findMany({
            where,
            orderBy: { startDate: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          }),
          ctx.db.billingCycle.count({ where }),
        ]);

        // Enrichir les résultats avec des statistiques
        const enrichedCycles = await Promise.all(
          billingCycles.map(async cycle => {
            // Récupérer le nombre de factures générées pour ce cycle
            const invoiceCount = await ctx.db.invoice.count({
              where: {
                billingCycleId: cycle.id,
              },
            });

            // Récupérer le montant total facturé
            const invoiceAmount = await ctx.db.invoice.aggregate({
              where: {
                billingCycleId: cycle.id,
              },
              _sum: {
                amount: true,
              },
            });

            return {
              ...cycle,
              stats: {
                invoiceCount,
                totalAmount: invoiceAmount._sum.amount
                  ? parseFloat(invoiceAmount._sum.amount.toString())
                  : 0,
              },
            };
          })
        );

        return {
          billingCycles: enrichedCycles,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des cycles de facturation',
          cause: error,
        });
      }
    }),

  /**
   * Exécute un cycle de facturation
   */
  executeBillingCycle: adminProcedure
    .input(
      z.object({
        billingCycleId: z.string(),
        dryRun: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { billingCycleId, dryRun } = input;

        // Récupérer le cycle de facturation
        const billingCycle = await ctx.db.billingCycle.findUnique({
          where: { id: billingCycleId },
        });

        if (!billingCycle) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Cycle de facturation non trouvé',
          });
        }

        // Vérifier que le cycle peut être exécuté
        if (billingCycle.status === 'COMPLETED' || billingCycle.status === 'CANCELLED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Impossible d'exécuter un cycle au statut ${billingCycle.status}`,
          });
        }

        if (dryRun) {
          // Simuler l'exécution
          const simulationResult = await billingService.simulateBillingCycle(billingCycleId);

          return {
            success: true,
            ...simulationResult,
            message: `Simulation: ${simulationResult.totalItems} éléments à facturer pour un total de ${simulationResult.totalAmount}€`,
          };
        }

        // Exécuter le cycle de facturation
        const result = await billingService.executeBillingCycle(billingCycleId, adminId);

        // Mettre à jour le statut du cycle si exécuté avec succès
        if (result.success) {
          await ctx.db.billingCycle.update({
            where: { id: billingCycleId },
            data: {
              status: 'IN_PROGRESS',
              executedById: adminId,
              executedAt: new Date(),
            },
          });
        }

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'BILLING_CYCLE',
            entityId: billingCycleId,
            performedById: adminId,
            action: 'EXECUTE_BILLING_CYCLE',
            changes: {
              cycleId: billingCycleId,
              generatedInvoices: String(result.generatedInvoices?.length || 0),
              totalAmount: String(result.totalAmount || 0),
            },
          },
        });

        return {
          success: result.success,
          ...result,
          message: `${result.generatedInvoices?.length || 0} factures générées avec succès pour un total de ${result.totalAmount || 0}€`,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de l'exécution du cycle de facturation",
          cause: error,
        });
      }
    }),

  /**
   * Finalise un cycle de facturation
   */
  completeBillingCycle: adminProcedure
    .input(
      z.object({
        billingCycleId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { billingCycleId, notes } = input;

        // Récupérer le cycle de facturation
        const billingCycle = await ctx.db.billingCycle.findUnique({
          where: { id: billingCycleId },
        });

        if (!billingCycle) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Cycle de facturation non trouvé',
          });
        }

        // Vérifier que le cycle peut être finalisé
        if (billingCycle.status !== 'IN_PROGRESS') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Impossible de finaliser un cycle au statut ${billingCycle.status}`,
          });
        }

        // Récupérer les statistiques finales
        const [invoiceStats, paymentStats] = await Promise.all([
          // Statistiques des factures
          ctx.db.invoice.groupBy({
            by: ['status'],
            where: { billingCycleId },
            _count: true,
            _sum: {
              amount: true,
            },
          }),

          // Statistiques des paiements
          ctx.db.payment.groupBy({
            by: ['status'],
            where: {
              invoice: {
                billingCycleId,
              },
            },
            _count: true,
            _sum: {
              amount: true,
            },
          }),
        ]);

        // Calculer les totaux
        const totalInvoiced = invoiceStats.reduce((total, stat) => {
          return total + (stat._sum.amount ? parseFloat(stat._sum.amount.toString()) : 0);
        }, 0);

        const totalPaid = paymentStats
          .filter(stat => stat.status === 'COMPLETED')
          .reduce((total, stat) => {
            return total + (stat._sum.amount ? parseFloat(stat._sum.amount.toString()) : 0);
          }, 0);

        // Finaliser le cycle
        const updatedCycle = await ctx.db.billingCycle.update({
          where: { id: billingCycleId },
          data: {
            status: 'COMPLETED',
            completedById: adminId,
            completedAt: new Date(),
            notes: notes
              ? billingCycle.notes
                ? `${billingCycle.notes}\n\n${notes}`
                : notes
              : billingCycle.notes,
            statistics: {
              totalInvoiced,
              totalPaid,
              invoicesByStatus: invoiceStats.map(stat => ({
                status: stat.status,
                count: stat._count,
                amount: stat._sum.amount ? parseFloat(stat._sum.amount.toString()) : 0,
              })),
            },
          },
        });

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'BILLING_CYCLE',
            entityId: billingCycleId,
            performedById: adminId,
            action: 'COMPLETE_BILLING_CYCLE',
            changes: {
              totalInvoiced: String(totalInvoiced),
              totalPaid: String(totalPaid),
              notes: notes || '',
            },
          },
        });

        return {
          success: true,
          billingCycle: updatedCycle,
          stats: {
            totalInvoiced,
            totalPaid,
            invoicesByStatus: invoiceStats.map(stat => ({
              status: stat.status,
              count: stat._count,
              amount: stat._sum.amount ? parseFloat(stat._sum.amount.toString()) : 0,
            })),
          },
          message: `Cycle de facturation finalisé avec succès. Total facturé: ${totalInvoiced}€, Total payé: ${totalPaid}€`,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la finalisation du cycle de facturation',
          cause: error,
        });
      }
    }),

  /**
   * Génère des statistiques financières
   */
  getFinancialStats: adminProcedure
    .input(
      z.object({
        period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        compareWithPrevious: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { period, startDate, endDate, compareWithPrevious } = input;

        // Définir la période courante
        const currentPeriod = {
          start:
            startDate ||
            (period === 'month'
              ? startOfMonth(new Date())
              : new Date(new Date().getFullYear(), 0, 1)),
          end:
            endDate ||
            (period === 'month'
              ? endOfMonth(new Date())
              : new Date(new Date().getFullYear(), 11, 31)),
        };

        // Définir la période précédente pour comparaison
        const previousPeriod = {
          start:
            period === 'month'
              ? subMonths(currentPeriod.start, 1)
              : new Date(
                  currentPeriod.start.getFullYear() - 1,
                  currentPeriod.start.getMonth(),
                  currentPeriod.start.getDate()
                ),
          end:
            period === 'month'
              ? subMonths(currentPeriod.end, 1)
              : new Date(
                  currentPeriod.end.getFullYear() - 1,
                  currentPeriod.end.getMonth(),
                  currentPeriod.end.getDate()
                ),
        };

        // Récupérer les statistiques de facturation
        const [
          currentInvoiceStats,
          previousInvoiceStats,
          currentPaymentStats,
          previousPaymentStats,
          topClients,
        ] = await Promise.all([
          // Factures de la période courante
          ctx.db.invoice.groupBy({
            by: ['status'],
            where: {
              issuedDate: {
                gte: currentPeriod.start,
                lte: currentPeriod.end,
              },
            },
            _count: true,
            _sum: {
              amount: true,
            },
          }),

          // Factures de la période précédente
          compareWithPrevious
            ? ctx.db.invoice.groupBy({
                by: ['status'],
                where: {
                  issuedDate: {
                    gte: previousPeriod.start,
                    lte: previousPeriod.end,
                  },
                },
                _count: true,
                _sum: {
                  amount: true,
                },
              })
            : [],

          // Paiements de la période courante
          ctx.db.payment.groupBy({
            by: ['status'],
            where: {
              createdAt: {
                gte: currentPeriod.start,
                lte: currentPeriod.end,
              },
            },
            _count: true,
            _sum: {
              amount: true,
            },
          }),

          // Paiements de la période précédente
          compareWithPrevious
            ? ctx.db.payment.groupBy({
                by: ['status'],
                where: {
                  createdAt: {
                    gte: previousPeriod.start,
                    lte: previousPeriod.end,
                  },
                },
                _count: true,
                _sum: {
                  amount: true,
                },
              })
            : [],

          // Top clients par montant facturé
          ctx.db.invoice.groupBy({
            by: ['userId'],
            where: {
              issuedDate: {
                gte: currentPeriod.start,
                lte: currentPeriod.end,
              },
              status: {
                in: ['PAID', 'PENDING'],
              },
            },
            _sum: {
              amount: true,
            },
            orderBy: {
              _sum: {
                amount: 'desc',
              },
            },
            take: 5,
          }),
        ]);

        // Enrichir les top clients avec les informations utilisateur
        const topClientsWithDetails = await Promise.all(
          topClients.map(async client => {
            const user = await ctx.db.user.findUnique({
              where: { id: client.userId },
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            });

            return {
              user,
              totalAmount: client._sum.amount ? parseFloat(client._sum.amount.toString()) : 0,
            };
          })
        );

        // Calculer les totaux
        const calculateTotals = (stats: any[]) => {
          return stats.reduce(
            (totals, stat) => {
              totals.count += stat._count;
              totals.amount += stat._sum.amount ? parseFloat(stat._sum.amount.toString()) : 0;
              return totals;
            },
            { count: 0, amount: 0 }
          );
        };

        const currentInvoiceTotals = calculateTotals(currentInvoiceStats);
        const previousInvoiceTotals = compareWithPrevious
          ? calculateTotals(previousInvoiceStats)
          : { count: 0, amount: 0 };

        const currentPaymentTotals = calculateTotals(
          currentPaymentStats.filter(stat => stat.status === 'COMPLETED')
        );
        const previousPaymentTotals = compareWithPrevious
          ? calculateTotals(previousPaymentStats.filter(stat => stat.status === 'COMPLETED'))
          : { count: 0, amount: 0 };

        // Calculer les variations
        const calculateVariation = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        const variations = {
          invoiceCount: calculateVariation(currentInvoiceTotals.count, previousInvoiceTotals.count),
          invoiceAmount: calculateVariation(
            currentInvoiceTotals.amount,
            previousInvoiceTotals.amount
          ),
          paymentCount: calculateVariation(currentPaymentTotals.count, previousPaymentTotals.count),
          paymentAmount: calculateVariation(
            currentPaymentTotals.amount,
            previousPaymentTotals.amount
          ),
        };

        return {
          period: {
            type: period,
            current: {
              start: currentPeriod.start,
              end: currentPeriod.end,
            },
            previous: compareWithPrevious
              ? {
                  start: previousPeriod.start,
                  end: previousPeriod.end,
                }
              : null,
          },
          invoices: {
            current: {
              total: currentInvoiceTotals.amount,
              count: currentInvoiceTotals.count,
              byStatus: currentInvoiceStats.map(stat => ({
                status: stat.status,
                count: stat._count,
                amount: stat._sum.amount ? parseFloat(stat._sum.amount.toString()) : 0,
              })),
            },
            previous: compareWithPrevious
              ? {
                  total: previousInvoiceTotals.amount,
                  count: previousInvoiceTotals.count,
                }
              : null,
            variation: variations,
          },
          payments: {
            current: {
              total: currentPaymentTotals.amount,
              count: currentPaymentTotals.count,
              byStatus: currentPaymentStats.map(stat => ({
                status: stat.status,
                count: stat._count,
                amount: stat._sum.amount ? parseFloat(stat._sum.amount.toString()) : 0,
              })),
            },
            previous: compareWithPrevious
              ? {
                  total: previousPaymentTotals.amount,
                  count: previousPaymentTotals.count,
                }
              : null,
            variation: {
              count: variations.paymentCount,
              amount: variations.paymentAmount,
            },
          },
          topClients: topClientsWithDetails,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des statistiques financières',
          cause: error,
        });
      }
    }),

  /**
   * Génère des rapports financiers
   */
  generateFinancialReport: adminProcedure
    .input(
      z.object({
        reportType: z.enum(['REVENUE', 'COMMISSIONS', 'PAYMENTS', 'SUBSCRIPTIONS']),
        period: z.enum(['month', 'quarter', 'year']).default('month'),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        format: z.enum(['JSON', 'CSV', 'PDF']).default('JSON'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { reportType, period, startDate, endDate, format } = input;

        // Définir la période
        const reportPeriod = {
          start:
            startDate ||
            (period === 'month'
              ? startOfMonth(new Date())
              : new Date(new Date().getFullYear(), 0, 1)),
          end:
            endDate ||
            (period === 'month'
              ? endOfMonth(new Date())
              : new Date(new Date().getFullYear(), 11, 31)),
        };

        // Générer le rapport
        const report = await billingService.generateFinancialReport({
          reportType,
          startDate: reportPeriod.start,
          endDate: reportPeriod.end,
          format,
        });

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'FINANCIAL_REPORT',
            entityId: report.reportId || 'report',
            performedById: adminId,
            action: 'GENERATE_FINANCIAL_REPORT',
            changes: {
              reportType,
              period,
              startDate: reportPeriod.start.toISOString(),
              endDate: reportPeriod.end.toISOString(),
              format,
            },
          },
        });

        return {
          success: true,
          ...report,
          message: `Rapport financier de type ${reportType} généré avec succès`,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la génération du rapport financier',
          cause: error,
        });
      }
    }),
});

export default billingRouter;
