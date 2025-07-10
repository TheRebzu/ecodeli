<<<<<<< Updated upstream
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
=======
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';
import { z } from 'zod';
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, subWeeks, startOfDay, endOfDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const analyticsQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']).default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  compare: z.boolean().default(false), // Comparer avec période précédente
  granularity: z.enum(['day', 'week', 'month']).default('day')
});

/**
 * GET - Analytics et statistiques merchant
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un commerçant
    const merchant = await db.merchant.findUnique({
      where: { userId: user.id }
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const query = analyticsQuerySchema.parse({
      period: searchParams.get('period'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      compare: searchParams.get('compare') === 'true',
      granularity: searchParams.get('granularity')
    });

    // Déterminer les dates de la période
    let startDate: Date, endDate: Date;
    let compareStartDate: Date | null = null, compareEndDate: Date | null = null;

    const now = new Date();

    switch (query.period) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        if (query.compare) {
          compareStartDate = startOfDay(subDays(now, 1));
          compareEndDate = endOfDay(subDays(now, 1));
        }
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        if (query.compare) {
          compareStartDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
          compareEndDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        }
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        if (query.compare) {
          compareStartDate = startOfMonth(subMonths(now, 1));
          compareEndDate = endOfMonth(subMonths(now, 1));
        }
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        startDate = quarterStart;
        endDate = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
        if (query.compare) {
          compareStartDate = new Date(quarterStart.getFullYear(), quarterStart.getMonth() - 3, 1);
          compareEndDate = new Date(quarterStart.getFullYear(), quarterStart.getMonth(), 0);
        }
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        if (query.compare) {
          compareStartDate = new Date(now.getFullYear() - 1, 0, 1);
          compareEndDate = new Date(now.getFullYear() - 1, 11, 31);
        }
        break;
      case 'custom':
        if (!query.startDate || !query.endDate) {
          return NextResponse.json({ 
            error: 'startDate et endDate requis pour la période custom' 
          }, { status: 400 });
        }
        startDate = new Date(query.startDate);
        endDate = new Date(query.endDate);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    // Récupérer les données analytiques
    const [
      ordersData,
      announcementsData,
      deliveriesData,
      revenueData,
      compareOrdersData,
      compareAnnouncementsData,
      compareDeliveriesData,
      compareRevenueData
    ] = await Promise.all([
      // Données période actuelle
      getOrdersAnalytics(merchant.id, startDate, endDate),
      getAnnouncementsAnalytics(merchant.id, startDate, endDate),
      getDeliveriesAnalytics(merchant.id, startDate, endDate),
      getRevenueAnalytics(merchant.id, startDate, endDate),
      
      // Données période de comparaison (si demandée)
      query.compare && compareStartDate && compareEndDate 
        ? getOrdersAnalytics(merchant.id, compareStartDate, compareEndDate)
        : Promise.resolve(null),
      query.compare && compareStartDate && compareEndDate
        ? getAnnouncementsAnalytics(merchant.id, compareStartDate, compareEndDate)
        : Promise.resolve(null),
      query.compare && compareStartDate && compareEndDate
        ? getDeliveriesAnalytics(merchant.id, compareStartDate, compareEndDate)
        : Promise.resolve(null),
      query.compare && compareStartDate && compareEndDate
        ? getRevenueAnalytics(merchant.id, compareStartDate, compareEndDate)
        : Promise.resolve(null)
    ]);

    // Calculer les métriques principales
    const metrics = {
      totalOrders: ordersData.total,
      totalAnnouncements: announcementsData.total,
      totalDeliveries: deliveriesData.total,
      totalRevenue: revenueData.total,
      avgOrderValue: ordersData.total > 0 ? revenueData.total / ordersData.total : 0,
      conversionRate: announcementsData.total > 0 ? (deliveriesData.total / announcementsData.total) * 100 : 0,
      
      // Comparaisons (si demandées)
      ...(query.compare && compareOrdersData && compareAnnouncementsData && compareDeliveriesData && compareRevenueData ? {
        ordersGrowth: calculateGrowth(ordersData.total, compareOrdersData.total),
        announcementsGrowth: calculateGrowth(announcementsData.total, compareAnnouncementsData.total),
        deliveriesGrowth: calculateGrowth(deliveriesData.total, compareDeliveriesData.total),
        revenueGrowth: calculateGrowth(revenueData.total, compareRevenueData.total)
      } : {})
    };

    // Données temporelles pour les graphiques
    const timeSeriesData = await getTimeSeriesData(
      merchant.id, 
      startDate, 
      endDate, 
      query.granularity
    );

    // Top performers
    const topPerformers = await getTopPerformers(merchant.id, startDate, endDate);

    // Répartition par type de service
    const serviceBreakdown = await getServiceBreakdown(merchant.id, startDate, endDate);

    // Performance par zone géographique
    const geographicPerformance = await getGeographicPerformance(merchant.id, startDate, endDate);

    return NextResponse.json({
      success: true,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        compare: query.compare,
        ...(query.compare && compareStartDate && compareEndDate ? {
          compareStart: compareStartDate.toISOString(),
          compareEnd: compareEndDate.toISOString()
        } : {})
      },
      metrics,
      timeSeries: timeSeriesData,
      topPerformers,
      serviceBreakdown,
      geographicPerformance,
      rawData: {
        orders: ordersData,
        announcements: announcementsData,
        deliveries: deliveriesData,
        revenue: revenueData
      }
    });

  } catch (error) {
    console.error('Error fetching merchant analytics:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Paramètres analytiques invalides',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Fonctions utilitaires pour les analytics

async function getOrdersAnalytics(merchantId: string, startDate: Date, endDate: Date) {
  const orders = await db.order.findMany({
    where: {
      merchantId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  return {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    totalValue: orders.reduce((sum, o) => sum + o.totalAmount, 0)
  };
}

async function getAnnouncementsAnalytics(merchantId: string, startDate: Date, endDate: Date) {
  const announcements = await db.announcement.findMany({
    where: {
      merchantId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      _count: {
        select: {
          deliveries: true
        }
      }
    }
  });

  return {
    total: announcements.length,
    active: announcements.filter(a => a.status === 'ACTIVE').length,
    completed: announcements.filter(a => a.status === 'COMPLETED').length,
    withDeliveries: announcements.filter(a => a._count.deliveries > 0).length,
    totalValue: announcements.reduce((sum, a) => sum + a.basePrice, 0)
  };
}

async function getDeliveriesAnalytics(merchantId: string, startDate: Date, endDate: Date) {
  const deliveries = await db.delivery.findMany({
    where: {
      announcement: {
        merchantId
      },
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      announcement: true
    }
  });

  return {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'PENDING').length,
    inTransit: deliveries.filter(d => d.status === 'IN_TRANSIT').length,
    delivered: deliveries.filter(d => d.status === 'DELIVERED').length,
    cancelled: deliveries.filter(d => d.status === 'CANCELLED').length,
    totalValue: deliveries.reduce((sum, d) => sum + (d.finalPrice || d.announcement.finalPrice), 0)
  };
}

async function getRevenueAnalytics(merchantId: string, startDate: Date, endDate: Date) {
  const [orders, deliveries] = await Promise.all([
    db.order.findMany({
      where: {
        merchantId,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['COMPLETED', 'DELIVERED']
        }
      }
    }),
    db.delivery.findMany({
      where: {
        announcement: {
          merchantId
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'DELIVERED'
      },
      include: {
        announcement: true
      }
    })
  ]);

  const orderRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const deliveryRevenue = deliveries.reduce((sum, d) => sum + (d.finalPrice || d.announcement.finalPrice), 0);

  return {
    total: orderRevenue + deliveryRevenue,
    orders: orderRevenue,
    deliveries: deliveryRevenue,
    avgOrderValue: orders.length > 0 ? orderRevenue / orders.length : 0,
    avgDeliveryValue: deliveries.length > 0 ? deliveryRevenue / deliveries.length : 0
  };
}

async function getTimeSeriesData(merchantId: string, startDate: Date, endDate: Date, granularity: string) {
  // Récupérer les données groupées par période
  const orders = await db.order.groupBy({
    by: ['createdAt'],
    where: {
      merchantId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    _count: { id: true },
    _sum: { totalAmount: true }
  });

  // Traiter selon la granularité
  // TODO: Implémenter le groupement par jour/semaine/mois
  
  return {
    labels: [], // Dates
    datasets: {
      orders: [], // Nombre de commandes
      revenue: [] // Revenus
    }
  };
}

async function getTopPerformers(merchantId: string, startDate: Date, endDate: Date) {
  // Top annonces par nombre de livraisons
  const topAnnouncements = await db.announcement.findMany({
    where: {
      merchantId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      _count: {
        select: {
          deliveries: true
        }
      }
    },
    orderBy: {
      deliveries: {
        _count: 'desc'
      }
    },
    take: 5
  });

  // Top livreurs par collaborations
  const topDeliverers = await db.delivery.groupBy({
    by: ['delivererId'],
    where: {
      announcement: {
        merchantId
      },
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      status: 'DELIVERED'
    },
    _count: { id: true },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 5
  });

  return {
    announcements: topAnnouncements.map(ann => ({
      id: ann.id,
      title: ann.title,
      deliveriesCount: ann._count.deliveries,
      revenue: ann.finalPrice
    })),
    deliverers: topDeliverers // TODO: Enrichir avec les infos des livreurs
  };
}

async function getServiceBreakdown(merchantId: string, startDate: Date, endDate: Date) {
  const breakdown = await db.announcement.groupBy({
    by: ['type'],
    where: {
      merchantId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    _count: { type: true },
    _sum: { finalPrice: true },
    _avg: { finalPrice: true }
  });

  return breakdown.map(item => ({
    type: item.type,
    count: item._count.type,
    totalRevenue: item._sum.finalPrice || 0,
    avgPrice: item._avg.finalPrice || 0
  }));
}

async function getGeographicPerformance(merchantId: string, startDate: Date, endDate: Date) {
  // Analyser par codes postaux des adresses de livraison
  const deliveries = await db.delivery.findMany({
    where: {
      announcement: {
        merchantId
      },
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      status: 'DELIVERED'
    },
    include: {
      announcement: true
    }
  });

  // Extraire les codes postaux et grouper
  const postalCodeStats: Record<string, { count: number, revenue: number }> = {};
  
  deliveries.forEach(delivery => {
    // Extraire le code postal de l'adresse de livraison
    const postalMatch = delivery.announcement.deliveryAddress.match(/\b\d{5}\b/);
    if (postalMatch) {
      const postalCode = postalMatch[0];
      if (!postalCodeStats[postalCode]) {
        postalCodeStats[postalCode] = { count: 0, revenue: 0 };
      }
      postalCodeStats[postalCode].count++;
      postalCodeStats[postalCode].revenue += delivery.finalPrice || delivery.announcement.finalPrice;
    }
  });

  return Object.entries(postalCodeStats)
    .map(([postalCode, stats]) => ({
      postalCode,
      ...stats
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 zones
}

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
>>>>>>> Stashed changes
} 