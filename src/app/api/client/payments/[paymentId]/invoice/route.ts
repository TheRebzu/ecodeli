import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await params;
    console.log(
      "Génération facture pour payment:",
      paymentId,
      "user:",
      user.id,
    );

    // Récupérer le paiement
    const payment = await db.payment.findUnique({
      where: {
        id: paymentId,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        delivery: {
          select: {
            id: true,
            announcement: {
              select: {
                title: true,
                description: true,
              },
            },
          },
        },
        booking: {
          select: {
            id: true,
            service: {
              select: {
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      console.log("Paiement non trouvé pour ID:", paymentId);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    console.log("Paiement trouvé:", payment.id, payment.amount);

    // Générer la facture HTML
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Facture - EcoDeli</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: white;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #4F46E5;
            padding-bottom: 20px;
          }
          .company-name { 
            font-size: 24px; 
            font-weight: bold; 
            color: #4F46E5; 
            margin-bottom: 10px;
          }
          .invoice-title { 
            font-size: 20px; 
            margin: 20px 0; 
          }
          .details { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px; 
          }
          .client-info, .invoice-info { 
            width: 45%; 
          }
          .section-title { 
            font-weight: bold; 
            margin-bottom: 10px; 
            color: #374151;
          }
          .info-line { 
            margin: 5px 0; 
          }
          .payment-details { 
            margin-top: 30px; 
          }
          .amount { 
            font-size: 24px; 
            font-weight: bold; 
            color: #059669; 
            text-align: center; 
            padding: 20px; 
            background: #F0FDF4; 
            border-radius: 8px; 
            margin: 20px 0;
          }
          .status { 
            display: inline-block; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: bold;
          }
          .status-completed { 
            background: #D1FAE5; 
            color: #065F46; 
          }
          .status-pending { 
            background: #FEF3C7; 
            color: #92400E; 
          }
          .footer { 
            margin-top: 50px; 
            text-align: center; 
            font-size: 12px; 
            color: #6B7280; 
            border-top: 1px solid #E5E7EB; 
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">EcoDeli</div>
          <div>Plateforme de livraison écologique</div>
        </div>

        <div class="invoice-title">Facture #${payment.id.slice(-8).toUpperCase()}</div>

        <div class="details">
          <div class="client-info">
            <div class="section-title">Informations client</div>
            <div class="info-line"><strong>Nom:</strong> ${payment.user?.name || "N/A"}</div>
            <div class="info-line"><strong>Email:</strong> ${payment.user?.email || "N/A"}</div>
          </div>
          
          <div class="invoice-info">
            <div class="section-title">Informations facture</div>
            <div class="info-line"><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleDateString("fr-FR")}</div>
            <div class="info-line"><strong>Statut:</strong> 
              <span class="status status-${payment.status.toLowerCase()}">${payment.status}</span>
            </div>
            <div class="info-line"><strong>Méthode:</strong> ${payment.paymentMethod || "Carte bancaire"}</div>
          </div>
        </div>

        <div class="payment-details">
          <div class="section-title">Détails du paiement</div>
          <div class="info-line"><strong>Type:</strong> ${payment.metadata?.type || "Paiement"}</div>
          <div class="info-line"><strong>Description:</strong> ${payment.metadata?.description || `Paiement ${payment.amount}€`}</div>
          
          ${
            payment.delivery
              ? `
            <div class="info-line"><strong>Livraison:</strong> ${payment.delivery.announcement?.title || "N/A"}</div>
          `
              : ""
          }
          
          ${
            payment.booking
              ? `
            <div class="info-line"><strong>Service:</strong> ${payment.booking.service?.name || "N/A"}</div>
          `
              : ""
          }
        </div>

        <div class="amount">
          Montant: ${payment.amount.toFixed(2)} ${payment.currency}
          ${payment.refundAmount ? `<br><small style="color: #DC2626;">Remboursé: ${payment.refundAmount.toFixed(2)} ${payment.currency}</small>` : ""}
        </div>

        <div class="footer">
          <div>EcoDeli - Plateforme de livraison écologique</div>
          <div>Cette facture a été générée automatiquement le ${new Date().toLocaleDateString("fr-FR")}</div>
          ${payment.stripePaymentId ? `<div>ID Stripe: ${payment.stripePaymentId}</div>` : ""}
        </div>
      </body>
      </html>
    `;

    return new NextResponse(invoiceHtml, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="facture-${paymentId.slice(-8)}.html"`,
      },
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
