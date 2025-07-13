import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get total providers
    const totalProviders = await prisma.provider.count({
      where: {
        isActive: true,
      },
    });

    // Get pending invoices (not yet generated)
    const pendingInvoices = await prisma.provider.count({
      where: {
        isActive: true,
        monthlyInvoices: {
          none: {
            month: currentMonth,
            year: currentYear,
          },
        },
      },
    });

    // Get generated invoices
    const generatedInvoices = await prisma.providerMonthlyInvoice.count({
      where: {
        month: currentMonth,
        year: currentYear,
        status: "SENT",
      },
    });

    // Get paid invoices
    const paidInvoices = await prisma.providerMonthlyInvoice.count({
      where: {
        month: currentMonth,
        year: currentYear,
        status: "PAID",
      },
    });

    // Get overdue invoices
    const overdueInvoices = await prisma.providerMonthlyInvoice.count({
      where: {
        dueDate: {
          lt: new Date(),
        },
        status: {
          in: ["SENT", "PENDING"],
        },
      },
    });

    // Get total amount for current month
    const totalAmountResult = await prisma.providerMonthlyInvoice.aggregate({
      where: {
        month: currentMonth,
        year: currentYear,
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalAmount = totalAmountResult._sum.totalAmount || 0;

    // Get average amount
    const averageAmountResult = await prisma.providerMonthlyInvoice.aggregate({
      where: {
        month: currentMonth,
        year: currentYear,
      },
      _avg: {
        totalAmount: true,
      },
    });

    const averageAmount = averageAmountResult._avg.totalAmount || 0;

    return NextResponse.json({
      totalProviders,
      pendingInvoices,
      generatedInvoices,
      paidInvoices,
      totalAmount,
      averageAmount,
      overdueInvoices,
    });
  } catch (error) {
    console.error("Error fetching provider billing stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
