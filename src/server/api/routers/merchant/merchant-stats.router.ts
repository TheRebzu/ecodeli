import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Router pour les statistiques et analytics des commerçants
 * Tableau de bord complet avec métriques de performance
 */

// Schémas de validation
const statsFiltersSchema = z.object({ period: z.enum(["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"]).default("MONTH"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  compareWithPrevious: z.boolean().default(false) });

const productStatsSchema = z.object({ period: z.enum(["WEEK", "MONTH", "QUARTER", "YEAR"]).default("MONTH"),
  sortBy: z.enum(["sales", "revenue", "views", "conversions"]).default("sales"),
  limit: z.number().min(1).max(100).default(20) });

const customerStatsSchema = z.object({ period: z.enum(["MONTH", "QUARTER", "YEAR"]).default("MONTH"),
  segment: z.enum(["ALL", "NEW", "RETURNING", "VIP"]).default("ALL"),
  city: z.string().optional() });

export const merchantStatsRouter = router({ /**
   * Obtenir les statistiques générales du tableau de bord
   */
  getDashboardStats: protectedProcedure
    .input(statsFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent consulter leurs statistiques" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        // Calculer les dates de période
        const { startDate, endDate, previousStartDate, previousEndDate } =
          calculatePeriodDates(input);

        // Statistiques principales
        const [
          currentStats,
          previousStats,
          topProducts,
          recentOrders,
          pendingOrdersCount] = await Promise.all([
          // Statistiques période actuelle
          getBasicStats(ctx.db, merchant.id, startDate, endDate),

          // Statistiques période précédente (pour comparaison)
          input.compareWithPrevious
            ? getBasicStats(
                ctx.db,
                merchant.id,
                previousStartDate!,
                previousEndDate!,
              )
            : null,

          // Top 5 produits les plus vendus
          ctx.db.orderItem.groupBy({
            by: ["productId"],
            where: {
              product: { merchantId: merchant.id },
              order: {
                status: { in: ["COMPLETED", "DELIVERED"] },
                createdAt: { gte: startDate, lte: endDate }}},
            sum: { quantity: true, price: true },
            orderBy: { sum: { quantity: "desc" } },
            take: 5}),

          // Commandes récentes
          ctx.db.order.findMany({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: startDate, lte: endDate }},
            include: {
              client: {
                select: { name: true, email: true }}},
            orderBy: { createdAt: "desc" },
            take: 10}),

          // Commandes en attente
          ctx.db.order.count({
            where: {
              merchantId: merchant.id,
              status: { in: ["PENDING", "CONFIRMED", "PREPARING"] }}})]);

        // Calculer les comparaisons si demandées
        const comparisons =
          input.compareWithPrevious && previousStats
            ? {
                revenue: calculateGrowthRate(
                  currentStats.revenue,
                  previousStats.revenue,
                ),
                orders: calculateGrowthRate(
                  currentStats.totalOrders,
                  previousStats.totalOrders,
                ),
                customers: calculateGrowthRate(
                  currentStats.uniqueCustomers,
                  previousStats.uniqueCustomers,
                ),
                averageOrder: calculateGrowthRate(
                  currentStats.averageOrderValue,
                  previousStats.averageOrderValue,
                )}
            : null;

        // Enrichir les données des top produits
        const enrichedTopProducts = await Promise.all(
          topProducts.map(async (item) => {
            const product = await ctx.db.product.findUnique({
              where: { id: item.productId },
              select: { name: true, images: true, price: true }});

            return {
              ...product,
              quantity: item.sum.quantity || 0,
              revenue: item.sum.price || 0};
          }),
        );

        return {
          success: true,
          data: {
            period: {
              type: input.period,
              startDate,
              endDate},
            overview: {
              ...currentStats,
              pendingOrders: pendingOrdersCount,
              fulfillmentRate:
                currentStats.totalOrders > 0
                  ? (currentStats.completedOrders / currentStats.totalOrders) *
                    100
                  : 0,
              returnRate:
                currentStats.totalOrders > 0
                  ? (currentStats.returnedOrders / currentStats.totalOrders) *
                    100
                  : 0},
            comparisons,
            topProducts: enrichedTopProducts,
            recentActivity: recentOrders.map((order) => ({ id: order.id,
              status: order.status,
              amount: order.totalAmount,
              customer: order.client?.name || "Client anonyme",
              createdAt: order.createdAt }))}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques" });
      }
    }),

  /**
   * Obtenir les statistiques détaillées des ventes
   */
  getSalesStats: protectedProcedure
    .input(statsFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const { startDate: startDate, endDate: endDate } =
          calculatePeriodDates(input);

        // Données de ventes par jour/semaine/mois selon la période
        const interval = getTimeInterval(input.period);
        const salesTimeline = (await ctx.db.$queryRaw`
          SELECT 
            DATE_TRUNC(${interval}, createdat) as period,
            COUNT(*)::int as orders_count,
            COALESCE(SUM(totalamount), 0)::float as revenue,
            COALESCE(AVG(totalamount), 0)::float as avg_order_value
          FROM orders 
          WHERE merchant_id = ${merchant.id}
            AND status IN ('COMPLETED', 'DELIVERED')
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY DATE_TRUNC(${interval}, createdat)
          ORDER BY period ASC
        `) as Array<{
          period: Date;
          orders_count: number;
          revenue: number;
          avg_order_value: number;
        }>;

        // Ventes par catégorie
        const salesByCategory = await ctx.db.orderItem.groupBy({
          by: ["productId"],
          where: {
            product: { merchantId: merchant.id },
            order: {
              status: { in: ["COMPLETED", "DELIVERED"] },
              createdAt: { gte: startDate, lte: endDate }}},
          sum: { quantity: true, price: true }});

        // Enrichir avec les catégories
        const categoryStats = await Promise.all(
          salesByCategory.map(async (item) => {
            const product = await ctx.db.product.findUnique({
              where: { id: item.productId },
              select: { category }});
            return {
              category: product?.category || "UNKNOWN",
              quantity: item.sum.quantity || 0,
              revenue: item.sum.price || 0};
          }),
        );

        // Regrouper par catégorie
        const categoryTotals = categoryStats.reduce(
          (acc, item) => {
            const cat = item.category;
            if (!acc[cat]) {
              acc[cat] = { quantity: 0, revenue: 0 };
            }
            acc[cat].quantity += item.quantity;
            acc[cat].revenue += item.revenue;
            return acc;
          },
          {} as Record<string, { quantity: number; revenue: number }>,
        );

        // Moyennes et tendances
        const totalRevenue = salesTimeline.reduce(
          (sum, item) => sum + item.revenue,
          0,
        );
        const totalOrders = salesTimeline.reduce(
          (sum, item) => sum + item.orders_count,
          0,
        );
        const averageOrderValue =
          totalOrders > 0 ? totalRevenue / totalOrders : 0;

        return {
          success: true,
          data: {
            summary: {
              totalRevenue,
              totalOrders,
              averageOrderValue,
              conversionRate: 0, // à calculer avec les vues produits
            },
            timeline: salesTimeline,
            byCategory: Object.entries(categoryTotals).map(
              ([category, stats]) => ({ category,
                ...stats,
                percentage:
                  totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0 }),
            ),
            trends: {
              revenueGrowth: calculateTrendGrowth(salesTimeline, "revenue"),
              ordersGrowth: calculateTrendGrowth(salesTimeline, "orders_count")}}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques de ventes" });
      }
    }),

  /**
   * Obtenir les statistiques des produits
   */
  getProductStats: protectedProcedure
    .input(productStatsSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const { startDate: startDate, endDate: endDate } =
          calculatePeriodDates({ period: input.period });

        // Statistiques des produits
        const productStats = await ctx.db.product.findMany({
          where: { merchantId: merchant.id },
          include: {
            orderItems: {
              where: {
                order: {
                  status: { in: ["COMPLETED", "DELIVERED"] },
                  createdAt: { gte: startDate, lte: endDate }}}},
            count: {
              select: {
                orderItems: {
                  where: {
                    order: {
                      status: { in: ["COMPLETED", "DELIVERED"] },
                      createdAt: { gte: startDate, lte: endDate }}}}}}},
          take: input.limit});

        // Calculer les métriques pour chaque produit
        const enrichedStats = productStats.map((product) => {
          const sales = product.orderItems.reduce(
            (sum, item) => sum + item.quantity,
            0,
          );
          const revenue = product.orderItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
          );
          const orders = product.count.orderItems;

          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category,
            status: product.status,
            price: product.price.toNumber(),
            stockQuantity: product.stockQuantity,
            images: product.images,

            // Métriques de performance
            sales,
            revenue,
            orders,
            conversionRate: 0, // à calculer avec les vues
            profitMargin: product.costPrice
              ? ((product.price.toNumber() - product.costPrice.toNumber()) /
                  product.price.toNumber()) *
                100
              : null,

            // Indicateurs
            isLowStock:
              product.trackInventory &&
              product.stockQuantity <= product.lowStockAlert,
            isTopSeller: sales > 0,
            revenuePercentage: 0, // Sera calculé après
          };
        });

        // Calculer les pourcentages de revenus
        const totalRevenue = enrichedStats.reduce(
          (sum, product) => sum + product.revenue,
          0,
        );
        enrichedStats.forEach((product) => {
          product.revenuePercentage =
            totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
        });

        // Pré-calculer les vues si nécessaire pour le tri
        let productViews: Map<string, number> = new Map();
        if (input.sortBy === "views") {
          const viewsData = await Promise.all(
            enrichedStats.map(async (product) => {
              const viewCount = await ctx.db.productView.count({
                where: { 
                  productId: product.id, 
                  createdAt: { gte: startDate, lte: endDate } 
                }
              });
              return { productId: product.id, views: viewCount };
            })
          );
          productViews = new Map(viewsData.map(item => [item.productId, item.views]));
        }

        // Trier selon le critère demandé
        enrichedStats.sort((a, b) => {
          switch (input.sortBy) {
            case "sales":
              return b.sales - a.sales;
            case "revenue":
              return b.revenue - a.revenue;
            case "views":
              const aViews = productViews.get(a.id) || 0;
              const bViews = productViews.get(b.id) || 0;
              return bViews - aViews;
            case "conversions":
              return b.conversionRate - a.conversionRate;
            default:
              return b.sales - a.sales;
          }
        });

        // Statistiques globales du catalogue
        const catalogStats = {
          totalProducts: await ctx.db.product.count({
            where: { merchantId: merchant.id }}),
          activeProducts: await ctx.db.product.count({
            where: {
              merchantId: merchant.id,
              status: "ACTIVE",
              isVisible: true}}),
          lowStockProducts: enrichedStats.filter((p) => p.isLowStock).length,
          outOfStockProducts: await ctx.db.product.count({
            where: {
              merchantId: merchant.id,
              trackInventory: true,
              stockQuantity: 0}})};

        return {
          success: true,
          data: {
            catalog: catalogStats,
            products: enrichedStats,
            period: {
              type: input.period,
              startDate,
              endDate}}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques produits" });
      }
    }),

  /**
   * Obtenir les statistiques des clients
   */
  getCustomerStats: protectedProcedure
    .input(customerStatsSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const { startDate: startDate, endDate: endDate } =
          calculatePeriodDates({ period: input.period });

        // Statistiques des clients
        const [
          totalCustomers,
          newCustomers,
          returningCustomers,
          customerOrders,
          topCustomers] = await Promise.all([
          // Total des clients ayant commandé
          ctx.db.order.findMany({
            where: {
              merchantId: merchant.id,
              status: { in: ["COMPLETED", "DELIVERED"] }},
            select: { clientId },
            distinct: ["clientId"]}),

          // Nouveaux clients (première commande dans la période)
          ctx.db.order.findMany({
            where: {
              merchantId: merchant.id,
              status: { in: ["COMPLETED", "DELIVERED"] },
              createdAt: { gte: startDate, lte: endDate }},
            select: { clientId: true, createdAt: true },
            orderBy: { createdAt: "asc" }}),

          // Clients récurrents
          ctx.db.order.groupBy({
            by: ["clientId"],
            where: {
              merchantId: merchant.id,
              status: { in: ["COMPLETED", "DELIVERED"] },
              createdAt: { gte: startDate, lte: endDate }},
            count: true,
            having: { clientId: { count: { gt: 1 } } }}),

          // Commandes par client
          ctx.db.order.groupBy({
            by: ["clientId"],
            where: {
              merchantId: merchant.id,
              status: { in: ["COMPLETED", "DELIVERED"] },
              createdAt: { gte: startDate, lte: endDate }},
            sum: { totalAmount },
            count: true}),

          // Top clients par revenus
          ctx.db.order.groupBy({
            by: ["clientId"],
            where: {
              merchantId: merchant.id,
              status: { in: ["COMPLETED", "DELIVERED"] },
              createdAt: { gte: startDate, lte: endDate }},
            sum: { totalAmount },
            count: true,
            orderBy: { sum: { totalAmount: "desc" } },
            take: 10})]);

        // Identifier les nouveaux clients
        const firstOrderDates = new Map();
        for (const order of newCustomers) {
          if (!firstOrderDates.has(order.clientId)) {
            firstOrderDates.set(order.clientId, order.createdAt);
          }
        }

        const newCustomersInPeriod = Array.from(
          firstOrderDates.entries(),
        ).filter(([, firstOrder]) => firstOrder >= startDate);

        // Enrichir les données des top clients
        const enrichedTopCustomers = await Promise.all(
          topCustomers.map(async (customer) => {
            const client = await ctx.db.client.findUnique({
              where: { id: customer.clientId },
              include: {
                user: {
                  select: { name: true, email: true }}}});

            return {
              id: customer.clientId,
              name: client?.user?.name || "Client anonyme",
              email: client?.user?.email,
              totalOrders: customer.count,
              totalSpent: customer.sum.totalAmount || 0,
              averageOrderValue:
                customer.count > 0
                  ? (customer.sum.totalAmount || 0) / customer.count
                  : 0,
              isNew: newCustomersInPeriod.some(
                ([id]) => id === customer.clientId,
              )};
          }),
        );

        // Calculs des métriques
        const totalRevenue = customerOrders.reduce(
          (sum, c) => sum + (c.sum.totalAmount || 0),
          0,
        );
        const averageOrderValue =
          customerOrders.length > 0
            ? totalRevenue /
              customerOrders.reduce((sum, c) => sum + c.count, 0)
            : 0;

        const customerLifetimeValue =
          totalCustomers.length > 0 ? totalRevenue / totalCustomers.length : 0;

        return {
          success: true,
          data: {
            overview: {
              totalCustomers: totalCustomers.length,
              newCustomers: newCustomersInPeriod.length,
              returningCustomers: returningCustomers.length,
              retentionRate:
                totalCustomers.length > 0
                  ? (returningCustomers.length / totalCustomers.length) * 100
                  : 0,
              averageOrderValue,
              customerLifetimeValue},
            topCustomers: enrichedTopCustomers,
            segmentation: {
              new: newCustomersInPeriod.length,
              returning: returningCustomers.length,
              vip: enrichedTopCustomers.filter(
                (c) => c.totalSpent > averageOrderValue * 3,
              ).length},
            period: {
              type: input.period,
              startDate,
              endDate}}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques clients" });
      }
    }),

  /**
   * Obtenir les données pour les graphiques de performance
   */
  getPerformanceCharts: protectedProcedure
    .input(
      z.object({ period: z.enum(["WEEK", "MONTH", "QUARTER"]).default("MONTH"),
        metrics: z
          .array(z.enum(["revenue", "orders", "customers", "products"]))
          .default(["revenue", "orders"]) }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const { startDate: startDate, endDate: endDate } =
          calculatePeriodDates({ period: input.period });
        const interval = getTimeInterval(input.period);

        // Données temporelles pour les graphiques
        const timeSeriesData = (await ctx.db.$queryRaw`
          SELECT 
            DATE_TRUNC(${interval}, createdat) as period,
            COUNT(*)::int as orders_count,
            COALESCE(SUM(totalamount), 0)::float as revenue,
            COUNT(DISTINCT clientid)::int as unique_customers
          FROM orders 
          WHERE merchant_id = ${merchant.id}
            AND status IN ('COMPLETED', 'DELIVERED')
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY DATE_TRUNC(${interval}, createdat)
          ORDER BY period ASC
        `) as Array<{
          period: Date;
          orders_count: number;
          revenue: number;
          unique_customers: number;
        }>;

        // Données des produits si demandées
        const productData = input.metrics.includes("products")
          ? await ctx.db.product.groupBy({
              by: ["category"],
              where: { merchantId: merchant.id },
              count: true})
          : [];

        // Implémenter le tracking des vues depuis la base de données
        const views = await ctx.db.announcementView.count({
          where: {
            announcement: {
              clientId: ctx.session.user.id,
            },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
            },
          },
        });
        
        return {
          success: true,
          data: {
            timeSeries: timeSeriesData.map((item) => ({ date: item.period,
              revenue: item.revenue,
              orders: item.orders_count,
              customers: item.unique_customers })),
            productsByCategory: productData.map((item) => ({ category: item.category,
              count: item.count })),
            period: {
              type: input.period,
              startDate,
              endDate}}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des données de performance" });
      }
    })});

