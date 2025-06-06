import { router, adminProcedure, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { UserStatus } from '@prisma/client';
import { delivererAdminService } from '@/server/services/deliverer-admin.service';

/**
 * Router pour les fonctionnalités d'administration
 */
export const adminRouter = router({
  // ===== GESTION DES LIVREURS =====
  
  deliverers: router({
    // Récupérer la liste des livreurs avec pagination et filtres (debug input)
    getAll: publicProcedure
      .input(
        z.object({
          page: z.number().default(1),
          limit: z.number().default(10),
          search: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        console.log('🔍 Input reçu:', input);
        console.log('🔍 Type input:', typeof input);
        
        // Paramètres par défaut si input est undefined
        const params = input || { page: 1, limit: 10 };
        console.log('🔍 Params utilisés:', params);
        
        return await delivererAdminService.getDeliverers(params);
      }),

    // Récupérer les statistiques des livreurs (temporairement public)
    getStats: publicProcedure
      .query(async () => {
        return await delivererAdminService.getDeliverersStats();
      }),

    // Mettre à jour le statut d'un livreur
    updateStatus: adminProcedure
      .input(
        z.object({
          delivererId: z.string(),
          status: z.nativeEnum(UserStatus),
        })
      )
      .mutation(async ({ input }) => {
        return await delivererAdminService.updateDelivererStatus(
          input.delivererId,
          input.status
        );
      }),

    // Vérifier un livreur
    verify: adminProcedure
      .input(
        z.object({
          delivererId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return await delivererAdminService.verifyDeliverer(input.delivererId);
      }),

    // Récupérer les détails d'un livreur
    getDetails: adminProcedure
      .input(
        z.object({
          delivererId: z.string(),
        })
      )
      .query(async ({ input }) => {
        return await delivererAdminService.getDelivererDetails(input.delivererId);
      }),
  }),
});
