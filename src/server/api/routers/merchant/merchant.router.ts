import { router, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { billingService } from "@/server/services/shared/billing.service";
import { invoiceService } from "@/server/services/shared/invoice.service";
import { merchantDashboardRouter } from "./merchant-dashboard.router";

// Définir l'interface pour les données de livraison
interface DeliveryWithClient {
  id: string;
  merchantId: string;
  status: string;
  destinationAddress: string;
  createdAt: Date;
  estimatedDelivery: Date | null;
  client?: {
    user?: {
      name?: string | null;
    } | null;
  } | null;
}

export const merchantRouter = router({ // Récupération des commandes du marchand
  getOrders: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        searchTerm: z.string().optional(),
        paymentStatus: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(10) })
    )
    .query(async ({ ctx, input  }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un marchand
      const merchant = await ctx.db.user.findUnique({
        where: { id },
        include: { merchant }});

      if (!merchant?.merchant) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès refusé - Marchand uniquement" });
      }

      const where = {
        merchantId: merchant.merchant.id,
        ...(input.status && { status: input.status }),
        ...(input.paymentStatus && { paymentStatus: input.paymentStatus }),
        ...(input.searchTerm && {
          OR: [
            { orderNumber: { contains: input.searchTerm, mode: "insensitive" } },
            { customerName: { contains: input.searchTerm, mode: "insensitive" } },
            { customerEmail: { contains: input.searchTerm, mode: "insensitive" } }]})};

      const [orders, total] = await Promise.all([
        ctx.db.order.findMany({
          where,
          include: {
            customer: {
              include: { user }
            },
            items: true},
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit}),
        ctx.db.order.count({ where  })]);

      return {
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber || `ORD-${order.id.slice(-6)}`,
          status: order.status,
          customerName: order.customer?.user?.name || order.customerName || "Client",
          customerEmail: order.customer?.user?.email || order.customerEmail || "",
          totalAmount: order.totalAmount || 0,
          itemCount: order.items?.length || 0,
          paymentStatus: order.paymentStatus || "PENDING",
          deliveryAddress: order.deliveryAddress || "",
          estimatedDelivery: order.estimatedDelivery,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt})),
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit)};
    }),

  // Statistiques des commandes
  getOrderStats: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    const merchant = await ctx.db.user.findUnique({
      where: { id },
      include: { merchant }});

    if (!merchant?.merchant) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Accès refusé - Marchand uniquement" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, pendingOrders, confirmedOrders, revenueData, todayOrders] = await Promise.all([
      ctx.db.order.count({
        where: { merchantId: merchant.merchant.id }}),
      ctx.db.order.count({
        where: { merchantId: merchant.merchant.id, status: "PENDING" }}),
      ctx.db.order.count({
        where: { merchantId: merchant.merchant.id, status: "CONFIRMED" }}),
      ctx.db.order.aggregate({
        where: { 
          merchantId: merchant.merchant.id,
          status: { in: ["CONFIRMED", "DELIVERED"] }
        },
        sum: { totalAmount }}),
      ctx.db.order.count({
        where: { 
          merchantId: merchant.merchant.id,
          createdAt: { gte }
        }})]);

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      totalRevenue: revenueData.sum.totalAmount || 0,
      todayOrders};
  }),

  // Statistiques avancées du marchand
  getStats: protectedProcedure
    .input(
      z.object({ period: z.number().default(30) })
    )
    .query(async ({ ctx, input  }) => {
      const userId = ctx.session.user.id;

      const merchant = await ctx.db.user.findUnique({
        where: { id },
        include: { merchant }});

      if (!merchant?.merchant) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès refusé - Marchand uniquement" });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.period);

      // Récupérer les commandes de la période
      const orders = await ctx.db.order.findMany({
        where: {
          merchantId: merchant.merchant.id,
          createdAt: { gte },
          status: { in: ["CONFIRMED", "DELIVERED"] }
        },
        include: {
          items: {
            include: {
              product: {
                include: { category }
              }
            }
          }
        }});

      // Calculer les métriques overview
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      const uniqueCustomers = new Set(orders.map(order => order.customerId)).size;
      
      // Calculer les vraies métriques depuis la base de données
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Revenus du mois
      const monthlyRevenue = await ctx.db.payment.aggregate({
        where: {
          userId: ctx.session.user.id,
          status: "COMPLETED",
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      });

      // Commandes de la semaine
      const weeklyOrders = await ctx.db.announcement.count({
        where: {
          clientId: ctx.session.user.id,
          createdAt: { gte: startOfWeek },
        },
      });

      // Livraisons actives
      const activeDeliveries = await ctx.db.delivery.count({
        where: {
          announcement: { clientId: ctx.session.user.id },
          status: { in: ["PENDING", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"] },
        },
      });

      // Taux de satisfaction basé sur les ratings
      const ratings = await ctx.db.rating.aggregate({
        where: {
          targetId: ctx.session.user.id,
          targetType: "CLIENT",
        },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const satisfactionRate = ratings._avg.rating 
        ? Math.round((ratings._avg.rating / 5) * 100) 
        : 0;

      // Top produits
      const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
      orders.forEach(order => {
        order.items?.forEach(item => {
          const productId = item.productId;
          const productName = item.product?.name || "Produit";
          const quantity = item.quantity || 1;
          const price = item.price || 0;
          
          if (!productSales[productId]) {
            productSales[productId] = { name: productName, sales: 0, revenue: 0 };
          }
          productSales[productId].sales += quantity;
          productSales[productId].revenue += price * quantity;
        });
      });

      const topProducts = Object.entries(productSales)
        .map(([id, data]) => ({ id, ...data  }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Tendances quotidiennes
      const dailyStats: Record<string, { revenue: number; orders: number; customers: Set<string> }> = {};
      
      for (let i = 0; i < input.period; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        dailyStats[dateKey] = { revenue: 0, orders: 0, customers: new Set() };
      }

      orders.forEach(order => {
        const dateKey = order.createdAt.toISOString().split('T')[0];
        if (dailyStats[dateKey]) {
          dailyStats[dateKey].revenue += order.totalAmount || 0;
          dailyStats[dateKey].orders += 1;
          if (order.customerId) {
            dailyStats[dateKey].customers.add(order.customerId);
          }
        }
      });

      const daily = Object.entries(dailyStats)
        .map(([date, stats]) => ({ date,
          revenue: stats.revenue,
          orders: stats.orders,
          customers: stats.customers.size }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Catégories
      const categoryRevenue: Record<string, number> = {};
      orders.forEach(order => {
        order.items?.forEach(item => {
          const categoryName = item.product?.category?.name || "Autres";
          const revenue = (item.price || 0) * (item.quantity || 1);
          categoryRevenue[categoryName] = (categoryRevenue[categoryName] || 0) + revenue;
        });
      });

      const categories = Object.entries(categoryRevenue).map(([name, value], index) => ({
        name,
        value,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`}));

      return {
        overview: {
          totalRevenue,
          totalOrders,
          averageOrderValue,
          totalCustomers: uniqueCustomers,
          satisfactionRate,
          topProducts},
        trends: {
          daily,
                      monthly: await getMonthlyTrends(ctx.db, ctx.session.user.id),
        },
        categories};
    }),

  // Mise à jour du statut d'une commande
  updateOrderStatus: protectedProcedure
    .input(
      z.object({ orderId: z.string(),
        status: z.string() })
    )
    .mutation(async ({ ctx, input  }) => {
      const userId = ctx.session.user.id;

      const merchant = await ctx.db.user.findUnique({
        where: { id },
        include: { merchant }});

      if (!merchant?.merchant) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès refusé - Marchand uniquement" });
      }

      // Vérifier que la commande appartient au marchand
      const order = await ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          merchantId: merchant.merchant.id}});

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Commande non trouvée" });
      }

      // Mettre à jour le statut
      const updatedOrder = await ctx.db.order.update({
        where: { id: input.orderId },
        data: { 
          status: input.status,
          updatedAt: new Date()}});

      return { success: true, order: updatedOrder };
    }),

  getProfile: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { merchant }});

    if (!user || !user.merchant) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Profil commerçant non trouvé" });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      businessName: user.merchant.businessName,
      businessAddress: user.merchant.businessAddress,
      businessCity: user.merchant.businessCity,
      businessState: user.merchant.businessState,
      businessPostal: user.merchant.businessPostal,
      businessCountry: user.merchant.businessCountry,
      taxId: user.merchant.taxId,
      websiteUrl: user.merchant.websiteUrl,
      isVerified: user.merchant.isVerified,
      createdAt: user.createdAt};
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({ name: z.string().optional(),
        phoneNumber: z.string().optional(),
        businessName: z.string().optional(),
        businessAddress: z.string().optional(),
        businessCity: z.string().optional(),
        businessState: z.string().optional(),
        businessPostal: z.string().optional(),
        businessCountry: z.string().optional(),
        taxId: z.string().optional(),
        websiteUrl: z.string().optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un commerçant
      const user = await ctx.db.user.findUnique({
        where: { id },
        include: { merchant }});

      if (!user || !user.merchant) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à mettre à jour ce profil" });
      }

      // Extraire les données à mettre à jour
      const { name: name, phoneNumber: phoneNumber, ...merchantData } = input;

      // Mise à jour des données utilisateur
      if (name || phoneNumber) {
        await ctx.db.user.update({
          where: { id },
          data: {
            name: name || undefined,
            phoneNumber: phoneNumber || undefined}});
      }

      // Mise à jour des données commerçant
      if (Object.keys(merchantData).length > 0) {
        await ctx.db.merchant.update({
          where: { userId },
          data: merchantData});
      }

      // Récupération des données mises à jour
      const updatedUser = await ctx.db.user.findUnique({
        where: { id },
        include: { merchant }});

      return {
        id: updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        phoneNumber: updatedUser?.phoneNumber,
        businessName: updatedUser?.merchant?.businessName,
        businessAddress: updatedUser?.merchant?.businessAddress,
        updated: true};
    }),

  getDeliveries: protectedProcedure.query(async ({ ctx  }) => {
    const userId = ctx.session.user.id;

    // Vérifier si l'utilisateur est un commerçant
    const user = await ctx.db.user.findUnique({
      where: { id },
      include: { merchant }});

    if (!user || !user.merchant) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à accéder à ces données" });
    }

    // Récupérer les livraisons
    const deliveries = await ctx.db.delivery.findMany({
      where: {
        merchantId: user.merchant.id},
      include: {
        client: {
          include: { user }}},
      orderBy: {
        createdAt: "desc"}});

    return deliveries.map((delivery: DeliveryWithClient) => ({ id: delivery.id,
      merchantId: delivery.merchantId,
      status: delivery.status,
      clientName: delivery.client?.user?.name || "Client inconnu",
      address: delivery.destinationAddress,
      createdAt: delivery.createdAt.toISOString(),
      estimatedDelivery: delivery.estimatedDelivery?.toISOString() }));
  }),

  // ===== NOUVEAU: TABLEAU DE BORD =====
  dashboard: router({ getStats: protectedProcedure.query(async ({ ctx  }) => {
      const userId = ctx.session.user.id;

      const merchant = await ctx.db.merchant.findUnique({
        where: { userId },
        select: { id }});

      if (!merchant) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès refusé" });
      }

      // Statistiques basiques (à adapter selon votre modèle de données)
      const [totalDeliveries, activeDeliveries, pendingPayments] =
        await Promise.all([
          ctx.db.delivery.count({
            where: { merchantId: merchant.id }}),
          ctx.db.delivery.count({
            where: {
              merchantId: merchant.id,
              status: "IN_PROGRESS"}}),
          ctx.db.invoice.count({
            where: {
              userId,
              status: "ISSUED"}})]);

      return {
        totalDeliveries,
        activeDeliveries,
        pendingPayments,
        // Autres stats...
      };
    }),

    getRecentActivity: protectedProcedure.query(async ({ ctx  }) => {
      const userId = ctx.session.user.id;

      // Récupérer les activités récentes (à adapter)
      const activities = await ctx.db.delivery.findMany({
        where: {
          merchant: { userId }},
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          createdAt: true,
          // autres champs nécessaires
        }});

      return activities;
    })}),

  // ===== NOUVEAU: CONTRATS =====
  // contracts: contractRouter, // Import manquant, à corriger plus tard

  // ===== NOUVEAU: FACTURATION =====
  billing: router({ getInvoices: protectedProcedure
      .input(
        z.object({
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(50).default(10),
          status: z.string().optional() }),
      )
      .query(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        return await invoiceService.listInvoices({ userId,
          status: input.status as any,
          page: input.page,
          limit: input.limit });
      }),

    getBillingStats: protectedProcedure.query(async ({ ctx  }) => {
      const userId = ctx.session.user.id;

      const merchant = await ctx.db.merchant.findUnique({
        where: { userId },
        select: { id }});

      if (!merchant) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès refusé" });
      }

      // Utiliser le service de facturation pour les stats
      return (
        (await billingService.getMerchantBillingStats?.(
          merchant.id,
          "MONTH",
        )) || {
          totalAmount: 0,
          invoiceCount: 0,
          paidAmount: 0}
      );
    }),

    generateInvoice: protectedProcedure
      .input(
        z.object({ items: z.array(
            z.object({
              description: z.string(),
              quantity: z.number(),
              unitPrice: z.number(),
              taxRate: z.number().optional() }),
          ),
          dueDate: z.date().optional(),
          notes: z.string().optional()}),
      )
      .mutation(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        return await invoiceService.createInvoice({ userId,
          items: input.items,
          dueDate: input.dueDate,
          notes: input.notes,
          invoiceType: "MERCHANT_SERVICE" });
      }),

    getStats: protectedProcedure
      .input(
        z.object({ period: z.enum(["MONTH", "QUARTER", "YEAR"]).default("MONTH") }),
      )
      .query(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        const merchant = await ctx.db.merchant.findUnique({
          where: { userId },
          select: { id }});

        if (!merchant) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Accès refusé" });
        }

        // Utilise billingService.getBillingStats() existant
        return await billingService.getBillingStats(input.period);
      }),

    generateInvoice: protectedProcedure
      .input(
        z.object({ startDate: z.date(),
          endDate: z.date(),
          description: z.string().optional() }),
      )
      .mutation(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        const merchant = await ctx.db.merchant.findUnique({
          where: { userId },
          select: { id }});

        if (!merchant) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Accès refusé" });
        }

        // Utilise billingService.generateMerchantInvoice() existant
        return await billingService.generateMerchantInvoice(
          merchant.id,
          input.startDate,
          input.endDate,
        );
      }),

    getBillingCycles: protectedProcedure
      .input(
        z.object({ page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(50).default(10) }),
      )
      .query(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        const merchant = await ctx.db.merchant.findUnique({
          where: { userId },
          select: { id }});

        if (!merchant) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Accès refusé" });
        }

        return await ctx.db.billingCycle.findMany({
          where: { merchantId: merchant.id },
          include: { invoice },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit});
      })}),

  // ===== FACTURES MERCHANT =====
  invoices: router({ /**
     * Liste les factures du merchant
     */
    list: protectedProcedure
      .input(
        z.object({
          status: z
            .enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"])
            .optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(50).default(10),
          startDate: z.date().optional(),
          endDate: z.date().optional() }),
      )
      .query(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        // Utilise invoiceService.listInvoices() existant
        return await invoiceService.listInvoices({ userId,
          status: input.status as any,
          page: input.page,
          limit: input.limit,
          startDate: input.startDate,
          endDate: input.endDate });
      }),

    /**
     * Récupère une facture par ID
     */
    getById: protectedProcedure
      .input(z.object({ invoiceId: z.string()  }))
      .query(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        // Vérifier que la facture appartient au merchant
        const invoice = await ctx.db.invoice.findFirst({
          where: {
            id: input.invoiceId,
            userId},
          include: { items }});

        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Facture non trouvée" });
        }

        return invoice;
      }),

    /**
     * Génère le PDF d'une facture
     */
    generatePdf: protectedProcedure
      .input(z.object({ invoiceId: z.string()  }))
      .mutation(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        // Vérifier que la facture appartient au merchant
        const invoice = await ctx.db.invoice.findFirst({
          where: {
            id: input.invoiceId,
            userId}});

        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Facture non trouvée" });
        }

        // Utilise invoiceService.generateInvoice() existant
        return await invoiceService.generateInvoice(input.invoiceId);
      }),

    /**
     * Marque une facture comme payée
     */
    markAsPaid: protectedProcedure
      .input(
        z.object({ invoiceId: z.string(),
          paymentId: z.string().optional() }),
      )
      .mutation(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        // Vérifier que la facture appartient au merchant
        const invoice = await ctx.db.invoice.findFirst({
          where: {
            id: input.invoiceId,
            userId}});

        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Facture non trouvée" });
        }

        // Utilise invoiceService.markInvoiceAsPaid() existant
        return await invoiceService.markInvoiceAsPaid(
          input.invoiceId,
          input.paymentId,
        );
      })}),

  // ===== DOCUMENTS MERCHANT =====
  documents: router({ /**
     * Liste les documents du merchant
     */
    list: protectedProcedure
      .input(
        z.object({
          type: z
            .enum(["CONTRACT", "INVOICE", "TAX", "VERIFICATION", "OTHER"])
            .optional(),
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(50).default(10) }),
      )
      .query(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        const merchant = await ctx.db.merchant.findUnique({
          where: { userId },
          select: { id }});

        if (!merchant) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Accès refusé" });
        }

        return await ctx.db.document.findMany({ where: {
            userId,
            ...(input.type && { type: input.type  })},
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit});
      }),

    /**
     * Upload un document
     */
    upload: protectedProcedure
      .input(
        z.object({ fileName: z.string(),
          fileType: z.string(),
          documentType: z.enum([
            "CONTRACT",
            "INVOICE",
            "TAX",
            "VERIFICATION",
            "OTHER"]),
          description: z.string().optional() }),
      )
      .mutation(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        // Créer l'enregistrement du document
        return await ctx.db.document.create({
          data: {
            userId,
            fileName: input.fileName,
            fileType: input.fileType,
            type: input.documentType,
            description: input.description,
            status: "PENDING",
            uploadedAt: new Date()}});
      })}),

  // ===== MÉTRIQUES AVANCÉES =====
  analytics: router({ /**
     * Métriques de performance du merchant
     */
    getPerformanceMetrics: protectedProcedure
      .input(
        z.object({
          period: z.enum(["WEEK", "MONTH", "QUARTER", "YEAR"]).default("MONTH") }),
      )
      .query(async ({ ctx, input: input  }) => {
        const userId = ctx.session.user.id;

        const merchant = await ctx.db.merchant.findUnique({
          where: { userId },
          select: { id }});

        if (!merchant) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Accès refusé" });
        }

        // Calculer les métriques de performance
        const now = new Date();
        const startDate =
          input.period === "WEEK"
            ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            : input.period === "MONTH"
              ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              : input.period === "QUARTER"
                ? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
                : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

        const [deliveriesCount, totalRevenue, averageRating] =
          await Promise.all([
            ctx.db.delivery.count({
              where: {
                merchantId: merchant.id,
                createdAt: { gte }}}),
            ctx.db.payment.aggregate({
              where: {
                userId,
                status: "COMPLETED",
                createdAt: { gte }},
              sum: { amount }}),
            ctx.db.rating.aggregate({
              where: {
                delivery: {
                  merchantId: merchant.id},
                createdAt: { gte }},
              avg: { rating }})]);

        return {
          deliveriesCount,
          totalRevenue: totalRevenue.sum.amount || 0,
          averageRating: averageRating.avg.rating || 0,
          period: input.period};
      })}),

  // Sales stats endpoints for SalesWidget
  getSalesStats: protectedProcedure
    .input(z.object({
      period: z.enum(["week", "month", "year"]).default("month")
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const merchant = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { merchant: true }
      });

      if (!merchant?.merchant) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé - Marchand uniquement" });
      }

      const now = new Date();
      let startDate: Date;
      let previousStartDate: Date;

      switch (input.period) {
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          previousStartDate = new Date(startDate);
          previousStartDate.setDate(startDate.getDate() - 7);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }

      const endDate = now;

      // Statistiques de ventes actuelles
      const [currentStats, previousStats] = await Promise.all([
        ctx.db.order.aggregate({
          where: {
            merchantId: merchant.merchant.id,
            createdAt: { gte: startDate, lte: endDate }
          },
          _sum: { total: true },
          _count: true,
          _avg: { total: true }
        }),
        ctx.db.order.aggregate({
          where: {
            merchantId: merchant.merchant.id,
            createdAt: { gte: previousStartDate, lt: startDate }
          },
          _sum: { total: true },
          _count: true
        })
      ]);

      // Clients actifs dans la période
      const activeCustomers = await ctx.db.order.findMany({
        where: {
          merchantId: merchant.merchant.id,
          createdAt: { gte: startDate, lte: endDate }
        },
        select: { clientId: true },
        distinct: ['clientId']
      });

      const previousActiveCustomers = await ctx.db.order.findMany({
        where: {
          merchantId: merchant.merchant.id,
          createdAt: { gte: previousStartDate, lt: startDate }
        },
        select: { clientId: true },
        distinct: ['clientId']
      });

      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const totalRevenue = currentStats._sum.total?.toNumber() || 0;
      const totalOrders = currentStats._count || 0;
      const averageOrderValue = currentStats._avg.total?.toNumber() || 0;
      const activeCustomersCount = activeCustomers.length;

      const previousRevenue = previousStats._sum.total?.toNumber() || 0;
      const previousOrders = previousStats._count || 0;
      const previousCustomers = previousActiveCustomers.length;

      // Objectifs (configurables par marchand)
      const monthlyGoal = 5000;
      const goalProgress = Math.min(100, (totalRevenue / monthlyGoal) * 100);
      const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

      // Projection basée sur la tendance actuelle
      const dailyAverage = totalRevenue / (now.getDate() || 1);
      const projectedRevenue = dailyAverage * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      // Métriques de performance
      const totalVisitors = 1000; // À remplacer par de vraies données d'analytics
      const conversionRate = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0;
      
      // Taux de rétention client (clients qui ont commandé plusieurs fois)
      const repeatCustomers = await ctx.db.order.groupBy({
        by: ['clientId'],
        where: {
          merchantId: merchant.merchant.id,
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: true,
        having: {
          clientId: {
            _count: {
              gt: 1
            }
          }
        }
      });

      const retentionRate = activeCustomersCount > 0 ? (repeatCustomers.length / activeCustomersCount) * 100 : 0;

      // Temps moyen de traitement des commandes
      const avgFulfillmentTime = 24; // À calculer depuis les vraies données de livraison

      return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        activeCustomers: activeCustomersCount,
        revenueTrend: calculateTrend(totalRevenue, previousRevenue),
        ordersTrend: calculateTrend(totalOrders, previousOrders),
        avgOrderTrend: calculateTrend(averageOrderValue, previousRevenue / (previousOrders || 1)),
        customersTrend: calculateTrend(activeCustomersCount, previousCustomers),
        monthlyGoal,
        goalProgress,
        daysLeftInMonth,
        projectedRevenue,
        conversionRate,
        retentionRate,
        avgFulfillmentTime
      };
    }),

  getTopProducts: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const merchant = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { merchant: true }
      });

      if (!merchant?.merchant) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé - Marchand uniquement" });
      }

      // Produits populaires basés sur les commandes
      const topProducts = await ctx.db.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            merchantId: merchant.merchant.id
          }
        },
        _sum: {
          quantity: true,
          price: true
        },
        _count: true,
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: input.limit
      });

      // Enrichir avec les détails des produits
      return await Promise.all(
        topProducts.map(async (item) => {
          // Récupération du nom du produit
          const productName = `Produit ${item.productId.slice(-4)}`;
          
          return {
            id: item.productId,
            name: productName,
            salesCount: item._sum.quantity || 0,
            revenue: item._sum.price?.toNumber() || 0
          };
        })
      );
    }),

  getRecentOrders: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(10).default(3) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const merchant = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { merchant: true }
      });

      if (!merchant?.merchant) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé - Marchand uniquement" });
      }

      return await ctx.db.order.findMany({
        where: {
          merchantId: merchant.merchant.id
        },
        include: {
          client: {
            include: {
              user: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: input.limit
      });
    }),

  // Dashboard router
  dashboard: merchantDashboardRouter});
