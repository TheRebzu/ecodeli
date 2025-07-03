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

    // Dates pour les calculs
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Gains du mois en cours
    const currentMonthEarnings = await prisma.transaction.aggregate({
      where: {
        providerId,
        type: "EARNING",
        status: "COMPLETED",
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
    const previousMonthEarnings = await prisma.transaction.aggregate({
      where: {
        providerId,
        type: "EARNING",
        status: "COMPLETED",
        createdAt: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Total des gains
    const totalEarnings = await prisma.transaction.aggregate({
      where: {
        providerId,
        type: "EARNING",
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });

    // Montant en attente
    const pendingAmount = await prisma.transaction.aggregate({
      where: {
        providerId,
        type: "EARNING",
        status: "PENDING",
      },
      _sum: {
        amount: true,
      },
    });

    // Total des retraits
    const totalWithdrawals = await prisma.transaction.aggregate({
      where: {
        providerId,
        type: "WITHDRAWAL",
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });

    // Dernier retrait
    const lastWithdrawal = await prisma.transaction.findFirst({
      where: {
        providerId,
        type: "WITHDRAWAL",
        status: "COMPLETED",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculer le montant disponible pour le retrait
    const availableForWithdrawal = 
      (totalEarnings._sum.amount || 0) - 
      (totalWithdrawals._sum.amount || 0) - 
      (pendingAmount._sum.amount || 0);

    return NextResponse.json({
      currentMonth: currentMonthEarnings._sum.amount || 0,
      previousMonth: previousMonthEarnings._sum.amount || 0,
      totalEarnings: totalEarnings._sum.amount || 0,
      pendingAmount: pendingAmount._sum.amount || 0,
      availableForWithdrawal: Math.max(0, availableForWithdrawal),
      lastWithdrawal: lastWithdrawal ? {
        amount: lastWithdrawal.amount,
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