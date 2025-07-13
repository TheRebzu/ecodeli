import { NextRequest, NextResponse } from "next/server";
import { ProviderBillingService } from "@/features/billing/services/provider-billing.service";
import { ecoLogger } from "@/lib/logger";

/**
 * POST /api/cron/provider-billing
 * FACTURATION AUTOMATIQUE MENSUELLE PRESTATAIRES
 * Exécuté le 30 de chaque mois à 23h selon cahier des charges
 */
export async function POST(request: NextRequest) {
  try {
    // Vérification sécurité CRON
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    ecoLogger.billing.info(
      "Début de la facturation automatique mensuelle des prestataires",
    );

    // Récupérer le mois et l'année cibles depuis les paramètres (pour les tests)
    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : undefined;
    const targetYear = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : undefined;

    // Générer les factures mensuelles avec le service dédié
    const results = await ProviderBillingService.generateMonthlyInvoices(
      targetMonth,
      targetYear,
    );

    ecoLogger.billing.info("Facturation automatique terminée", {
      successful: results.success,
      failed: results.errors.length,
      errors: results.errors,
    });

    return NextResponse.json({
      success: true,
      message: "Facturation automatique terminée",
      stats: {
        successful: results.success,
        failed: results.errors.length,
        errors: results.errors,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    ecoLogger.billing.error("Erreur lors de la facturation automatique", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Erreur lors de la facturation automatique" },
      { status: 500 },
    );
  }
}

/**
 * GET - Obtenir les statistiques de facturation des prestataires
 */
export async function GET(request: NextRequest) {
  try {
    const cronKey = request.headers.get("X-Cron-Key");

    if (!cronKey || cronKey !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : undefined;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : undefined;

    const stats = await ProviderBillingService.getBillingStats(month, year);

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting billing stats:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 },
    );
  }
}
