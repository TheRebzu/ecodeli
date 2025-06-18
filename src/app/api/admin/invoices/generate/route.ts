import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";
import { invoiceGenerationService } from "@/server/services/billing/invoice-generation.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Vérifier que l'utilisateur est admin
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { month, year, type, providerId } = body;

    // Validation des paramètres
    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Mois et année requis et valides" },
        { status: 400 }
      );
    }

    let result;

    if (type === "single" && providerId) {
      // Génération pour un seul prestataire
      result = await invoiceGenerationService.generateMonthlyInvoiceForProvider({
        providerId,
        month,
        year,
        dueInDays: 30,
        taxRate: 0.20,
        notes: `Facture générée manuellement par ${session.user.name || "Admin"}`
      });

      if (result) {
        return NextResponse.json({ success: true,
          message: "Facture générée avec succès",
          invoiceId: result.id
         });
      } else {
        return NextResponse.json({ success: false,
          message: "Aucune prestation trouvée pour cette période"
         });
      }
    } else {
      // Génération en masse pour tous les prestataires
      result = await invoiceGenerationService.generateMonthlyInvoicesForAllProviders(
        month,
        year,
        {
          dueInDays: 30,
          taxRate: 0.20,
          notes: `Factures générées manuellement par ${session.user.name || "Admin"}`,
          adminId: session.user.id
        }
      );

      return NextResponse.json({
        success: true,
        message: `${result.generated} factures générées avec succès`,
        details: {
          generated: result.generated,
          failed: result.failed,
          errors: result.errors
        }
      });
    }

  } catch (error) {
    console.error("Erreur lors de la génération des factures:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors de la génération des factures",
        details: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    // Retourner des statistiques sur la génération de factures
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json(
        { error: "Paramètres mois et année requis" },
        { status: 400 }
      );
    }

    const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    // Compter les factures déjà générées pour cette période
    const existingInvoices = await db.invoice.count({
      where: {
        type: "MONTHLY_SERVICE",
        billingPeriodStart: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    // Compter les prestataires éligibles
    const eligibleProviders = await db.provider.count({
      where: {
        isActive: true,
        services: {
          some: {
            bookings: {
              some: {
                status: "COMPLETED",
                completedAt: {
                  gte: startOfMonth,
                  lte: endOfMonth
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      period: {
        month: parseInt(month),
        year: parseInt(year)
      },
      stats: {
        existingInvoices,
        eligibleProviders,
        canGenerate: eligibleProviders > existingInvoices
      }
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}