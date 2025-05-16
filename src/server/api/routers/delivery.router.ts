import { router, protectedProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const deliveryRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'])
          .optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Récupération des livraisons
      return {
        items: [],
        nextCursor: null,
      };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    // Récupération d'une livraison par ID
    return {
      id: input.id,
      status: 'PENDING',
      // Autres champs fictifs
    };
  }),

  create: protectedProcedure
    .input(
      z.object({
        announcementId: z.string().optional(),
        pickupAddress: z.string(),
        deliveryAddress: z.string(),
        pickupDate: z.date(),
        weight: z.number().optional(),
        dimensions: z.string().optional(),
        description: z.string().optional(),
        price: z.number(),
        type: z.enum([
          'PACKAGE',
          'SHOPPING_CART',
          'AIRPORT_TRANSFER',
          'GROCERY',
          'FOREIGN_PRODUCT',
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Création d'une livraison
      return {
        id: 'new-delivery-id',
        status: 'PENDING',
        // Autres champs fictifs
      };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          'PENDING',
          'ACCEPTED',
          'PICKED_UP',
          'IN_TRANSIT',
          'DELIVERED',
          'CANCELLED',
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Mise à jour du statut d'une livraison
      return {
        id: input.id,
        status: input.status,
        // Autres champs fictifs
      };
    }),

  confirmCode: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        code: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Confirmation du code de livraison
      return {
        success: true,
        delivery: {
          id: input.id,
          status: 'DELIVERED',
          // Autres champs fictifs
        },
      };
    }),

  getLatestCoordinates: protectedProcedure
    .input(
      z.object({
        deliveryIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Supposons qu'il y a une table pour stocker les mises à jour de localisation des livreurs
        const coordinates = await ctx.db.deliveryLocationUpdate.findMany({
          where: {
            deliveryId: {
              in: input.deliveryIds,
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
          distinct: ['deliveryId'],
          select: {
            deliveryId: true,
            latitude: true,
            longitude: true,
            timestamp: true,
          },
        });

        return coordinates;
      } catch (error) {
        console.error('Erreur lors de la récupération des coordonnées:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Impossible de récupérer les coordonnées des livraisons',
        });
      }
    }),

  getHeatmapData: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Définir la période de recherche
        const startDate = input.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 derniers jours par défaut
        const endDate = input.endDate || new Date();

        // Agréger les points de livraison pour générer la carte thermique
        const heatmapData = await ctx.db.$queryRaw`
          SELECT 
            ROUND(delivery_latitude::numeric, 3) as latitude,
            ROUND(delivery_longitude::numeric, 3) as longitude,
            COUNT(*) as count
          FROM delivery
          WHERE 
            delivery_latitude IS NOT NULL 
            AND delivery_longitude IS NOT NULL
            AND created_at BETWEEN ${startDate} AND ${endDate}
          GROUP BY ROUND(delivery_latitude::numeric, 3), ROUND(delivery_longitude::numeric, 3)
          HAVING COUNT(*) > 1
        `;

        return heatmapData;
      } catch (error) {
        console.error('Erreur lors de la récupération des données de la carte thermique:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Impossible de récupérer les données de la carte thermique',
        });
      }
    }),
});
