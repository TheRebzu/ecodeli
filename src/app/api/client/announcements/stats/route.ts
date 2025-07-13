import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ["CLIENT"]);

    // Récupérer toutes les annonces du client
    const announcements = await db.announcement.findMany({
      where: { authorId: user.id },
      include: {
        delivery: {
          include: {
            payment: {
              where: { status: "COMPLETED" },
            },
          },
        },
      },
    });

    // Calculer les statistiques
    const stats = {
      active: announcements.filter((a) => a.status === "ACTIVE").length,
      matched: announcements.filter((a) => a.status === "MATCHED").length,
      completed: announcements.filter((a) => a.status === "COMPLETED").length,
      inProgress: announcements.filter((a) => a.status === "IN_PROGRESS")
        .length,
      totalAnnouncements: announcements.length,
      totalSaved: 0,
    };

    // Calculer les économies réalisées (exemple: 20% d'économie par rapport aux services traditionnels)
    const totalSpent = announcements
      .filter((a) => a.status === "COMPLETED" && a.delivery?.payment)
      .reduce((sum, announcement) => {
        const paid = announcement.delivery?.payment?.amount || 0;
        return sum + Number(paid);
      }, 0);

    stats.totalSaved = Math.round(totalSpent * 0.2); // 20% d'économie simulée

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching announcement stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
