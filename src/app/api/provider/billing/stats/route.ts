import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET - Récupérer les statistiques de facturation du prestataire
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil prestataire
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Profil prestataire non trouvé" },
        { status: 404 },
      );
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Période mois actuel
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(
      currentYear,
      currentMonth + 1,
      0,
      23,
      59,
      59,
    );

    // Période mois précédent
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Période année en cours
    const yearStart = new Date(currentYear, 0, 1);

    // Calculer les stats pour chaque période
    const [currentMonthStats, lastMonthStats, yearToDateStats] =
      await Promise.all([
        calculatePeriodStats(provider.id, currentMonthStart, currentMonthEnd),
        calculatePeriodStats(provider.id, lastMonthStart, lastMonthEnd),
        calculatePeriodStats(provider.id, yearStart, now),
      ]);

    const stats = {
      currentMonth: currentMonthStats,
      lastMonth: lastMonthStats,
      yearToDate: yearToDateStats,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching provider billing stats:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 },
    );
  }
}

async function calculatePeriodStats(
  providerId: string,
  startDate: Date,
  endDate: Date,
) {
  // Récupérer les interventions terminées pour la période
  const interventions = await prisma.intervention.findMany({
    where: {
      providerId,
      isCompleted: true,
      completedAt: {
        gte: startDate,
        lte: endDate,
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

  const totalInterventions = interventions.length;
  const totalHours = interventions.reduce((sum, intervention) => {
    const duration =
      intervention.actualDuration || intervention.booking.duration;
    return sum + duration / 60; // Convertir en heures
  }, 0);

  const totalEarnings = interventions.reduce((sum, intervention) => {
    const duration =
      intervention.actualDuration || intervention.booking.duration;
    const hourlyRate = intervention.booking.service.basePrice;
    const earning = (duration / 60) * hourlyRate;
    // Soustraire la commission de 10%
    return sum + earning * 0.9;
  }, 0);

  const avgHourlyRate = totalHours > 0 ? totalEarnings / totalHours : 0;

  return {
    totalEarnings,
    interventions: totalInterventions,
    totalHours,
    avgHourlyRate,
  };
}
