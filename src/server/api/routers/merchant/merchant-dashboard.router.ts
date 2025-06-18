import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { subDays, startOfDay, endOfDay, subMonths, format } from "date-fns";

export const merchantDashboardRouter = router({
  /**
   * Récupère les statistiques du dashboard merchant
   */
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "MERCHANT") {
      throw new TRPCError({ 
        code: "FORBIDDEN",
        message: "Accès réservé aux marchands" 
      });
    }

    const merchantId = ctx.session.user.id;
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Revenus du jour
    const dailyRevenue = await ctx.db.payment.aggregate({
      where: {
        userId: merchantId,
        status: "COMPLETED",
        createdAt: {
          gte: startOfToday,
          lte: endOfToday
        }
      },
      _sum: { 
        amount: true 
      }
    });

    // Revenus du mois
    const monthlyRevenue = await ctx.db.payment.aggregate({
      where: {
        userId: merchantId,
        status: "COMPLETED",
        createdAt: { 
          gte: startOfCurrentMonth
        }
      },
      _sum: { 
        amount: true 
      }
    });

    // Commandes du jour
    const orderCount = await ctx.db.order.count({
      where: {
        merchantId,
        createdAt: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    });

    // Livraisons actives
    const activeDeliveries = await ctx.db.delivery.count({
      where: {
        announcement: { 
          clientId: merchantId 
        },
        status: {
          in: ["PENDING", "ASSIGNED", "IN_PROGRESS"]
        }
      }
    });

    // Articles en stock faible
    const lowStockItems = await ctx.db.product.count({
      where: {
        merchantId,
        stockQuantity: {
          lt: 10 // Seuil de stock faible
        }
      }
    });

    // Nombre total d'annonces pour calculer le taux de conversion
    const totalAnnouncements = await ctx.db.announcement.count({
      where: { 
        clientId: merchantId 
      }
    });

    // Statut de vérification du marchand
    const merchantInfo = await ctx.db.merchant.findUnique({
      where: { 
        userId: merchantId 
      },
      select: { 
        isVerified: true,
        verificationStatus: true 
      }
    });

    // Panier moyen
    const avgOrderValue = await ctx.db.order.aggregate({
      where: {
        merchantId,
        status: "COMPLETED",
        createdAt: { 
          gte: startOfCurrentMonth
        }
      },
      _avg: { 
        total: true 
      }
    });

    // Note moyenne de satisfaction
    const customerSatisfaction = await ctx.db.merchantReview.aggregate({
      where: {
        merchantId
      },
      _avg: { 
        rating: true 
      }
    });

    return {
      dailyRevenue: dailyRevenue._sum.amount || 0,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      orderCount,
      activeDeliveries,
      lowStockItems,
      averageOrderValue: avgOrderValue._avg.total || 0,
      customerSatisfaction: customerSatisfaction._avg.rating || 0,
      
      // Calcul réel du taux de conversion (annonces créées vs commandes créées)
      conversionRate: totalAnnouncements > 0 ? Math.round((orderCount / totalAnnouncements) * 100) : 0,
      
      // Statut de vérification
      isVerified: merchantInfo?.isVerified || false,
      verificationStatus: merchantInfo?.verificationStatus || 'PENDING'
    };
  }),

  /**
   * Récupère les commandes récentes
   */
  getRecentOrders: protectedProcedure
    .input(
      z.object({ 
        limit: z.number().optional().default(10) 
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "MERCHANT") {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "Accès réservé aux marchands" 
        });
      }

      const merchantId = ctx.session.user.id;

      return await ctx.db.order.findMany({
        where: {
          merchantId
        },
        include: {
          customer: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              },
              email: true
            }
          },
          items: {
            include: {
              product: {
                select: { 
                  name: true 
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: input.limit
      });
    }),

  /**
   * Récupère les alertes de stock
   */
  getStockAlerts: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "MERCHANT") {
      throw new TRPCError({ 
        code: "FORBIDDEN",
        message: "Accès réservé aux marchands" 
      });
    }

    const merchantId = ctx.session.user.id;

    const lowStockProducts = await ctx.db.product.findMany({
      where: {
        merchantId,
        stockQuantity: {
          lt: 10 // Seuil de stock faible
        }
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        minimumStock: true,
        category: {
          select: { 
            name: true 
          }
        }
      }
    });

    return lowStockProducts.map((product) => ({
      id: product.id,
      productName: product.name,
      currentStock: product.stockQuantity,
      minimumStock: product.minimumStock,
      category: product.category?.name || "Non catégorisé"
    }));
  }),

  /**
   * Récupère les données pour le graphique des ventes
   */
  getSalesChart: protectedProcedure
    .input(
      z.object({ 
        period: z.enum(["week", "month", "quarter"]).default("week") 
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "MERCHANT") {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "Accès réservé aux marchands" 
        });
      }

      const merchantId = ctx.session.user.id;
      const today = new Date();

      let startDate: Date;
      let days: number;

      switch (input.period) {
        case "week":
          days = 7;
          startDate = subDays(today, 7);
          break;
        case "month":
          days = 30;
          startDate = subDays(today, 30);
          break;
        case "quarter":
          days = 90;
          startDate = subDays(today, 90);
          break;
      }

      // Générer les données pour chaque jour
      const chartData = await Promise.all(
        Array.from({ length: days }, async (_, i) => {
          const date = subDays(today, days - 1 - i);
          const startOfDate = startOfDay(date);
          const endOfDate = endOfDay(date);

          const revenue = await ctx.db.payment.aggregate({
            where: {
              userId: merchantId,
              status: "COMPLETED",
              createdAt: {
                gte: startOfDate,
                lte: endOfDate
              }
            },
            _sum: { 
              amount: true 
            }
          });

          const orders = await ctx.db.order.count({
            where: {
              merchantId,
              createdAt: {
                gte: startOfDate,
                lte: endOfDate
              }
            }
          });

          return {
            date: format(date, "MM/dd"),
            revenue: revenue._sum.amount || 0,
            orders
          };
        })
      );

      return chartData;
    }),

  /**
   * Récupère les commandes par statut pour les métriques
   */
  getOrdersByStatus: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "MERCHANT") {
      throw new TRPCError({ 
        code: "FORBIDDEN",
        message: "Accès réservé aux marchands" 
      });
    }

    const merchantId = ctx.session.user.id;

    const orderStats = await ctx.db.order.groupBy({
      by: ["status"],
      where: {
        merchantId
      },
      _count: { 
        id: true 
      }
    });

    return orderStats.map((stat) => ({
      status: stat.status,
      count: stat._count.id
    }));
  }),

  /**
   * Récupère les produits les plus vendus
   */
  getTopProducts: protectedProcedure
    .input(
      z.object({ 
        limit: z.number().optional().default(5),
        period: z.enum(["week", "month", "quarter"]).default("month") 
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "MERCHANT") {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "Accès réservé aux marchands" 
        });
      }

      const merchantId = ctx.session.user.id;
      let startDate: Date;

      switch (input.period) {
        case "week":
          startDate = subDays(new Date(), 7);
          break;
        case "month":
          startDate = subMonths(new Date(), 1);
          break;
        case "quarter":
          startDate = subMonths(new Date(), 3);
          break;
      }

      const topProducts = await ctx.db.orderItem.groupBy({
        by: ["productId"],
        where: {
          product: {
            merchantId
          },
          order: {
            createdAt: {
              gte: startDate
            }
          }
        },
        _sum: {
          quantity: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            quantity: "desc"
          }
        },
        take: input.limit
      });

      // Récupérer les détails des produits
      const productDetails = await Promise.all(
        topProducts.map(async (item) => {
          const product = await ctx.db.product.findUnique({
            where: { id: item.productId },
            select: {
              name: true,
              price: true,
              category: {
                select: {
                  name: true
                }
              }
            }
          });

          return {
            productId: item.productId,
            name: product?.name || "Produit inconnu",
            category: product?.category?.name || "Non catégorisé",
            totalSold: item._sum.quantity || 0,
            orderCount: item._count.id,
            price: product?.price || 0
          };
        })
      );

      return productDetails;
    })
});
