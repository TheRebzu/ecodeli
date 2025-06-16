import { router, adminProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { prisma } from "@/server/db";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

export const adminAnalyticsRouter = router({
  /**
   * Récupère les données du dashboard overview
   */
  getDashboardOverview: adminProcedure.query(async () => {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Données d'activité pour le graphique
    const activityData = await Promise.all(
      Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return getActivityForDate(date);
      }),
    );

    // Alertes système
    const alerts = await getSystemAlerts();

    // Activité récente
    const recentActivity = await getRecentActivity();

    return {
      activityChart: activityData,
      alerts,
      recentActivity};
  }),

  /**
   * Récupère les statistiques de livraison
   */
  getDeliveryStats: adminProcedure.query(async () => {
    const deliveryStats = await prisma.delivery.groupBy({
      by: ["status"],
      count: { id }});

    const statusDistribution = deliveryStats.map((stat) => ({ status: stat.status,
      count: stat.count.id }));

    return {
      statusDistribution};
  }),

  /**
   * Récupère les statistiques utilisateurs
   */
  getUserStats: adminProcedure.query(async () => {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Tendance des inscriptions
    const signupTrend = await Promise.all(
      Array.from({ length: 30 }, async (_, i) => {
        const date = subDays(new Date(), 29 - i);
        const startDate = startOfDay(date);
        const endDate = endOfDay(date);

        const count = await prisma.user.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate}}});

        return {
          date: format(date, "MM/dd"),
          signups: count};
      }),
    );

    // Répartition par rôle
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      count: { id }});

    const totalUsers = await prisma.user.count();

    // Vérifications
    const pendingVerifications = await prisma.verification.count({
      where: { status: "PENDING" }});

    const approvedVerifications = await prisma.verification.count({
      where: { status: "APPROVED" }});

    const rejectedVerifications = await prisma.verification.count({
      where: { status: "REJECTED" }});

    return {
      signupTrend,
      usersByRole: usersByRole.map((role) => ({ role: role.role,
        count: role.count.id })),
      totalUsers,
      pendingVerifications,
      approvedVerifications,
      rejectedVerifications};
  }),

  /**
   * Récupère les données financières
   */
  getFinancialData: adminProcedure.query(async () => {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Graphique des revenus
    const revenueChart = await Promise.all(
      Array.from({ length: 30 }, async (_, i) => {
        const date = subDays(new Date(), 29 - i);
        const startDate = startOfDay(date);
        const endDate = endOfDay(date);

        const payments = await prisma.payment.aggregate({
          where: {
            status: "COMPLETED",
            createdAt: {
              gte: startDate,
              lte: endDate}},
          sum: { amount }});

        const commissions = await prisma.commission.aggregate({
          where: {
            status: "PAID",
            paidAt: {
              gte: startDate,
              lte: endDate}},
          sum: { amount }});

        return {
          date: format(date, "MM/dd"),
          revenue: payments.sum.amount || 0,
          commissions: commissions.sum.amount || 0};
      }),
    );

    // Revenus mensuels
    const monthlyRevenue = await prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: subDays(new Date(), 30)}},
      sum: { amount }});

    const monthlyCommissions = await prisma.commission.aggregate({
      where: {
        status: "PAID",
        paidAt: {
          gte: subDays(new Date(), 30)}},
      sum: { amount }});

    // Calcul de la croissance
    const previousMonthRevenue = await prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: subDays(new Date(), 60),
          lte: subDays(new Date(), 30)}},
      sum: { amount }});

    const revenueGrowth = previousMonthRevenue.sum.amount
      ? (((monthlyRevenue.sum.amount || 0) -
          previousMonthRevenue.sum.amount) /
          previousMonthRevenue.sum.amount) *
        100
      : 0;

    return {
      revenueChart,
      monthlyRevenue: monthlyRevenue.sum.amount || 0,
      monthlyCommissions: monthlyCommissions.sum.amount || 0,
      revenueGrowth};
  }),

  /**
   * Récupère les statistiques d'annonces
   */
  getAnnouncementStats: adminProcedure.query(async () => {
    // Tendance de création sur 7 jours
    const creationTrend = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const startDate = startOfDay(date);
        const endDate = endOfDay(date);

        const count = await prisma.announcement.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate}}});

        return {
          date: format(date, "MM/dd"),
          created: count};
      }),
    );

    return {
      creationTrend};
  }),

  /**
   * Récupère l'activité récente
   */
  getRecentActivity: adminProcedure.query(async () => {
    const recentActivity = await getRecentActivity();
    return { recentActivity };
  })});

// Fonctions utilitaires
async function getActivityForDate(date: Date) {
  const startDate = startOfDay(date);
  const endDate = endOfDay(date);

  const [users, deliveries, announcements] = await Promise.all([
    prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate}}}),
    prisma.delivery.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate}}}),
    prisma.announcement.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate}}})]);

  return {
    date: format(date, "MM/dd"),
    users,
    deliveries,
    announcements};
}

async function getSystemAlerts() {
  const alerts = [];

  // Vérifications en attente
  const pendingVerifications = await prisma.verification.count({
    where: { status: "PENDING" }});

  if (pendingVerifications > 5) {
    alerts.push({
      id: "pending-verifications",
      type: "verification",
      severity: "high" as const,
      title: "Vérifications en attente",
      description: `${pendingVerifications} vérifications nécessitent votre attention`,
      timestamp: new Date().toISOString(),
      isResolved: false});
  }

  // Livraisons en retard
  const delayedDeliveries = await prisma.delivery.count({
    where: {
      status: "IN_PROGRESS",
      estimatedDeliveryTime: {
        lt: new Date()}}});

  if (delayedDeliveries > 0) {
    alerts.push({
      id: "delayed-deliveries",
      type: "delivery",
      severity: "medium" as const,
      title: "Livraisons en retard",
      description: `${delayedDeliveries} livraisons ont dépassé leur heure estimée`,
      timestamp: new Date().toISOString(),
      isResolved: false});
  }

  return alerts;
}

async function getRecentActivity() {
  const activities = [];

  // Dernières inscriptions
  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true}});

  recentUsers.forEach((user) => {
    activities.push({
      id: `user-${user.id}`,
      action: `Nouvelle inscription: ${user.email}`,
      type: user.role,
      timestamp: format(user.createdAt, "HH:mm")});
  });

  // Dernières livraisons
  const recentDeliveries = await prisma.delivery.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true}});

  recentDeliveries.forEach((delivery) => {
    activities.push({
      id: `delivery-${delivery.id}`,
      action: `Livraison ${delivery.status}`,
      type: "delivery",
      timestamp: format(delivery.createdAt, "HH:mm")});
  });

  // Trier par timestamp
  return activities
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 10);
}
