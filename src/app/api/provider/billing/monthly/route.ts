import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { fr } from "date-fns/locale";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const monthParam = searchParams.get("month"); // format: YYYY-MM

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 }
      );
    }

    // Déterminer le mois à afficher
    const targetDate = monthParam ? new Date(monthParam + "-01") : new Date();
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

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

    // Calculer les détails des services
    const servicesDetails = bookings.map(booking => {
      const commission = booking.payment?.amount ? booking.payment.amount * 0.20 : 0; // 20% de commission EcoDeli
      const netAmount = booking.payment?.amount ? booking.payment.amount - commission : 0;

      return {
        id: booking.id,
        name: booking.service.name,
        date: booking.scheduledAt.toISOString(),
        clientName: `${booking.client.profile?.firstName || ""} ${booking.client.profile?.lastName || ""}`.trim() || "Client",
        amount: booking.payment?.amount || 0,
        commission,
        netAmount,
        status: booking.status as "COMPLETED" | "PENDING",
      };
    });

    const totalAmount = servicesDetails.reduce((sum, s) => sum + s.netAmount, 0);

    // Récupérer la dernière facture
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        providerId,
        type: "PROVIDER_MONTHLY",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Prochaine date de génération (30 du mois à 23h)
    const nextGenerationDate = new Date();
    nextGenerationDate.setDate(30);
    nextGenerationDate.setHours(23, 0, 0, 0);
    if (nextGenerationDate < new Date()) {
      nextGenerationDate.setMonth(nextGenerationDate.getMonth() + 1);
    }

    // Estimation pour le mois prochain
    const upcomingInvoice = {
      generationDate: nextGenerationDate.toISOString(),
      estimatedAmount: totalAmount,
      servicesCount: servicesDetails.length,
    };

    // Paramètres de facturation
    const billingSettings = {
      autoGeneration: true,
      generationDay: 30,
      generationHour: 23,
      paymentDelay: 5, // 5 jours ouvrés
    };

    return NextResponse.json({
      currentMonth: {
        totalServices: servicesDetails.length,
        totalAmount,
        servicesDetails,
        estimatedPaymentDate: new Date(nextGenerationDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      lastInvoice: lastInvoice ? {
        id: lastInvoice.id,
        month: new Date(lastInvoice.periodStart).getMonth() + 1,
        year: new Date(lastInvoice.periodStart).getFullYear(),
        amount: lastInvoice.totalAmount,
        status: lastInvoice.status,
        pdfUrl: lastInvoice.pdfUrl,
        generatedAt: lastInvoice.createdAt.toISOString(),
        paidAt: lastInvoice.paidAt?.toISOString(),
      } : null,
      upcomingInvoice,
      billingSettings,
    });
  } catch (error) {
    console.error("Error fetching monthly billing data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Déclencher manuellement la génération de facture (pour les tests)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "PROVIDER")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { providerId, month } = body;

    if (!providerId || !month) {
      return NextResponse.json(
        { error: "Provider ID and month are required" },
        { status: 400 }
      );
    }

    // Cette fonction serait normalement appelée par un CRON job le 30 à 23h
    // Ici on la déclenche manuellement pour les tests
    
    const targetDate = new Date(month + "-01");
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    // Récupérer toutes les prestations du mois
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
        payment: true,
      },
    });

    if (bookings.length === 0) {
      return NextResponse.json(
        { error: "No completed services found for this month" },
        { status: 404 }
      );
    }

    // Calculer le montant total
    const totalAmount = bookings.reduce((sum, booking) => {
      const commission = booking.payment?.amount ? booking.payment.amount * 0.20 : 0;
      return sum + (booking.payment?.amount || 0) - commission;
    }, 0);

    // Créer la facture
    const invoice = await prisma.invoice.create({
      data: {
        providerId,
        type: "PROVIDER_MONTHLY",
        status: "GENERATED",
        totalAmount,
        periodStart: monthStart,
        periodEnd: monthEnd,
        dueDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        items: {
          create: bookings.map(booking => ({
            description: `Service: ${booking.service.name}`,
            quantity: 1,
            unitPrice: booking.payment?.amount || 0,
            totalPrice: booking.payment?.amount || 0,
          })),
        },
      },
    });

    // Ici on devrait générer le PDF et l'envoyer par email
    // Pour l'instant on retourne juste l'invoice créée

    return NextResponse.json({
      message: "Invoice generated successfully",
      invoice: {
        id: invoice.id,
        amount: invoice.totalAmount,
        status: invoice.status,
        generatedAt: invoice.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating monthly invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 