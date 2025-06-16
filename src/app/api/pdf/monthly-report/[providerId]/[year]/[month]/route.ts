import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { pdfGenerationService } from "@/lib/services/pdf-generation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { providerId: string; year: string; month: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { providerId, year, month } = params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Vérifier que l'utilisateur peut accéder à ce rapport
    if (session.user.id !== providerId && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    // Récupérer le prestataire
    const provider = await db.provider.findFirst({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        siretNumber: true
      }
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Prestataire non trouvé" },
        { status: 404 }
      );
    }

    // Définir les dates de début et fin du mois
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Récupérer toutes les prestations du mois
    const bookings = await db.serviceBooking.findMany({
      where: {
        providerId: provider.id,
        completedAt: {
          gte: startDate,
          lte: endDate
        },
        status: "COMPLETED"
      },
      include: {
        client: {
          include: {
            user: {
              select: { name }
            }
          }
        },
        service: {
          select: {
            title: true,
            price: true
          }
        }
      },
      orderBy: {
        completedAt: "asc"
      }
    });

    // Calculer les totaux
    const commissionRate = 0.15; // 15% de commission EcoDeli
    const totalGross = 0;
    const totalCommission = 0;

    const services = bookings.map(booking => {
      const amount = booking.service?.price || booking.totalAmount || 0;
      const commission = amount * commissionRate;
      const net = amount - commission;

      totalGross += amount;
      totalCommission += commission;

      return {
        date: booking.completedAt || booking.createdAt,
        client: booking.client?.user?.name || "Client inconnu",
        description: booking.service?.title || "Service",
        amount,
        commission,
        net
      };
    });

    const totalNet = totalGross - totalCommission;

    // Préparer les données pour la génération PDF
    const reportData = {
      provider: {
        name: provider.user?.name || "Prestataire",
        email: provider.user?.email || "",
        siret: provider.siretNumber || undefined
      },
      period: {
        month: monthNum,
        year: yearNum
      },
      services,
      totals: {
        gross: totalGross,
        commission: totalCommission,
        net: totalNet
      }
    };

    // Générer le PDF
    const pdfBuffer = await pdfGenerationService.generateMonthlyReport(reportData);

    // Noms des mois en français
    const monthNames = [
      "janvier", "fevrier", "mars", "avril", "mai", "juin",
      "juillet", "aout", "septembre", "octobre", "novembre", "decembre"
    ];

    const filename = `rapport-${monthNames[monthNum - 1]}-${yearNum}-${provider.user?.name?.replace(/\s+/g, '-').toLowerCase() || 'prestataire'}.pdf`;

    // Retourner le PDF avec les en-têtes appropriés
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString()}});

  } catch (error) {
    console.error("Erreur lors de la génération du rapport mensuel:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du rapport" },
      { status: 500 }
    );
  }
}