import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";
    const type = searchParams.get("type");

    const now = new Date();
    let dateFrom: Date;

    switch (period) {
      case "7d":
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const baseFilter: any = {
      createdAt: { gte: dateFrom },
    };

    if (type) {
      baseFilter.type = type;
    }

    const [
      totalAnnouncements,
      completedAnnouncements,
      cancelledAnnouncements,
      averagePrice,
      announcementsByStatus,
      announcementsByType,
      topClients,
    ] = await Promise.all([
      db.announcement.count({ where: baseFilter }),

      db.announcement.count({
        where: { ...baseFilter, status: "COMPLETED" },
      }),

      db.announcement.count({
        where: { ...baseFilter, status: "CANCELLED" },
      }),

      db.announcement.aggregate({
        where: baseFilter,
        _avg: { basePrice: true },
      }),

      db.announcement.groupBy({
        by: ["status"],
        where: baseFilter,
        _count: { _all: true },
      }),

      db.announcement.groupBy({
        by: ["type"],
        where: baseFilter,
        _count: { _all: true },
      }),

      db.announcement.groupBy({
        by: ["authorId"],
        where: baseFilter,
        _count: { _all: true },
        orderBy: { _count: { _all: "desc" } },
        take: 10,
      }),
    ]);

    const completionRate =
      totalAnnouncements > 0
        ? (completedAnnouncements / totalAnnouncements) * 100
        : 0;

    const cancellationRate =
      totalAnnouncements > 0
        ? (cancelledAnnouncements / totalAnnouncements) * 100
        : 0;

    const topClientsWithDetails = await db.user.findMany({
      where: {
        id: { in: topClients.map((tc) => tc.authorId) },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const topClientsData = topClients.map((tc) => ({
      ...topClientsWithDetails.find((user) => user.id === tc.authorId),
      announcementCount: tc._count._all,
    }));

    // Statistiques quotidiennes simplifiées
    const dailyStats = await db.announcement.groupBy({
      by: ["createdAt"],
      where: baseFilter,
      _count: { _all: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      summary: {
        totalAnnouncements,
        completedAnnouncements,
        cancelledAnnouncements,
        averagePrice: averagePrice._avg.basePrice || 0,
        completionRate: Math.round(completionRate * 100) / 100,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
      },
      statusDistribution: announcementsByStatus.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      typeDistribution: announcementsByType.map((item) => ({
        type: item.type,
        count: item._count._all,
      })),
      dailyStats: dailyStats.map((item) => ({
        date: item.createdAt.toISOString().split("T")[0],
        count: item._count._all,
      })),
      topClients: topClientsData,
      period,
      dateRange: {
        from: dateFrom.toISOString(),
        to: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching announcement analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
