import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { TicketService } from "@/features/support/services/ticket.service";

const statsFiltersSchema = z.object({
  dateFrom: z
    .string()
    .transform((str) => (str ? new Date(str) : undefined))
    .optional(),
  dateTo: z
    .string()
    .transform((str) => (str ? new Date(str) : undefined))
    .optional(),
  period: z.enum(["day", "week", "month", "year"]).optional().default("month"),
});

/**
 * GET - Récupérer les statistiques du support
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filters = statsFiltersSchema.parse({
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
      period: searchParams.get("period"),
    });

    // Définir les dates par défaut selon la période
    let dateFrom = filters.dateFrom;
    let dateTo = filters.dateTo || new Date();

    if (!dateFrom) {
      switch (filters.period) {
        case "day":
          dateFrom = new Date();
          dateFrom.setDate(dateFrom.getDate() - 1);
          break;
        case "week":
          dateFrom = new Date();
          dateFrom.setDate(dateFrom.getDate() - 7);
          break;
        case "month":
          dateFrom = new Date();
          dateFrom.setMonth(dateFrom.getMonth() - 1);
          break;
        case "year":
          dateFrom = new Date();
          dateFrom.setFullYear(dateFrom.getFullYear() - 1);
          break;
      }
    }

    // Récupérer les statistiques globales
    const stats = await TicketService.getTicketStats(dateFrom, dateTo);

    return NextResponse.json({
      success: true,
      stats,
      period: {
        from: dateFrom,
        to: dateTo,
        type: filters.period,
      },
    });
  } catch (error) {
    console.error("Error fetching support stats:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 },
    );
  }
}
