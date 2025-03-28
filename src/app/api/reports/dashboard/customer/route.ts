import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only customers can access this endpoint
    if (session.user.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Access denied. Only customers can access this dashboard." },
        { status: 403 }
      );
    }

    // Find customer profile
    const customer = await prisma.customer.findFirst({
      where: { userId: session.user.id },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer profile not found" },
        { status: 404 }
      );
    }

    // Get time periods for different stats
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Get order statistics
    const [
      orderCount,
      lastMonthOrderCount,
      pendingOrderCount,
      totalSpent,
      lastMonthSpent,
      recentOrders,
    ] = await Promise.all([
      // Total order count
      prisma.cartDrop.count({
        where: {
          customerId: customer.id,
        },
      }),
      // Last month order count
      prisma.cartDrop.count({
        where: {
          customerId: customer.id,
          orderDate: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
      }),
      // Pending order count
      prisma.cartDrop.count({
        where: {
          customerId: customer.id,
          status: {
            in: ["PENDING", "PROCESSING"],
          },
        },
      }),
      // Total spent
      prisma.payment.aggregate({
        where: {
          customerId: customer.id,
          status: "COMPLETED",
        },
        _sum: {
          amount: true,
        },
      }),
      // Last month spent
      prisma.payment.aggregate({
        where: {
          customerId: customer.id,
          status: "COMPLETED",
          createdAt: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      // Recent orders
      prisma.cartDrop.findMany({
        where: {
          customerId: customer.id,
        },
        orderBy: {
          orderDate: "desc",
        },
        take: 5,
        include: {
          merchant: {
            select: {
              businessName: true,
              logo: true,
            },
          },
          delivery: {
            select: {
              status: true,
              estimatedDelivery: true,
              trackingNumber: true,
            },
          },
        },
      }),
    ]);

    // Get delivery statistics
    const [
      deliveryCount,
      lastMonthDeliveryCount,
      pendingDeliveryCount,
      completedDeliveryCount,
      recentDeliveries,
    ] = await Promise.all([
      // Total delivery count
      prisma.delivery.count({
        where: {
          customerId: customer.id,
        },
      }),
      // Last month delivery count
      prisma.delivery.count({
        where: {
          customerId: customer.id,
          createdAt: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
      }),
      // Pending delivery count
      prisma.delivery.count({
        where: {
          customerId: customer.id,
          status: {
            in: ["PENDING", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT"],
          },
        },
      }),
      // Completed delivery count
      prisma.delivery.count({
        where: {
          customerId: customer.id,
          status: "DELIVERED",
        },
      }),
      // Recent deliveries
      prisma.delivery.findMany({
        where: {
          customerId: customer.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        include: {
          deliveryPerson: {
            select: {
              user: {
                select: {
                  name: true,
                  image: true,
                },
              },
              rating: true,
            },
          },
        },
      }),
    ]);

    // Calculate order growth
    let orderGrowth = 0;
    if (lastMonthOrderCount > 0) {
      // Compare current month to last month
      const currentMonthOrders = await prisma.cartDrop.count({
        where: {
          customerId: customer.id,
          orderDate: {
            gte: thisMonth,
            lte: now,
          },
        },
      });
      
      // Adjust for days in month for fair comparison
      const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentDayOfMonth = now.getDate();
      const projectedMonthlyOrders = (currentMonthOrders / currentDayOfMonth) * daysInCurrentMonth;
      
      orderGrowth = ((projectedMonthlyOrders - lastMonthOrderCount) / lastMonthOrderCount) * 100;
    }

    // Calculate spend growth
    const thisMonthSpent = await prisma.payment.aggregate({
      where: {
        customerId: customer.id,
        status: "COMPLETED",
        createdAt: {
          gte: thisMonth,
          lte: now,
        },
      },
      _sum: {
        amount: true,
      },
    });

    let spendGrowth = 0;
    const lastMonthTotalSpent = lastMonthSpent._sum.amount || 0;
    if (lastMonthTotalSpent > 0) {
      const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentDayOfMonth = now.getDate();
      const projectedMonthlySpend = ((thisMonthSpent._sum.amount || 0) / currentDayOfMonth) * daysInCurrentMonth;
      
      spendGrowth = ((projectedMonthlySpend - lastMonthTotalSpent) / lastMonthTotalSpent) * 100;
    }

    // Get wallet balance
    const wallet = await prisma.wallet.findFirst({
      where: {
        customerId: customer.id,
      },
      select: {
        balance: true,
        currency: true,
      },
    });

    // Get payment methods
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: {
        customerId: customer.id,
        isActive: true,
      },
      select: {
        id: true,
        type: true,
        lastFourDigits: true,
        expiryDate: true,
        isDefault: true,
      },
    });

    // Get monthly spending trend (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlySpending = await prisma.$queryRaw<Array<{ month: string, total: number }>>`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM(amount) as total
      FROM 
        "Payment"
      WHERE 
        "customerId" = ${customer.id}
        AND status = 'COMPLETED'
        AND "createdAt" >= ${sixMonthsAgo}
      GROUP BY 
        DATE_TRUNC('month', "createdAt")
      ORDER BY 
        month ASC
    `;

    // Return dashboard data
    return NextResponse.json({
      data: {
        orders: {
          total: orderCount,
          pending: pendingOrderCount,
          lastMonth: lastMonthOrderCount,
          growth: Math.round(orderGrowth * 100) / 100,
          recent: recentOrders.map(order => ({
            id: order.id,
            reference: order.orderReference,
            date: order.orderDate,
            status: order.status,
            merchantName: order.merchant.businessName,
            merchantLogo: order.merchant.logo,
            deliveryStatus: order.delivery?.status || 'N/A',
            estimatedDelivery: order.delivery?.estimatedDelivery,
            trackingNumber: order.delivery?.trackingNumber,
          })),
        },
        deliveries: {
          total: deliveryCount,
          pending: pendingDeliveryCount,
          completed: completedDeliveryCount,
          lastMonth: lastMonthDeliveryCount,
          recent: recentDeliveries.map(delivery => ({
            id: delivery.id,
            status: delivery.status,
            trackingNumber: delivery.trackingNumber,
            createdAt: delivery.createdAt,
            estimatedDelivery: delivery.estimatedDelivery,
            deliveryPersonName: delivery.deliveryPerson?.user?.name || 'N/A',
            deliveryPersonImage: delivery.deliveryPerson?.user?.image,
            deliveryPersonRating: delivery.deliveryPerson?.rating || 0,
          })),
        },
        payments: {
          totalSpent: totalSpent._sum.amount || 0,
          lastMonthSpent: lastMonthSpent._sum.amount || 0,
          spendGrowth: Math.round(spendGrowth * 100) / 100,
          wallet: wallet ? {
            balance: wallet.balance,
            currency: wallet.currency,
          } : { balance: 0, currency: 'USD' },
          paymentMethods: paymentMethods.map(method => ({
            id: method.id,
            type: method.type,
            lastFourDigits: method.lastFourDigits,
            expiryDate: method.expiryDate,
            isDefault: method.isDefault,
          })),
          monthlyTrend: monthlySpending.map(item => ({
            month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            total: item.total,
          })),
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching customer dashboard:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
} 