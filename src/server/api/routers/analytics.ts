import { z } from 'zod';
import { router, adminProcedure, protectedProcedure, merchantProcedure, delivererProcedure, clientProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

export const analyticsRouter = router({
  // Admin dashboard overview statistics
  adminDashboardStats: adminProcedure.query(async () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [
      totalUsers,
      newUsersLastMonth,
      totalDeliverers,
      activeDeliverers,
      totalMerchants,
      activeMerchants,
      totalProviders,
      activeProviders,
      totalAnnouncements,
      completedDeliveries,
      totalRevenue,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // New users in the last 30 days
      prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      
      // Total deliverers
      prisma.user.count({
        where: {
          role: 'DELIVERER',
        },
      }),
      
      // Active deliverers (made at least one delivery in the last 30 days)
      prisma.user.count({
        where: {
          role: 'DELIVERER',
          delivererAnnouncements: {
            some: {
              updatedAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
      }),
      
      // Total merchants
      prisma.user.count({
        where: {
          role: 'MERCHANT',
        },
      }),
      
      // Active merchants
      prisma.user.count({
        where: {
          role: 'MERCHANT',
          stores: {
            some: {
              updatedAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
      }),
      
      // Total service providers
      prisma.user.count({
        where: {
          role: 'PROVIDER',
        },
      }),
      
      // Active service providers
      prisma.user.count({
        where: {
          role: 'PROVIDER',
          services: {
            some: {
              updatedAt: {
                gte: thirtyDaysAgo,
              },
            },
          },
        },
      }),
      
      // Total announcements
      prisma.announcement.count(),
      
      // Completed deliveries
      prisma.delivery.count({
        where: {
          status: 'DELIVERED',
        },
      }),
      
      // Total revenue from payments
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        newLastMonth: newUsersLastMonth,
      },
      deliverers: {
        total: totalDeliverers,
        active: activeDeliverers,
      },
      merchants: {
        total: totalMerchants,
        active: activeMerchants,
      },
      providers: {
        total: totalProviders,
        active: activeProviders,
      },
      announcements: {
        total: totalAnnouncements,
      },
      deliveries: {
        completed: completedDeliveries,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
      },
    };
  }),

  // Monthly revenue chart data
  revenueChartData: adminProcedure.query(async () => {
    const today = new Date();
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setMonth(today.getMonth() - 12);
    
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        amount: true,
        createdAt: true,
        type: true,
      },
    });
    
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(today);
      month.setMonth(today.getMonth() - i);
      month.setDate(1);
      month.setHours(0, 0, 0, 0);
      
      const nextMonth = new Date(month);
      nextMonth.setMonth(month.getMonth() + 1);
      
      const monthPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        return paymentDate >= month && paymentDate < nextMonth;
      });
      
      const total = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      // Group by payment type
      const byType = {
        ANNOUNCEMENT: monthPayments
          .filter(payment => payment.type === 'ANNOUNCEMENT')
          .reduce((sum, payment) => sum + payment.amount, 0),
        SUBSCRIPTION: monthPayments
          .filter(payment => payment.type === 'SUBSCRIPTION')
          .reduce((sum, payment) => sum + payment.amount, 0),
        SERVICE: monthPayments
          .filter(payment => payment.type === 'SERVICE')
          .reduce((sum, payment) => sum + payment.amount, 0),
      };
      
      return {
        month: month.toISOString().substring(0, 7), // YYYY-MM format
        total,
        byType,
      };
    }).reverse(); // Reverse to get oldest month first
    
    return monthlyRevenue;
  }),

  // Deliverer performance statistics
  delivererPerformance: delivererProcedure.query(async ({ ctx }) => {
    const delivererId = ctx.session.user.id;
    
    const [
      totalDeliveries,
      completedDeliveries,
      totalEarnings,
      averageRating,
      deliveriesByMonth
    ] = await Promise.all([
      // Total deliveries
      prisma.announcement.count({
        where: {
          delivererId,
        },
      }),
      
      // Completed deliveries
      prisma.announcement.count({
        where: {
          delivererId,
          status: 'DELIVERED',
        },
      }),
      
      // Total earnings
      prisma.payment.aggregate({
        where: {
          announcement: {
            delivererId,
            status: 'DELIVERED',
          },
          status: 'PAID_TO_DELIVERER',
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Average rating
      prisma.delivery.aggregate({
        where: {
          announcement: {
            delivererId,
          },
          rating: {
            not: null,
          },
        },
        _avg: {
          rating: true,
        },
      }),
      
      // Deliveries by month (last 6 months)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as count,
          SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as completed
        FROM "Announcement"
        WHERE "delivererId" = ${delivererId}
        AND "createdAt" > NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
      `,
    ]);
    
    return {
      totalDeliveries,
      completedDeliveries,
      completionRate: totalDeliveries > 0 
        ? (completedDeliveries / totalDeliveries) * 100 
        : 0,
      totalEarnings: totalEarnings._sum.amount || 0,
      averageRating: averageRating._avg.rating || 0,
      deliveriesByMonth,
    };
  }),

  // Merchant statistics
  merchantStatistics: merchantProcedure.query(async ({ ctx }) => {
    const merchantId = ctx.session.user.id;
    
    const [
      totalAnnouncements,
      completedDeliveries,
      totalSpent,
      storeStats
    ] = await Promise.all([
      // Total announcements
      prisma.announcement.count({
        where: {
          client: {
            stores: {
              some: {
                merchantId,
              },
            },
          },
        },
      }),
      
      // Completed deliveries
      prisma.announcement.count({
        where: {
          client: {
            stores: {
              some: {
                merchantId,
              },
            },
          },
          status: 'DELIVERED',
        },
      }),
      
      // Total spent
      prisma.payment.aggregate({
        where: {
          announcement: {
            client: {
              stores: {
                some: {
                  merchantId,
                },
              },
            },
          },
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Store statistics
      prisma.store.findMany({
        where: {
          merchantId,
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              merchant: {
                select: {
                  clientAnnouncements: true,
                },
              },
            },
          },
        },
      }),
    ]);
    
    return {
      totalAnnouncements,
      completedDeliveries,
      completionRate: totalAnnouncements > 0 
        ? (completedDeliveries / totalAnnouncements) * 100 
        : 0,
      totalSpent: totalSpent._sum.amount || 0,
      stores: storeStats,
    };
  }),

  // Client statistics
  clientStatistics: clientProcedure.query(async ({ ctx }) => {
    const clientId = ctx.session.user.id;
    
    const [
      totalAnnouncements,
      completedDeliveries,
      totalSpent,
      serviceAppointments
    ] = await Promise.all([
      // Total announcements
      prisma.announcement.count({
        where: {
          clientId,
        },
      }),
      
      // Completed deliveries
      prisma.announcement.count({
        where: {
          clientId,
          status: 'DELIVERED',
        },
      }),
      
      // Total spent
      prisma.payment.aggregate({
        where: {
          announcement: {
            clientId,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Service appointments
      prisma.appointment.count({
        where: {
          clientId,
        },
      }),
    ]);
    
    // Get user's subscription plan details if exists
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId: clientId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });
    
    return {
      totalAnnouncements,
      completedDeliveries,
      completionRate: totalAnnouncements > 0 
        ? (completedDeliveries / totalAnnouncements) * 100 
        : 0,
      totalSpent: totalSpent._sum.amount || 0,
      serviceAppointments,
      subscription: clientProfile?.subscription
        ? {
            name: clientProfile.subscription.plan.name,
            status: clientProfile.subscription.status,
            expiresAt: clientProfile.subscription.endDate,
          }
        : null,
    };
  }),

  // Generate PDF report (admin only)
  generateAdminReport: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        includeUserStats: z.boolean().default(true),
        includeFinancialStats: z.boolean().default(true),
        includeDeliveryStats: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const { startDate, endDate, includeUserStats, includeFinancialStats, includeDeliveryStats } = input;
      
      // This would normally generate a PDF report and return a URL
      // For this example, we'll just return the data that would go into the report
      
      const reportData: Record<string, any> = {};
      
      if (includeUserStats) {
        const [
          newUsers,
          activeUsers,
          usersByRole
        ] = await Promise.all([
          // New users in period
          prisma.user.count({
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          }),
          
          // Active users in period
          prisma.user.count({
            where: {
              OR: [
                {
                  clientAnnouncements: {
                    some: {
                      createdAt: {
                        gte: startDate,
                        lte: endDate,
                      },
                    },
                  },
                },
                {
                  delivererAnnouncements: {
                    some: {
                      createdAt: {
                        gte: startDate,
                        lte: endDate,
                      },
                    },
                  },
                },
                {
                  clientAppointments: {
                    some: {
                      createdAt: {
                        gte: startDate,
                        lte: endDate,
                      },
                    },
                  },
                },
                {
                  providerAppointments: {
                    some: {
                      createdAt: {
                        gte: startDate,
                        lte: endDate,
                      },
                    },
                  },
                },
              ],
            },
          }),
          
          // Users by role
          prisma.user.groupBy({
            by: ['role'],
            _count: true,
          }),
        ]);
        
        reportData.userStats = {
          newUsers,
          activeUsers,
          usersByRole: usersByRole.reduce((acc, item) => {
            acc[item.role] = item._count;
            return acc;
          }, {} as Record<string, number>),
        };
      }
      
      if (includeFinancialStats) {
        const [
          totalRevenue,
          revenueByType
        ] = await Promise.all([
          // Total revenue in period
          prisma.payment.aggregate({
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            _sum: {
              amount: true,
            },
          }),
          
          // Revenue by type
          prisma.payment.groupBy({
            by: ['type'],
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            _sum: {
              amount: true,
            },
          }),
        ]);
        
        reportData.financialStats = {
          totalRevenue: totalRevenue._sum.amount || 0,
          revenueByType: revenueByType.reduce((acc, item) => {
            acc[item.type] = item._sum.amount || 0;
            return acc;
          }, {} as Record<string, number>),
        };
      }
      
      if (includeDeliveryStats) {
        const [
          totalAnnouncements,
          announcementsByStatus,
          deliveriesByStatus
        ] = await Promise.all([
          // Total announcements in period
          prisma.announcement.count({
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          }),
          
          // Announcements by status
          prisma.announcement.groupBy({
            by: ['status'],
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            _count: true,
          }),
          
          // Deliveries by status
          prisma.delivery.groupBy({
            by: ['status'],
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            _count: true,
          }),
        ]);
        
        reportData.deliveryStats = {
          totalAnnouncements,
          announcementsByStatus: announcementsByStatus.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {} as Record<string, number>),
          deliveriesByStatus: deliveriesByStatus.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {} as Record<string, number>),
        };
      }
      
      // In a real implementation, this would generate a PDF and return a URL
      return {
        reportUrl: `https://ecodeli.example.com/reports/admin-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.pdf`,
        reportData,
      };
    }),
}); 