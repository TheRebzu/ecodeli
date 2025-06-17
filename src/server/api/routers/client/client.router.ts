import {
  router,
  protectedProcedure,
  clientProcedure,
  adminProcedure,
  type Context} from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { User, Client } from "@prisma/client";
import { dashboardService } from "@/server/services/admin/dashboard.service";
import { storageService } from "@/server/services/storage.service";
import { serviceService } from "@/server/services/provider/provider-service.service";
import { Prisma } from "@prisma/client";

// Définir les interfaces pour les données récupérées de la base de données
interface DeliveryWithRelations {
  id: string;
  clientId: string;
  status: string;
  originAddress: string;
  destinationAddress: string;
  createdAt: Date;
  estimatedDelivery: Date | null;
  deliveredAt: Date | null;
  merchant?: {
    user?: {
      name?: string | null;
    } | null;
  } | null;
}

interface InvoiceWithRelations {
  id: string;
  clientId: string;
  amount: number;
  status: string;
  createdAt: Date;
  deliveryId: string | null;
}

export const clientRouter = router({ getProfile: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { client }});

    if (!user || !user.client) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Profil client non trouvé" });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.client.address,
      city: user.client.city,
      postalCode: user.client.postalCode,
      country: user.client.country,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt};
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({ name: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
        phoneNumber: z.string().optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { client }});

      if (!user || !user.client) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à mettre à jour ce profil" });
      }

      // Mise à jour des données utilisateur
      const { name: name, phoneNumber: phoneNumber, ...clientData } = input;

      // Mise à jour des données utilisateur
      if (name || phoneNumber) {
        await ctx.db.user.update({
          where: { id },
          data: {
            name: name || undefined,
            phoneNumber: phoneNumber || undefined}});
      }

      // Mise à jour des données client
      if (Object.keys(clientData).length > 0) {
        await ctx.db.client.update({
          where: { userId },
          data: clientData});
      }

      // Récupération des données mises à jour
      const updatedUser = await ctx.db.user.findUnique({
        where: { id },
        include: { client }});

      return {
        id: updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        address: updatedUser?.client?.address,
        city: updatedUser?.client?.city,
        postalCode: updatedUser?.client?.postalCode,
        country: updatedUser?.client?.country,
        phoneNumber: updatedUser?.phoneNumber,
        updated: true};
    }),

  getDeliveries: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    // Vérifier si l'utilisateur est un client
    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { client }});

    if (!user || !user.client) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à accéder à ces données" });
    }

    // Récupérer les livraisons avec les relations nécessaires
    const deliveries = await ctx.db.delivery.findMany({
      where: {
        clientId: user.client.id},
      include: {
        deliverer: {
          select: {
            id: true,
            name: true,
            image: true}},
        announcement: {
          select: {
            pickupAddress: true,
            deliveryAddress: true,
            pickupDate: true,
            deliveryDate: true}}},
      orderBy: {
        createdAt: "desc"}});

    // Transformer les données pour le client
    return deliveries.map((delivery) => ({ id: delivery.id,
      clientId: delivery.clientId,
      status: delivery.status,
      merchantName: "Inconnu", // Valeur par défaut si merchant n'est pas disponible
      originAddress: delivery.announcement.pickupAddress,
      destinationAddress: delivery.announcement.deliveryAddress,
      createdAt: delivery.createdAt.toISOString(),
      estimatedDelivery: delivery.announcement.deliveryDate?.toISOString(),
      deliveredAt:
        delivery.status === "DELIVERED"
          ? delivery.updatedAt.toISOString()
          : undefined }));
  }),

  getInvoices: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    // Vérifier si l'utilisateur est un client
    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { client }});

    if (!user || !user.client) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à accéder à ces données" });
    }

    // Récupérer les factures
    const invoices = await ctx.db.invoice.findMany({
      where: {
        userId: userId, // Utiliser userId au lieu de clientId
      },
      orderBy: {
        createdAt: "desc"}});

    // Transformer les données pour le client
    return invoices.map((invoice) => ({ id: invoice.id,
      clientId: user.client?.id || "", // Utiliser l'opérateur de coalescence nullish
      amount: invoice.amount,
      status: invoice.status,
      date: invoice.createdAt.toISOString(),
      deliveryId: null, // Pas disponible dans le modèle actuel
     }));
  }),

  bookService: protectedProcedure
    .input(
      z.object({ serviceId: z.string(),
        providerId: z.string(),
        date: z.string(),
        notes: z.string().optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { client }});

      if (!user || !user.client) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à réserver un service" });
      }

      // Vérifier si le service existe
      const service = await ctx.db.service.findUnique({
        where: { id: input.serviceId }});

      if (!service) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Service non trouvé" });
      }

      // Vérifier si le prestataire existe
      const provider = await ctx.db.user.findUnique({
        where: { id: input.providerId }});

      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Prestataire non trouvé" });
      }

      // Créer la réservation de service
      const date = new Date(input.date);
      const booking = await ctx.db.serviceBooking.create({
        data: {
          clientId: user.client.id,
          serviceId: input.serviceId,
          providerId: input.providerId,
          startTime: date,
          endTime: new Date(date.getTime() + 60 * 60 * 1000), // +1 heure par défaut
          status: "PENDING",
          totalPrice: service.price,
          notes: input.notes}});

      return {
        id: booking.id,
        clientId: booking.clientId,
        serviceId: booking.serviceId,
        providerId: booking.providerId,
        status: booking.status,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        notes: booking.notes,
        createdAt: booking.createdAt.toISOString()};
    }),

  // Nouvelle procédure pour récupérer les statistiques du dashboard client
  getDashboardStats: clientProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    // Récupérer l'utilisateur client avec le contexte tRPC
    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { client }});

    if (!user || !user.client) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Profil client non trouvé" });
    }

    const clientId = user.client.id;

    // Statistiques simplifiées directement dans le routeur
    const [
      totalDeliveries,
      activeDeliveries,
      completedDeliveries,
      bookedServices,
      unpaidInvoices] = await Promise.all([
      ctx.db.delivery.count({ where: { clientId } }),
      ctx.db.delivery.count({
        where: {
          clientId,
          status: { in: ["PENDING", "ACCEPTED", "IN_TRANSIT"] }}}),
      ctx.db.delivery.count({
        where: { clientId, status: "DELIVERED" }}),
      ctx.db.serviceBooking.count({ where: { clientId } }),
      ctx.db.invoice.count({
        where: { userId, status: "OVERDUE" }})]);

    return {
      totalDeliveries,
      activeDeliveries,
      completedDeliveries,
      bookedServices,
      unpaidInvoices};
  }),

  // Procédure pour récupérer l'activité récente du client
  getRecentActivity: clientProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    // Récupérer l'utilisateur client avec le contexte tRPC
    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { client }});

    if (!user || !user.client) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Profil client non trouvé" });
    }

    const clientId = user.client.id;

    // Activité récente simplifiée
    const [recentDeliveries, recentServices, recentInvoices] =
      await Promise.all([
        ctx.db.delivery.findMany({
          where: { clientId },
          orderBy: { createdAt: "desc" },
          take: 5}),
        ctx.db.serviceBooking.findMany({
          where: { clientId },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { service }}),
        ctx.db.invoice.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5})]);

    // Combiner et trier toutes les activités par date
    const allActivities = [
      ...recentDeliveries.map((delivery) => ({ type: "DELIVERY",
        id: delivery.id,
        status: delivery.status,
        date: delivery.createdAt,
        data: delivery })),
      ...recentServices.map((booking) => ({
        type: "SERVICE",
        id: booking.id,
        status: booking.status,
        date: booking.createdAt,
        data: {
          ...booking,
          serviceName: booking.service.name}})),
      ...recentInvoices.map((invoice) => ({ type: "INVOICE",
        id: invoice.id,
        status: invoice.status,
        date: invoice.createdAt,
        data: invoice }))]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);

    return allActivities;
  }),

  // Procédure pour récupérer les métriques financières du client
  getFinancialMetrics: clientProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    // Métriques financières simplifiées
    const [totalSpent, unpaidInvoices] = await Promise.all([
      ctx.db.payment.aggregate({
        where: { userId, status: "COMPLETED" },
        sum: { amount }}),
      ctx.db.invoice.findMany({
        where: { userId, status: "OVERDUE" }})]);

    const unpaidAmount = unpaidInvoices.reduce(
      (sum, invoice) => sum + invoice.amount.toNumber(),
      0,
    );

    return {
      totalSpent: totalSpent.sum.amount?.toNumber() || 0,
      unpaidAmount,
      unpaidInvoicesCount: unpaidInvoices.length};
  }),

  // Procédure pour récupérer les éléments actifs du client
  getActiveItems: clientProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    // Récupérer l'utilisateur client avec le contexte tRPC
    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { client }});

    if (!user || !user.client) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Profil client non trouvé" });
    }

    const clientId = user.client.id;

    // Éléments actifs
    const [activeDeliveries, upcomingServices, pendingPayments] =
      await Promise.all([
        ctx.db.delivery.findMany({
          where: {
            clientId,
            status: { in: ["PENDING", "ACCEPTED", "IN_TRANSIT"] }},
          include: {
            deliverer: { select: { name: true, image: true } }},
          orderBy: { updatedAt: "desc" },
          take: 5}),
        ctx.db.serviceBooking.findMany({
          where: {
            clientId,
            status: "CONFIRMED",
            startTime: { gte: new Date() }},
          include: {
            service: true,
            provider: { select: { name: true, image: true } }},
          orderBy: { startTime: "asc" },
          take: 5}),
        ctx.db.invoice.findMany({
          where: { userId, status: "ISSUED" },
          orderBy: { dueDate: "asc" },
          take: 5})]);

    return {
      activeDeliveries,
      upcomingServices,
      pendingPayments};
  }),

  // Procédure pour récupérer les réservations de service d'un client
  getMyClientBookings: protectedProcedure
    .input(
      z
        .object({ status: z.string().optional() })
        .optional(),
    )
    .query(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { client }});

      if (!user || !user.client) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder à ces données" });
      }

      const status = input?.status;

      return serviceService.getClientBookings(user.client.id, status);
    }),

  // Procédure pour récupérer les détails d'une réservation
  getBookingById: protectedProcedure
    .input(
      z.object({ id: z.string().cuid() }),
    )
    .query(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { client }});

      if (!user || !user.client) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder à ces données" });
      }

      const booking = await ctx.db.serviceBooking.findUnique({
        where: { id: input.id },
        include: {
          service: true,
          provider: {
            select: {
              id: true,
              name: true,
              image: true}},
          review: true}});

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Réservation non trouvée" });
      }

      // Vérifier que la réservation appartient au client
      if (booking.clientId !== user.client.id) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à accéder à cette réservation" });
      }

      return booking;
    }),

  // === MÉTHODES ADMIN ===

  /**
   * Get all clients for admin (paginated with filters)
   */
  getAllClients: adminProcedure
    .input(
      z
        .object({ page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(10),
          search: z.string().optional(),
          status: z
            .enum(["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "INACTIVE"])
            .optional(),
          sortBy: z
            .enum(["name", "email", "createdAt", "lastLoginAt"])
            .default("createdAt"),
          sortDirection: z.enum(["asc", "desc"]).default("desc") })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input: input  }) => {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        sortBy = "createdAt",
        sortDirection = "desc"} = input || {};

      // Construire les conditions de filtrage
      const where: any = {
        role: "CLIENT"};

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { client: { city: { contains: search, mode: "insensitive" } } }];
      }

      // Calculer offset pour pagination
      const offset = (page - 1) * limit;

      // Requête pour récupérer les clients avec pagination
      const [clients, totalCount] = await Promise.all([
        ctx.db.user.findMany({
          where,
          include: {
            client: true,
            count: {
              select: {
                clientAnnouncements: true,
                documents: true}}},
          orderBy: { [sortBy]: sortDirection },
          skip: offset,
          take: limit}),
        ctx.db.user.count({ where  })]);

      // Calculer statistiques pour chaque client
      const clientsWithStats = await Promise.all(
        clients.map(async (client) => {
          if (!client.client) return null;

          // Récupérer les statistiques du client
          const [totalOrders, totalSpent, lastOrderDate] = await Promise.all([
            ctx.db.announcement.count({
              where: { clientId: client.client.id }}),
            ctx.db.payment.aggregate({
              where: { userId: client.id, status: "COMPLETED" },
              sum: { amount }}),
            ctx.db.announcement.findFirst({
              where: { clientId: client.client.id },
              orderBy: { createdAt: "desc" },
              select: { createdAt }})]);

          return {
            id: client.id,
            name: client.name,
            email: client.email,
            phoneNumber: client.phoneNumber,
            status: client.status,
            isVerified: client.isVerified,
            createdAt: client.createdAt,
            lastLoginAt: client.lastLoginAt,
            client: {
              id: client.client.id,
              address: client.client.address,
              city: client.client.city,
              postalCode: client.client.postalCode,
              country: client.client.country},
            stats: {
              totalOrders,
              totalSpent: totalSpent.sum.amount?.toNumber() || 0,
              lastOrderDate: lastOrderDate?.createdAt,
              documentsCount: client.count.documents}};
        }),
      );

      // Filtrer les clients null (qui n'ont pas de profil client)
      const validClients = clientsWithStats.filter(Boolean);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        clients: validClients,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1}};
    }),

  /**
   * Get client statistics for admin dashboard
   */
  getClientStats: adminProcedure.query(async ({ ctx  }) => {
    const [
      totalClients,
      activeClients,
      pendingClients,
      suspendedClients,
      inactiveClients,
      newClientsThisMonth,
      totalRevenue,
      averageOrderValue] = await Promise.all([
      ctx.db.user.count({ where: { role: "CLIENT" } }),
      ctx.db.user.count({ where: { role: "CLIENT", status: "ACTIVE" } }),
      ctx.db.user.count({
        where: { role: "CLIENT", status: "PENDING_VERIFICATION" }}),
      ctx.db.user.count({ where: { role: "CLIENT", status: "SUSPENDED" } }),
      ctx.db.user.count({ where: { role: "CLIENT", status: "INACTIVE" } }),
      ctx.db.user.count({
        where: {
          role: "CLIENT",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)}}}),
      ctx.db.payment.aggregate({
        where: { status: "COMPLETED" },
        sum: { amount }}),
      ctx.db.payment.aggregate({
        where: { status: "COMPLETED" },
        avg: { amount }})]);

    return {
      totalClients,
      activeClients,
      pendingClients,
      suspendedClients,
      inactiveClients,
      newClientsThisMonth,
      totalRevenue: totalRevenue.sum.amount?.toNumber() || 0,
      averageOrderValue: averageOrderValue.avg.amount?.toNumber() || 0};
  }),

  // Nouveaux endpoints pour le dashboard amélioré
  services: router({ getUpcomingBookings: clientProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(20).default(5) }),
      )
      .query(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;
        const user = await ctx.db.user.findUnique({
          where: { id },
          include: { client }});

        if (!user?.client) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Client non trouvé" });
        }

        return await ctx.db.serviceBooking.findMany({
          where: {
            clientId: user.client.id,
            startTime: { gte: new Date() },
            status: { in: ["CONFIRMED", "PENDING"] }},
          include: {
            service: { select: { name: true, category: true } },
            provider: { select: { name: true, image: true, rating: true } }},
          orderBy: { startTime: "asc" },
          take: input.limit});
      })}),

  storage: router({ getActiveBoxes: clientProcedure.query(async ({ ctx  }) => {
      const userId = ctx.session.user.id;
      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { client }});

      if (!user?.client) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Client non trouvé" });
      }

      return await ctx.db.storageBoxReservation.findMany({
        where: {
          clientId: user.client.id,
          status: "ACTIVE",
          endDate: { gte: new Date() }},
        include: {
          box: {
            include: {
              warehouse: { select: { name: true, address: true } }}}},
        orderBy: { startDate: "desc" }});
    })}),

  invoices: router({ getRecent: clientProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(20).default(5) }),
      )
      .query(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        return await ctx.db.invoice.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: input.limit});
      })}),

  // API endpoints pour ClientStatsWidget
  getStats: clientProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      include: { client: true }
    });

    if (!user?.client) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Client non trouvé" });
    }

    const clientId = user.client.id;
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // Statistiques principales
    const [totalDeliveries, activeAnnouncements, serviceBookings, storageBoxes] = await Promise.all([
      ctx.db.delivery.count({ where: { clientId } }),
      ctx.db.announcement.count({ where: { clientId, status: "ACTIVE" } }),
      ctx.db.serviceBooking.count({ where: { clientId } }),
      ctx.db.storageBoxReservation.count({ where: { clientId, status: "ACTIVE" } })
    ]);

    // Tendances (comparaison avec le mois dernier)
    const [lastMonthDeliveries, lastMonthAnnouncements, lastMonthBookings, lastMonthStorage] = await Promise.all([
      ctx.db.delivery.count({ where: { clientId, createdAt: { lt: lastMonth } } }),
      ctx.db.announcement.count({ where: { clientId, createdAt: { lt: lastMonth } } }),
      ctx.db.serviceBooking.count({ where: { clientId, createdAt: { lt: lastMonth } } }),
      ctx.db.storageBoxReservation.count({ where: { clientId, createdAt: { lt: lastMonth } } })
    ]);

    // Calcul des tendances en pourcentage
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Note de satisfaction moyenne
    const reviews = await ctx.db.review.findMany({
      where: { clientId },
      select: { rating: true }
    });
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : null;

    return {
      totalDeliveries,
      activeAnnouncements,
      serviceBookings,
      storageBoxes,
      deliveriesTrend: calculateTrend(totalDeliveries, lastMonthDeliveries),
      announcementsTrend: calculateTrend(activeAnnouncements, lastMonthAnnouncements),
      bookingsTrend: calculateTrend(serviceBookings, lastMonthBookings),
      storageTrend: calculateTrend(storageBoxes, lastMonthStorage),
      averageRating,
      totalRatings: reviews.length
    };
  }),

  getRecentDeliveries: clientProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true }
      });

      if (!user?.client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client non trouvé" });
      }

      return await ctx.db.delivery.findMany({
        where: { clientId: user.client.id },
        include: {
          announcement: {
            select: { title: true, pickupAddress: true, deliveryAddress: true }
          },
          deliverer: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: input.limit
      });
    }),

  getMonthlySpending: clientProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Calculer les dépenses du mois actuel
    const currentMonthPayments = await ctx.db.payment.aggregate({
      where: {
        userId,
        status: "COMPLETED",
        createdAt: {
          gte: currentMonthStart,
          lt: nextMonthStart
        }
      },
      _sum: { amount: true }
    });

    const current = currentMonthPayments._sum.amount?.toNumber() || 0;
    
    // Budget fictif basé sur l'historique ou une valeur par défaut
    const budget = 1000; // À remplacer par une vraie logique de budget utilisateur
    const percentageOfBudget = budget > 0 ? Math.min((current / budget) * 100, 100) : 0;

    return {
      current,
      budget,
      percentageOfBudget: Math.round(percentageOfBudget)
    };
  }),

  updateAnnouncement: clientProcedure
    .input(z.object({
      id: z.string().cuid(),
      title: z.string().min(1),
      description: z.string().optional(),
      pickupAddress: z.string().min(1),
      deliveryAddress: z.string().min(1),
      packageType: z.string(),
      weight: z.number().positive().optional(),
      dimensions: z.string().optional(),
      value: z.number().positive().optional(),
      pickupDate: z.date(),
      deliveryDate: z.date().optional(),
      maxPrice: z.number().positive().optional(),
      urgencyLevel: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
      specialInstructions: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true }
      });

      if (!user?.client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client non trouvé" });
      }

      // Vérifier que l'annonce appartient au client
      const existingAnnouncement = await ctx.db.announcement.findUnique({
        where: { id: input.id }
      });

      if (!existingAnnouncement || existingAnnouncement.clientId !== user.client.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Vous n'êtes pas autorisé à modifier cette annonce" });
      }

      // Mettre à jour l'annonce
      return await ctx.db.announcement.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          pickupAddress: input.pickupAddress,
          deliveryAddress: input.deliveryAddress,
          packageType: input.packageType,
          weight: input.weight,
          dimensions: input.dimensions,
          value: input.value,
          pickupDate: input.pickupDate,
          deliveryDate: input.deliveryDate,
          maxPrice: input.maxPrice,
          urgencyLevel: input.urgencyLevel,
          specialInstructions: input.specialInstructions,
          updatedAt: new Date(),
        },
        include: {
          client: {
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          }
        }
      });
    }),

  // Payment Methods API endpoints
  getPaymentMethods: clientProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    return await ctx.db.paymentMethod.findMany({
      where: { userId },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" }
      ]
    });
  }),

  addPaymentMethod: clientProcedure
    .input(z.object({
      type: z.enum(["CARD", "BANK_TRANSFER", "PAYPAL", "STRIPE"]),
      name: z.string().min(1),
      cardNumber: z.string().optional(),
      expiryMonth: z.number().min(1).max(12).optional(),
      expiryYear: z.number().min(new Date().getFullYear()).optional(),
      cvv: z.string().optional(),
      holderName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Extraire les 4 derniers chiffres de la carte
      const cardLast4 = input.cardNumber ? input.cardNumber.slice(-4) : undefined;
      
      // Déterminer la marque de la carte (simplifiée)
      const getCardBrand = (cardNumber?: string) => {
        if (!cardNumber) return undefined;
        const firstDigit = cardNumber.charAt(0);
        switch (firstDigit) {
          case "4": return "VISA";
          case "5": return "MASTERCARD";
          case "3": return "AMEX";
          default: return "OTHER";
        }
      };

      // Vérifier si c'est la première méthode de paiement (sera définie par défaut)
      const existingMethods = await ctx.db.paymentMethod.count({
        where: { userId }
      });
      const isDefault = existingMethods === 0;

      return await ctx.db.paymentMethod.create({
        data: {
          userId,
          type: input.type,
          name: input.name,
          cardLast4,
          cardBrand: getCardBrand(input.cardNumber),
          expiryMonth: input.expiryMonth,
          expiryYear: input.expiryYear,
          holderName: input.holderName,
          isDefault,
          isVerified: true, // En production, cela nécessiterait une vérification
        }
      });
    }),

  removePaymentMethod: clientProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que la méthode appartient à l'utilisateur
      const paymentMethod = await ctx.db.paymentMethod.findUnique({
        where: { id: input.id }
      });

      if (!paymentMethod || paymentMethod.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Méthode de paiement non trouvée" });
      }

      // Si c'était la méthode par défaut, définir une autre comme défaut
      if (paymentMethod.isDefault) {
        const otherMethod = await ctx.db.paymentMethod.findFirst({
          where: { 
            userId, 
            id: { not: input.id } 
          }
        });

        if (otherMethod) {
          await ctx.db.paymentMethod.update({
            where: { id: otherMethod.id },
            data: { isDefault: true }
          });
        }
      }

      return await ctx.db.paymentMethod.delete({
        where: { id: input.id }
      });
    }),

  setDefaultPaymentMethod: clientProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que la méthode appartient à l'utilisateur
      const paymentMethod = await ctx.db.paymentMethod.findUnique({
        where: { id: input.id }
      });

      if (!paymentMethod || paymentMethod.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Méthode de paiement non trouvée" });
      }

      // Désactiver toutes les autres méthodes par défaut
      await ctx.db.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });

      // Définir la nouvelle méthode par défaut
      return await ctx.db.paymentMethod.update({
        where: { id: input.id },
        data: { isDefault: true }
      });
    }),

  // Service Booking endpoints
  cancelServiceBooking: clientProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true }
      });

      if (!user?.client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client non trouvé" });
      }

      // Vérifier que la réservation appartient au client
      const booking = await ctx.db.serviceBooking.findUnique({
        where: { id: input.id }
      });

      if (!booking || booking.clientId !== user.client.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Réservation non trouvée" });
      }

      // Vérifier que la réservation peut être annulée
      if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cette réservation ne peut pas être annulée" });
      }

      return await ctx.db.serviceBooking.update({
        where: { id: input.id },
        data: { 
          status: "CANCELLED",
          updatedAt: new Date()
        }
      });
    })
});
