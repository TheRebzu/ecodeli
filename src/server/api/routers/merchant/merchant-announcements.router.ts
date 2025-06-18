import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  MerchantAnnouncementType,
  AnnouncementStatus,
  AnnouncementPriority} from "@prisma/client";

/**
 * Router pour les annonces commerçants selon le cahier des charges
 * Promotions, nouveautés, événements spéciaux, livraisons express
 */

// Schémas de validation
const createAnnouncementSchema = z.object({ type: z.nativeEnum(MerchantAnnouncementType),
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  content: z.string().min(20).max(5000),

  // Détails de l'annonce
  discount: z
    .object({
      type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
      value: z.number().min(0),
      minOrderAmount: z.number().min(0).optional(),
      maxDiscount: z.number().min(0).optional(), // Pour les %
     })
    .optional(),

  // Période de validité
  startDate: z.date(),
  endDate: z.date(),

  // Ciblage géographique
  targetZones: z
    .array(
      z.object({ postalCode: z.string(),
        city: z.string(),
        maxDistance: z.number().min(1).max(50) }),
    )
    .min(1),

  // Produits concernés (optionnel)
  targetProducts: z.array(z.string().cuid()).optional(),
  targetCategories: z.array(z.string()).optional(),

  // Configuration
  priority: z.nativeEnum(AnnouncementPriority).default("NORMAL"),
  isPublished: z.boolean().default(false),
  allowNotifications: z.boolean().default(true),
  maxBudget: z.number().min(0).optional(), // Budget marketing

  // Médias
  images: z.array(z.string().url()).max(5),
  bannerImage: z.string().url().optional(),

  // Paramètres avancés
  audienceFilters: z
    .object({ minAge: z.number().min(18).max(100).optional(),
      maxAge: z.number().min(18).max(100).optional(),
      interests: z.array(z.string()).optional(),
      previousCustomers: z.boolean().default(false) })
    .optional(),

  // Conditions d'utilisation
  termsAndConditions: z.string().max(2000).optional(),
  usageLimit: z
    .object({ perCustomer: z.number().int().min(1).optional(),
      total: z.number().int().min(1).optional() })
    .optional()});

const updateAnnouncementSchema = createAnnouncementSchema.partial().extend({ id: z.string().cuid() });

const announcementFiltersSchema = z.object({ type: z.nativeEnum(MerchantAnnouncementType).optional(),
  status: z.nativeEnum(AnnouncementStatus).optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),
  isPublished: z.boolean().optional(),
  isActive: z.boolean().optional(), // Actuellement dans la période de validité
  zone: z.string().optional(), // Code postal ou ville
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["createdAt", "startDate", "endDate", "title", "priority"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0) });

const announcementStatsSchema = z.object({ announcementId: z.string().cuid(),
  period: z.enum(["DAY", "WEEK", "MONTH"]).default("WEEK") });

