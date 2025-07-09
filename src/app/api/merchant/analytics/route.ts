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

    // Fetch merchant's announcements and deliveries
    const [announcements, deliveries, payments, customers] = await Promise.all([
      prisma.announcement.findMany({
        where: {
          authorId: user.id,
          createdAt: { gte: startDate }
        },
        include: {
          deliveries: {
            include: {
              payment: true
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
          announcement: true,
          payment: true
        }
      }),
      prisma.payment.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: startDate }
        }
      }),
      prisma.user.findMany({
        where: {
          role: "CLIENT",
          deliveries: {
            some: {
              announcement: {
                authorId: user.id
              },
              createdAt: { gte: startDate }
            }
          }
        },
        include: {
          deliveries: {
            where: {
              announcement: {
                authorId: user.id
              },
              createdAt: { gte: startDate }
            },
            include: {
              payment: true
            }
          }
        }
      })
    ]);

    // Calculate sales metrics
    const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const monthlyRevenue = payments
      .filter(p => p.createdAt >= new Date(now.getFullYear(), now.getMonth(), 1))
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    // Calculate previous period revenue for growth
    const previousPayments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: previousStartDate, lt: startDate }
      }
    });
    const previousRevenue = previousPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Calculate delivery metrics
    const completedDeliveries = deliveries.filter(d => d.status === "DELIVERED").length;
    const deliverySuccessRate = deliveries.length > 0 ? (completedDeliveries / deliveries.length) * 100 : 0;

    // Calculate customer metrics
    const uniqueCustomers = new Set(customers.map(c => c.id)).size;
    const newCustomers = customers.filter(c => 
      c.createdAt >= startDate
    ).length;

    // Calculate top products (announcements)
    const productRevenue = announcements.reduce((acc, announcement) => {
      const revenue = announcement.deliveries.reduce((sum, delivery) => 
        sum + (delivery.payment ? Number(delivery.payment.amount) : 0), 0
      );
      acc[announcement.title] = {
        name: announcement.title,
        revenue,
        orders: announcement.deliveries.length
      };
      return acc;
    }, {} as Record<string, { name: string; revenue: number; orders: number }>);

    const topProducts = Object.values(productRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate top customers
    const customerRevenue = customers.reduce((acc, customer) => {
      const totalSpent = customer.deliveries.reduce((sum, delivery) => 
        sum + (delivery.payment ? Number(delivery.payment.amount) : 0), 0
      );
      acc[customer.id] = {
        name: customer.profile?.firstName && customer.profile?.lastName 
          ? `${customer.profile.firstName} ${customer.profile.lastName}`
          : customer.email,
        totalSpent,
        orders: customer.deliveries.length
      };
      return acc;
    }, {} as Record<string, { name: string; totalSpent: number; orders: number }>);

    const topCustomers = Object.values(customerRevenue)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Calculate average metrics
    const averageOrderValue = deliveries.length > 0 
      ? totalRevenue / deliveries.length 
      : 0;
    
    const conversionRate = announcements.length > 0 
      ? (deliveries.length / announcements.length) * 100 
      : 0;

    const customerLifetimeValue = uniqueCustomers > 0 
      ? totalRevenue / uniqueCustomers 
      : 0;

    // Calculate delivery zones based on actual delivery addresses
    const deliveryZones = deliveries.reduce((acc, delivery) => {
      const address = delivery.deliveryAddress || delivery.announcement?.deliveryAddress || '';
      const zone = address.includes('Paris') ? 'Paris' : 
                   address.includes('Lyon') ? 'Lyon' :
                   address.includes('Marseille') ? 'Marseille' :
                   address.includes('Lille') ? 'Lille' :
                   address.includes('Montpellier') ? 'Montpellier' :
                   address.includes('Rennes') ? 'Rennes' : 'Autre';
      
      if (!acc[zone]) {
        acc[zone] = { zone, deliveries: 0, revenue: 0 };
      }
      acc[zone].deliveries++;
      acc[zone].revenue += delivery.payment ? Number(delivery.payment.amount) : 0;
      return acc;
    }, {} as Record<string, { zone: string; deliveries: number; revenue: number }>);

    const deliveryZonesArray = Object.values(deliveryZones);

    // Calculate performance metrics based on actual data
    const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const ordersPerDay = daysInPeriod > 0 ? deliveries.length / daysInPeriod : 0;
    const revenuePerDay = daysInPeriod > 0 ? totalRevenue / daysInPeriod : 0;

    // Calculate customer satisfaction from actual reviews
    const reviews = await prisma.review.findMany({
      where: {
        announcement: {
          authorId: user.id
        },
        createdAt: { gte: startDate }
      }
    });

    const customerSatisfaction = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    // Calculate return rate from actual data
    const returnRate = deliveries.length > 0 
      ? (deliveries.filter(d => d.status === 'CANCELLED').length / deliveries.length) * 100 
      : 0;

    // Calculate average delivery time from actual data
    const completedDeliveriesWithTime = deliveries.filter(d => 
      d.status === 'DELIVERED' && d.completedAt && d.createdAt
    );

    const averageDeliveryTime = completedDeliveriesWithTime.length > 0
      ? completedDeliveriesWithTime.reduce((sum, delivery) => {
          const deliveryTime = new Date(delivery.completedAt!).getTime() - new Date(delivery.createdAt).getTime();
          return sum + (deliveryTime / (1000 * 60 * 60)); // Convert to hours
        }, 0) / completedDeliveriesWithTime.length
      : 0;

    const analyticsData = {
      sales: {
        totalRevenue,
        monthlyRevenue,
        revenueGrowth,
        averageOrderValue,
        conversionRate,
        topProducts
      },
      customers: {
        totalCustomers: uniqueCustomers,
        newCustomers,
        repeatCustomers: uniqueCustomers - newCustomers,
        customerLifetimeValue,
        topCustomers
      },
      deliveries: {
        totalDeliveries: deliveries.length,
        completedDeliveries,
        averageDeliveryTime,
        deliverySuccessRate,
        deliveryZones: deliveryZonesArray
      },
      performance: {
        ordersPerDay,
        revenuePerDay,
        customerSatisfaction,
        returnRate
      }
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Error fetching merchant analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 