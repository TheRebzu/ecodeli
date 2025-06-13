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
    .mutation(({ input, _ctx }) => {
      return storageService.createBoxReservation(input, _ctx.session.user.id);
    }),

  // Mise à jour d'une réservation de box
  updateBoxReservation: protectedProcedure
    .input(boxReservationUpdateSchema)
    .mutation(({ input, _ctx }) => {
      return storageService.updateBoxReservation(input, _ctx.session.user.id);
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
    .query(({ input, _ctx }) => {
      return storageService.getClientBoxReservations(
        _ctx.session.user.id,
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
    .query(({ input, _ctx }) => {
      return storageService.getBoxUsageHistory(
        input.boxId,
        _ctx.session.user.id,
      );
    }),

  // Abonnement aux notifications de disponibilité
  subscribeToAvailability: protectedProcedure
    .input(boxAvailabilitySubscriptionSchema)
    .mutation(({ input, _ctx }) => {
      return storageService.createAvailabilitySubscription(
        input,
        _ctx.session.user.id,
      );
    }),

  // Récupération des abonnements de notification du client
  getMySubscriptions: protectedProcedure.query(({ _ctx }) => {
    return storageService.getClientSubscriptions(_ctx.session.user.id);
  }),

  // Désactivation d'un abonnement aux notifications
  deactivateSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
      }),
    )
    .mutation(({ input, _ctx }) => {
      return storageService.deactivateSubscription(
        input.subscriptionId,
        _ctx.session.user.id,
      );
    }),

  // Extension d'une réservation
  extendReservation: protectedProcedure
    .input(extendReservationSchema)
    .mutation(({ input, _ctx }) => {
      return storageService.extendReservation(input, _ctx.session.user.id);
    }),

  // Accès à une box (validation du code d'accès)
  accessBox: protectedProcedure
    .input(boxAccessSchema)
    .mutation(({ input, _ctx }) => {
      return storageService.accessBox(input, _ctx.session.user.id);
    }),

  // Enregistrement d'une action dans l'historique
  logBoxUsage: protectedProcedure
    .input(boxUsageHistorySchema)
    .mutation(({ input, _ctx }) => {
      return storageService.logBoxUsage(input, _ctx.session.user.id);
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
    .mutation(({ input, _ctx }) => {
      // Vérification que l'utilisateur est admin (le service effectue également cette vérification)
      if (_ctx.session.user.role !== "ADMIN") {
        throw new Error("Accès non autorisé");
      }
      return storageService.upsertBox(input, _ctx.session.user.id);
    }),

  // Vérification des disponibilités et envoi de notifications (admin ou système)
  checkAvailabilityAndNotify: protectedProcedure.mutation(({ _ctx }) => {
    // Vérification que l'utilisateur est admin
    if (_ctx.session.user.role !== "ADMIN") {
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
    .query(({ input, _ctx }) => {
      return storageService.getBoxRecommendationsForClient(
        _ctx.session.user.id,
        input,
      );
    }),

  // Récupération des statistiques personnelles du client
  getMyStorageStats: protectedProcedure.query(({ _ctx }) => {
    return storageService.getClientStorageStats(_ctx.session.user.id);
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
    .query(({ input, _ctx }) => {
      return storageService.calculateOptimalPricing({
        ...input,
        clientId: _ctx.session.user.id,
      });
    }),
});
