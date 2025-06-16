import { z } from "zod";
import { router as router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { UserRole } from "@prisma/client";

/**
 * Router pour la gestion des tarifs prestataires
 * Gestion complète des tarifs, services et grilles tarifaires
 */
export const providerRatesRouter = router({ // Récupérer les tarifs du prestataire
  getRates: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const { user } = ctx.session;

      // Vérifier que l'utilisateur est un prestataire
      if (user.role !== UserRole.PROVIDER) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès réservé aux prestataires" });
      }

      // Récupérer le profil prestataire
      const provider = await db.user.findUnique({
        where: { id: user.id },
        include: {
          provider: {
            include: {
              serviceRates: {
                include: { serviceCategory },
                orderBy: { createdAt: "desc" }}}}}});

      if (!provider?.provider) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Profil prestataire non trouvé" });
      }

      return {
        success: true,
        data: {
          rates: provider.provider.serviceRates,
          totalRates: provider.provider.serviceRates.length}};
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des tarifs" });
    }
  }),

  // Créer ou mettre à jour un tarif
  upsertRate: protectedProcedure
    .input(
      z.object({ serviceCategoryId: z.string(),
        baseRate: z.number().min(0),
        hourlyRate: z.number().min(0).optional(),
        minimumCharge: z.number().min(0).optional(),
        description: z.string().optional(),
        isActive: z.boolean().default(true),
        travelCostIncluded: z.boolean().default(false),
        maxDistanceKm: z.number().min(0).optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const { user } = ctx.session;

        if (user.role !== UserRole.PROVIDER) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Accès réservé aux prestataires" });
        }

        // Vérifier que le prestataire existe
        const provider = await db.user.findUnique({
          where: { id: user.id },
          include: { provider }});

        if (!provider?.provider) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil prestataire non trouvé" });
        }

        // Vérifier que la catégorie de service existe
        const serviceCategory = await db.serviceCategory.findUnique({
          where: { id: input.serviceCategoryId }});

        if (!serviceCategory) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Catégorie de service non trouvée" });
        }

        // Créer ou mettre à jour le tarif
        const rate = await db.serviceRate.upsert({
          where: {
            providerId_serviceCategoryId: {
              providerId: provider.provider.id,
              serviceCategoryId: input.serviceCategoryId}},
          create: {
            providerId: provider.provider.id,
            serviceCategoryId: input.serviceCategoryId,
            baseRate: input.baseRate,
            hourlyRate: input.hourlyRate,
            minimumCharge: input.minimumCharge,
            description: input.description,
            isActive: input.isActive,
            travelCostIncluded: input.travelCostIncluded,
            maxDistanceKm: input.maxDistanceKm},
          update: {
            baseRate: input.baseRate,
            hourlyRate: input.hourlyRate,
            minimumCharge: input.minimumCharge,
            description: input.description,
            isActive: input.isActive,
            travelCostIncluded: input.travelCostIncluded,
            maxDistanceKm: input.maxDistanceKm,
            updatedAt: new Date()},
          include: { serviceCategory }});

        return {
          success: true,
          data: rate};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la sauvegarde du tarif" });
      }
    }),

  // Supprimer un tarif
  deleteRate: protectedProcedure
    .input(
      z.object({ serviceCategoryId: z.string() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const { user } = ctx.session;

        if (user.role !== UserRole.PROVIDER) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Accès réservé aux prestataires" });
        }

        const provider = await db.user.findUnique({
          where: { id: user.id },
          include: { provider }});

        if (!provider?.provider) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil prestataire non trouvé" });
        }

        await db.serviceRate.delete({
          where: {
            providerId_serviceCategoryId: {
              providerId: provider.provider.id,
              serviceCategoryId: input.serviceCategoryId}}});

        return {
          success: true,
          message: "Tarif supprimé avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression du tarif" });
      }
    }),

  // Calculer le coût d'un service
  calculateServiceCost: protectedProcedure
    .input(
      z.object({ serviceCategoryId: z.string(),
        estimatedHours: z.number().min(0).optional(),
        distanceKm: z.number().min(0).optional() }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        const { user } = ctx.session;

        if (user.role !== UserRole.PROVIDER) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Accès réservé aux prestataires" });
        }

        const provider = await db.user.findUnique({
          where: { id: user.id },
          include: { provider }});

        if (!provider?.provider) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil prestataire non trouvé" });
        }

        // Récupérer le tarif pour cette catégorie
        const rate = await db.serviceRate.findUnique({
          where: {
            providerId_serviceCategoryId: {
              providerId: provider.provider.id,
              serviceCategoryId: input.serviceCategoryId}},
          include: { serviceCategory }});

        if (!rate) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Tarif non défini pour cette catégorie" });
        }

        // Calculer le coût
        const totalCost = rate.baseRate;

        // Ajouter les heures si spécifiées
        if (input.estimatedHours && rate.hourlyRate) {
          totalCost += input.estimatedHours * rate.hourlyRate;
        }

        // Vérifier la charge minimale
        if (rate.minimumCharge && totalCost < rate.minimumCharge) {
          totalCost = rate.minimumCharge;
        }

        // Ajouter les frais de déplacement si nécessaire
        const travelCost = 0;
        if (input.distanceKm && !rate.travelCostIncluded) {
          if (rate.maxDistanceKm && input.distanceKm > rate.maxDistanceKm) {
            // Frais supplémentaires pour dépassement
            travelCost = (input.distanceKm - rate.maxDistanceKm) * 0.5; // 0.5€/km par défaut
          }
        }

        return {
          success: true,
          data: {
            serviceCost: totalCost,
            travelCost,
            totalCost: totalCost + travelCost,
            rate: {
              baseRate: rate.baseRate,
              hourlyRate: rate.hourlyRate,
              minimumCharge: rate.minimumCharge,
              travelCostIncluded: rate.travelCostIncluded},
            calculation: {
              baseRate: rate.baseRate,
              hourlyCharge:
                input.estimatedHours && rate.hourlyRate
                  ? input.estimatedHours * rate.hourlyRate
                  : 0,
              travelCharge: travelCost,
              minimumApplied:
                rate.minimumCharge && totalCost < rate.minimumCharge}}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du calcul du coût" });
      }
    }),

  // Obtenir les catégories de services disponibles
  getAvailableServiceCategories: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const categories = await db.serviceCategory.findMany({
        where: { isActive },
        orderBy: { name: "asc" }});

      return {
        success: true,
        data: categories};
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des catégories" });
    }
  })});
