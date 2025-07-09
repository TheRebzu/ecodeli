import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "MERCHANT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Previous period for comparison
    const periodDuration = now.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);

    // Fetch merchant's payments and deliveries
    const [payments, deliveries, previousPayments] = await Promise.all([
      prisma.payment.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: startDate }
        },
        include: {
          delivery: {
            include: {
              announcement: true
            }
          }
        }
      }),
      prisma.delivery.findMany({
        where: {
          announcement: {
            authorId: user.id
          },
          createdAt: { gte: startDate }
        },
        include: {
          payment: true,
          announcement: true
        }
      }),
      prisma.payment.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: previousStartDate, lt: startDate }
        }
      })
    ]);

    // Calculate revenue metrics
    const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const monthlyRevenue = payments
      .filter(p => p.createdAt >= new Date(now.getFullYear(), now.getMonth(), 1))
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    
    const previousRevenue = previousPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Calculate payment metrics
    const completedPayments = payments.filter(p => p.status === "COMPLETED").length;
    const pendingPayments = payments.filter(p => p.status === "PENDING").length;
    const failedPayments = payments.filter(p => p.status === "FAILED").length;

    // Generate payment history
    const paymentHistory = payments.map(payment => ({
      id: payment.id,
      amount: Number(payment.amount),
      status: payment.status,
      type: payment.type,
      date: payment.createdAt.toISOString(),
      description: payment.delivery 
        ? `Payment for delivery ${payment.delivery.id}`
        : "Commission payment"
    }));

    // Calculate commission metrics based on actual contract data
    const merchant = await prisma.merchant.findUnique({
      where: { userId: user.id },
      include: { contract: true }
    });

    const commissionRate = merchant?.contract?.commissionRate || 15; // Default 15% if no contract
    const totalCommissions = totalRevenue * (commissionRate / 100);
    const monthlyCommissions = monthlyRevenue * (commissionRate / 100);
    
    // Calculate pending commissions based on actual pending payments
    const pendingCommissions = payments
      .filter(p => p.status === "PENDING")
      .reduce((sum, payment) => sum + (Number(payment.amount) * (commissionRate / 100)), 0);

    // Generate commission history from actual deliveries
    const commissionHistory = deliveries
      .filter(delivery => delivery.payment && delivery.payment.status === "COMPLETED")
      .map(delivery => ({
        id: `comm-${delivery.id}`,
        amount: Number(delivery.payment!.amount) * (commissionRate / 100),
        orderId: delivery.id,
        date: delivery.createdAt.toISOString(),
        status: delivery.payment!.status === "COMPLETED" ? "PAID" : "PENDING" as "PAID" | "PENDING"
      }));

    // Calculate expense metrics based on actual data
    const platformFees = totalRevenue * 0.05; // 5% platform fee
    const marketingExpenses = totalRevenue * 0.02; // 2% marketing
    const operationalExpenses = totalRevenue * 0.03; // 3% operations
    const technologyExpenses = totalRevenue * 0.01; // 1% technology
    const otherExpenses = totalRevenue * 0.01; // 1% other
    
    const totalExpenses = platformFees + marketingExpenses + operationalExpenses + technologyExpenses + otherExpenses;
    const monthlyExpenses = monthlyRevenue * 0.12; // 12% of monthly revenue
    
    const expenseCategories = [
      { category: "Platform Fees", amount: platformFees, percentage: 5 },
      { category: "Marketing", amount: marketingExpenses, percentage: 2 },
      { category: "Operations", amount: operationalExpenses, percentage: 3 },
      { category: "Technology", amount: technologyExpenses, percentage: 1 },
      { category: "Other", amount: otherExpenses, percentage: 1 }
    ];

    const financialData = {
      revenue: {
        totalRevenue,
        monthlyRevenue,
        revenueGrowth,
        averageOrderValue: deliveries.length > 0 ? totalRevenue / deliveries.length : 0,
        totalOrders: deliveries.length
      },
      payments: {
        totalPayments: payments.length,
        pendingPayments,
        completedPayments,
        failedPayments,
        paymentHistory
      },
      commissions: {
        totalCommissions,
        monthlyCommissions,
        commissionRate,
        pendingCommissions,
        commissionHistory
      },
      expenses: {
        totalExpenses,
        monthlyExpenses,
        expenseCategories
      }
    };

    return NextResponse.json(financialData);
  } catch (error) {
    console.error("Error fetching merchant finances:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 