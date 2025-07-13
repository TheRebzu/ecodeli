import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProviderBillingService } from "@/features/billing/services/provider-billing.service";

/**
 * GET - R�cup�rer le rapport de gains du prestataire pour une p�riode
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // R�cup�rer le profil prestataire
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        bookings: {
          where: {
            status: "COMPLETED",
          },
          include: {
            service: true,
            client: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            intervention: true,
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Profil prestataire non trouv�" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : new Date().getMonth() + 1;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear();

    const billingPeriod = ProviderBillingService.getBillingPeriod(month, year);

    // Filtrer les interventions pour la p�riode demand�e
    provider.bookings = provider.bookings.filter(
      (booking) =>
        new Date(booking.scheduledDate) >= billingPeriod.startDate &&
        new Date(booking.scheduledDate) <= billingPeriod.endDate,
    );

    const earnings = ProviderBillingService.calculateProviderEarnings(
      provider,
      billingPeriod,
    );

    // R�cup�rer la facture correspondante si elle existe
    const invoice = await prisma.invoice.findFirst({
      where: {
        providerId: provider.id,
        type: "PROVIDER_MONTHLY",
        billingPeriodStart: billingPeriod.startDate,
        billingPeriodEnd: billingPeriod.endDate,
      },
    });

    // Statistiques comparatives
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    const previousPeriod = ProviderBillingService.getBillingPeriod(
      previousMonth,
      previousYear,
    );

    const previousEarnings = await prisma.invoice.findFirst({
      where: {
        providerId: provider.id,
        type: "PROVIDER_MONTHLY",
        billingPeriodStart: previousPeriod.startDate,
        billingPeriodEnd: previousPeriod.endDate,
      },
    });

    const comparison = {
      earningsChange: previousEarnings
        ? ((earnings.netAmount - previousEarnings.total) /
            previousEarnings.total) *
          100
        : 0,
      interventionsChange: previousEarnings?.metadata?.totalInterventions
        ? ((earnings.totalInterventions -
            previousEarnings.metadata.totalInterventions) /
            previousEarnings.metadata.totalInterventions) *
          100
        : 0,
      hoursChange: previousEarnings?.metadata?.totalHours
        ? ((earnings.totalHours - previousEarnings.metadata.totalHours) /
            previousEarnings.metadata.totalHours) *
          100
        : 0,
    };

    return NextResponse.json({
      success: true,
      earnings: {
        ...earnings,
        period: `${billingPeriod.month}/${billingPeriod.year}`,
        periodStart: billingPeriod.startDate,
        periodEnd: billingPeriod.endDate,
        invoice: invoice
          ? {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
              pdfUrl: invoice.pdfUrl,
            }
          : null,
        comparison,
      },
    });
  } catch (error) {
    console.error("Error getting provider earnings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la r�cup�ration des gains" },
      { status: 500 },
    );
  }
}
