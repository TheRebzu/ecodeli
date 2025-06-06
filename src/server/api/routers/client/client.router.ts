import { router, protectedProcedure, clientProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { dashboardService } from '@/server/services/admin/dashboard.service';
import { serviceService } from '@/server/services/provider/provider-service.service';
import { Prisma } from '@prisma/client';

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

export const clientRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      include: {
        client: true,
      },
    });

    if (!user || !user.client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profil client non trouvé',
      });
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
      createdAt: user.createdAt,
    };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
        phoneNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });

      if (!user || !user.client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à mettre à jour ce profil",
        });
      }

      // Mise à jour des données utilisateur
      const { name, phoneNumber, ...clientData } = input;

      // Mise à jour des données utilisateur
      if (name || phoneNumber) {
        await ctx.db.user.update({
          where: { id: userId },
          data: {
            name: name || undefined,
            phoneNumber: phoneNumber || undefined,
          },
        });
      }

      // Mise à jour des données client
      if (Object.keys(clientData).length > 0) {
        await ctx.db.client.update({
          where: { userId },
          data: clientData,
        });
      }

      // Récupération des données mises à jour
      const updatedUser = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });

      return {
        id: updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        address: updatedUser?.client?.address,
        city: updatedUser?.client?.city,
        postalCode: updatedUser?.client?.postalCode,
        country: updatedUser?.client?.country,
        phoneNumber: updatedUser?.phoneNumber,
        updated: true,
      };
    }),

  getDeliveries: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Vérifier si l'utilisateur est un client
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });

    if (!user || !user.client) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à accéder à ces données",
      });
    }

    // Récupérer les livraisons avec les relations nécessaires
    const deliveries = await ctx.db.delivery.findMany({
      where: {
        clientId: user.client.id,
      },
      include: {
        deliverer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        announcement: {
          select: {
            pickupAddress: true,
            deliveryAddress: true,
            pickupDate: true,
            deliveryDate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transformer les données pour le client
    return deliveries.map(delivery => ({
      id: delivery.id,
      clientId: delivery.clientId,
      status: delivery.status,
      merchantName: 'Inconnu', // Valeur par défaut si merchant n'est pas disponible
      originAddress: delivery.announcement.pickupAddress,
      destinationAddress: delivery.announcement.deliveryAddress,
      createdAt: delivery.createdAt.toISOString(),
      estimatedDelivery: delivery.announcement.deliveryDate?.toISOString(),
      deliveredAt: delivery.status === 'DELIVERED' ? delivery.updatedAt.toISOString() : undefined,
    }));
  }),

  getInvoices: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Vérifier si l'utilisateur est un client
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });

    if (!user || !user.client) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à accéder à ces données",
      });
    }

    // Récupérer les factures
    const invoices = await ctx.db.invoice.findMany({
      where: {
        userId: userId, // Utiliser userId au lieu de clientId
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transformer les données pour le client
    return invoices.map(invoice => ({
      id: invoice.id,
      clientId: user.client?.id || '', // Utiliser l'opérateur de coalescence nullish
      amount: invoice.amount,
      status: invoice.status,
      date: invoice.createdAt.toISOString(),
      deliveryId: null, // Pas disponible dans le modèle actuel
    }));
  }),

  bookService: protectedProcedure
    .input(
      z.object({
        serviceId: z.string(),
        providerId: z.string(),
        date: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });

      if (!user || !user.client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à réserver un service",
        });
      }

      // Vérifier si le service existe
      const service = await ctx.db.service.findUnique({
        where: { id: input.serviceId },
      });

      if (!service) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service non trouvé',
        });
      }

      // Vérifier si le prestataire existe
      const provider = await ctx.db.user.findUnique({
        where: { id: input.providerId },
      });

      if (!provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Prestataire non trouvé',
        });
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
          status: 'PENDING',
          totalPrice: service.price,
          notes: input.notes,
        },
      });

      return {
        id: booking.id,
        clientId: booking.clientId,
        serviceId: booking.serviceId,
        providerId: booking.providerId,
        status: booking.status,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        notes: booking.notes,
        createdAt: booking.createdAt.toISOString(),
      };
    }),

  // Nouvelle procédure pour récupérer les statistiques du dashboard client
  getDashboardStats: clientProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Récupérer l'utilisateur client avec le contexte tRPC
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });

    if (!user || !user.client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profil client non trouvé',
      });
    }

    const clientId = user.client.id;

    // Statistiques simplifiées directement dans le routeur
    const [totalDeliveries, activeDeliveries, completedDeliveries, bookedServices, unpaidInvoices] =
      await Promise.all([
        ctx.db.delivery.count({ where: { clientId } }),
        ctx.db.delivery.count({
          where: {
            clientId,
            status: { in: ['PENDING', 'ACCEPTED', 'IN_TRANSIT'] },
          },
        }),
        ctx.db.delivery.count({
          where: { clientId, status: 'DELIVERED' },
        }),
        ctx.db.serviceBooking.count({ where: { clientId } }),
        ctx.db.invoice.count({
          where: { userId, status: 'OVERDUE' },
        }),
      ]);

    return {
      totalDeliveries,
      activeDeliveries,
      completedDeliveries,
      bookedServices,
      unpaidInvoices,
    };
  }),

  // Procédure pour récupérer l'activité récente du client
  getRecentActivity: clientProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Récupérer l'utilisateur client avec le contexte tRPC
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });

    if (!user || !user.client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profil client non trouvé',
      });
    }

    const clientId = user.client.id;

    // Activité récente simplifiée
    const [recentDeliveries, recentServices, recentInvoices] = await Promise.all([
      ctx.db.delivery.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      ctx.db.serviceBooking.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { service: true },
      }),
      ctx.db.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Combiner et trier toutes les activités par date
    const allActivities = [
      ...recentDeliveries.map(delivery => ({
        type: 'DELIVERY',
        id: delivery.id,
        status: delivery.status,
        date: delivery.createdAt,
        data: delivery,
      })),
      ...recentServices.map(booking => ({
        type: 'SERVICE',
        id: booking.id,
        status: booking.status,
        date: booking.createdAt,
        data: {
          ...booking,
          serviceName: booking.service.name,
        },
      })),
      ...recentInvoices.map(invoice => ({
        type: 'INVOICE',
        id: invoice.id,
        status: invoice.status,
        date: invoice.createdAt,
        data: invoice,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);

    return allActivities;
  }),

  // Procédure pour récupérer les métriques financières du client
  getFinancialMetrics: clientProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Métriques financières simplifiées
    const [totalSpent, unpaidInvoices] = await Promise.all([
      ctx.db.payment.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      ctx.db.invoice.findMany({
        where: { userId, status: 'OVERDUE' },
      }),
    ]);

    const unpaidAmount = unpaidInvoices.reduce(
      (sum, invoice) => sum + invoice.amount.toNumber(),
      0
    );

    return {
      totalSpent: totalSpent._sum.amount?.toNumber() || 0,
      unpaidAmount,
      unpaidInvoicesCount: unpaidInvoices.length,
    };
  }),

  // Procédure pour récupérer les éléments actifs du client
  getActiveItems: clientProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Récupérer l'utilisateur client avec le contexte tRPC
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });

    if (!user || !user.client) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profil client non trouvé',
      });
    }

    const clientId = user.client.id;

    // Éléments actifs
    const [activeDeliveries, upcomingServices, pendingPayments] = await Promise.all([
      ctx.db.delivery.findMany({
        where: {
          clientId,
          status: { in: ['PENDING', 'ACCEPTED', 'IN_TRANSIT'] },
        },
        include: {
          deliverer: { select: { name: true, image: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      ctx.db.serviceBooking.findMany({
        where: {
          clientId,
          status: 'CONFIRMED',
          startTime: { gte: new Date() },
        },
        include: {
          service: true,
          provider: { select: { name: true, image: true } },
        },
        orderBy: { startTime: 'asc' },
        take: 5,
      }),
      ctx.db.invoice.findMany({
        where: { userId, status: 'ISSUED' },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ]);

    return {
      activeDeliveries,
      upcomingServices,
      pendingPayments,
    };
  }),

  // Procédure pour récupérer les réservations de service d'un client
  getMyClientBookings: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });

      if (!user || !user.client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à accéder à ces données",
        });
      }

      const status = input?.status;

      return serviceService.getClientBookings(user.client.id, status);
    }),

  // Procédure pour récupérer les détails d'une réservation
  getBookingById: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un client
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { client: true },
      });

      if (!user || !user.client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à accéder à ces données",
        });
      }

      const booking = await ctx.db.serviceBooking.findUnique({
        where: { id: input.id },
        include: {
          service: true,
          provider: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          review: true,
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Réservation non trouvée',
        });
      }

      // Vérifier que la réservation appartient au client
      if (booking.clientId !== user.client.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à accéder à cette réservation",
        });
      }

      return booking;
    }),
});
