import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { subDays, startOfDay, endOfDay, subMonths, format } from "date-fns";

export const merchantDashboardRouter = router({ /**
   * Récupère les statistiques du dashboard merchant
   */
  getDashboardStats: protectedProcedure.query(async ({ ctx  }) => {
    if (ctx.session.user.role !== "MERCHANT") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Accès réservé aux marchands" });
    }

    const merchantId = ctx.session.user.id;
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Revenus du jour
    const dailyRevenue = await ctx.db.payment.aggregate({
      where: {
        userId: merchantId,
        status: "COMPLETED",
        createdAt: {
          gte: startOfToday,
          lte: endOfToday}},
      sum: { amount }});

    // Revenus du mois
    const monthlyRevenue = await ctx.db.payment.aggregate({
      where: {
        userId: merchantId,
        status: "COMPLETED",
        createdAt: { gte }},
      sum: { amount }});

    // Commandes du jour
    const orderCount = await ctx.db.order.count({
      where: {
        merchantId,
        createdAt: {
          gte: startOfToday,
          lte: endOfToday}}});

    // Livraisons actives
    const activeDeliveries = await ctx.db.delivery.count({
      where: {
        announcement: { userId },
        status: {
          in: ["PENDING", "ASSIGNED", "IN_PROGRESS"]}}});

    // Articles en stock faible
    const lowStockItems = await ctx.db.product.count({
      where: {
        merchantId,
        stockQuantity: {
          lte: ctx.db.product.findFirst({
            where: { merchantId },
            select: { minimumStock }})}}});

    // Panier moyen
    const avgOrderValue = await ctx.db.order.aggregate({
      where: {
        merchantId,
        status: "COMPLETED",
        createdAt: { gte }},
      avg: { total }});

    // Note moyenne de satisfaction
    const customerSatisfaction = await ctx.db.merchantReview.aggregate({
      where: {
        merchantId},
      avg: { rating }});

    return {
      dailyRevenue: dailyRevenue.sum.amount || 0,
      monthlyRevenue: monthlyRevenue.sum.amount || 0,
      orderCount,
      activeDeliveries,
      lowStockItems,
      averageOrderValue: avgOrderValue.avg.total || 0,
      customerSatisfaction: customerSatisfaction.avg.rating || 0,
      conversionRate: 85};
  }),

  /**
   * Récupère les commandes récentes
   */
  getRecentOrders: protectedProcedure
    .input(
      z.object({ limit: z.number().optional().default(10) }),
    )
    .query(async ({ ctx, input  }) => {
      if (ctx.session.user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès réservé aux marchands" });
      }

      const merchantId = ctx.session.user.id;

      return await ctx.db.order.findMany({
        where: {
          merchantId},
        include: {
          customer: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true}},
              email: true}},
          items: {
            include: {
              product: {
                select: { name }}}}},
        orderBy: {
          createdAt: "desc"},
        take: input.limit});
    }),

  /**
   * Récupère les alertes de stock
   */
  getStockAlerts: protectedProcedure.query(async ({ ctx  }) => {
    if (ctx.session.user.role !== "MERCHANT") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Accès réservé aux marchands" });
    }

    const merchantId = ctx.session.user.id;

    const lowStockProducts = await ctx.db.product.findMany({
      where: {
        merchantId,
        stockQuantity: {
          lte: ctx.db.product.fields.minimumStock}},
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        minimumStock: true,
        category: {
          select: { name }}}});

    return lowStockProducts.map((product) => ({ id: product.id,
      productName: product.name,
      currentStock: product.stockQuantity,
      minimumStock: product.minimumStock,
      category: product.category?.name || "Non catégorisé" }));
  }),

  /**
   * Récupère les données pour le graphique des ventes
   */
  getSalesChart: protectedProcedure
    .input(
      z.object({ period: z.enum(["week", "month", "quarter"]).default("week") }),
    )
    .query(async ({ ctx, input  }) => {
      if (ctx.session.user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès réservé aux marchands" });
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
        Array.from({ length }, async (_, i) => {
          const date = subDays(today, days - 1 - i);
          const startOfDate = startOfDay(date);
          const endOfDate = endOfDay(date);

          const revenue = await ctx.db.payment.aggregate({
            where: {
              userId: merchantId,
              status: "COMPLETED",
              createdAt: {
                gte: startOfDate,
                lte: endOfDate}},
            sum: { amount }});

          const orders = await ctx.db.order.count({
            where: {
              merchantId,
              createdAt: {
                gte: startOfDate,
                lte: endOfDate}}});

          return {
            date: format(date, "MM/dd"),
            revenue: revenue.sum.amount || 0,
            orders};
        }),
      );

      return chartData;
    }),

  /**
   * Récupère les commandes par statut pour les métriques
   */
  getOrdersByStatus: protectedProcedure.query(async ({ ctx  }) => {
    if (ctx.session.user.role !== "MERCHANT") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Accès réservé aux marchands" });
    }

    const merchantId = ctx.session.user.id;

    const orderStats = await ctx.db.order.groupBy({
      by: ["status"],
      where: {
        merchantId},
      count: { id }});

    return orderStats.map((stat) => ({ status: stat.status,
      count: stat.count.id }));
  }),

  /**
   * Récupère les produits les plus vendus
   */
  getTopProducts: protectedProcedure
    .input(
      z.object({ limit: z.number().optional().default(5),
        period: z.enum(["week", "month", "quarter"]).default("month") }),
    )
    .query(async ({ ctx, input  }) => {
      if (ctx.session.user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès réservé aux marchands" });
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
            merchantId},
          order: {
            status: "COMPLETED",
            createdAt: { gte }}},
        sum: {
          quantity: true,
          total: true},
        orderBy: {
          sum: {
            quantity: "desc"}},
        take: input.limit});

      // Récupérer les détails des produits
      const productDetails = await Promise.all(
        topProducts.map(async (item) => {
          const product = await ctx.db.product.findUnique({
            where: { id: item.productId },
            select: {
              id: true,
              name: true,
              price: true}});

          return {
            id: product?.id || item.productId,
            name: product?.name || "Produit inconnu",
            price: product?.price || 0,
            totalSold: item.sum.quantity || 0,
            totalRevenue: item.sum.total || 0};
        }),
      );

      return productDetails;
    })});
