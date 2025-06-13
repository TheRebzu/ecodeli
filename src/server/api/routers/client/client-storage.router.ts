import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { storageService } from "@/server/services/shared/storage.service";
import {
  boxAvailabilitySubscriptionSchema,
  boxReservationCreateSchema,
  boxReservationUpdateSchema,
  boxSearchSchema,
  boxUsageHistorySchema,
  extendReservationSchema,
  boxAccessSchema,
  boxDetailsSchema,
} from "@/schemas/storage/storage.schema";

// Définir les statuts de réservation si non disponibles dans Prisma
export enum ReservationStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  OVERDUE = "OVERDUE",
  EXTENDED = "EXTENDED",
}

export const storageRouter = router({
  // Recherche de box disponibles
  findAvailableBoxes: protectedProcedure
    .input(boxSearchSchema)
    .query(({ input }) => {
      return storageService.findAvailableBoxes(input);
    }),

  // Création d'une réservation de box
  createBoxReservation: protectedProcedure
    .input(boxReservationCreateSchema)
    .mutation(({ input, ctx }) => {
      return storageService.createBoxReservation(input, ctx.session.user.id);
    }),

  // Mise à jour d'une réservation de box
  updateBoxReservation: protectedProcedure
    .input(boxReservationUpdateSchema)
    .mutation(({ input, ctx }) => {
      return storageService.updateBoxReservation(input, ctx.session.user.id);
    }),

  // Récupération des réservations du client
  getMyBoxReservations: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "PENDING",
              "ACTIVE",
              "COMPLETED",
              "CANCELLED",
              "OVERDUE",
              "EXTENDED",
            ])
            .optional(),
        })
        .optional(),
    )
    .query(({ input, ctx }) => {
      return storageService.getClientBoxReservations(
        ctx.session.user.id,
        input?.status as ReservationStatus | undefined,
      );
    }),

  // Récupération de l'historique d'utilisation d'une box
  getBoxUsageHistory: protectedProcedure
    .input(
      z.object({
        boxId: z.string(),
      }),
    )
    .query(({ input, ctx }) => {
      return storageService.getBoxUsageHistory(
        input.boxId,
        ctx.session.user.id,
      );
    }),

  // Abonnement aux notifications de disponibilité
  subscribeToAvailability: protectedProcedure
    .input(boxAvailabilitySubscriptionSchema)
    .mutation(({ input, ctx }) => {
      return storageService.createAvailabilitySubscription(
        input,
        ctx.session.user.id,
      );
    }),

  // Récupération des abonnements de notification du client
  getMySubscriptions: protectedProcedure.query(({ ctx }) => {
    return storageService.getClientSubscriptions(ctx.session.user.id);
  }),

  // Désactivation d'un abonnement aux notifications
  deactivateSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return storageService.deactivateSubscription(
        input.subscriptionId,
        ctx.session.user.id,
      );
    }),

  // Extension d'une réservation
  extendReservation: protectedProcedure
    .input(extendReservationSchema)
    .mutation(({ input, ctx }) => {
      return storageService.extendReservation(input, ctx.session.user.id);
    }),

  // Accès à une box (validation du code d'accès)
  accessBox: protectedProcedure
    .input(boxAccessSchema)
    .mutation(({ input, ctx }) => {
      return storageService.accessBox(input, ctx.session.user.id);
    }),

  // Enregistrement d'une action dans l'historique
  logBoxUsage: protectedProcedure
    .input(boxUsageHistorySchema)
    .mutation(({ input, ctx }) => {
      return storageService.logBoxUsage(input, ctx.session.user.id);
    }),

  // Récupération des entrepôts actifs
  getActiveWarehouses: protectedProcedure.query(() => {
    return storageService.getActiveWarehouses();
  }),

  // Récupération des box d'un entrepôt
  getWarehouseBoxes: protectedProcedure
    .input(
      z.object({
        warehouseId: z.string(),
      }),
    )
    .query(({ input }) => {
      return storageService.getWarehouseBoxes(input.warehouseId);
    }),

  // Création ou mise à jour d'une box (admin uniquement)
  upsertBox: protectedProcedure
    .input(boxDetailsSchema)
    .mutation(({ input, ctx }) => {
      // Vérification que l'utilisateur est admin (le service effectue également cette vérification)
      if (ctx.session.user.role !== "ADMIN") {
        throw new Error("Accès non autorisé");
      }
      return storageService.upsertBox(input, ctx.session.user.id);
    }),

  // Vérification des disponibilités et envoi de notifications (admin ou système)
  checkAvailabilityAndNotify: protectedProcedure.mutation(({ ctx }) => {
    // Vérification que l'utilisateur est admin
    if (ctx.session.user.role !== "ADMIN") {
      throw new Error("Accès non autorisé");
    }
    return storageService.checkAvailabilityAndNotify();
  }),

  // Nouvelles fonctionnalités client

  // Récupération des recommandations personnalisées de box
  getBoxRecommendations: protectedProcedure
    .input(
      z
        .object({
          warehouseId: z.string().optional(),
          maxPrice: z.number().optional(),
          startDate: z.coerce.date().optional(),
          endDate: z.coerce.date().optional(),
        })
        .optional(),
    )
    .query(({ input, ctx }) => {
      return storageService.getBoxRecommendationsForClient(
        ctx.session.user.id,
        input,
      );
    }),

  // Récupération des statistiques personnelles du client
  getMyStorageStats: protectedProcedure.query(({ ctx }) => {
    return storageService.getClientStorageStats(ctx.session.user.id);
  }),

  // Recherche d'alternatives pour une box non disponible
  findBoxAlternatives: protectedProcedure
    .input(
      z.object({
        boxId: z.string(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      }),
    )
    .query(({ input }) => {
      return storageService.findBoxAlternatives(
        input.boxId,
        input.startDate,
        input.endDate,
      );
    }),

  // Calcul du prix optimal avec remises
  calculateOptimalPricing: protectedProcedure
    .input(
      z.object({
        boxId: z.string(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      }),
    )
    .query(({ input, ctx }) => {
      return storageService.calculateOptimalPricing({
        ...input,
        clientId: ctx.session.user.id,
      });
    }),
});
