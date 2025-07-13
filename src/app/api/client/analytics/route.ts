import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = parseInt(searchParams.get("timeRange") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    // Récupération des livraisons
    const deliveries = await prisma.delivery.findMany({
      where: {
        announcement: {
          authorId: session.id,
        },
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        announcement: true,
        payment: true,
      },
    });

    // Récupération des paiements
    const payments = await prisma.payment.findMany({
      where: {
        userId: session.id,
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Récupération des réservations de services
    const bookings = await prisma.booking.findMany({
      where: {
        clientId: session.id,
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        service: true,
        payment: true,
      },
    });

    // Calcul des métriques
    const totalDeliveries = deliveries.length;
    const totalSpent = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    // Calcul de la note moyenne (simulé)
    const averageRating = 4.2 + Math.random() * 0.6;

    // Calcul des économies (basé sur l'abonnement)
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.id,
        status: "active",
      },
    });

    let totalSavings = 0;
    if (subscription) {
      const discountRate =
        subscription.plan === "STARTER"
          ? 0.05
          : subscription.plan === "PREMIUM"
            ? 0.09
            : 0;
      totalSavings = totalSpent * discountRate;
    }

    // Livraisons ce mois
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const deliveriesThisMonth = deliveries.filter(
      (d) => d.createdAt >= thisMonth,
    ).length;

    // Abonnements actifs
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        userId: session.id,
        status: "active",
      },
    });

    // Top villes
    const cityStats = deliveries.reduce(
      (acc, delivery) => {
        const city =
          delivery.deliveryAddress.split(",").pop()?.trim() || "Inconnu";
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topCities = Object.entries(cityStats)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Statistiques mensuelles
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      month.setDate(1);

      const nextMonth = new Date(month);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const monthDeliveries = deliveries.filter(
        (d) => d.createdAt >= month && d.createdAt < nextMonth,
      );

      const monthPayments = payments.filter(
        (p) => p.createdAt >= month && p.createdAt < nextMonth,
      );

      monthlyStats.push({
        month: month.toLocaleDateString("fr-FR", {
          month: "short",
          year: "numeric",
        }),
        deliveries: monthDeliveries.length,
        spending: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      });
    }

    // Livraisons récentes
    const recentDeliveries = deliveries
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5)
      .map((delivery) => ({
        id: delivery.id,
        title: delivery.announcement.title,
        status: delivery.status,
        amount: delivery.payment ? Number(delivery.payment.amount) : 0,
        createdAt: delivery.createdAt.toISOString(),
      }));

    return NextResponse.json({
      totalDeliveries,
      totalSpent,
      averageRating,
      totalSavings,
      deliveriesThisMonth,
      activeSubscriptions,
      topCities,
      monthlyStats,
      recentDeliveries,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des analytics" },
      { status: 500 },
    );
  }
}
