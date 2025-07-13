import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { generateProviderInvoice } from "@/features/invoices/services/invoice-generator.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ["PROVIDER"]);

    // Récupérer le profil prestataire
    const provider = await db.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Profil prestataire non trouvé" },
        { status: 404 },
      );
    }

    // Récupérer les factures mensuelles
    const invoices = await db.invoice.findMany({
      where: {
        providerId: provider.id,
        type: "PROVIDER_MONTHLY",
      },
      include: {
        invoiceItems: {
          include: {
            booking: {
              include: {
                client: {
                  include: {
                    user: {
                      select: {
                        profile: {
                          select: {
                            firstName: true,
                            lastName: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            service: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Formater les données
    const formattedInvoices = invoices.map((invoice) => ({
      id: invoice.id,
      month:
        invoice.period?.split("-")[1] ||
        new Date(invoice.createdAt).getMonth() + 1,
      year:
        invoice.period?.split("-")[0] ||
        new Date(invoice.createdAt).getFullYear(),
      totalServices: invoice.invoiceItems.length,
      totalHours: invoice.invoiceItems.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0,
      ),
      grossAmount: Number(invoice.subtotal),
      commissionAmount: Number(invoice.taxAmount || 0),
      netAmount: Number(invoice.total),
      status: invoice.status,
      generatedAt: invoice.createdAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString(),
      services: invoice.invoiceItems.map((item) => ({
        id: item.id,
        serviceType: item.service?.name || item.description,
        clientName: item.booking
          ? `${item.booking.client.user.profile?.firstName || ""} ${item.booking.client.user.profile?.lastName || ""}`.trim()
          : "Client inconnu",
        date:
          item.booking?.scheduledAt?.toISOString() ||
          item.createdAt.toISOString(),
        duration: item.quantity || 0,
        rate: Number(item.unitPrice),
        amount: Number(item.total),
      })),
    }));

    return NextResponse.json({
      success: true,
      invoices: formattedInvoices,
    });
  } catch (error) {
    console.error("❌ Erreur GET provider billing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ["PROVIDER", "ADMIN"]);

    const body = await request.json();
    const { month, year, providerId } = body;

    // Si c'est un prestataire, il ne peut générer que ses propres factures
    let targetProviderId = providerId;
    if (user.role === "PROVIDER") {
      const provider = await db.provider.findUnique({
        where: { userId: user.id },
      });
      if (!provider) {
        return NextResponse.json(
          { error: "Profil prestataire non trouvé" },
          { status: 404 },
        );
      }
      targetProviderId = provider.id;
    }

    // Vérifier si une facture existe déjà pour cette période
    const existingInvoice = await db.invoice.findFirst({
      where: {
        providerId: targetProviderId,
        type: "PROVIDER_MONTHLY",
        period: `${year}-${String(month).padStart(2, "0")}`,
      },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { error: "Une facture existe déjà pour cette période" },
        { status: 400 },
      );
    }

    // Générer la facture mensuelle
    const invoice = await generateProviderInvoice(
      targetProviderId,
      month,
      year,
    );

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        month,
        year,
        grossAmount: Number(invoice.subtotal),
        commissionAmount: Number(invoice.taxAmount || 0),
        netAmount: Number(invoice.total),
        status: invoice.status,
        generatedAt: invoice.createdAt.toISOString(),
      },
      message: "Facture générée avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur POST provider billing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
