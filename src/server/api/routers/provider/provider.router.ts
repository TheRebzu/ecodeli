import { router, protectedProcedure } from "@/server/api/trpc";
import { serviceService } from "@/server/services/provider/provider-service.service";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

// Définir les interfaces pour les données
interface ServiceData {
  id: string;
  providerId: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  createdAt?: Date;
}

interface AppointmentWithRelations {
  id: string;
  providerId: string;
  clientId: string;
  serviceId: string;
  date: Date;
  status: string;
  client?: {
    user?: {
      name?: string | null;
    } | null;
  } | null;
  service?: {
    name?: string | null;
    duration?: number | null;
  } | null;
}

export const providerRouter = router({ // Récupération des contrats du prestataire
  getContracts: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(10) })
    )
    .query(async ({ ctx, input  }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un prestataire
      const provider = await ctx.db.user.findUnique({
        where: { id },
        include: { provider }});

      if (!provider?.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès refusé - Prestataire uniquement" });
      }

      const where = {
        providerId: provider.provider.id,
        ...(input.status && { status: input.status })};

      const [contracts, total] = await Promise.all([
        ctx.db.contract.findMany({
          where,
          include: {
            client: {
              include: { user }
            },
            service: true},
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit}),
        ctx.db.contract.count({ where  })]);

      return {
        contracts: contracts.map(contract => ({
          id: contract.id,
          title: contract.title || `Contrat - ${contract.service?.name || 'Service'}`,
          status: contract.status,
          clientName: contract.client?.user?.name || "Client",
          serviceType: contract.service?.name || "Service",
          startDate: contract.startDate,
          endDate: contract.endDate,
          amount: contract.amount || 0,
          commission: contract.commission || 0,
          createdAt: contract.createdAt,
          updatedAt: contract.updatedAt})),
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit)};
    }),

  // Statistiques des contrats
  getContractStats: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    const provider = await ctx.db.user.findUnique({
      where: { id },
      include: { provider }});

    if (!provider?.provider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Accès refusé - Prestataire uniquement" });
    }

    const [totalContracts, activeContracts, pendingContracts, earningsData] = await Promise.all([
      ctx.db.contract.count({
        where: { providerId: provider.provider.id }}),
      ctx.db.contract.count({
        where: { providerId: provider.provider.id, status: "ACTIVE" }}),
      ctx.db.contract.count({
        where: { providerId: provider.provider.id, status: "PENDING" }}),
      ctx.db.contract.aggregate({
        where: { 
          providerId: provider.provider.id,
          status: { in: ["ACTIVE", "COMPLETED"] }
        },
        sum: { amount }})]);

    return {
      totalContracts,
      activeContracts,
      pendingContracts,
      totalEarnings: earningsData.sum.amount || 0};
  }),

  // Récupération des créneaux de disponibilité
  getSchedule: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    const provider = await ctx.db.user.findUnique({
      where: { id },
      include: { 
        provider: {
          include: { availability }
        }
      }});

    if (!provider?.provider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Accès refusé - Prestataire uniquement" });
    }

    return {
      availability: provider.provider.availability || [],
      zones: provider.provider.serviceZones || []};
  }),

  // Mise à jour du planning
  updateSchedule: protectedProcedure
    .input(
      z.object({ schedule: z.array(z.object({
          day: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          isAvailable: z.boolean(),
          zones: z.array(z.string()) }))})
    )
    .mutation(async ({ ctx, input  }) => {
      const userId = ctx.session.user.id;

      const provider = await ctx.db.user.findUnique({
        where: { id },
        include: { provider }});

      if (!provider?.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès refusé - Prestataire uniquement" });
      }

      // Supprimer les anciens créneaux
      await ctx.db.providerAvailability.deleteMany({
        where: { providerId: provider.provider.id }});

      // Créer les nouveaux créneaux
      const availabilityData = input.schedule
        .filter(slot => slot.isAvailable)
        .map(slot => ({ providerId: provider.provider.id,
          dayOfWeek: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: slot.isAvailable }));

      if (availabilityData.length > 0) {
        await ctx.db.providerAvailability.createMany({ data  });
      }

      // Mettre à jour les zones de service
      const allZones = Array.from(new Set(
        input.schedule.flatMap(slot => slot.zones)
      ));

      await ctx.db.provider.update({
        where: { id: provider.provider.id },
        data: { serviceZones }});

      return { success };
    }),

  getProfile: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { provider }});

    if (!user || !user.provider) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Profil prestataire non trouvé" });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      description: user.provider.description,
      serviceType: user.provider.serviceType,
      isVerified: user.provider.isVerified,
      rating: user.provider.rating,
      createdAt: user.createdAt};
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({ name: z.string().optional(),
        phoneNumber: z.string().optional(),
        description: z.string().optional(),
        serviceType: z.string().optional(),
        availability: z.string().optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { provider }});

      if (!user || !user.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à mettre à jour ce profil" });
      }

      // Extraire les données à mettre à jour
      const { name: name, phoneNumber: phoneNumber, ...providerData } = input;

      // Mise à jour des données utilisateur
      if (name || phoneNumber) {
        await ctx.db.user.update({
          where: { id },
          data: {
            name: name || undefined,
            phoneNumber: phoneNumber || undefined}});
      }

      // Mise à jour des données prestataire
      if (Object.keys(providerData).length > 0) {
        await ctx.db.provider.update({
          where: { userId },
          data: providerData});
      }

      // Récupération des données mises à jour
      const updatedUser = await ctx.db.user.findUnique({
        where: { id },
        include: { provider }});

      return {
        id: updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        phoneNumber: updatedUser?.phoneNumber,
        description: updatedUser?.provider?.description,
        serviceType: updatedUser?.provider?.serviceType,
        updated: true};
    }),

  getServices: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    // Vérifier si l'utilisateur est un prestataire
    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { provider }});

    if (!user || !user.provider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à accéder à ces données" });
    }

    // Récupérer les services
    const services = await ctx.db.service.findMany({
      where: {
        providerId: user.provider.id},
      orderBy: {
        createdAt: "desc"}});

    return services.map((service: ServiceData) => ({ id: service.id,
      providerId: service.providerId,
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      category: service.category }));
  }),

  createService: protectedProcedure
    .input(
      z.object({ name: z.string().min(3),
        description: z.string().min(10),
        price: z.number().positive(),
        duration: z.number().int().positive(),
        category: z.string() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { provider }});

      if (!user || !user.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à créer un service" });
      }

      // Créer le service
      const service = await ctx.db.service.create({
        data: {
          providerId: user.provider.id,
          name: input.name,
          description: input.description,
          price: input.price,
          duration: input.duration,
          category: input.category,
          isActive: true}});

      return {
        id: service.id,
        providerId: service.providerId,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        category: service.category,
        createdAt: service.createdAt.toISOString()};
    }),

  getAppointments: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    // Vérifier si l'utilisateur est un prestataire
    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { provider }});

    if (!user || !user.provider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à accéder à ces données" });
    }

    // Récupérer les rendez-vous via le service
    return serviceService.getProviderBookings(user.provider.id);
  }),

  // ===== NOUVELLES FONCTIONNALITÉS ÉTENDUES =====

  // Gestion des disponibilités
  getAvailabilities: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { provider }});

    if (!user || !user.provider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à accéder à ces données" });
    }

    return serviceService.getProviderAvailabilities(user.provider.id);
  }),

  createAvailability: protectedProcedure
    .input(
      z.object({ dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { provider }});

      if (!user || !user.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à créer des disponibilités" });
      }

      return serviceService.createAvailability(user.provider.id, input);
    }),

  deleteAvailability: protectedProcedure
    .input(z.object({ availabilityId: z.string()  }))
    .mutation(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { provider }});

      if (!user || !user.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à supprimer des disponibilités" });
      }

      return serviceService.deleteAvailability(
        user.provider.id,
        input.availabilityId,
      );
    }),

  // Gestion des créneaux horaires
  getAvailableTimeSlots: protectedProcedure
    .input(
      z.object({
        serviceId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),
    )
    .query(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { provider }});

      if (!user || !user.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à consulter ces créneaux" });
      }

      return serviceService.getAvailableTimeSlots(
        user.provider.id,
        input.serviceId,
        input.date,
      );
    }),

  // Gestion des réservations avancée
  updateBookingStatus: protectedProcedure
    .input(
      z.object({ bookingId: z.string(),
        status: z.enum([
          "PENDING",
          "CONFIRMED",
          "CANCELLED",
          "COMPLETED",
          "RESCHEDULED"]) }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { provider }});

      if (!user || !user.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à modifier cette réservation" });
      }

      return serviceService.updateBookingStatus(user.provider.id, {
        id: input.bookingId,
        status: input.status});
    }),

  getBookingDetails: protectedProcedure
    .input(z.object({ bookingId: z.string()  }))
    .query(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { provider }});

      if (!user || !user.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à consulter cette réservation" });
      }

      return serviceService.getBookingById(user.provider.id, input.bookingId);
    }),

  // Gestion des évaluations
  getMyReviews: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { provider }});

    if (!user || !user.provider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à consulter ces évaluations" });
    }

    return serviceService.getProviderReviews(user.provider.id);
  }),

  // Statistiques du prestataire
  getProviderStats: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { provider }});

    if (!user || !user.provider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à consulter ces statistiques" });
    }

    return serviceService.getProviderStats(user.provider.id);
  }),

  // Gestion des catégories de services (consultation)
  getServiceCategories: publicProcedure.query(async () => {
    return serviceService.getServiceCategories();
  }),

  // Recherche de prestataires (pour les clients)
  searchProviders: publicProcedure
    .input(
      z.object({ query: z.string().optional(),
        categoryId: z.string().optional(),
        city: z.string().optional(),
        maxDistance: z.number().optional(),
        location: z
          .object({
            lat: z.number(),
            lng: z.number() })
          .optional(),
        page: z.number().default(1),
        limit: z.number().default(10)}),
    )
    .query(async ({ input  }) => {
      return serviceService.searchProviders(input);
    }),

  // Dashboard Provider - Statistiques principales
  getDashboardStats: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    // Vérifier que l'utilisateur est un prestataire
    const provider = await ctx.db.user.findUnique({
      where: { id: userId, role: "PROVIDER" },
      include: { provider }});

    if (!provider?.provider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Accès non autorisé" });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      monthlyRevenue,
      dailyRevenue,
      appointmentsToday,
      appointmentsWeek,
      completedMonth,
      averageRating,
      clientsServed,
      activeContracts] = await Promise.all([
      // Revenus mensuels
      ctx.db.serviceBooking.aggregate({
        where: {
          providerId: provider.provider.id,
          status: "COMPLETED",
          completedAt: { gte }},
        sum: { price }}),
      // Revenus du jour
      ctx.db.serviceBooking.aggregate({
        where: {
          providerId: provider.provider.id,
          status: "COMPLETED",
          completedAt: { gte: startOfDay, lte: endOfDay }},
        sum: { price }}),
      // RDV aujourd'hui
      ctx.db.serviceBooking.count({
        where: {
          providerId: provider.provider.id,
          scheduledDate: { gte: startOfDay, lte: endOfDay },
          status: { in: ["CONFIRMED", "IN_PROGRESS"] }}}),
      // RDV cette semaine
      ctx.db.serviceBooking.count({
        where: {
          providerId: provider.provider.id,
          scheduledDate: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)},
          status: { in: ["CONFIRMED", "IN_PROGRESS"] }}}),
      // Interventions terminées ce mois
      ctx.db.serviceBooking.count({
        where: {
          providerId: provider.provider.id,
          status: "COMPLETED",
          completedAt: { gte }}}),
      // Note moyenne
      ctx.db.serviceBooking.aggregate({
        where: {
          providerId: provider.provider.id,
          rating: { not }},
        avg: { rating }}),
      // Clients uniques servis ce mois
      ctx.db.serviceBooking.groupBy({
        by: ["clientId"],
        where: {
          providerId: provider.provider.id,
          status: "COMPLETED",
          completedAt: { gte }}}),
      // Contrats actifs
      ctx.db.providerContract.count({
        where: {
          providerId: provider.provider.id,
          status: "ACTIVE"}})]);

    return {
      monthlyRevenue: monthlyRevenue.sum.price || 0,
      dailyRevenue: dailyRevenue.sum.price || 0,
      appointmentsToday,
      appointmentsWeek,
      completedMonth,
      averageRating: averageRating.avg.rating || 0,
      clientsServed: clientsServed.length,
      activeContracts,
      certificationsCount: provider.provider.certificationsCount || 0,
      skillsCount: provider.provider.skillsCount || 0};
  }),

  // Prochains rendez-vous
  getUpcomingAppointments: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5)  }))
    .query(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      const provider = await ctx.db.user.findUnique({
        where: { id: userId, role: "PROVIDER" },
        include: { provider }});

      if (!provider?.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      return await ctx.db.serviceBooking.findMany({
        where: {
          providerId: provider.provider.id,
          scheduledDate: { gte: new Date() },
          status: { in: ["CONFIRMED", "IN_PROGRESS"] }},
        include: {
          client: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true, phone: true }}}},
          service: {
            select: { name: true, description: true, category: true }}},
        orderBy: { scheduledDate: "asc" },
        take: input.limit});
    }),

  // Historique des interventions récentes
  getRecentInterventions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10)  }))
    .query(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      const provider = await ctx.db.user.findUnique({
        where: { id: userId, role: "PROVIDER" },
        include: { provider }});

      if (!provider?.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      return await ctx.db.serviceBooking.findMany({
        where: {
          providerId: provider.provider.id,
          status: "COMPLETED"},
        include: {
          client: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true }}}},
          service: {
            select: { name: true, category: true }}},
        orderBy: { completedAt: "desc" },
        take: input.limit});
    }),

  // Revenus et statistiques détaillées
  getRevenueChart: protectedProcedure
    .input(
      z.object({ period: z.enum(["week", "month", "quarter"]).default("month") }),
    )
    .query(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      const provider = await ctx.db.user.findUnique({
        where: { id: userId, role: "PROVIDER" },
        include: { provider }});

      if (!provider?.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      const now = new Date();
      let startDate: Date;
      let groupBy: string;

      switch (input.period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = "day";
          break;
        case "quarter":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          groupBy = "week";
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          groupBy = "month";
      }

      const bookings = await ctx.db.serviceBooking.findMany({
        where: {
          providerId: provider.provider.id,
          status: "COMPLETED",
          completedAt: { gte }},
        select: {
          price: true,
          completedAt: true},
        orderBy: { completedAt: "asc" }});

      // Grouper les données par période
      const chartData: Array<{ date: string; revenue: number; count: number }> =
        [];
      const groupedData = new Map<string, { revenue: number; count: number }>();

      bookings.forEach((booking) => {
        if (!booking.completedAt) return;

        let key: string;
        if (groupBy === "day") {
          key = booking.completedAt.toISOString().split("T")[0];
        } else if (groupBy === "week") {
          const weekStart = new Date(booking.completedAt);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().split("T")[0];
        } else {
          key = `${booking.completedAt.getFullYear()}-${String(booking.completedAt.getMonth() + 1).padStart(2, "0")}`;
        }

        const existing = groupedData.get(key) || { revenue: 0, count: 0 };
        groupedData.set(key, {
          revenue: existing.revenue + booking.price,
          count: existing.count + 1});
      });

      groupedData.forEach((value, key) => {
        chartData.push({ date: key,
          revenue: value.revenue,
          count: value.count });
      });

      return chartData.sort((a, b) => a.date.localeCompare(b.date));
    }),

  // Évaluations récentes
  getRecentRatings: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(10).default(5)  }))
    .query(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      const provider = await ctx.db.user.findUnique({
        where: { id: userId, role: "PROVIDER" },
        include: { provider }});

      if (!provider?.provider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      return await ctx.db.serviceBooking.findMany({
        where: {
          providerId: provider.provider.id,
          rating: { not },
          review: { not }},
        include: {
          client: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true }}}},
          service: {
            select: { name }}},
        orderBy: { completedAt: "desc" },
        take: input.limit});
    }),

  // Profil public du prestataire
  getPublicProfile: publicProcedure
    .input(z.object({ providerId: z.string()  }))
    .query(async ({ input  }) => {
      return serviceService.getProviderPublicProfile(input.providerId);
    }),

  // Services publics d'un prestataire
  getPublicServices: publicProcedure
    .input(z.object({ providerId: z.string()  }))
    .query(async ({ input  }) => {
      return serviceService.getProviderPublicServices(input.providerId);
    }),

  // Créneaux disponibles publics
  getPublicAvailableTimeSlots: publicProcedure
    .input(
      z.object({
        providerId: z.string(),
        serviceId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),
    )
    .query(async ({ input  }) => {
      return serviceService.getAvailableTimeSlots(
        input.providerId,
        input.serviceId,
        input.date,
      );
    })});
