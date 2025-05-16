import { z } from 'zod';
import { router as createTRPCRouter, adminProcedure, protectedProcedure } from '../trpc';
import { billingService } from '../../services/billing.service';
import { TRPCError } from '@trpc/server';
import { format, subMonths } from 'date-fns';

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
export const billingRouter = createTRPCRouter({
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
});
