import { db } from '../db';
import { DeliveryStatus, AnnouncementStatus } from '@prisma/client';

export const DashboardService = {
  /**
   * Récupère les statistiques générales pour le dashboard client
   */
  async getClientDashboardStats(userId: string) {
    const announcementsCount = await db.announcement.count({
      where: { clientId: userId },
    });

    const deliveriesCount = await db.delivery.count({
      where: { clientId: userId },
    });

    const completedDeliveriesCount = await db.delivery.count({
      where: {
        clientId: userId,
        status: DeliveryStatus.DELIVERED,
      },
    });

    const averageRating = await db.deliveryRating.aggregate({
      where: {
        delivery: {
          clientId: userId,
        },
      },
      _avg: {
        rating: true,
      },
    });

    // Calcul des économies (exemple: 2€ d'économie par livraison)
    const estimatedSavings = completedDeliveriesCount * 2;

    return {
      announcementsCount,
      deliveriesCount,
      completedDeliveriesCount,
      averageRating: averageRating._avg.rating || 0,
      estimatedSavings,
    };
  },

  /**
   * Récupère les activités récentes du client
   */
  async getClientRecentActivity(userId: string, limit = 10) {
    // Récupérer les dernières livraisons
    const recentDeliveries = await db.delivery.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        deliverer: true,
      },
    });

    // Récupérer les dernières annonces
    const recentAnnouncements = await db.announcement.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Récupérer les derniers paiements
    const recentPayments = await db.payment.findMany({
      where: {
        // Comme Payment n'a pas de référence directe à User,
        // nous allons filtrer autrement ou recalibrer cette logique
        id: {
          in: await db.serviceBooking
            .findMany({
              where: { clientId: userId },
              select: { paymentId: true },
            })
            .then(bookings => bookings.map(b => b.paymentId).filter(Boolean) as string[]),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Récupérer les dernières réservations de box
    const recentBoxReservations = await db.reservation.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        box: true,
      },
    });

    // Combiner les activités et trier par date
    const allActivities = [
      ...recentDeliveries.map(d => ({
        type: 'delivery',
        date: d.createdAt,
        data: d,
      })),
      ...recentAnnouncements.map(a => ({
        type: 'announcement',
        date: a.createdAt,
        data: a,
      })),
      ...recentPayments.map(p => ({
        type: 'payment',
        date: p.createdAt,
        data: p,
      })),
      ...recentBoxReservations.map(r => ({
        type: 'box_reservation',
        date: r.createdAt,
        data: r,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);

    return allActivities;
  },

  /**
   * Récupère les métriques financières du client
   */
  async getClientFinancialMetrics(userId: string) {
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Récupération des IDs de paiement pour ce client
    const getClientPaymentIds = async (startDate: Date, endDate?: Date) => {
      const where: { clientId: string; createdAt?: { gte?: Date; lte?: Date } } = {
        clientId: userId,
      };
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const bookings = await db.serviceBooking.findMany({
        where,
        select: { paymentId: true },
      });

      return bookings.map(b => b.paymentId).filter(Boolean) as string[];
    };

    // Dépenses du mois en cours
    const currentMonthPaymentIds = await getClientPaymentIds(firstDayCurrentMonth);
    const currentMonthExpenses = await db.payment.aggregate({
      where: {
        id: { in: currentMonthPaymentIds },
      },
      _sum: {
        amount: true,
      },
    });

    // Dépenses du mois précédent
    const previousMonthPaymentIds = await getClientPaymentIds(
      firstDayPreviousMonth,
      lastDayPreviousMonth
    );
    const previousMonthExpenses = await db.payment.aggregate({
      where: {
        id: { in: previousMonthPaymentIds },
      },
      _sum: {
        amount: true,
      },
    });

    // Récupérer les 6 derniers mois de dépenses pour le graphique
    const lastSixMonths = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthlyPaymentIds = await getClientPaymentIds(month, endMonth);
      const monthlyTotal = await db.payment.aggregate({
        where: {
          id: { in: monthlyPaymentIds },
        },
        _sum: {
          amount: true,
        },
      });

      lastSixMonths.push({
        month: month.toISOString().slice(0, 7), // Format YYYY-MM
        amount: monthlyTotal._sum?.amount || 0,
      });
    }

    // Calcul des économies (exemple: 2€ d'économie par livraison)
    const completedDeliveriesCount = await db.delivery.count({
      where: {
        clientId: userId,
        status: DeliveryStatus.DELIVERED,
      },
    });

    const estimatedSavings = completedDeliveriesCount * 2;

    return {
      currentMonthExpenses: currentMonthExpenses._sum?.amount || 0,
      previousMonthExpenses: previousMonthExpenses._sum?.amount || 0,
      expenseEvolution: lastSixMonths,
      estimatedSavings,
    };
  },

  /**
   * Récupère les éléments actifs du client (livraisons, annonces)
   */
  async getClientActiveItems(userId: string) {
    // Livraisons actives (en cours)
    const activeDeliveries = await db.delivery.findMany({
      where: {
        clientId: userId,
        status: {
          in: [
            DeliveryStatus.PENDING,
            DeliveryStatus.ACCEPTED,
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.IN_TRANSIT,
          ],
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        deliverer: true,
      },
    });

    // Annonces actives (publiées, sans livreur)
    const activeAnnouncements = await db.announcement.findMany({
      where: {
        clientId: userId,
        status: {
          in: [AnnouncementStatus.PENDING, AnnouncementStatus.PUBLISHED],
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // Services réservés à venir
    const upcomingServices = await db.serviceBooking.findMany({
      where: {
        clientId: userId,
        startTime: {
          gte: new Date(),
        },
      },
      orderBy: { startTime: 'asc' },
      take: 3,
      include: {
        service: true,
        provider: true,
      },
    });

    // Box actuellement réservées
    const activeBoxes = await db.reservation.findMany({
      where: {
        clientId: userId,
        status: {
          not: 'CANCELLED',
        },
        endDate: {
          gte: new Date(),
        },
      },
      orderBy: { endDate: 'asc' },
      take: 3,
      include: {
        box: true,
      },
    });

    return {
      activeDeliveries,
      activeAnnouncements,
      upcomingServices,
      activeBoxes,
    };
  },
};
