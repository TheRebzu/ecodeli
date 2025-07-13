import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const monthParam = searchParams.get("month"); // format: YYYY-MM

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 },
      );
    }

    // Déterminer le mois à prévisualiser
    const targetDate = monthParam ? new Date(monthParam + "-01") : new Date();
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);
    const monthName = format(targetDate, "MMMM yyyy", { locale: fr });

    // Récupérer les informations du prestataire
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      include: {
        profile: true,
        providerProfile: true,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Récupérer les prestations du mois
    const bookings = await prisma.booking.findMany({
      where: {
        service: {
          providerId,
        },
        status: "COMPLETED",
        completedAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        service: true,
        client: {
          include: {
            profile: true,
          },
        },
        payment: true,
      },
    });

    // Générer un aperçu PDF
    const doc = new jsPDF();

    // En-tête
    doc.setFontSize(20);
    doc.text("EcoDeli", 20, 20);
    doc.setFontSize(16);
    doc.text("APERÇU FACTURE MENSUELLE", 20, 30);
    doc.setFontSize(10);
    doc.text("(Document non contractuel)", 20, 36);

    // Informations
    doc.setFontSize(10);
    doc.text(`Période: ${monthName}`, 20, 50);
    doc.text(
      `Date de génération prévue: 30 ${format(targetDate, "MMMM yyyy", { locale: fr })} à 23h00`,
      20,
      55,
    );

    // Prestataire
    doc.text(
      `Prestataire: ${provider.profile?.firstName} ${provider.profile?.lastName}`,
      20,
      70,
    );
    doc.text(`Email: ${provider.email}`, 20, 75);

    // Résumé
    let totalBrut = 0;
    let totalCommission = 0;

    bookings.forEach((booking) => {
      const amount = booking.payment?.amount || 0;
      const commission = amount * 0.2; // 20% de commission
      totalBrut += amount;
      totalCommission += commission;
    });

    const totalNet = totalBrut - totalCommission;

    doc.setFontSize(12);
    doc.text("RÉSUMÉ", 20, 90);
    doc.setFontSize(10);
    doc.text(`Nombre de prestations: ${bookings.length}`, 20, 100);
    doc.text(`Montant brut total: ${totalBrut.toFixed(2)}€`, 20, 105);
    doc.text(
      `Commission EcoDeli (20%): -${totalCommission.toFixed(2)}€`,
      20,
      110,
    );
    doc.setFontSize(12);
    doc.text(`MONTANT NET À PERCEVOIR: ${totalNet.toFixed(2)}€`, 20, 120);

    // Note
    doc.setFontSize(8);
    doc.text(
      "Cet aperçu est fourni à titre indicatif. La facture définitive sera générée automatiquement",
      20,
      140,
    );
    doc.text(
      "le 30 du mois à 23h00 et pourra présenter des différences selon les prestations effectuées.",
      20,
      145,
    );

    // Convertir en base64
    const pdfBase64 = doc.output("datauristring");

    return NextResponse.json({
      url: pdfBase64,
      preview: {
        period: monthName,
        servicesCount: bookings.length,
        totalGross: totalBrut,
        commission: totalCommission,
        totalNet: totalNet,
      },
    });
  } catch (error) {
    console.error("Error generating invoice preview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
