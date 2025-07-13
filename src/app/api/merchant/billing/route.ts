import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const merchant = await db.merchant.findFirst({
      where: { userId: user.id },
    });

    if (!merchant) {
      return NextResponse.json(
        { error: "Merchant not found" },
        { status: 404 },
      );
    }

    const where: any = { merchantId: merchant.id };

    if (status) {
      where.status = status;
    }

    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      where.periodStart = { gte: startDate };
      where.periodEnd = { lte: endDate };
    }

    const billingCycles = await db.merchantBilling.findMany({
      where,
      include: {
        contract: {
          select: {
            id: true,
            title: true,
            commissionRate: true,
          },
        },
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { periodStart: "desc" },
    });

    const stats = await db.merchantBilling.aggregate({
      where: { merchantId: merchant.id },
      _sum: {
        totalRevenue: true,
        commissionAmount: true,
        totalAmount: true,
      },
      _count: true,
    });

    const currentMonth = new Date();
    const currentMonthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const currentMonthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
    );

    const currentMonthBilling = await db.merchantBilling.findFirst({
      where: {
        merchantId: merchant.id,
        periodStart: { gte: currentMonthStart },
        periodEnd: { lte: currentMonthEnd },
      },
    });

    return NextResponse.json({
      billingCycles: billingCycles.map((cycle) => ({
        id: cycle.id,
        periodStart: cycle.periodStart.toISOString(),
        periodEnd: cycle.periodEnd.toISOString(),
        status: cycle.status,
        totalOrders: cycle.totalOrders,
        totalRevenue: cycle.totalRevenue,
        commissionAmount: cycle.commissionAmount,
        monthlyFee: cycle.monthlyFee,
        additionalFees: cycle.additionalFees,
        totalAmount: cycle.totalAmount,
        invoiceNumber: cycle.invoiceNumber,
        invoicePath: cycle.invoicePath,
        dueDate: cycle.dueDate?.toISOString(),
        paidAt: cycle.paidAt?.toISOString(),
        paymentMethod: cycle.paymentMethod,
        createdAt: cycle.createdAt.toISOString(),
        contract: cycle.contract,
        ordersCount: cycle.orders.length,
      })),
      stats: {
        totalBillings: stats._count,
        totalRevenue: stats._sum.totalRevenue || 0,
        totalCommissions: stats._sum.commissionAmount || 0,
        totalAmountDue: stats._sum.totalAmount || 0,
      },
      currentMonth: currentMonthBilling
        ? {
            id: currentMonthBilling.id,
            totalOrders: currentMonthBilling.totalOrders,
            totalRevenue: currentMonthBilling.totalRevenue,
            commissionAmount: currentMonthBilling.commissionAmount,
            status: currentMonthBilling.status,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching merchant billing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
