import { getCurrentUser } from "@/lib/auth/utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé - rôle admin requis" },
        { status: 403 },
      );
    }

    // Récupérer les métriques système
    const [totalUsers, totalDeliveries, totalAnnouncements, activeDeliveries] =
      await Promise.all([
        prisma.user.count(),
        prisma.delivery.count(),
        prisma.announcement.count(),
        prisma.delivery.count({
          where: { status: "IN_PROGRESS" },
        }),
      ]);

    return NextResponse.json({
      success: true,
      metrics: {
        totalUsers,
        totalDeliveries,
        totalAnnouncements,
        activeDeliveries,
      },
    });
  } catch (error) {
    console.error("Erreur récupération métriques:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
