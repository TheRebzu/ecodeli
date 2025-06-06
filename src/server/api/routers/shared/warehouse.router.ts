import { router, protectedProcedure } from '@/server/api/trpc';
import { warehouseService } from '@/server/services/shared/warehouse.service';
import { z } from 'zod';

export const warehouseRouter = router({
  // Récupération des entrepôts actifs avec leurs informations complètes
  getWarehouses: protectedProcedure
    .input(
      z
        .object({
          includeBoxes: z.boolean().optional().default(false),
          city: z.string().optional(),
          lat: z.number().optional(),
          lng: z.number().optional(),
          radius: z.number().optional(), // En kilomètres
        })
        .optional()
    )
    .query(async ({ input = {} }) => {
      return warehouseService.getActiveWarehouses(input);
    }),

  // Récupération des détails d'un entrepôt spécifique
  getWarehouseDetails: protectedProcedure
    .input(z.object({ warehouseId: z.string() }))
    .query(async ({ input }) => {
      return warehouseService.getWarehouseDetails(input.warehouseId);
    }),

  // Récupération des boxes d'un entrepôt avec leurs disponibilités
  getBoxes: protectedProcedure
    .input(
      z.object({
        warehouseId: z.string(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        availableOnly: z.boolean().optional().default(true),
      })
    )
    .query(async ({ input }) => {
      return warehouseService.getWarehouseBoxes(input);
    }),

  // Recherche d'entrepôts par proximité géographique
  searchNearbyWarehouses: protectedProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radius: z.number().default(25), // Rayon en kilomètres
        maxResults: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      return warehouseService.searchNearbyWarehouses(input);
    }),

  // Obtenir les statistiques d'un entrepôt
  getWarehouseStats: protectedProcedure
    .input(z.object({ warehouseId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Vérification des droits admin pour certaines stats
      const isAdmin = ctx.session.user.role === 'ADMIN';
      return warehouseService.getWarehouseStats(input.warehouseId, isAdmin);
    }),

  // Récupération des créneaux de disponibilité pour un entrepôt
  getAvailabilitySlots: protectedProcedure
    .input(
      z.object({
        warehouseId: z.string(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        boxType: z
          .enum([
            'STANDARD',
            'CLIMATE_CONTROLLED',
            'SECURE',
            'EXTRA_LARGE',
            'REFRIGERATED',
            'FRAGILE',
          ])
          .optional(),
        minSize: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return warehouseService.getAvailabilitySlots(input);
    }),

  // Réservation rapide d'une box (utilise le storage service)
  reserveBox: protectedProcedure
    .input(
      z.object({
        boxId: z.string(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Redirection vers le service de stockage pour la réservation
      const { storageService } = await import('@/server/services/storage.service');
      return storageService.createBoxReservation(input, ctx.session.user.id);
    }),

  // Libération d'une box (admin seulement)
  releaseBox: protectedProcedure
    .input(z.object({ boxId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      // Vérification des droits admin
      if (ctx.session.user.role !== 'ADMIN') {
        throw new Error('Accès non autorisé');
      }
      return warehouseService.releaseBox(input.boxId, input.reason, ctx.session.user.id);
    }),

  // Signalement d'un problème sur un entrepôt ou une box
  reportIssue: protectedProcedure
    .input(
      z.object({
        warehouseId: z.string(),
        boxId: z.string().optional(),
        issueType: z.enum(['MAINTENANCE', 'SECURITY', 'ACCESS', 'CLEANLINESS', 'OTHER']),
        description: z.string().min(10, 'Description trop courte'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return warehouseService.reportIssue(input, ctx.session.user.id);
    }),

  // Obtenir les horaires d'accès pour un entrepôt
  getAccessHours: protectedProcedure
    .input(z.object({ warehouseId: z.string() }))
    .query(async ({ input }) => {
      return warehouseService.getAccessHours(input.warehouseId);
    }),

  // Vérifier la capacité d'un entrepôt
  checkCapacity: protectedProcedure
    .input(
      z.object({
        warehouseId: z.string(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      })
    )
    .query(async ({ input }) => {
      return warehouseService.checkCapacity(input);
    }),
});
