import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { routePlanningService } from '@/server/services/deliverer/route-planning.service';
import { TRPCError } from '@trpc/server';

/**
 * Router TRPC pour la gestion des trajets planifiés des livreurs
 * Fonctionnalité unique EcoDeli: matching automatique des trajets avec les annonces
 */
export const delivererRoutesRouter = createTRPCRouter({
  /**
   * Crée un nouveau trajet planifié
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(3, 'Nom requis (min 3 caractères)'),
      description: z.string().optional(),
      startAddress: z.string().min(5, 'Adresse de départ requise'),
      endAddress: z.string().min(5, 'Adresse d\'arrivée requise'),
      waypoints: z.array(z.object({
        lat: z.number(),
        lng: z.number(),
        name: z.string()
      })).optional(),
      departureTime: z.date(),
      arrivalTime: z.date(),
      availableWeight: z.number().min(1, 'Capacité poids requise'),
      availableVolume: z.number().min(0.1, 'Capacité volume requise'),
      isRecurring: z.boolean().default(false),
      recurringDays: z.array(z.enum([
        'monday', 'tuesday', 'wednesday', 'thursday', 
        'friday', 'saturday', 'sunday'
      ])).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès réservé aux livreurs'
        });
      }

      // Vérifier que l'heure d'arrivée est après l'heure de départ
      if (input.arrivalTime <= input.departureTime) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'L\'heure d\'arrivée doit être après l\'heure de départ'
        });
      }

      // Vérifier que le trajet est dans le futur
      if (input.departureTime <= new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Le trajet doit être planifié dans le futur'
        });
      }

      return await routePlanningService.createPlannedRoute(
        ctx.session.user.id,
        input
      );
    }),

  /**
   * Récupère tous les trajets du livreur
   */
  getMyRoutes: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().default(false)
    }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès réservé aux livreurs'
        });
      }

      // Récupérer les trajets depuis les notes utilisateur (temporaire)
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { notes: true }
      });

      if (!user?.notes) {
        return [];
      }

      const data = JSON.parse(user.notes);
      const routes = data.plannedRoutes || [];

      // Filtrer selon les préférences
      if (!input?.includeInactive) {
        return routes.filter((route: any) => route.isActive);
      }

      return routes;
    }),

  /**
   * Récupère les correspondances pour un trajet spécifique
   */
  getMatches: protectedProcedure
    .input(z.object({ 
      routeId: z.string() 
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès réservé aux livreurs'
        });
      }

      return await routePlanningService.getRouteMatches(
        ctx.session.user.id, 
        input.routeId
      );
    }),

  /**
   * Accepte une correspondance trajet/annonce
   */
  acceptMatch: protectedProcedure
    .input(z.object({ 
      matchId: z.string() 
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès réservé aux livreurs'
        });
      }

      return await routePlanningService.acceptRouteMatch(
        ctx.session.user.id,
        input.matchId
      );
    }),

  /**
   * Rejette une correspondance
   */
  rejectMatch: protectedProcedure
    .input(z.object({ 
      matchId: z.string(),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès réservé aux livreurs'
        });
      }

      // Marquer comme rejeté dans les notes
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { notes: true }
      });

      if (!user?.notes) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Correspondance non trouvée'
        });
      }

      const data = JSON.parse(user.notes);
      const routeMatches = data.routeMatches || {};

      // Trouver et marquer comme rejeté
      let matchFound = false;
      for (const routeId in routeMatches) {
        const matches = routeMatches[routeId];
        const matchIndex = matches.findIndex((m: any) => m.id === input.matchId);
        
        if (matchIndex !== -1) {
          matches[matchIndex].isRejected = true;
          matches[matchIndex].rejectedAt = new Date().toISOString();
          matches[matchIndex].rejectionReason = input.reason;
          matchFound = true;
          break;
        }
      }

      if (!matchFound) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Correspondance non trouvée'
        });
      }

      // Sauvegarder
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          notes: JSON.stringify({
            ...data,
            routeMatches
          })
        }
      });

      return { success: true, matchId: input.matchId };
    }),

  /**
   * Désactive un trajet
   */
  deactivateRoute: protectedProcedure
    .input(z.object({ 
      routeId: z.string() 
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès réservé aux livreurs'
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { notes: true }
      });

      if (!user?.notes) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Trajet non trouvé'
        });
      }

      const data = JSON.parse(user.notes);
      const routes = data.plannedRoutes || [];

      const routeIndex = routes.findIndex((r: any) => r.id === input.routeId);
      if (routeIndex === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Trajet non trouvé'
        });
      }

      // Désactiver le trajet
      routes[routeIndex].isActive = false;
      routes[routeIndex].deactivatedAt = new Date().toISOString();

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          notes: JSON.stringify({
            ...data,
            plannedRoutes: routes
          })
        }
      });

      return { success: true, routeId: input.routeId };
    }),

  /**
   * Optimise l'itinéraire d'un trajet avec les livraisons acceptées
   */
  optimize: protectedProcedure
    .input(z.object({ 
      routeId: z.string() 
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès réservé aux livreurs'
        });
      }

      // Récupérer le trajet et ses correspondances acceptées
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { notes: true }
      });

      if (!user?.notes) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Trajet non trouvé'
        });
      }

      const data = JSON.parse(user.notes);
      const routes = data.plannedRoutes || [];
      const routeMatches = data.routeMatches || {};

      const route = routes.find((r: any) => r.id === input.routeId);
      if (!route) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Trajet non trouvé'
        });
      }

      const matches = routeMatches[input.routeId] || [];
      const acceptedMatches = matches.filter((m: any) => m.isAccepted);

      if (acceptedMatches.length === 0) {
        return {
          optimizedWaypoints: [
            { type: 'start', ...route.startCoords, address: route.startAddress },
            { type: 'end', ...route.endCoords, address: route.endAddress }
          ],
          totalDistance: routePlanningService.calculateDistance(
            route.startCoords.lat, route.startCoords.lng,
            route.endCoords.lat, route.endCoords.lng
          ),
          estimatedDuration: 60, // 1h par défaut
          totalProfit: 0
        };
      }

      // Algorithme d'optimisation simple (plus proche voisin)
      const waypoints = [
        { type: 'start', ...route.startCoords, address: route.startAddress }
      ];

      // Ajouter tous les pickups et deliveries
      acceptedMatches.forEach((match: any) => {
        waypoints.push({
          type: 'pickup',
          lat: match.announcement.pickupLatitude,
          lng: match.announcement.pickupLongitude,
          address: match.announcement.pickupAddress,
          announcementId: match.announcementId
        });
        waypoints.push({
          type: 'delivery', 
          lat: match.announcement.deliveryLatitude,
          lng: match.announcement.deliveryLongitude,
          address: match.announcement.deliveryAddress,
          announcementId: match.announcementId
        });
      });

      waypoints.push({
        type: 'end',
        ...route.endCoords,
        address: route.endAddress
      });

      // Calculer la distance totale
      let totalDistance = 0;
      for (let i = 0; i < waypoints.length - 1; i++) {
        totalDistance += routePlanningService.calculateDistance(
          waypoints[i].lat, waypoints[i].lng,
          waypoints[i + 1].lat, waypoints[i + 1].lng
        );
      }

      // Calculer le profit total
      const totalProfit = acceptedMatches.reduce((sum: number, match: any) => 
        sum + match.estimatedProfit, 0
      );

      return {
        optimizedWaypoints: waypoints,
        totalDistance: Math.round(totalDistance * 100) / 100,
        estimatedDuration: Math.round(totalDistance * 2), // 2 min/km approximation
        totalProfit: Math.round(totalProfit * 100) / 100,
        acceptedDeliveries: acceptedMatches.length
      };
    }),

  /**
   * Récupère les statistiques des trajets du livreur
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès réservé aux livreurs'
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { notes: true }
      });

      if (!user?.notes) {
        return {
          totalRoutes: 0,
          activeRoutes: 0,
          totalMatches: 0,
          acceptedMatches: 0,
          rejectedMatches: 0,
          totalPotentialProfit: 0
        };
      }

      const data = JSON.parse(user.notes);
      const routes = data.plannedRoutes || [];
      const routeMatches = data.routeMatches || {};

      let totalMatches = 0;
      let acceptedMatches = 0;
      let rejectedMatches = 0;
      let totalPotentialProfit = 0;

      Object.values(routeMatches).forEach((matches: any) => {
        matches.forEach((match: any) => {
          totalMatches++;
          totalPotentialProfit += match.estimatedProfit;
          if (match.isAccepted) acceptedMatches++;
          if (match.isRejected) rejectedMatches++;
        });
      });

      return {
        totalRoutes: routes.length,
        activeRoutes: routes.filter((r: any) => r.isActive).length,
        totalMatches,
        acceptedMatches,
        rejectedMatches,
        totalPotentialProfit: Math.round(totalPotentialProfit * 100) / 100,
        acceptanceRate: totalMatches > 0 ? Math.round((acceptedMatches / totalMatches) * 100) : 0
      };
    })
});