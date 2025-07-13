import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET - Récupérer les tendances financières mensuelles (Admin seulement)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "last12months";

    const monthlyData = await calculateMonthlyTrends(period);

    return NextResponse.json({
      success: true,
      monthlyData,
      period,
    });
  } catch (error) {
    console.error("Error fetching financial trends:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des tendances" },
      { status: 500 },
    );
  }
}

async function calculateMonthlyTrends(period: string) {
  const now = new Date();
  let monthsToFetch: number;

  switch (period) {
    case "last30days":
      monthsToFetch = 1;
      break;
    case "last3months":
      monthsToFetch = 3;
      break;
    case "last6months":
      monthsToFetch = 6;
      break;
    case "last12months":
      monthsToFetch = 12;
      break;
    case "currentyear":
      monthsToFetch = now.getMonth() + 1;
      break;
    default:
      monthsToFetch = 12;
  }

  const monthlyData = [];

  for (let i = monthsToFetch - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - i + 1,
      0,
      23,
      59,
      59,
    );

    // Calculer le chiffre d'affaires du mois
    const monthInterventions = await prisma.intervention.findMany({
      where: {
        isCompleted: true,
        completedAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        booking: {
          include: {
            service: true,
          },
        },
      },
    });

    const monthRevenue = monthInterventions.reduce((sum, intervention) => {
      const duration =
        intervention.actualDuration || intervention.booking.duration;
      const hourlyRate = intervention.booking.service.basePrice;
      return sum + (duration / 60) * hourlyRate;
    }, 0);

    const monthCommission = monthRevenue * 0.1;

    // Compter les transactions du mois
    const monthTransactions = await prisma.payment.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Compter les nouveaux utilisateurs du mois
    const monthUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    monthlyData.push({
      month: monthStart.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      }),
      revenue: monthRevenue,
      commission: monthCommission,
      transactions: monthTransactions,
      users: monthUsers,
    });
  }

  return monthlyData;
}
