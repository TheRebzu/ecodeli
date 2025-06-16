import { z } from "zod";
import {
  router,
  protectedProcedure,
  verifiedDelivererProcedure} from "@/server/api/trpc";
import { AnnouncementService } from "@/server/services/shared/announcement.service";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementFilterSchema,
  createAnnouncementApplicationSchema,
  updateAnnouncementStatusSchema,
  searchAnnouncementSchema,
  assignDelivererSchema,
  announcementStatsSchema,
  getAnnouncementDetailSchema} from "@/schemas/delivery/announcement.schema";
import { TRPCError } from "@trpc/server";
import { AnnouncementStatus } from "@/types/announcements/announcement";
import { UserRole } from "@prisma/client";

export const announcementRouter = router({ // Récupération de toutes les annonces avec filtres
  getAll: publicProcedure
    .input(announcementFilterSchema.optional().default({ }))
    .query(async ({ input  }) => {
      try {
        return await AnnouncementService.getAll(input);
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Une erreur est survenue",
          cause: error });
      }
    }),

  // Récupération des annonces d'un client spécifique
  getMyAnnouncements: protectedProcedure
    .input(
      z.object({ status: z.nativeEnum(AnnouncementStatus).optional(),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0) }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        const filters = {
          clientId: ctx.session.user.id,
          status: input.status,
          limit: input.limit,
          offset: input.offset};

        return await AnnouncementService.getAll(filters);
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Une erreur est survenue",
          cause: error });
      }
    }),

  // Récupération d'une annonce par ID
  getById: publicProcedure
    .input(z.object({ id: z.string()  }))
    .query(async ({ input  }) => {
      try {
        return await AnnouncementService.getById(input.id);
      } catch (error) {
        if (error instanceof Error && error.message === "Annonce non trouvée") {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée",
            cause: error });
        }

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Une erreur est survenue",
          cause: error });
      }
    }),

  // Création d'une annonce
  create: protectedProcedure
    .input(createAnnouncementSchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérification du rôle utilisateur
      if (
        ctx.session.user.role !== UserRole.CLIENT &&
        ctx.session.user.role !== UserRole.MERCHANT &&
        ctx.session.user.role !== UserRole.ADMIN
      ) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'avez pas les permissions pour créer une annonce" });
      }

      // Pour être sûr que l'utilisateur connecté est celui qui crée l'annonce
      if (
        input.clientId !== ctx.session.user.id &&
        ctx.session.user.role !== UserRole.ADMIN
      ) {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous ne pouvez pas créer une annonce pour un autre utilisateur" });
      }

      try {
        const announcement = await ctx.db.announcement.create({
          data: {
            title: input.title,
            description: input.description,
            type: input.type,
            status: "DRAFT", // Statut initial d'une annonce
            priority: input.priority,
            pickupAddress: input.pickupAddress,
            pickupLongitude: input.pickupLongitude,
            pickupLatitude: input.pickupLatitude,
            deliveryAddress: input.deliveryAddress,
            deliveryLongitude: input.deliveryLongitude,
            deliveryLatitude: input.deliveryLatitude,
            weight: input.weight,
            width: input.width,
            height: input.height,
            length: input.length,
            isFragile: input.isFragile,
            needsCooling: input.needsCooling,
            pickupDate: input.pickupDate
              ? new Date(input.pickupDate)
              : undefined,
            pickupTimeWindow: input.pickupTimeWindow,
            deliveryDate: input.deliveryDate
              ? new Date(input.deliveryDate)
              : undefined,
            deliveryTimeWindow: input.deliveryTimeWindow,
            isFlexible: input.isFlexible,
            suggestedPrice: input.suggestedPrice,
            isNegotiable: input.isNegotiable,
            tags: input.tags,
            photos: input.photos,
            specialInstructions: input.specialInstructions,
            requiresSignature: input.requiresSignature,
            requiresId: input.requiresId,
            clientId: input.clientId}});

        return announcement;
      } catch (error) {
        console.error("Erreur lors de la création de l'annonce:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Une erreur est survenue lors de la création de l'annonce" });
      }
    }),

  // Mise à jour d'une annonce
  update: protectedProcedure
    .input(updateAnnouncementSchema)
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // Vérifier que l'annonce existe
        const announcement = await ctx.db.announcement.findUnique({
          where: { id: input.id }});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        // Vérification des autorisations
        const isAuthor = announcement.clientId === ctx.session.user.id;
        const isAdmin = ctx.session.user.role === UserRole.ADMIN;

        if (!isAuthor && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Vous n'avez pas les droits pour modifier cette annonce" });
        }

        // Vérifier si l'annonce peut être modifiée en fonction de son statut
        const nonModifiableStatuses = [
          "IN_PROGRESS",
          "DELIVERED",
          "COMPLETED",
          "PAID",
          "CANCELLED"];

        if (nonModifiableStatuses.includes(announcement.status) && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN",
            message:
              "Cette annonce ne peut plus être modifiée dans son état actuel" });
        }

        // Supprimer l'id de input avant de l'utiliser pour la mise à jour
        const { id: id, ...updateData } = input;

        // Convertir les dates si nécessaires
        const finalUpdateData = { ...updateData };

        // Mise à jour
        const updatedAnnouncement = await ctx.db.announcement.update({
          where: { id },
          data: finalUpdateData});

        return updatedAnnouncement;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la mise à jour de l'annonce:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            "Une erreur est survenue lors de la mise à jour de l'annonce" });
      }
    }),

  // Suppression d'une annonce
  delete: protectedProcedure
    .input(z.object({ id: z.string()  }))
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const announcement = await ctx.db.announcement.findUnique({
          where: { id: input.id }});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        // Vérifier les autorisations
        const isAuthor = announcement.clientId === ctx.session.user.id;
        const isAdmin = ctx.session.user.role === UserRole.ADMIN;

        if (!isAuthor && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Vous n'avez pas les droits pour supprimer cette annonce" });
        }

        // Vérifier que l'annonce peut être supprimée
        const nonDeletableStatuses = [
          "IN_PROGRESS",
          "DELIVERED",
          "COMPLETED",
          "PAID"];
        if (nonDeletableStatuses.includes(announcement.status) && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN",
            message:
              "Cette annonce ne peut pas être supprimée dans son état actuel" });
        }

        // Marquer comme annulée plutôt que de supprimer
        const deletedAnnouncement = await ctx.db.announcement.update({
          where: { id: input.id },
          data: {
            status: "CANCELLED",
            cancelReason: "Supprimée par l'utilisateur",
            updatedAt: new Date()}});

        return deletedAnnouncement;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la suppression de l'annonce:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            "Une erreur est survenue lors de la suppression de l'annonce" });
      }
    }),

  // Postuler à une annonce (pour les livreurs vérifiés uniquement)
  applyForAnnouncement: verifiedDelivererProcedure
    .input(createAnnouncementApplicationSchema)
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const {
          announcementId: announcementId,
          proposedPrice: proposedPrice,
          message: message} = input;

        return await AnnouncementService.applyForAnnouncement(
          announcementId,
          ctx.session.user.id,
          {
            proposedPrice,
            message},
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes("livreurs")) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: error.message,
            cause: error });
        }

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Une erreur est survenue",
          cause: error });
      }
    }),

  // Mettre à jour le statut d'une candidature
  updateApplicationStatus: protectedProcedure
    .input(
      z.object({ applicationId: z.string(),
        status: z.string() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // Vérifier que l'utilisateur est authentifié
        if (!ctx.session?.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED",
            message: "Vous devez être connecté pour gérer une candidature" });
        }

        const { applicationId: applicationId, status: status } = input;

        return await AnnouncementService.updateApplicationStatus(
          applicationId,
          status,
          ctx.session.user.id,
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes("autorisé")) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: error.message,
            cause: error });
        }

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Une erreur est survenue",
          cause: error });
      }
    }),

  // Publier une annonce
  publish: protectedProcedure
    .input(z.object({ id: z.string()  }))
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const announcement = await ctx.db.announcement.findUnique({
          where: { id: input.id }});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        // Vérifier les autorisations
        const isAuthor = announcement.clientId === ctx.session.user.id;
        const isAdmin = ctx.session.user.role === UserRole.ADMIN;

        if (!isAuthor && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Vous n'avez pas les droits pour publier cette annonce" });
        }

        // Vérifier que l'annonce est en brouillon
        if (announcement.status !== "DRAFT") {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Seules les annonces en brouillon peuvent être publiées" });
        }

        // Publier l'annonce
        const publishedAnnouncement = await ctx.db.announcement.update({
          where: { id: input.id },
          data: {
            status: "PUBLISHED",
            updatedAt: new Date()}});

        return publishedAnnouncement;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la publication de l'annonce:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            "Une erreur est survenue lors de la publication de l'annonce" });
      }
    }),

  // Marquer une annonce comme complétée
  complete: protectedProcedure
    .input(z.object({ id: z.string()  }))
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // Vérifier que l'utilisateur est authentifié
        if (!ctx.session?.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED",
            message: "Vous devez être connecté pour compléter une annonce" });
        }

        return await AnnouncementService.completeAnnouncement(
          input.id,
          ctx.session.user.id,
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes("autorisé")) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: error.message,
            cause: error });
        }

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Une erreur est survenue",
          cause: error });
      }
    }),

  // Changer le statut d'une annonce
  updateStatus: protectedProcedure
    .input(updateAnnouncementStatusSchema)
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // Vérifier que l'annonce existe
        const announcement = await ctx.db.announcement.findUnique({
          where: { id: input.id }});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        // Vérification des autorisations et règles métier selon les statuts
        const isAuthor = announcement.clientId === ctx.session.user.id;
        const isAssignedDeliverer =
          announcement.delivererId === ctx.session.user.id;
        const isAdmin = ctx.session.user.role === UserRole.ADMIN;

        // Règles de changement d'état selon le rôle et l'état actuel
        const allowed = () => {
          // L'admin peut tout faire
          if (isAdmin) return true;

          // L'auteur peut publier, annuler, et confirmer la livraison
          if (isAuthor) {
            if (input.status === "PUBLISHED" && announcement.status === "DRAFT")
              return true;
            if (
              input.status === "CANCELLED" &&
              ["DRAFT", "PUBLISHED", "IN_APPLICATION", "ASSIGNED"].includes(
                announcement.status,
              )
            )
              return true;
            if (
              input.status === "COMPLETED" &&
              announcement.status === "DELIVERED"
            )
              return true;
            if (
              input.status === "PROBLEM" &&
              ["ASSIGNED", "IN_PROGRESS"].includes(announcement.status)
            )
              return true;
          }

          // Le livreur assigné peut mettre à jour le statut de livraison
          if (isAssignedDeliverer) {
            if (
              input.status === "IN_PROGRESS" &&
              announcement.status === "ASSIGNED"
            )
              return true;
            if (
              input.status === "DELIVERED" &&
              announcement.status === "IN_PROGRESS"
            )
              return true;
            if (
              input.status === "PROBLEM" &&
              ["IN_PROGRESS", "DELIVERED"].includes(announcement.status)
            )
              return true;
          }

          return false;
        };

        if (!allowed()) {
          throw new TRPCError({ code: "FORBIDDEN",
            message:
              "Vous n'avez pas les droits pour modifier le statut de cette annonce" });
        }

        // Vérifier la raison d'annulation si nécessaire
        if (input.status === "CANCELLED" && !input.cancelReason) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Une raison d'annulation est requise" });
        }

        // Mise à jour du statut
        const updatedAnnouncement = await ctx.db.announcement.update({
          where: { id: input.id },
          data: {
            status: input.status,
            cancelReason: input.cancelReason,
            notes: input.notes,
            updatedAt: new Date()}});

        return updatedAnnouncement;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error(
          "Erreur lors du changement de statut de l'annonce:",
          error,
        );
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            "Une erreur est survenue lors du changement de statut de l'annonce" });
      }
    }),

  // Rechercher et filtrer les annonces
  search: publicProcedure
    .input(searchAnnouncementSchema)
    .query(async ({ ctx, input: input  }) => {
      try {
        const skip = (input.page - 1) * input.limit;

        // Construire les filtres en fonction des paramètres
        const where: any = {};

        // Filtrer par statut
        if (input.status) {
          where.status = input.status;
        } else {
          // Par défaut, ne montrer que les annonces publiées aux utilisateurs non connectés
          if (!ctx.session?.user) {
            where.status = "PUBLISHED";
          }
        }

        // Filtrer par type
        if (input.type) {
          where.type = input.type;
        }

        // Filtrer par priorité
        if (input.priority) {
          where.priority = input.priority;
        }

        // Filtrer par plage de prix
        if (input.minPrice !== undefined) {
          where.suggestedPrice = {
            ...where.suggestedPrice,
            gte: input.minPrice};
        }
        if (input.maxPrice !== undefined) {
          where.suggestedPrice = {
            ...where.suggestedPrice,
            lte: input.maxPrice};
        }

        // Filtrer par caractéristiques
        if (input.isFragile !== undefined) {
          where.isFragile = input.isFragile;
        }

        if (input.needsCooling !== undefined) {
          where.needsCooling = input.needsCooling;
        }

        if (input.requiresSignature !== undefined) {
          where.requiresSignature = input.requiresSignature;
        }

        if (input.requiresId !== undefined) {
          where.requiresId = input.requiresId;
        }

        // Filtrer par tags
        if (input.tags && input.tags.length > 0) {
          where.tags = {
            hasEvery: input.tags};
        }

        // Filtrer par plage de dates
        if (input.fromDate) {
          where.pickupDate = {
            ...where.pickupDate,
            gte: new Date(input.fromDate)};
        }

        if (input.toDate) {
          where.pickupDate = {
            ...where.pickupDate,
            lte: new Date(input.toDate)};
        }

        // Recherche textuelle
        if (input.query) {
          where.OR = [
            { title: { contains: input.query, mode: "insensitive" } },
            { description: { contains: input.query, mode: "insensitive" } }];
        }

        // Recherche par adresse
        if (input.pickupAddressSearch) {
          where.pickupAddress = {
            contains: input.pickupAddressSearch,
            mode: "insensitive"};
        }

        if (input.deliveryAddressSearch) {
          where.deliveryAddress = {
            contains: input.deliveryAddressSearch,
            mode: "insensitive"};
        }

        // Déterminer le tri
        const orderBy: any = {};
        if (input.orderBy && input.orderDirection) {
          orderBy[input.orderBy] = input.orderDirection;
        } else {
          // Tri par défaut
          orderBy.createdAt = "desc";
        }

        // Exécuter la requête
        const [announcements, totalCount] = await Promise.all([
          ctx.db.announcement.findMany({
            where,
            orderBy,
            skip,
            take: input.limit,
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  image: true}},
              count: {
                select: {
                  applications: true,
                  favorites: true}}}}),
          ctx.db.announcement.count({ where  })]);

        return {
          announcements,
          totalCount,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(totalCount / input.limit)};
      } catch (error) {
        console.error("Erreur lors de la recherche d'annonces:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Une erreur est survenue lors de la recherche d'annonces" });
      }
    }),

  // Attribuer une annonce à un livreur
  assignDeliverer: protectedProcedure
    .input(assignDelivererSchema)
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // Vérifier que l'annonce existe
        const announcement = await ctx.db.announcement.findUnique({
          where: { id: input.announcementId },
          include: {
            applications: {
              where: { delivererId: input.delivererId }}}});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        // Vérifier que l'utilisateur est l'auteur de l'annonce ou un admin
        const isAuthor = announcement.clientId === ctx.session.user.id;
        const isAdmin = ctx.session.user.role === UserRole.ADMIN;

        if (!isAuthor && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Vous n'avez pas les droits pour attribuer cette annonce" });
        }

        // Vérifier que l'annonce est dans un état permettant l'attribution
        if (
          announcement.status !== "PUBLISHED" &&
          announcement.status !== "IN_APPLICATION"
        ) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message:
              "Cette annonce ne peut pas être attribuée dans son état actuel" });
        }

        // Vérifier que le livreur a bien postulé (sauf pour les admins)
        if (announcement.applications.length === 0 && !isAdmin) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Ce livreur n'a pas postulé à cette annonce" });
        }

        // Mettre à jour l'annonce avec le livreur sélectionné
        const updatedAnnouncement = await ctx.db.announcement.update({
          where: { id: input.announcementId },
          data: {
            delivererId: input.delivererId,
            finalPrice: input.finalPrice,
            status: "ASSIGNED",
            notes: input.notes}});

        // Mettre à jour le statut de la candidature du livreur
        if (announcement.applications.length > 0) {
          await ctx.db.deliveryApplication.update({
            where: {
              id: announcement.applications[0].id},
            data: {
              status: "ACCEPTED"}});

          // Rejeter les autres candidatures
          await ctx.db.deliveryApplication.updateMany({
            where: {
              announcementId: input.announcementId,
              delivererId: { not: input.delivererId }},
            data: {
              status: "REJECTED"}});
        }

        return updatedAnnouncement;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de l'attribution de l'annonce:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Une erreur est survenue lors de l'attribution de l'annonce" });
      }
    }),

  // Obtenir des statistiques sur les annonces
  getStats: protectedProcedure
    .input(announcementStatsSchema.optional().default({}))
    .query(async ({ ctx, input: input  }) => {
      try {
        // Vérifier que l'utilisateur est un admin, sinon limiter aux statistiques personnelles
        const isAdmin = ctx.session.user.role === UserRole.ADMIN;
        const userId = ctx.session.user.id;

        // Construire les filtres
        const where: any = {};

        // Filtres temporels
        if (input.startDate) {
          where.createdAt = {
            ...where.createdAt,
            gte: new Date(input.startDate)};
        }

        if (input.endDate) {
          where.createdAt = {
            ...where.createdAt,
            lte: new Date(input.endDate)};
        }

        // Filtrer par type d'annonce
        if (input.type) {
          where.type = input.type;
        }

        // Appliquer les filtres de client/livreur
        if (input.clientId && (isAdmin || input.clientId === userId)) {
          where.clientId = input.clientId;
        } else if (!isAdmin) {
          // Si non admin, limiter aux annonces de l'utilisateur
          if (
            ctx.session.user.role === UserRole.CLIENT ||
            ctx.session.user.role === UserRole.MERCHANT
          ) {
            where.clientId = userId;
          } else if (ctx.session.user.role === UserRole.DELIVERER) {
            where.delivererId = userId;
          }
        }

        if (input.delivererId && (isAdmin || input.delivererId === userId)) {
          where.delivererId = input.delivererId;
        }

        // Obtenir les statistiques
        const [
          totalCount,
          publishedCount,
          assignedCount,
          completedCount,
          cancelledCount,
          averagePrice,
          totalRevenue] = await Promise.all([
          ctx.db.announcement.count({ where  }),
          ctx.db.announcement.count({
            where: { ...where, status: "PUBLISHED" }}),
          ctx.db.announcement.count({
            where: { ...where, status: "ASSIGNED" }}),
          ctx.db.announcement.count({
            where: { ...where, status: "COMPLETED" }}),
          ctx.db.announcement.count({
            where: { ...where, status: "CANCELLED" }}),
          ctx.db.announcement.aggregate({
            where: { ...where, suggestedPrice: { not } },
            avg: { suggestedPrice }}),
          ctx.db.announcement.aggregate({
            where: {
              ...where,
              status: "COMPLETED",
              suggestedPrice: { not }},
            sum: { suggestedPrice }})]);

        // Obtenir la distribution par type si admin
        const typeDistribution = {};
        if (isAdmin) {
          const typeCounts = await ctx.db.announcement.groupBy({ by: ["type"],
            where,
            count: true });

          typeDistribution = typeCounts.reduce((acc, curr) => {
            return { ...acc, [curr.type]: curr.count };
          }, {});
        }

        return {
          totalCount,
          publishedCount,
          assignedCount,
          completedCount,
          cancelledCount,
          averagePrice: averagePrice.avg.suggestedPrice || 0,
          totalRevenue: totalRevenue.sum.suggestedPrice || 0,
          typeDistribution: isAdmin ? typeDistribution : undefined};
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des statistiques:",
          error,
        );
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            "Une erreur est survenue lors de la récupération des statistiques" });
      }
    }),

  // Récupérer les annonces d'un utilisateur
  getByUserId: protectedProcedure
    .input(
      z.object({ userId: z.string().cuid(),
        status: z.nativeEnum(AnnouncementStatus).optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().min(1).max(100).default(20) }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        const skip = (input.page - 1) * input.limit;

        // Vérifier les autorisations
        const requestedUserId = input.userId;
        const currentUserId = ctx.session.user.id;
        const isRequestingOwnData = requestedUserId === currentUserId;
        const isAdmin = ctx.session.user.role === UserRole.ADMIN;

        if (!isRequestingOwnData && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Vous n'avez pas accès aux annonces de cet utilisateur" });
        }

        // Construire les filtres
        const where: any = { clientId };

        if (input.status) {
          where.status = input.status;
        }

        // Exécuter la requête
        const [announcements, totalCount] = await Promise.all([
          ctx.db.announcement.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: input.limit,
            include: {
              count: {
                select: { applications }}}}),
          ctx.db.announcement.count({ where  })]);

        return {
          announcements,
          totalCount,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(totalCount / input.limit)};
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error(
          "Erreur lors de la récupération des annonces de l'utilisateur:",
          error,
        );
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            "Une erreur est survenue lors de la récupération des annonces" });
      }
    }),

  // Récupérer les annonces assignées à un livreur
  getAssignedToDeliverer: protectedProcedure
    .input(
      z.object({ delivererId: z.string().cuid().optional(),
        status: z.nativeEnum(AnnouncementStatus).optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().min(1).max(100).default(20) }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        const skip = (input.page - 1) * input.limit;

        // Si delivererId n'est pas fourni, utiliser l'ID de l'utilisateur connecté
        const delivererId = input.delivererId || ctx.session.user.id;

        // Vérifier les autorisations
        const isRequestingOwnData = delivererId === ctx.session.user.id;
        const isAdmin = ctx.session.user.role === UserRole.ADMIN;

        if (!isRequestingOwnData && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Vous n'avez pas accès aux annonces de ce livreur" });
        }

        // Construire les filtres
        const where: any = {
          delivererId};

        if (input.status) {
          where.status = input.status;
        }

        // Exécuter la requête
        const [announcements, totalCount] = await Promise.all([
          ctx.db.announcement.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: input.limit,
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  image: true}}}}),
          ctx.db.announcement.count({ where  })]);

        return {
          announcements,
          totalCount,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(totalCount / input.limit)};
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error(
          "Erreur lors de la récupération des annonces du livreur:",
          error,
        );
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            "Une erreur est survenue lors de la récupération des annonces" });
      }
    })});