export const merchantAnnouncementsRouter = router({ /**
   * Créer une nouvelle annonce
   */
  createAnnouncement: protectedProcedure
    .input(createAnnouncementSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent créer des annonces" });
      }

      try {
        // Récupérer le profil commerçant
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        // Vérifier les dates
        if (input.startDate >= input.endDate) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "La date de fin doit être postérieure à la date de début" });
        }

        // Vérifier les limites d'annonces actives (max 10)
        const activeAnnouncements = await ctx.db.merchantAnnouncement.count({
          where: {
            merchantId: merchant.id,
            status: { in: ["ACTIVE", "SCHEDULED"] },
            endDate: { gte: new Date() }}});

        if (activeAnnouncements >= 10) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Limite de 10 annonces actives atteinte" });
        }

        // Vérifier que les produits ciblés appartiennent au commerçant
        if (input.targetProducts && input.targetProducts.length > 0) {
          const productCount = await ctx.db.product.count({
            where: {
              id: { in: input.targetProducts },
              merchantId: merchant.id}});

          if (productCount !== input.targetProducts.length) {
            throw new TRPCError({ code: "BAD_REQUEST",
              message:
                "Certains produits sélectionnés ne vous appartiennent pas" });
          }
        }

        // Déterminer le statut initial
        const now = new Date();
        let status: AnnouncementStatus;
        if (!input.isPublished) {
          status = "DRAFT";
        } else if (input.startDate > now) {
          status = "SCHEDULED";
        } else if (input.endDate < now) {
          status = "EXPIRED";
        } else {
          status = "ACTIVE";
        }

        const announcement = await ctx.db.merchantAnnouncement.create({
          data: {
            merchantId: merchant.id,
            type: input.type,
            title: input.title,
            description: input.description,
            content: input.content,

            discount: input.discount,
            startDate: input.startDate,
            endDate: input.endDate,

            targetZones: input.targetZones,
            targetProducts: input.targetProducts,
            targetCategories: input.targetCategories,

            priority: input.priority,
            status,
            allowNotifications: input.allowNotifications,
            maxBudget: input.maxBudget,

            images: input.images,
            bannerImage: input.bannerImage,
            audienceFilters: input.audienceFilters,
            termsAndConditions: input.termsAndConditions,
            usageLimit: input.usageLimit,

            publishedAt: input.isPublished ? new Date() : null}});

        // Si publié et actif, déclencher les notifications aux livreurs potentiels
        if (status === "ACTIVE" && input.allowNotifications) {
          try {
            await this.triggerDelivererNotifications(announcement, ctx);
          } catch (notificationError) {
            console.warn("Erreur lors de l'envoi des notifications:", notificationError);
            // Ne pas faire échouer la publication si les notifications échouent
          }
        }

        return {
          success: true,
          data: announcement,
          message: input.isPublished
            ? "Annonce créée et publiée avec succès"
            : "Annonce créée en brouillon"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de l'annonce" });
      }
    }),

  /**
   * Obtenir toutes les annonces du commerçant
   */
  getMyAnnouncements: protectedProcedure
    .input(announcementFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent consulter leurs annonces" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        // Construire les filtres
        const where: any = {
          merchantId: merchant.id,
          ...(input.type && { type: input.type }),
          ...(input.status && { status: input.status }),
          ...(input.priority && { priority: input.priority }),
          ...(input.isPublished !== undefined && {
            publishedAt: input.isPublished ? { not } : null}),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } }]}),
          ...(input.dateFrom &&
            input.dateTo && {
              startDate: { gte: input.dateFrom, lte: input.dateTo }})};

        // Filtre pour les annonces actives
        if (input.isActive !== undefined) {
          const now = new Date();
          if (input.isActive) {
            where.AND = [
              { startDate: { lte } },
              { endDate: { gte } },
              { status: "ACTIVE" }];
          } else {
            where.OR = [
              { startDate: { gt } },
              { endDate: { lt } },
              { status: { in: ["DRAFT", "EXPIRED", "PAUSED"] } }];
          }
        }

        const orderBy: any = {};
        orderBy[input.sortBy] = input.sortOrder;

        const [announcements, totalCount] = await Promise.all([
          ctx.db.merchantAnnouncement.findMany({
            where,
            include: {
              stats: {
                select: {
                  views: true,
                  clicks: true,
                  conversions: true,
                  revenue: true,
                  engagementRate: true}},
              count: {
                select: { usages }}},
            orderBy,
            skip: input.offset,
            take: input.limit}),
          ctx.db.merchantAnnouncement.count({ where  })]);

        // Formatter les données
        const formattedAnnouncements = announcements.map((announcement) => {
          const now = new Date();
          const isActive =
            announcement.status === "ACTIVE" &&
            announcement.startDate <= now &&
            announcement.endDate >= now;

          return {
            ...announcement,
            isActive,
            daysRemaining: isActive
              ? Math.ceil(
                  (announcement.endDate.getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0,
            usageCount: announcement.count.usages,
            performance: announcement.stats || {
              views: 0,
              clicks: 0,
              conversions: 0,
              revenue: 0,
              engagementRate: 0}};
        });

        return {
          success: true,
          data: formattedAnnouncements,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des annonces" });
      }
    }),

  /**
   * Obtenir les détails d'une annonce
   */
  getAnnouncementById: protectedProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const announcement = await ctx.db.merchantAnnouncement.findFirst({
          where: {
            id: input.id,
            merchantId: merchant.id},
          include: {
            products: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true}},
            stats: true,
            usages: {
              orderBy: { createdAt: "desc" },
              take: 10,
              include: {
                client: {
                  select: {
                    name: true,
                    email: true}}}}}});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        const now = new Date();
        const isActive =
          announcement.status === "ACTIVE" &&
          announcement.startDate <= now &&
          announcement.endDate >= now;

        return {
          success: true,
          data: {
            ...announcement,
            isActive,
            canEdit: ["DRAFT", "SCHEDULED"].includes(announcement.status),
            canDelete: !["ACTIVE"].includes(announcement.status),
            daysRemaining: isActive
              ? Math.ceil(
                  (announcement.endDate.getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de l'annonce" });
      }
    }),

  /**
   * Mettre à jour une annonce
   */
  updateAnnouncement: protectedProcedure
    .input(updateAnnouncementSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent modifier leurs annonces" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const announcement = await ctx.db.merchantAnnouncement.findFirst({
          where: {
            id: input.id,
            merchantId: merchant.id}});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        // Vérifier si l'annonce peut être modifiée
        if (!["DRAFT", "SCHEDULED", "PAUSED"].includes(announcement.status)) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Cette annonce ne peut plus être modifiée" });
        }

        const { id: id, ...updateData } = input;

        // Vérifier les dates si modifiées
        if (
          updateData.startDate &&
          updateData.endDate &&
          updateData.startDate >= updateData.endDate
        ) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "La date de fin doit être postérieure à la date de début" });
        }

        const updatedAnnouncement = await ctx.db.merchantAnnouncement.update({
          where: { id: input.id },
          data: {
            ...updateData,
            updatedAt: new Date()}});

        // Si publié et actif, déclencher les notifications aux livreurs potentiels
        if (updatedAnnouncement.status === "ACTIVE" && updatedAnnouncement.allowNotifications) {
          try {
            await this.triggerDelivererNotifications(updatedAnnouncement, ctx);
          } catch (notificationError) {
            console.warn("Erreur lors de l'envoi des notifications:", notificationError);
            // Ne pas faire échouer la publication si les notifications échouent
          }
        }

        return {
          success: true,
          data: updatedAnnouncement,
          message: "Annonce mise à jour avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour" });
      }
    }),

  /**
   * Publier ou dépublier une annonce
   */
  togglePublish: protectedProcedure
    .input(
      z.object({ id: z.string().cuid(),
        publish: z.boolean() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent publier leurs annonces" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const announcement = await ctx.db.merchantAnnouncement.findFirst({
          where: {
            id: input.id,
            merchantId: merchant.id}});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        // Déterminer le nouveau statut
        let newStatus: AnnouncementStatus;
        const now = new Date();

        if (input.publish) {
          if (announcement.startDate > now) {
            newStatus = "SCHEDULED";
          } else if (announcement.endDate < now) {
            newStatus = "EXPIRED";
          } else {
            newStatus = "ACTIVE";
          }
        } else {
          newStatus = "DRAFT";
        }

        const updatedAnnouncement = await ctx.db.merchantAnnouncement.update({
          where: { id: input.id },
          data: {
            status: newStatus,
            publishedAt: input.publish ? new Date() : null}});

        // Si publié et actif, déclencher les notifications aux livreurs potentiels
        if (input.publish && updatedAnnouncement.status === "ACTIVE") {
          try {
            await this.triggerDelivererNotifications(updatedAnnouncement, ctx);
          } catch (notificationError) {
            console.warn("Erreur lors de l'envoi des notifications:", notificationError);
            // Ne pas faire échouer la publication si les notifications échouent
          }
        }

        return {
          success: true,
          data: updatedAnnouncement,
          message: input.publish ? "Annonce publiée" : "Annonce dépubliée"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la publication" });
      }
    }),

  /**
   * Supprimer une annonce
   */
  deleteAnnouncement: protectedProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent supprimer leurs annonces" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const announcement = await ctx.db.merchantAnnouncement.findFirst({
          where: {
            id: input.id,
            merchantId: merchant.id},
          include: {
            count: {
              select: { usages }}}});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        // Vérifier si l'annonce peut être supprimée
        if (announcement.status === "ACTIVE") {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Impossible de supprimer une annonce active" });
        }

        if (announcement.count.usages > 0) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Impossible de supprimer une annonce déjà utilisée" });
        }

        await ctx.db.merchantAnnouncement.delete({
          where: { id: input.id }});

        return {
          success: true,
          message: "Annonce supprimée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression" });
      }
    }),

  /**
   * Obtenir les statistiques détaillées d'une annonce
   */
  getAnnouncementStats: protectedProcedure
    .input(announcementStatsSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const announcement = await ctx.db.merchantAnnouncement.findFirst({
          where: {
            id: input.announcementId,
            merchantId: merchant.id}});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée" });
        }

        // Calculer la période
        const now = new Date();
        let startDate: Date;

        switch (input.period) {
          case "DAY":
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "WEEK":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "MONTH":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }

        // Récupérer les statistiques
        const [totalUsages, periodUsages, revenueData] = await Promise.all([
          ctx.db.merchantAnnouncementUsage.count({
            where: { announcementId: input.announcementId }}),
          ctx.db.merchantAnnouncementUsage.count({
            where: {
              announcementId: input.announcementId,
              createdAt: { gte }}}),
          ctx.db.merchantAnnouncementUsage.aggregate({
            where: {
              announcementId: input.announcementId,
              createdAt: { gte }},
            sum: {
              orderAmount: true,
              discountAmount: true}})]);

        return {
          success: true,
          data: {
            period: input.period,
            totalUsages,
            periodUsages,
            revenue: revenueData.sum.orderAmount || 0,
            totalDiscount: revenueData.sum.discountAmount || 0,
            conversionRate: announcement.stats?.engagementRate || 0,
            roi: announcement.maxBudget
              ? ((revenueData.sum.orderAmount || 0) / announcement.maxBudget) *
                100
              : null}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques" });
      }
    }),

  /**
   * Obtenir les annonces publiques dans une zone (pour les clients)
   */
  getPublicAnnouncements: publicProcedure
    .input(
      z.object({ postalCode: z.string().min(5).max(10),
        city: z.string().min(2).max(100),
        type: z.nativeEnum(MerchantAnnouncementType).optional(),
        limit: z.number().min(1).max(50).default(10) }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        const now = new Date();

        const announcements = await ctx.db.merchantAnnouncement.findMany({
          where: {
            status: "ACTIVE",
            startDate: { lte },
            endDate: { gte },
            ...(input.type && { type: input.type }),
            targetZones: {
              some: {
                OR: [
                  { postalCode: input.postalCode },
                  { city: { contains: input.city, mode: "insensitive" } }]}}},
          include: {
            merchant: {
              select: {
                businessName: true,
                businessCity: true,
                user: {
                  select: { name }}}}},
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: input.limit});

        return {
          success: true,
          data: announcements.map((announcement) => ({
            id: announcement.id,
            type: announcement.type,
            title: announcement.title,
            description: announcement.description,
            discount: announcement.discount,
            images: announcement.images,
            bannerImage: announcement.bannerImage,
            endDate: announcement.endDate,
            merchant: {
              name:
                announcement.merchant.businessName ||
                announcement.merchant.user?.name,
              city: announcement.merchant.businessCity}}))};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des annonces" });
      }
    })});
