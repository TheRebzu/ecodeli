import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

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

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 }
      );
    }

    // Vérifier que le provider existe
    const provider = await prisma.provider.findUnique({
      where: { userId: providerId }
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Dates pour les calculs
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Commission EcoDeli par défaut (15%)
    const commissionRate = 0.15;

    // Gains du mois en cours (paiements des services complétés)
    const currentMonthPayments = await prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        type: "SERVICE",
        booking: {
          service: {
            providerId: provider.id
          }
        },
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Gains du mois précédent
    const previousMonthPayments = await prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        type: "SERVICE",
        booking: {
          service: {
            providerId: provider.id
          }
        },
        createdAt: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Total des gains (tous les paiements complétés)
    const totalPayments = await prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        type: "SERVICE",
        booking: {
          service: {
            providerId: provider.id
          }
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Montant en attente (paiements en cours)
    const pendingPayments = await prisma.payment.aggregate({
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
        type: "SERVICE",
        booking: {
          service: {
            providerId: provider.id
          }
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Total des retraits effectués via WalletOperation
    const totalWithdrawalsAgg = await prisma.walletOperation.aggregate({
      where: {
        userId: providerId,
        type: "WITHDRAWAL",
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });

    // Dernier retrait
    const lastWithdrawal = await prisma.walletOperation.findFirst({
      where: {
        userId: providerId,
        type: "WITHDRAWAL",
        status: "COMPLETED",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculer les montants nets (après commission EcoDeli)
    const grossCurrentMonth = currentMonthPayments._sum.amount || 0;
    const grossPreviousMonth = previousMonthPayments._sum.amount || 0;
    const grossTotalEarnings = totalPayments._sum.amount || 0;
    const grossPendingAmount = pendingPayments._sum.amount || 0;

    const netCurrentMonth = grossCurrentMonth * (1 - commissionRate);
    const netPreviousMonth = grossPreviousMonth * (1 - commissionRate);
    const netTotalEarnings = grossTotalEarnings * (1 - commissionRate);
    const netPendingAmount = grossPendingAmount * (1 - commissionRate);

    const totalWithdrawals = Math.abs(totalWithdrawalsAgg._sum.amount || 0);
    const availableForWithdrawal = Math.max(0, netTotalEarnings - totalWithdrawals);

    return NextResponse.json({
      currentMonth: netCurrentMonth,
      previousMonth: netPreviousMonth,
      totalEarnings: netTotalEarnings,
      pendingAmount: netPendingAmount,
      availableForWithdrawal,
      grossEarnings: {
        currentMonth: grossCurrentMonth,
        previousMonth: grossPreviousMonth,
        total: grossTotalEarnings,
        pending: grossPendingAmount,
      },
      commission: {
        rate: commissionRate,
        currentMonth: grossCurrentMonth * commissionRate,
        previousMonth: grossPreviousMonth * commissionRate,
        total: grossTotalEarnings * commissionRate,
      },
      lastWithdrawal: lastWithdrawal ? {
        amount: Math.abs(lastWithdrawal.amount),
        date: lastWithdrawal.createdAt.toISOString(),
        status: lastWithdrawal.status,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching earnings summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 