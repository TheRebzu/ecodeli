import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  period: z.enum(["day", "week", "month", "quarter", "year"]).default("month"),
});

// GET: Fetch dashboard analytics data
export async function GET(req: NextRequest) {
  try {
    // Authenticate user and verify admin permission
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      period: searchParams.get("period") || "month",
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { period } = validatedParams.data;

    // Determine date range based on period
    const now = new Date();
    const dateFrom = new Date();
    
    switch (period) {
      case "day":
        dateFrom.setHours(0, 0, 0, 0);
        break;
      case "week":
        dateFrom.setDate(now.getDate() - 7);
        break;
      case "month":
        dateFrom.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        dateFrom.setMonth(now.getMonth() - 3);
        break;
      case "year":
        dateFrom.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get previous period dates for comparison
    const previousDateFrom = new Date(dateFrom);
    const previousDateTo = new Date(dateFrom);
    
    switch (period) {
      case "day":
        previousDateFrom.setDate(previousDateFrom.getDate() - 1);
        previousDateTo.setDate(previousDateTo.getDate() - 1);
        previousDateTo.setHours(23, 59, 59, 999);
        break;
      case "week":
        previousDateFrom.setDate(previousDateFrom.getDate() - 7);
        break;
      case "month":
        previousDateFrom.setMonth(previousDateFrom.getMonth() - 1);
        break;
      case "quarter":
        previousDateFrom.setMonth(previousDateFrom.getMonth() - 3);
        break;
      case "year":
        previousDateFrom.setFullYear(previousDateFrom.getFullYear() - 1);
        break;
    }

    // Get user statistics
    const [
      totalUsers,
      newUsers,
      previousNewUsers,
      activeUsers,
      previousActiveUsers
    ] = await Promise.all([
      // Total users
      prisma.user.count({
        where: {
          deletedAt: null,
        },
      }),
      // New users in current period
      prisma.user.count({
        where: {
          createdAt: {
            gte: dateFrom,
            lte: now,
          },
          deletedAt: null,
        },
      }),
      // New users in previous period
      prisma.user.count({
        where: {
          createdAt: {
            gte: previousDateFrom,
            lte: dateFrom,
          },
          deletedAt: null,
        },
      }),
      // Active users in current period (logged in)
      prisma.user.count({
        where: {
          lastLogin: {
            gte: dateFrom,
            lte: now,
          },
          deletedAt: null,
        },
      }),
      // Active users in previous period
      prisma.user.count({
        where: {
          lastLogin: {
            gte: previousDateFrom,
            lte: dateFrom,
          },
          deletedAt: null,
        },
      }),
    ]);

    // Get delivery statistics
    const [
      totalDeliveries,
      completedDeliveries,
      previousCompletedDeliveries,
      cancelledDeliveries,
      previousCancelledDeliveries,
      totalDistance,
      previousTotalDistance,
      deliveryUsers
    ] = await Promise.all([
      // Total deliveries
      prisma.delivery.count({
        where: {
          isDeleted: false,
        },
      }),
      // Completed deliveries in current period
      prisma.delivery.count({
        where: {
          status: "DELIVERED",
          completedAt: {
            gte: dateFrom,
            lte: now,
          },
          isDeleted: false,
        },
      }),
      // Completed deliveries in previous period
      prisma.delivery.count({
        where: {
          status: "DELIVERED",
          completedAt: {
            gte: previousDateFrom,
            lte: dateFrom,
          },
          isDeleted: false,
        },
      }),
      // Cancelled deliveries in current period
      prisma.delivery.count({
        where: {
          status: "CANCELLED",
          createdAt: {
            gte: dateFrom,
            lte: now,
          },
          isDeleted: false,
        },
      }),
      // Cancelled deliveries in previous period
      prisma.delivery.count({
        where: {
          status: "CANCELLED",
          createdAt: {
            gte: previousDateFrom,
            lte: dateFrom,
          },
          isDeleted: false,
        },
      }),
      // Total distance covered in current period
      prisma.delivery.aggregate({
        where: {
          status: "DELIVERED",
          completedAt: {
            gte: dateFrom,
            lte: now,
          },
          isDeleted: false,
        },
        _sum: {
          distance: true,
        },
      }),
      // Total distance covered in previous period
      prisma.delivery.aggregate({
        where: {
          status: "DELIVERED",
          completedAt: {
            gte: previousDateFrom,
            lte: dateFrom,
          },
          isDeleted: false,
        },
        _sum: {
          distance: true,
        },
      }),
      // Unique users with deliveries in current period
      prisma.delivery.findMany({
        where: {
          createdAt: {
            gte: dateFrom,
            lte: now,
          },
          isDeleted: false,
        },
        select: {
          customerId: true,
        },
        distinct: ['customerId'],
      }),
    ]);

    // Calculate delivery metrics
    const totalDistanceValue = totalDistance._sum.distance || 0;
    const previousTotalDistanceValue = previousTotalDistance._sum.distance || 0;

    // Get financial statistics
    const [
      currentRevenue,
      previousRevenue,
      paymentsByMethod
    ] = await Promise.all([
      // Current period revenue
      prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: dateFrom,
            lte: now,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      // Previous period revenue
      prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: previousDateFrom,
            lte: dateFrom,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      // Payments by method
      prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: dateFrom,
            lte: now,
          },
        },
        _count: true,
        _sum: {
          amount: true,
        },
      }),
    ]);

    // Calculate financial metrics
    const currentRevenueValue = currentRevenue._sum.amount || 0;
    const previousRevenueValue = previousRevenue._sum.amount || 0;
    const revenueChangePercent = previousRevenueValue > 0 
      ? ((currentRevenueValue - previousRevenueValue) / previousRevenueValue) * 100 
      : 100;

    // Format payment methods
    const paymentMethods = paymentsByMethod.map(method => ({
      method: method.paymentMethod,
      count: method._count,
      amount: method._sum.amount || 0,
    }));

    // Calculate growth percentages
    const userGrowthPercent = previousNewUsers > 0 
      ? ((newUsers - previousNewUsers) / previousNewUsers) * 100 
      : 100;
    
    const activeUserChangePercent = previousActiveUsers > 0 
      ? ((activeUsers - previousActiveUsers) / previousActiveUsers) * 100 
      : 100;
    
    const deliveryGrowthPercent = previousCompletedDeliveries > 0 
      ? ((completedDeliveries - previousCompletedDeliveries) / previousCompletedDeliveries) * 100 
      : 100;
    
    const cancellationChangePercent = previousCancelledDeliveries > 0 
      ? ((cancelledDeliveries - previousCancelledDeliveries) / previousCancelledDeliveries) * 100 
      : 0;
    
    const distanceChangePercent = previousTotalDistanceValue > 0 
      ? ((totalDistanceValue - previousTotalDistanceValue) / previousTotalDistanceValue) * 100 
      : 100;

    // Build the response
    return NextResponse.json({
      data: {
        userMetrics: {
          totalUsers,
          newUsers,
          activeUsers,
          userGrowthPercent: parseFloat(userGrowthPercent.toFixed(2)),
          activeUserChangePercent: parseFloat(activeUserChangePercent.toFixed(2)),
        },
        deliveryMetrics: {
          totalDeliveries,
          completedDeliveries,
          cancelledDeliveries,
          activeDeliveries: totalDeliveries - completedDeliveries - cancelledDeliveries,
          totalDistance: totalDistanceValue,
          deliveryGrowthPercent: parseFloat(deliveryGrowthPercent.toFixed(2)),
          cancellationChangePercent: parseFloat(cancellationChangePercent.toFixed(2)),
          distanceChangePercent: parseFloat(distanceChangePercent.toFixed(2)),
          uniqueCustomers: deliveryUsers.length,
        },
        financialMetrics: {
          revenue: currentRevenueValue,
          revenueChangePercent: parseFloat(revenueChangePercent.toFixed(2)),
          averageOrderValue: deliveryUsers.length > 0 
            ? parseFloat((currentRevenueValue / deliveryUsers.length).toFixed(2))
            : 0,
          paymentMethods,
        },
      },
      meta: {
        period,
        dateRange: {
          from: dateFrom,
          to: now,
        },
        previousDateRange: {
          from: previousDateFrom,
          to: dateFrom,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching dashboard analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard analytics" },
      { status: 500 }
    );
  }
} 