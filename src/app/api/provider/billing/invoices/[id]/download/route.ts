import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

/**
 * GET - Télécharger une facture PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer la facture
    const invoice = await prisma.invoice.findUnique({
      where: { id: (await params).id },
      include: {
        items: true,
        provider: {
          include: {
            profile: true,
            providerProfile: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Vérifier que l'utilisateur a accès à cette facture
    if (
      invoice.providerId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized to access this invoice" },
        { status: 403 },
      );
    }

    // Si un PDF existe déjà, le retourner
    if (invoice.pdfUrl) {
      return NextResponse.json({ url: invoice.pdfUrl });
    }

    // Sinon, générer le PDF
    const doc = new jsPDF();

    // En-tête EcoDeli
    doc.setFontSize(24);
    doc.text("EcoDeli", 20, 20);
    doc.setFontSize(10);
    doc.text("110 rue de Flandre", 20, 28);
    doc.text("75019 Paris", 20, 33);
    doc.text("SIRET: 123 456 789 00012", 20, 38);

    // Titre facture
    doc.setFontSize(18);
    doc.text("FACTURE MENSUELLE PRESTATAIRE", 120, 20);
    doc.setFontSize(12);
    doc.text(`N° ${invoice.id.slice(0, 8).toUpperCase()}`, 120, 28);
    doc.text(`Date: ${format(invoice.createdAt, "dd/MM/yyyy")}`, 120, 34);

    // Informations prestataire
    doc.setFontSize(12);
    doc.text("PRESTATAIRE:", 20, 55);
    doc.setFontSize(10);
    doc.text(
      `${invoice.provider.profile?.firstName} ${invoice.provider.profile?.lastName}`,
      20,
      62,
    );
    doc.text(`${invoice.provider.email}`, 20, 67);
    if (invoice.provider.providerProfile?.siret) {
      doc.text(`SIRET: ${invoice.provider.providerProfile.siret}`, 20, 72);
    }
    doc.text(`Statut: Autoentrepreneur`, 20, 77);

    // Période
    doc.setFontSize(12);
    doc.text("PÉRIODE DE FACTURATION:", 20, 90);
    doc.setFontSize(10);
    doc.text(
      `Du ${format(invoice.periodStart, "dd/MM/yyyy")} au ${format(invoice.periodEnd, "dd/MM/yyyy")}`,
      20,
      97,
    );

    // Tableau des prestations
    let y = 110;
    doc.setFontSize(12);
    doc.text("DÉTAIL DES PRESTATIONS:", 20, y);
    y += 10;

    // En-têtes du tableau
    doc.setFontSize(9);
    doc.text("Description", 20, y);
    doc.text("Qté", 100, y);
    doc.text("Prix unit.", 120, y);
    doc.text("Total", 150, y);
    doc.text("Comm.", 170, y);

    y += 5;
    doc.line(20, y, 190, y); // Ligne horizontale
    y += 5;

    // Lignes du tableau
    let totalBrut = 0;
    let totalCommission = 0;

    doc.setFontSize(8);
    invoice.items.forEach((item) => {
      const commission = item.totalPrice * 0.2; // 20% de commission
      totalBrut += item.totalPrice;
      totalCommission += commission;

      // Tronquer la description si trop longue
      const description =
        item.description.length > 50
          ? item.description.substring(0, 47) + "..."
          : item.description;

      doc.text(description, 20, y);
      doc.text(item.quantity.toString(), 100, y);
      doc.text(`${item.unitPrice.toFixed(2)}€`, 120, y);
      doc.text(`${item.totalPrice.toFixed(2)}€`, 150, y);
      doc.text(`${commission.toFixed(2)}€`, 170, y);
      y += 5;
    });

    // Totaux
    y += 5;
    doc.line(20, y, 190, y);
    y += 8;

    doc.setFontSize(10);
    doc.text("Montant brut total:", 120, y);
    doc.text(`${totalBrut.toFixed(2)}€`, 170, y);
    y += 6;

    doc.text("Commission EcoDeli (20%):", 120, y);
    doc.text(`-${totalCommission.toFixed(2)}€`, 170, y);
    y += 6;

    doc.setFontSize(12);
    doc.text("MONTANT NET À PERCEVOIR:", 120, y);
    doc.text(`${invoice.totalAmount.toFixed(2)}€`, 170, y);

    // Informations de paiement
    y += 15;
    doc.setFontSize(10);
    doc.text("INFORMATIONS DE PAIEMENT:", 20, y);
    y += 7;
    doc.setFontSize(9);
    if (invoice.paidAt) {
      doc.text(`Payée le: ${format(invoice.paidAt, "dd/MM/yyyy")}`, 20, y);
      doc.text("Mode: Virement bancaire", 20, y + 5);
    } else {
      doc.text(
        `Échéance: ${format(invoice.dueDate || new Date(), "dd/MM/yyyy")}`,
        20,
        y,
      );
      doc.text(
        "Mode: Virement bancaire automatique sous 5 jours ouvrés",
        20,
        y + 5,
      );
    }

    // Mentions légales
    y = 260;
    doc.setFontSize(8);
    doc.text("Facture générée automatiquement le 30 du mois à 23h00", 20, y);
    doc.text(
      "Document à conserver pour votre comptabilité d'autoentrepreneur",
      20,
      y + 5,
    );
    doc.text("TVA non applicable, art. 293 B du CGI", 20, y + 10);

    // Convertir en base64
    const pdfBase64 = doc.output("datauristring");

    // Optionnel : sauvegarder l'URL du PDF en base de données
    // await prisma.invoice.update({
    //   where: { id: (await params).id },
    //   data: { pdfUrl: pdfBase64 }
    // })

    return NextResponse.json({ url: pdfBase64 });
  } catch (error) {
    console.error("Error downloading invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
