import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ServiceStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only service providers can access this endpoint
    if (session.user.role !== "SERVICE_PROVIDER") {
      return NextResponse.json(
        { error: "Access denied. Only service providers can access this dashboard." },
        { status: 403 }
      );
    }

    // Find service provider profile
    const serviceProvider = await prisma.serviceProvider.findFirst({
      where: { userId: session.user.id },
    });

    if (!serviceProvider) {
      return NextResponse.json(
        { error: "Service provider profile not found" },
        { status: 404 }
      );
    }

    // Get time periods for different stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get service statistics
    const [
      totalServices,
      completedServices,
      pendingServices,
      cancelledServices,
      lastMonthServices,
      thisMonthServices,
      todayServices,
      recentServices
    ] = await Promise.all([
      // Total services
      prisma.service.count({
        where: {
          serviceProviderId: serviceProvider.id,
        },
      }),
      // Completed services
      prisma.service.count({
        where: {
          serviceProviderId: serviceProvider.id,
          status: ServiceStatus.COMPLETED,
        },
      }),
      // Pending services
      prisma.service.count({
        where: {
          serviceProviderId: serviceProvider.id,
          status: {
            in: [ServiceStatus.PENDING, ServiceStatus.ACCEPTED, ServiceStatus.IN_PROGRESS],
          },
        },
      }),
      // Cancelled services
      prisma.service.count({
        where: {
          serviceProviderId: serviceProvider.id,
          status: ServiceStatus.CANCELLED,
        },
      }),
      // Last month services
      prisma.service.count({
        where: {
          serviceProviderId: serviceProvider.id,
          createdAt: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
      }),
      // This month services
      prisma.service.count({
        where: {
          serviceProviderId: serviceProvider.id,
          createdAt: {
            gte: thisMonth,
            lte: now,
          },
        },
      }),
      // Today's services
      prisma.service.count({
        where: {
          serviceProviderId: serviceProvider.id,
          createdAt: {
            gte: today,
            lte: now,
          },
        },
      }),
      // Recent services
      prisma.service.findMany({
        where: {
          serviceProviderId: serviceProvider.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        include: {
          customer: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                  image: true,
                  phone: true,
                },
              },
            },
          },
          serviceType: {
            select: {
              name: true,
              icon: true,
            },
          },
          ratings: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
            select: {
              value: true,
              comment: true,
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
          serviceProviderId: serviceProvider.id,
          status: "COMPLETED",
        },
        _sum: {
          amount: true,
          serviceFee: true,
          tip: true,
        },
      }),
      // Last month earnings
      prisma.payment.aggregate({
        where: {
          serviceProviderId: serviceProvider.id,
          status: "COMPLETED",
          createdAt: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
        _sum: {
          amount: true,
          serviceFee: true,
          tip: true,
        },
      }),
      // This month earnings
      prisma.payment.aggregate({
        where: {
          serviceProviderId: serviceProvider.id,
          status: "COMPLETED",
          createdAt: {
            gte: thisMonth,
            lte: now,
          },
        },
        _sum: {
          amount: true,
          serviceFee: true,
          tip: true,
        },
      }),
      // Pending payouts
      prisma.payout.findMany({
        where: {
          serviceProviderId: serviceProvider.id,
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
          serviceProviderId: serviceProvider.id,
          status: "COMPLETED",
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
            lte: now,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    // Calculate total earnings and growth
    const totalEarningsAmount = 
      (totalEarnings._sum.amount || 0) + 
      (totalEarnings._sum.serviceFee || 0) + 
      (totalEarnings._sum.tip || 0);
    
    const lastMonthEarningsAmount = 
      (lastMonthEarnings._sum.amount || 0) + 
      (lastMonthEarnings._sum.serviceFee || 0) + 
      (lastMonthEarnings._sum.tip || 0);
    
    const thisMonthEarningsAmount = 
      (thisMonthEarnings._sum.amount || 0) + 
      (thisMonthEarnings._sum.serviceFee || 0) + 
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
      totalServiceTime,
      numRatings,
      topServiceTypes
    ] = await Promise.all([
      // Average rating
      prisma.rating.aggregate({
        where: {
          serviceId: {
            in: await prisma.service.findMany({
              where: {
                serviceProviderId: serviceProvider.id,
              },
              select: {
                id: true,
              },
            }).then(services => services.map(s => s.id)),
          },
        },
        _avg: {
          value: true,
        },
        _count: true,
      }),
      // Total service time
      prisma.service.aggregate({
        where: {
          serviceProviderId: serviceProvider.id,
          status: ServiceStatus.COMPLETED,
          completedAt: {
            not: null,
          },
          startedAt: {
            not: null,
          },
        },
        _sum: {
          duration: true,
        },
      }),
      // Number of ratings
      prisma.rating.count({
        where: {
          serviceId: {
            in: await prisma.service.findMany({
              where: {
                serviceProviderId: serviceProvider.id,
              },
              select: {
                id: true,
              },
            }).then(services => services.map(s => s.id)),
          },
        },
      }),
      // Top service types
      prisma.$queryRaw<Array<{ serviceTypeId: string, serviceTypeName: string, count: number, revenue: number }>>`
        SELECT 
          st.id as "serviceTypeId", 
          st.name as "serviceTypeName", 
          COUNT(s.id) as "count",
          SUM(p.amount) as "revenue"
        FROM 
          "Service" s
        JOIN 
          "ServiceType" st ON s."serviceTypeId" = st.id
        LEFT JOIN 
          "Payment" p ON s.id = p."serviceId" AND p.status = 'COMPLETED'
        WHERE 
          s."serviceProviderId" = ${serviceProvider.id}
          AND s.status = 'COMPLETED'
        GROUP BY 
          st.id, st.name
        ORDER BY 
          "count" DESC
        LIMIT 5
      `,
    ]);

    // Get wallet balance
    const wallet = await prisma.wallet.findFirst({
      where: {
        serviceProviderId: serviceProvider.id,
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
      const amount = day._sum.amount || 0;
      if (dailyEarningsData.has(dateString)) {
        dailyEarningsData.set(dateString, (dailyEarningsData.get(dateString) || 0) + amount);
      }
    });
    
    // Convert to array for response
    const dailyEarningsArray = last7Days.map(date => ({
      date,
      amount: dailyEarningsData.get(date) || 0,
    }));

    // Get upcoming services
    const upcomingServices = await prisma.service.findMany({
      where: {
        serviceProviderId: serviceProvider.id,
        status: {
          in: [ServiceStatus.ACCEPTED, ServiceStatus.PENDING],
        },
        scheduledDate: {
          gte: today,
        },
      },
      orderBy: {
        scheduledDate: "asc",
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
        serviceType: {
          select: {
            name: true,
            icon: true,
          },
        },
      },
    });

    // Return dashboard data
    return NextResponse.json({
      data: {
        services: {
          total: totalServices,
          completed: completedServices,
          pending: pendingServices,
          cancelled: cancelledServices,
          completionRate: totalServices > 0 
            ? Math.round((completedServices / totalServices) * 100) 
            : 0,
          today: todayServices,
          thisMonth: thisMonthServices,
          lastMonth: lastMonthServices,
          monthlyGrowth: lastMonthServices > 0 
            ? Math.round(((thisMonthServices - lastMonthServices) / lastMonthServices) * 100) 
            : 0,
          recent: recentServices.map(service => ({
            id: service.id,
            status: service.status,
            createdAt: service.createdAt,
            scheduledDate: service.scheduledDate,
            scheduledTime: service.scheduledTime,
            price: service.price,
            serviceType: service.serviceType.name,
            serviceTypeIcon: service.serviceType.icon,
            description: service.description,
            location: service.location,
            customerName: service.customer?.user?.name || 'N/A',
            customerImage: service.customer?.user?.image,
            customerPhone: service.customer?.user?.phone,
            rating: service.ratings[0]?.value || null,
            comment: service.ratings[0]?.comment || null,
          })),
          upcoming: upcomingServices.map(service => ({
            id: service.id,
            status: service.status,
            scheduledDate: service.scheduledDate,
            scheduledTime: service.scheduledTime,
            price: service.price,
            serviceType: service.serviceType.name,
            serviceTypeIcon: service.serviceType.icon,
            description: service.description,
            location: service.location,
            customerName: service.customer?.user?.name || 'N/A',
            customerImage: service.customer?.user?.image,
            customerPhone: service.customer?.user?.phone,
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
          totalRatings: numRatings,
          ratingCount: averageRating._count || 0,
          totalServiceHours: Math.round(((totalServiceTime._sum.duration || 0) / 60) * 10) / 10,
          topServiceTypes: topServiceTypes.map(type => ({
            id: type.serviceTypeId,
            name: type.serviceTypeName,
            count: type.count,
            revenue: type.revenue,
          })),
          stats: {
            servicesPerDay: totalServices > 0 
              ? Math.round((totalServices / (serviceProvider.daysActive || 1)) * 10) / 10 
              : 0,
            avgEarningsPerService: completedServices > 0 
              ? Math.round((totalEarningsAmount / completedServices) * 100) / 100 
              : 0,
          },
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching service provider dashboard:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
} 

  return results;
} 