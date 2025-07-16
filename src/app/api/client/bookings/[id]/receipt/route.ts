import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import jsPDF from "jspdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Récupérer le profil client
    const client = await db.client.findUnique({
      where: { userId: user.id },
      include: { user: { include: { profile: true } } },
    });
    if (!client) {
      return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
    }

    // Récupérer la réservation
    const booking = await db.booking.findFirst({
      where: { id, clientId: client.id },
      include: {
        provider: {
          include: {
            user: { include: { profile: true } },
          },
        },
        service: true,
        payment: true,
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Générer le PDF avec jsPDF
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("EcoDeli - Reçu de Réservation", 20, 20);
    doc.setFontSize(12);
    doc.text(`Référence: ${booking.id.slice(-8).toUpperCase()}`, 20, 35);
    doc.text(`Date de réservation: ${booking.createdAt.toLocaleDateString("fr-FR")}`, 20, 45);
    doc.text(`Statut: ${booking.status}`, 20, 55);

    doc.text("Client:", 20, 70);
    doc.text(`${client.user.profile?.firstName || ""} ${client.user.profile?.lastName || ""}`, 40, 70);
    doc.text(client.user.email, 40, 75);

    doc.text("Prestataire:", 20, 90);
    doc.text(`${booking.provider.user.profile?.firstName || ""} ${booking.provider.user.profile?.lastName || ""}`, 40, 90);
    doc.text(booking.provider.user.email, 40, 95);

    doc.text("Service:", 20, 110);
    doc.text(booking.service?.name || "Service", 40, 110);

    doc.text("Date et heure:", 20, 125);
    doc.text(`${booking.scheduledDate.toLocaleDateString("fr-FR")} à ${booking.scheduledTime}`, 60, 125);

    doc.text("Lieu:", 20, 140);
    let address = "";
    if (typeof booking.address === "object" && booking.address && "address" in booking.address) {
      address = `${booking.address.address}, ${booking.address.city}`;
    } else {
      address = booking.address?.toString() || "Non spécifié";
    }
    doc.text(address, 40, 140);

    doc.text("Montant total:", 20, 155);
    doc.text(`${booking.totalPrice.toFixed(2)} €`, 60, 155);

    if (booking.payment) {
      doc.text("Paiement:", 20, 170);
      doc.text(`Statut: ${booking.payment.status}`, 40, 170);
      if (booking.payment.paidAt) {
        doc.text(`Payé le: ${new Date(booking.payment.paidAt).toLocaleDateString("fr-FR")}`, 40, 175);
      }
      doc.text(`Méthode: ${booking.payment.paymentMethod || "-"}`, 40, 180);
    }

    doc.setFontSize(10);
    doc.text("Merci d'avoir utilisé EcoDeli !", 20, 200);

    // Générer le buffer PDF
    const pdfBuffer = doc.output("arraybuffer");
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=recue-booking-${booking.id}.pdf`,
      },
    });
  } catch (error) {
    console.error("Error generating booking receipt:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 