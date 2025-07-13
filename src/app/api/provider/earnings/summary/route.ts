import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const range = searchParams.get("range") || "month";

    if (!userId || userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer le profil Provider
    const provider = await prisma.provider.findUnique({
      where: { userId: userId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider profile not found" },
        { status: 404 },
      );
    }

    // Calculate date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Get current month interventions
    const currentMonthInterventions = await prisma.serviceIntervention.findMany(
      {
        where: {
          providerId: provider.id,
          status: { in: ["COMPLETED"] }, // Seulement les interventions terminées
          scheduledDate: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
        include: {
          payment: true,
        },
      },
    );

    // Get previous month interventions
    const previousMonthInterventions =
      await prisma.serviceIntervention.findMany({
        where: {
          providerId: provider.id,
          status: { in: ["COMPLETED"] },
          scheduledDate: {
            gte: previousMonthStart,
            lte: previousMonthEnd,
          },
        },
        include: {
          payment: true,
        },
      });

    // Get year to date interventions
    const yearInterventions = await prisma.serviceIntervention.findMany({
      where: {
        providerId: provider.id,
        status: { in: ["COMPLETED"] },
        scheduledDate: {
          gte: yearStart,
          lte: now,
        },
      },
      include: {
        payment: true,
      },
    });

    // Get pending payments (interventions with payments not yet completed)
    const pendingInterventions = await prisma.serviceIntervention.findMany({
      where: {
        providerId: provider.id,
        status: { in: ["PAYMENT_PENDING", "IN_PROGRESS"] },
        scheduledDate: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      include: {
        payment: true,
      },
    });

    // Calculate current month stats
    const currentMonthEarnings = currentMonthInterventions.reduce(
      (sum, intervention) => {
        return sum + (intervention.payment?.amount || 0);
      },
      0,
    );

    const currentMonthNet = currentMonthEarnings * 0.85; // After 15% commission
    const averageInterventionValue =
      currentMonthInterventions.length > 0
        ? currentMonthEarnings / currentMonthInterventions.length
        : 0;

    // Calculate previous month stats
    const previousMonthEarnings = previousMonthInterventions.reduce(
      (sum, intervention) => {
        return sum + (intervention.payment?.amount || 0);
      },
      0,
    );

    // Calculate year stats
    const yearEarnings = yearInterventions.reduce((sum, intervention) => {
      return sum + (intervention.payment?.amount || 0);
    }, 0);

    // Calculate pending payments
    const pendingPaymentsAmount = pendingInterventions.reduce(
      (sum, intervention) => {
        return sum + (intervention.payment?.amount || 0);
      },
      0,
    );

    // Find best month (calculate from all months of the year)
    const monthlyStats = new Map();
    yearInterventions.forEach((intervention) => {
      const month = new Date(intervention.scheduledDate).getMonth();
      const monthName = new Date(
        now.getFullYear(),
        month,
        1,
      ).toLocaleDateString("fr-FR", { month: "long" });
      const amount = intervention.payment?.amount || 0;

      if (!monthlyStats.has(monthName)) {
        monthlyStats.set(monthName, 0);
      }
      monthlyStats.set(monthName, monthlyStats.get(monthName) + amount);
    });

    const bestMonthEntry = Array.from(monthlyStats.entries()).reduce(
      (best, current) => {
        return current[1] > (best[1] || 0) ? current : best;
      },
      ["Octobre", 0],
    );

    const bestMonth = bestMonthEntry[0];
    const bestMonthAmount = bestMonthEntry[1] * 0.85; // After commission

    // Generate weekly breakdown (last 4 weeks)
    const weeklyBreakdown = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7 + 7));
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);

      const weekInterventions = currentMonthInterventions.filter(
        (intervention) => {
          const interventionDate = new Date(intervention.scheduledDate);
          return interventionDate >= weekStart && interventionDate <= weekEnd;
        },
      );

      const weekEarnings = weekInterventions.reduce((sum, intervention) => {
        return sum + (intervention.payment?.amount || 0);
      }, 0);

      weeklyBreakdown.push({
        week: `Semaine ${4 - i}`,
        earnings: weekEarnings * 0.85, // After commission
        bookings: weekInterventions.length,
      });
    }

    // Calculate top services (based on intervention titles)
    const serviceStats = new Map();
    currentMonthInterventions.forEach((intervention) => {
      const serviceName = intervention.title;
      const amount = intervention.payment?.amount || 0;

      if (!serviceStats.has(serviceName)) {
        serviceStats.set(serviceName, {
          earnings: 0,
          interventions: 0,
          totalAmount: 0,
        });
      }

      const stats = serviceStats.get(serviceName);
      stats.earnings += amount * 0.85; // After commission
      stats.interventions += 1;
      stats.totalAmount += amount;
    });

    const topServices = Array.from(serviceStats.entries())
      .map(([serviceName, stats]) => ({
        serviceName,
        earnings: stats.earnings,
        bookings: stats.interventions,
        averageValue:
          stats.interventions > 0 ? stats.totalAmount / stats.interventions : 0,
      }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);

    // Calculate percentage changes
    const earningsChange =
      previousMonthEarnings > 0
        ? ((currentMonthEarnings - previousMonthEarnings) /
            previousMonthEarnings) *
          100
        : 0;

    const bookingsChange =
      previousMonthInterventions.length > 0
        ? ((currentMonthInterventions.length -
            previousMonthInterventions.length) /
            previousMonthInterventions.length) *
          100
        : 0;

    const summary = {
      currentMonth: {
        totalEarnings: currentMonthNet,
        completedBookings: currentMonthInterventions.length,
        averageBookingValue: averageInterventionValue,
        pendingPayments: pendingPaymentsAmount * 0.85, // After commission
        earningsChange: earningsChange,
        bookingsChange: bookingsChange,
      },
      previousMonth: {
        totalEarnings: previousMonthEarnings * 0.85,
        completedBookings: previousMonthInterventions.length,
      },
      yearToDate: {
        totalEarnings: yearEarnings * 0.85,
        completedBookings: yearInterventions.length,
        bestMonth: bestMonth,
        bestMonthAmount: bestMonthAmount,
      },
      weeklyBreakdown: weeklyBreakdown,
      topServices: topServices,
      paymentStatus: {
        available: currentMonthNet * 0.7,
        pending: pendingPaymentsAmount * 0.85,
        processing: currentMonthNet * 0.1,
      },
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching earnings summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
