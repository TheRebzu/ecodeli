import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET - Récupérer les gains et rapports pour une période
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Profil livreur non trouvé" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Dates de début et fin requises" },
        { status: 400 },
      );
    }

    // Construire les conditions de filtrage
    const whereConditions: any = {
      delivererId: deliverer.userId,
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (status && status !== "all") {
      whereConditions.status = status.toUpperCase();
    }

    // Récupérer les livraisons avec gains
    const deliveries = await prisma.delivery.findMany({
      where: whereConditions,
      include: {
        announcement: {
          select: {
            title: true,
            author: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        payment: {
          select: {
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculer les gains
    const earnings = deliveries.map((delivery) => {
      const amount = delivery.payment?.amount || 0;
      const commission = amount * 0.15; // 15% de commission
      const netAmount = amount - commission;

      return {
        id: delivery.id,
        deliveryId: delivery.id,
        announcementTitle: delivery.announcement.title,
        clientName:
          `${delivery.announcement.author.profile?.firstName || ""} ${delivery.announcement.author.profile?.lastName || ""}`.trim(),
        amount: amount,
        commission: commission,
        netAmount: netAmount,
        status: delivery.status.toLowerCase(),
        date: delivery.createdAt.toISOString(),
        paidAt: delivery.payment?.createdAt?.toISOString(),
      };
    });

    // Calculer les statistiques du rapport
    const totalEarnings = earnings.reduce(
      (sum, earning) => sum + earning.amount,
      0,
    );
    const totalCommission = earnings.reduce(
      (sum, earning) => sum + earning.commission,
      0,
    );
    const netEarnings = earnings.reduce(
      (sum, earning) => sum + earning.netAmount,
      0,
    );
    const totalDeliveries = earnings.length;
    const averagePerDelivery =
      totalDeliveries > 0 ? netEarnings / totalDeliveries : 0;

    // Répartition par statut
    const earningsByStatus = {
      completed: earnings
        .filter((e) => e.status === "delivered")
        .reduce((sum, e) => sum + e.netAmount, 0),
      pending: earnings
        .filter((e) => e.status === "pending")
        .reduce((sum, e) => sum + e.netAmount, 0),
      processing: earnings
        .filter((e) => e.status === "in_transit")
        .reduce((sum, e) => sum + e.netAmount, 0),
    };

    // Répartition mensuelle
    const earningsByMonth = earnings.reduce(
      (acc, earning) => {
        const month = new Date(earning.date).toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
        });
        const existing = acc.find((item) => item.month === month);

        if (existing) {
          existing.earnings += earning.netAmount;
          existing.deliveries += 1;
        } else {
          acc.push({
            month,
            earnings: earning.netAmount,
            deliveries: 1,
          });
        }

        return acc;
      },
      [] as Array<{ month: string; earnings: number; deliveries: number }>,
    );

    const report = {
      totalEarnings,
      totalCommission,
      netEarnings,
      totalDeliveries,
      averagePerDelivery,
      earningsByStatus,
      earningsByMonth,
    };

    return NextResponse.json({
      success: true,
      earnings,
      report,
    });
  } catch (error) {
    console.error("Error generating earnings report:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du rapport" },
      { status: 500 },
    );
  }
}
