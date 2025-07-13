import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Endpoint pour les statistiques de documents (admin seulement)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès administrateur requis" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // day, week, month, year

    // Calculer la date de début selon la période
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "day":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Statistiques globales
    const [totalDocuments, documentsByType, documentsByPeriod, topUsers] =
      await Promise.all([
        // Total de documents générés
        db.documentGeneration.count({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
        }),

        // Répartition par type de document
        db.documentGeneration.groupBy({
          by: ["documentType"],
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          _count: true,
        }),

        // Evolution dans le temps (par jour)
        db.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          document_type
        FROM document_generations 
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY DATE(created_at), document_type
        ORDER BY date DESC
      `,

        // Top utilisateurs
        db.documentGeneration.groupBy({
          by: ["userId"],
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          _count: true,
          orderBy: {
            _count: {
              userId: "desc",
            },
          },
          take: 10,
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalDocuments,
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        byType: documentsByType.map((item) => ({
          type: item.documentType,
          count: item._count,
        })),
        timeline: documentsByPeriod,
        topUsers: topUsers.map((item) => ({
          userId: item.userId,
          count: item._count,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching document statistics:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 },
    );
  }
}
