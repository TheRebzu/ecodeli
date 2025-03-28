import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DeliveryStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only delivery persons can access this endpoint
    if (session.user.role !== "DELIVERY_PERSON") {
      return NextResponse.json(
        { error: "Access denied. Only delivery persons can access this dashboard." },
        { status: 403 }
      );
    }

    // Find delivery person profile
    const deliveryPerson = await prisma.deliveryPerson.findFirst({
      where: { userId: session.user.id },
    });

    if (!deliveryPerson) {
      return NextResponse.json(
        { error: "Delivery person profile not found" },
        { status: 404 }
      );
    }

    // Get time periods for different stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get delivery statistics
    const [
      totalDeliveries,
      completedDeliveries,
      pendingDeliveries,
      cancelledDeliveries,
      lastMonthDeliveries,
      thisMonthDeliveries,
      todayDeliveries,
      recentDeliveries,
      upcomingDeliveries
    ] = await Promise.all([
      // Total deliveries
      prisma.delivery.count({
        where: {
          deliveryPersonId: deliveryPerson.id,
        },
      }),
      // Completed deliveries
      prisma.delivery.count({
        where: {
          deliveryPersonId: deliveryPerson.id,
          status: DeliveryStatus.DELIVERED,
        },
      }),
      // Pending deliveries
      prisma.delivery.count({
        where: {
          deliveryPersonId: deliveryPerson.id,
          status: {
            in: [
              DeliveryStatus.PENDING,
              DeliveryStatus.ACCEPTED,
              DeliveryStatus.PICKUP_SCHEDULED,
              DeliveryStatus.PICKED_UP,
              DeliveryStatus.IN_TRANSIT
            ],
          },
        },
      }),
      // Cancelled deliveries
      prisma.delivery.count({
        where: {
          deliveryPersonId: deliveryPerson.id,
          status: DeliveryStatus.CANCELLED,
        },
      }),
      // Last month deliveries
      prisma.delivery.count({
        where: {
          deliveryPersonId: deliveryPerson.id,
          createdAt: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
      }),
      // This month deliveries
      prisma.delivery.count({
        where: {
          deliveryPersonId: deliveryPerson.id,
          createdAt: {
            gte: thisMonth,
            lte: now,
          },
        },
      }),
      // Today's deliveries
      prisma.delivery.count({
        where: {
          deliveryPersonId: deliveryPerson.id,
          createdAt: {
            gte: today,
            lte: now,
          },
        },
      }),
      // Recent deliveries
      prisma.delivery.findMany({
        where: {
          deliveryPersonId: deliveryPerson.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        include: {
          customer: {
            select: {
              user: {
                select: {
                  name: true,
                  image: true,
                },
              },
            },
          },
          merchant: {
            select: {
              businessName: true,
              logo: true,
            },
          },
          ratings: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      }),
      // Upcoming deliveries
      prisma.delivery.findMany({
        where: {
          deliveryPersonId: deliveryPerson.id,
          status: {
            in: [
              DeliveryStatus.ACCEPTED,
              DeliveryStatus.PICKUP_SCHEDULED,
              DeliveryStatus.PICKED_UP,
            ],
          },
        },
        orderBy: {
          estimatedDelivery: "asc",
        },
        take: 5,
        include: {
          customer: {
            select: {
              user: {
                select: {
                  name: true,
                  image: true,
                  phone: true,
                },
              },
            },
          },
          merchant: {
            select: {
              businessName: true,
              address: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    // Get earnings statistics
    const [
      totalEarnings,
      lastMonthEarnings,
      thisMonthEarnings,
      pendingPayouts,
      dailyEarnings
    ] = await Promise.all([
      // Total earnings
      prisma.payment.aggregate({
        where: {
          deliveryPersonId: deliveryPerson.id,
          status: "COMPLETED",
        },
        _sum: {
          deliveryFee: true,
          tip: true,
        },
      }),
      // Last month earnings
      prisma.payment.aggregate({
        where: {
          deliveryPersonId: deliveryPerson.id,
          status: "COMPLETED",
          createdAt: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
        _sum: {
          deliveryFee: true,
          tip: true,
        },
      }),
      // This month earnings
      prisma.payment.aggregate({
        where: {
          deliveryPersonId: deliveryPerson.id,
          status: "COMPLETED",
          createdAt: {
            gte: thisMonth,
            lte: now,
          },
        },
        _sum: {
          deliveryFee: true,
          tip: true,
        },
      }),
      // Pending payouts
      prisma.payout.findMany({
        where: {
          deliveryPersonId: deliveryPerson.id,
          status: "PENDING",
        },
        select: {
          amount: true,
          currency: true,
          estimatedArrival: true,
        },
      }),
      // Daily earnings for the last 7 days
      prisma.payment.groupBy({
        by: ["createdAt"],
        where: {
          deliveryPersonId: deliveryPerson.id,
          status: "COMPLETED",
          createdAt: {
            gte: new Date(now.setDate(now.getDate() - 7)),
            lte: new Date(),
          },
        },
        _sum: {
          deliveryFee: true,
          tip: true,
        },
      }),
    ]);

    // Calculate total earnings and growth
    const totalEarningsAmount = 
      (totalEarnings._sum.deliveryFee || 0) + 
      (totalEarnings._sum.tip || 0);
    
    const lastMonthEarningsAmount = 
      (lastMonthEarnings._sum.deliveryFee || 0) + 
      (lastMonthEarnings._sum.tip || 0);
    
    const thisMonthEarningsAmount = 
      (thisMonthEarnings._sum.deliveryFee || 0) + 
      (thisMonthEarnings._sum.tip || 0);

    // Calculate earnings growth
    let earningsGrowth = 0;
    if (lastMonthEarningsAmount > 0) {
      // Adjust for partial month
      const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const currentDayOfMonth = now.getDate();
      const projectedMonthlyEarnings = (thisMonthEarningsAmount / currentDayOfMonth) * daysInCurrentMonth;
      
      earningsGrowth = ((projectedMonthlyEarnings - lastMonthEarningsAmount) / lastMonthEarningsAmount) * 100;
    }

    // Get performance metrics
    const [
      averageRating,
      totalDistance,
      avgDeliveryTime,
      onTimeDeliveries
    ] = await Promise.all([
      // Average rating
      prisma.rating.aggregate({
        where: {
          deliveryId: {
            in: await prisma.delivery.findMany({
              where: {
                deliveryPersonId: deliveryPerson.id,
              },
              select: {
                id: true,
              },
            }).then(deliveries => deliveries.map(d => d.id)),
          },
        },
        _avg: {
          value: true,
        },
      }),
      // Total distance covered
      prisma.delivery.aggregate({
        where: {
          deliveryPersonId: deliveryPerson.id,
          status: DeliveryStatus.DELIVERED,
        },
        _sum: {
          distance: true,
        },
      }),
      // Average delivery time
      prisma.$queryRaw<Array<{ avg_delivery_time: number }>>`
        SELECT AVG(EXTRACT(EPOCH FROM ("actualDelivery" - "pickupDate"))/60) as avg_delivery_time
        FROM "Delivery"
        WHERE "deliveryPersonId" = ${deliveryPerson.id}
          AND "status" = 'DELIVERED'
          AND "actualDelivery" IS NOT NULL
          AND "pickupDate" IS NOT NULL
      `,
      // On-time delivery percentage
      prisma.$queryRaw<Array<{ on_time_percentage: number }>>`
        SELECT 
          CAST(COUNT(*) FILTER (WHERE "actualDelivery" <= "estimatedDelivery") AS FLOAT) / 
          CAST(COUNT(*) AS FLOAT) * 100 as on_time_percentage
        FROM "Delivery"
        WHERE "deliveryPersonId" = ${deliveryPerson.id}
          AND "status" = 'DELIVERED'
          AND "actualDelivery" IS NOT NULL
          AND "estimatedDelivery" IS NOT NULL
      `,
    ]);

    // Get wallet balance
    const wallet = await prisma.wallet.findFirst({
      where: {
        deliveryPersonId: deliveryPerson.id,
      },
      select: {
        balance: true,
        currency: true,
      },
    });

    // Process daily earnings
    const dailyEarningsData = new Map();
    const last7Days = [];
    
    // Initialize the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateString = date.toISOString().split('T')[0];
      dailyEarningsData.set(dateString, 0);
      last7Days.push(dateString);
    }
    
    // Fill in actual earnings
    dailyEarnings.forEach(day => {
      const dateString = new Date(day.createdAt).toISOString().split('T')[0];
      const amount = (day._sum.deliveryFee || 0) + (day._sum.tip || 0);
      if (dailyEarningsData.has(dateString)) {
        dailyEarningsData.set(dateString, (dailyEarningsData.get(dateString) || 0) + amount);
      }
    });
    
    // Convert to array for response
    const dailyEarningsArray = last7Days.map(date => ({
      date,
      amount: dailyEarningsData.get(date) || 0,
    }));

    // Return dashboard data
    return NextResponse.json({
      data: {
        deliveries: {
          total: totalDeliveries,
          completed: completedDeliveries,
          pending: pendingDeliveries,
          cancelled: cancelledDeliveries,
          completionRate: totalDeliveries > 0 
            ? Math.round((completedDeliveries / totalDeliveries) * 100) 
            : 0,
          today: todayDeliveries,
          thisMonth: thisMonthDeliveries,
          lastMonth: lastMonthDeliveries,
          monthlyGrowth: lastMonthDeliveries > 0 
            ? Math.round(((thisMonthDeliveries - lastMonthDeliveries) / lastMonthDeliveries) * 100) 
            : 0,
          recent: recentDeliveries.map(delivery => ({
            id: delivery.id,
            status: delivery.status,
            trackingNumber: delivery.trackingNumber,
            createdAt: delivery.createdAt,
            estimatedDelivery: delivery.estimatedDelivery,
            customerName: delivery.customer?.user?.name || 'N/A',
            customerImage: delivery.customer?.user?.image,
            merchantName: delivery.merchant?.businessName,
            merchantLogo: delivery.merchant?.logo,
            rating: delivery.ratings[0]?.value || null,
          })),
          upcoming: upcomingDeliveries.map(delivery => ({
            id: delivery.id,
            status: delivery.status,
            trackingNumber: delivery.trackingNumber,
            pickupAddress: delivery.pickupAddress,
            deliveryAddress: delivery.deliveryAddress,
            estimatedDelivery: delivery.estimatedDelivery,
            customerName: delivery.customer?.user?.name || 'N/A',
            customerPhone: delivery.customer?.user?.phone,
            merchantName: delivery.merchant?.businessName,
            merchantAddress: delivery.merchant?.address,
            merchantPhone: delivery.merchant?.phone,
          })),
        },
        earnings: {
          total: totalEarningsAmount,
          thisMonth: thisMonthEarningsAmount,
          lastMonth: lastMonthEarningsAmount,
          growth: Math.round(earningsGrowth * 100) / 100,
          pendingPayouts: pendingPayouts.map(payout => ({
            amount: payout.amount,
            currency: payout.currency,
            estimatedArrival: payout.estimatedArrival,
          })),
          wallet: wallet ? {
            balance: wallet.balance,
            currency: wallet.currency,
          } : { balance: 0, currency: 'USD' },
          daily: dailyEarningsArray,
        },
        performance: {
          rating: Math.round((averageRating._avg.value || 0) * 10) / 10,
          totalDistance: Math.round((totalDistance._sum.distance || 0) * 10) / 10,
          avgDeliveryTime: Math.round(avgDeliveryTime[0]?.avg_delivery_time || 0),
          onTimePercentage: Math.round(onTimeDeliveries[0]?.on_time_percentage || 0),
          stats: {
            deliveriesPerDay: totalDeliveries > 0 
              ? Math.round((totalDeliveries / (deliveryPerson.daysActive || 1)) * 10) / 10 
              : 0,
            avgEarningsPerDelivery: completedDeliveries > 0 
              ? Math.round((totalEarningsAmount / completedDeliveries) * 100) / 100 
              : 0,
          },
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching delivery person dashboard:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
} 