import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';

/**
 * Routeur pour les données du dashboard client
 * Fournit les statistiques et métriques pour le tableau de bord client
 */
export const clientDataRouter = createTRPCRouter({
  /**
   * Récupérer les statistiques du dashboard
   */
  getDashboardStats: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        // Récupérer le profil client
        const client = await ctx.db.client.findUnique({
          where: { userId },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil client introuvable',
          });
        }

        // Calculer les statistiques
        const [
          totalAnnouncements,
          activeDeliveries,
          completedDeliveries,
          totalServices,
        ] = await Promise.all([
          ctx.db.announcement.count({
            where: { clientId: client.id },
          }),
          ctx.db.delivery.count({
            where: {
              clientId: client.id,
              status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
            },
          }),
          ctx.db.delivery.count({
            where: {
              clientId: client.id,
              status: 'DELIVERED',
            },
          }),
          ctx.db.serviceBooking.count({
            where: { clientId: client.id },
          }),
        ]);

        return {
          totalAnnouncements,
          activeDeliveries,
          completedDeliveries,
          totalServices,
          successRate: completedDeliveries > 0 
            ? Math.round((completedDeliveries / (completedDeliveries + activeDeliveries)) * 100)
            : 0,
        };
      } catch (error) {
        console.error('Erreur lors du calcul des statistiques:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors du calcul des statistiques',
        });
      }
    }),

  /**
   * Récupérer l'activité récente
   */
  getRecentActivity: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        // Récupérer le profil client
        const client = await ctx.db.client.findUnique({
          where: { userId },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil client introuvable',
          });
        }

        // Récupérer les dernières activités
        const [recentDeliveries, recentBookings, recentAnnouncements] = await Promise.all([
          ctx.db.delivery.findMany({
            where: { clientId: client.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              status: true,
              createdAt: true,
              trackingCode: true,
            },
          }),
          ctx.db.serviceBooking.findMany({
            where: { clientId: client.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              status: true,
              createdAt: true,
              service: {
                select: {
                  name: true,
                },
              },
            },
          }),
          ctx.db.announcement.findMany({
            where: { clientId: client.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              status: true,
              createdAt: true,
              title: true,
            },
          }),
        ]);

        return {
          recentDeliveries,
          recentBookings,
          recentAnnouncements,
        };
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'activité récente:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération de l\'activité récente',
        });
      }
    }),

  /**
   * Récupérer les métriques financières
   */
  getFinancialMetrics: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        // Récupérer le profil client
        const client = await ctx.db.client.findUnique({
          where: { userId },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil client introuvable',
          });
        }

        // Calculer les métriques financières
        const [totalSpent, pendingPayments, monthlySpent] = await Promise.all([
          ctx.db.payment.aggregate({
            where: {
              userId: userId,
              status: 'COMPLETED',
            },
            _sum: {
              amount: true,
            },
          }),
          ctx.db.payment.aggregate({
            where: {
              userId: userId,
              status: 'PENDING',
            },
            _sum: {
              amount: true,
            },
          }),
          ctx.db.payment.aggregate({
            where: {
              userId: userId,
              status: 'COMPLETED',
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              },
            },
            _sum: {
              amount: true,
            },
          }),
        ]);

        return {
          totalSpent: totalSpent._sum.amount || 0,
          pendingPayments: pendingPayments._sum.amount || 0,
          monthlySpent: monthlySpent._sum.amount || 0,
          averageOrderValue: totalSpent._sum.amount && totalSpent._sum.amount > 0 
            ? totalSpent._sum.amount / Math.max(await ctx.db.announcement.count({
                where: { clientId: client.id },
              }), 1)
            : 0,
        };
      } catch (error) {
        console.error('Erreur lors du calcul des métriques financières:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors du calcul des métriques financières',
        });
      }
    }),

  /**
   * Récupérer les éléments actifs (annonces, livraisons, réservations)
   */
  getActiveItems: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        // Récupérer le profil client
        const client = await ctx.db.client.findUnique({
          where: { userId },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil client introuvable',
          });
        }

        // Récupérer les éléments actifs
        const [activeAnnouncements, activeDeliveries, activeBookings] = await Promise.all([
          ctx.db.announcement.findMany({
            where: {
              clientId: client.id,
              status: { in: ['DRAFT', 'PUBLISHED', 'IN_APPLICATION'] },
            },
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          ctx.db.delivery.findMany({
            where: {
              clientId: client.id,
              status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
            },
            select: {
              id: true,
              trackingCode: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          ctx.db.serviceBooking.findMany({
            where: {
              clientId: client.id,
              status: { in: ['CONFIRMED', 'PENDING'] },
            },
            select: {
              id: true,
              status: true,
              createdAt: true,
              service: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        return {
          activeAnnouncements,
          activeDeliveries,
          activeBookings,
        };
      } catch (error) {
        console.error('Erreur lors de la récupération des éléments actifs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des éléments actifs',
        });
      }
    }),
}); 