// Helper functions
function calculatePeriodDates(input: {
  period: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const now = new Date();
  let startDate: Date, endDate: Date;

  if (input.startDate && input.endDate) {
    startDate = input.startDate;
    endDate = input.endDate;
  } else {
    switch (input.period) {
      case "DAY":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        );
        break;
      case "WEEK":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = weekStart;
        endDate = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "MONTH":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "QUARTER":
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case "YEAR":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
  }

  // Calculer la période précédente pour comparaison
  const periodLength = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - periodLength);

  return { startDate, endDate, previousStartDate, previousEndDate };
}

async function getBasicStats(
  db: any,
  merchantId: string,
  startDate: Date,
  endDate: Date,
) {
  const [revenue, orders, customers, returns] = await Promise.all([
    db.order.aggregate({
      where: {
        merchantId,
        status: { in: ["COMPLETED", "DELIVERED"] },
        createdAt: { gte: startDate, lte: endDate }},
      sum: { totalAmount }}),
    db.order.count({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate }}}),
    db.order.findMany({
      where: {
        merchantId,
        status: { in: ["COMPLETED", "DELIVERED"] },
        createdAt: { gte: startDate, lte: endDate }},
      select: { clientId },
      distinct: ["clientId"]}),
    db.order.count({
      where: {
        merchantId,
        status: "RETURNED",
        createdAt: { gte: startDate, lte: endDate }}})]);

  const completedOrders = await db.order.count({
    where: {
      merchantId,
      status: { in: ["COMPLETED", "DELIVERED"] },
      createdAt: { gte: startDate, lte: endDate }}});

  return {
    revenue: revenue.sum.totalAmount || 0,
    totalOrders: orders,
    completedOrders,
    returnedOrders: returns,
    uniqueCustomers: customers.length,
    averageOrderValue:
      orders > 0 ? (revenue.sum.totalAmount || 0) / orders : 0};
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function calculateTrendGrowth(timeline: any[], field: string): number {
  if (timeline.length < 2) return 0;

  const firstValue = timeline[0][field];
  const lastValue = timeline[timeline.length - 1][field];

  return calculateGrowthRate(lastValue, firstValue);
}

function getTimeInterval(period: string): string {
  switch (period) {
    case "DAY":
      return "hour";
    case "WEEK":
      return "day";
    case "MONTH":
      return "day";
    case "QUARTER":
      return "week";
    case "YEAR":
      return "month";
    default:
      return "day";
  }
}
