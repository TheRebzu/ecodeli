import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { FinancialManagementService } from "@/features/finance/services/financial-management.service";

const financialQuerySchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  type: z
    .enum(["summary", "cashflow", "metrics", "detailed"])
    .default("summary"),
  interval: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

/**
 * GET - Récupérer les données financières
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Définir les dates par défaut (30 derniers jours)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const query = financialQuerySchema.parse({
      startDate:
        searchParams.get("startDate") || defaultStartDate.toISOString(),
      endDate: searchParams.get("endDate") || defaultEndDate.toISOString(),
      type: searchParams.get("type") || "summary",
      interval: searchParams.get("interval") || "daily",
    });

    let data;

    switch (query.type) {
      case "summary":
        // Résumé financier
        data = await FinancialManagementService.getFinancialSummary(
          query.startDate,
          query.endDate,
        );
        break;

      case "cashflow":
        // Données de cash flow
        data = await FinancialManagementService.getCashFlowData(
          query.startDate,
          query.endDate,
          query.interval,
        );
        break;

      case "metrics":
        // Métriques financières
        data = await FinancialManagementService.getFinancialMetrics(
          query.startDate,
          query.endDate,
        );
        break;

      case "detailed":
        // Rapport détaillé complet
        data = await FinancialManagementService.getDetailedFinancialReport(
          query.startDate,
          query.endDate,
        );
        break;

      default:
        return NextResponse.json(
          { error: "Type de rapport non supporté" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      type: query.type,
      period: {
        start: query.startDate.toISOString(),
        end: query.endDate.toISOString(),
      },
      data,
    });
  } catch (error) {
    console.error("Error getting financial data:", error);

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
      { error: "Erreur lors de la récupération des données financières" },
      { status: 500 },
    );
  }
}

/**
 * POST - Exporter un rapport financier
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      startDate,
      endDate,
      format = "pdf",
    } = z
      .object({
        startDate: z.string().transform((str) => new Date(str)),
        endDate: z.string().transform((str) => new Date(str)),
        format: z.enum(["pdf", "excel", "csv"]).default("pdf"),
      })
      .parse(body);

    // Générer le rapport détaillé
    const report = await FinancialManagementService.getDetailedFinancialReport(
      startDate,
      endDate,
    );

    // Selon le format demandé, générer le fichier
    let exportUrl: string;
    let filename: string;

    switch (format) {
      case "pdf":
        // Générer PDF (utiliser une bibliothèque comme jsPDF ou Puppeteer)
        filename = `rapport-financier-${startDate.toISOString().split("T")[0]}-${endDate.toISOString().split("T")[0]}.pdf`;
        exportUrl = `/exports/finance/${filename}`;
        break;

      case "excel":
        // Générer Excel (utiliser une bibliothèque comme exceljs)
        filename = `rapport-financier-${startDate.toISOString().split("T")[0]}-${endDate.toISOString().split("T")[0]}.xlsx`;
        exportUrl = `/exports/finance/${filename}`;
        break;

      case "csv":
        // Générer CSV
        filename = `rapport-financier-${startDate.toISOString().split("T")[0]}-${endDate.toISOString().split("T")[0]}.csv`;
        exportUrl = `/exports/finance/${filename}`;
        break;
    }

    // TODO: Implémenter la génération réelle des fichiers
    console.log("Generating financial report:", { format, filename, report });

    return NextResponse.json({
      success: true,
      message: "Rapport financier généré avec succès",
      export: {
        url: exportUrl,
        filename,
        format,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error exporting financial report:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de l'export du rapport financier" },
      { status: 500 },
    );
  }
}
