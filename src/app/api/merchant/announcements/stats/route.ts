import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Statistiques générales
    const [
      totalAnnouncements,
      activeAnnouncements,
      completedAnnouncements,
      cancelledAnnouncements,
    ] = await Promise.all([
      db.announcement.count({ where: { authorId: user.id } }),
      db.announcement.count({ where: { authorId: user.id, status: "ACTIVE" } }),
      db.announcement.count({
        where: { authorId: user.id, status: "COMPLETED" },
      }),
      db.announcement.count({
        where: { authorId: user.id, status: "CANCELLED" },
      }),
    ]);

    // Statistiques par type
    const typeStats = await db.announcement.groupBy({
      by: ["type"],
      where: { authorId: user.id },
      _count: { type: true },
      _avg: { basePrice: true },
    });

    // Revenus total
    const revenueStats = await db.announcement.aggregate({
      where: {
        authorId: user.id,
        status: "COMPLETED",
      },
      _sum: { finalPrice: true },
      _avg: { finalPrice: true },
    });

    // Annonces récentes (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentStats = await db.announcement.count({
      where: {
        authorId: user.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    return NextResponse.json({
      success: true,
      // Structure attendue par la page frontend
      total: totalAnnouncements,
      active: activeAnnouncements,
      completed: completedAnnouncements,
      cancelled: cancelledAnnouncements,
      recent: recentStats,
      totalViews: 0, // À implémenter avec un champ views dans Announcement
      averagePrice: revenueStats._avg.finalPrice || 0,
      totalRevenue: revenueStats._sum.finalPrice || 0,
      // Structure détaillée pour usage avancé
      overview: {
        total: totalAnnouncements,
        active: activeAnnouncements,
        completed: completedAnnouncements,
        cancelled: cancelledAnnouncements,
        recent: recentStats,
      },
      revenue: {
        total: revenueStats._sum.finalPrice || 0,
        average: revenueStats._avg.finalPrice || 0,
      },
      byType: typeStats.reduce(
        (acc, stat) => {
          acc[stat.type] = {
            count: stat._count.type,
            avgPrice: stat._avg.basePrice || 0,
          };
          return acc;
        },
        {} as Record<string, any>,
      ),
    });
  } catch (error) {
    console.error("❌ Erreur récupération stats annonces:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
