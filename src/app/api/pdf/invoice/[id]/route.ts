import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";
import { db } from "@/server/db";
import { pdfGenerationService, InvoiceData } from "@/lib/services/pdf-generation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const invoiceId = params.id;

    // Récupérer la facture avec toutes les informations nécessaires
    const invoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        OR: [
          { clientId: session.user.id },
          { providerId: session.user.id },
          // Permettre aux admins d'accéder à toutes les factures
          ...(session.user.role === "ADMIN" ? [{}] : [])
        ]
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                address: true,
                city: true,
                postalCode: true,
                country: true
              }
            }
          }
        },
        provider: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                address: true,
                city: true,
                postalCode: true,
                country: true
              }
            },
            siretNumber: true
          }
        },
        items: true
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Facture non trouvée" },
        { status: 404 }
      );
    }

    // Préparer les données pour la génération PDF
    const invoiceData: InvoiceData = {
      invoiceNumber: invoice.number,
      date: invoice.createdAt,
      dueDate: invoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours par défaut
      client: {
        name: invoice.client?.user?.name || "Client",
        email: invoice.client?.user?.email || "",
        address: invoice.client?.user?.address || "",
        city: invoice.client?.user?.city || "",
        postalCode: invoice.client?.user?.postalCode || "",
        country: invoice.client?.user?.country || "France"
      },
      provider: invoice.provider ? {
        name: invoice.provider.user?.name || "Prestataire",
        email: invoice.provider.user?.email || "",
        siret: invoice.provider.siretNumber || undefined,
        address: invoice.provider.user?.address || "",
        city: invoice.provider.user?.city || "",
        postalCode: invoice.provider.user?.postalCode || "",
        country: invoice.provider.user?.country || "France"
      } : undefined,
      items: invoice.items.map(item => ({ description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        taxRate: item.taxRate || 0
       })),
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      notes: invoice.notes || undefined,
      paymentTerms: "Paiement à 30 jours",
      type: invoice.type as any || "SERVICE"
    };

    // Générer le PDF
    const pdfBuffer = await pdfGenerationService.generateInvoice(invoiceData);

    // Retourner le PDF avec les en-têtes appropriés
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="facture-${invoice.number}.pdf"`,
        "Content-Length": pdfBuffer.length.toString()}});

  } catch (error) {
    console.error("Erreur lors de la génération du PDF de facture:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}