import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { billingService } from "@/server/services/shared/billing.service";
import { invoiceService } from "@/server/services/shared/invoice.service";
import type { ContractStatus } from "@prisma/client";

/**
 * Service merchant spécialisé
 * Réutilise au maximum les services existants (billing, invoice, contract)
 * pour éviter la duplication de code
 */
export class MerchantService {
  /**
   * Récupère le profil complet d'un merchant avec ses métriques
   */
  async getMerchantProfile(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        merchant: true
      }
    });

    if (!user || !user.merchant) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Profil merchant non trouvé" });
    }

    // Calculer les statistiques séparément
    const [totalDeliveries, totalContracts] = await Promise.all([
      db.delivery.count({
        where: { merchant: { userId: userId } }
      }),
      db.contract.count({
        where: { merchant: { userId: userId } }
      })
    ]);

    return {
      ...user,
      merchant: {
        ...user.merchant,
        totalDeliveries,
        totalContracts
      }
    };
  }

  /**
   * Génère un rapport de facturation pour un merchant
   * Utilise billingService.generateMerchantInvoice() existant
   */
  async generateBillingReport(
    merchantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    try {
      // Utilise le service de facturation existant
      const invoice = await billingService.generateMerchantInvoice(
        merchantId,
        startDate,
        endDate,
      );

      // Récupère les statistiques additionnelles
      const [deliveriesCount, commissionsTotal, paymentsTotal] =
        await Promise.all([
          db.delivery.count({
            where: {
              merchantId,
              createdAt: {
                gte: startDate,
                lte: endDate}}}),

          db.commission.aggregate({
            where: {
              payment: {
                delivery: {
                  merchantId},
                createdAt: {
                  gte: startDate,
                  lte: endDate}}},
            sum: { amount }}),

          db.payment.aggregate({
            where: {
              delivery: {
                merchantId},
              status: "COMPLETED",
              createdAt: {
                gte: startDate,
                lte: endDate}},
            sum: { amount }})]);

      return {
        invoice,
        stats: {
          deliveriesCount,
          commissionsTotal: commissionsTotal.sum.amount || 0,
          paymentsTotal: paymentsTotal.sum.amount || 0,
          period: { startDate, endDate }}};
    } catch (error) {
      console.error("Erreur génération rapport facturation merchant:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la génération du rapport" });
    }
  }

  /**
   * Récupère les factures d'un merchant avec pagination
   * Utilise invoiceService.listInvoices() existant
   */
  async getMerchantInvoices(
    userId: string,
    options: {
      status?: string;
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    return await invoiceService.listInvoices({ userId,
      ...options });
  }

  /**
   * Crée une facture personnalisée pour un merchant
   * Utilise invoiceService.createInvoice() existant
   */
  async createCustomInvoice(
    userId: string,
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      serviceId?: string;
      deliveryId?: string;
    }>,
    options: {
      dueDate?: Date;
      notes?: string;
      invoiceType?: string;
    } = {},
  ) {
    return await invoiceService.createInvoice({ userId,
      items,
      ...options });
  }

  /**
   * Calcule les métriques de performance d'un merchant
   */
  async calculatePerformanceMetrics(
    merchantId: string,
    period: "WEEK" | "MONTH" | "QUARTER" | "YEAR" = "MONTH",
  ) {
    const now = new Date();
    const periodDays = {
      WEEK: 7,
      MONTH: 30,
      QUARTER: 90,
      YEAR: 365};

    const startDate = new Date(
      now.getTime() - periodDays[period] * 24 * 60 * 60 * 1000,
    );

    const [deliveriesStats, revenueStats, ratingStats, completionStats] =
      await Promise.all([
        // Statistiques de livraisons
        db.delivery.groupBy({
          by: ["status"],
          where: {
            merchantId,
            createdAt: { gte }},
          count: { id }}),

        // Statistiques de revenus
        db.payment.aggregate({
          where: {
            delivery: { merchantId },
            status: "COMPLETED",
            createdAt: { gte }},
          sum: { amount },
          avg: { amount },
          count: { id }}),

        // Statistiques de notation
        db.rating.aggregate({
          where: {
            delivery: { merchantId },
            createdAt: { gte }},
          avg: { rating },
          count: { id }}),

        // Taux de complétion
        db.delivery.count({
          where: {
            merchantId,
            status: "DELIVERED",
            createdAt: { gte }}})]);

    const totalDeliveries = deliveriesStats.reduce(
      (sum, stat) => sum + stat.count.id,
      0,
    );
    const completionRate =
      totalDeliveries > 0 ? (completionStats / totalDeliveries) * 100 : 0;

    return {
      period,
      periodStart: startDate,
      periodEnd: now,
      deliveries: {
        total: totalDeliveries,
        completed: completionStats,
        completionRate,
        byStatus: deliveriesStats},
      revenue: {
        total: revenueStats.sum.amount || 0,
        average: revenueStats.avg.amount || 0,
        transactionCount: revenueStats.count || 0},
      rating: {
        average: ratingStats.avg.rating || 0,
        count: ratingStats.count || 0}};
  }

  /**
   * Récupère les contrats d'un merchant
   * Compatible avec contract.router.ts existant
   */
  async getMerchantContracts(
    merchantId: string,
    options: {
      status?: ContractStatus;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { page = 1, limit = 10, status: status } = options;

    const where = {
      merchantId,
      ...(status && { status })};

    const [contracts, total] = await Promise.all([
      db.contract.findMany({
        where,
        include: {
          template: {
            select: {
              name: true,
              description: true}},
          amendments: {
            select: {
              id: true,
              title: true,
              createdAt: true},
            orderBy: {
              createdAt: "desc"},
            take: 3}},
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit}),

      db.contract.count({ where  })]);

    return {
      contracts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)}};
  }

  /**
   * Récupère les cycles de facturation d'un merchant
   * Compatible avec billingService existant
   */
  async getMerchantBillingCycles(
    merchantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
    } = {},
  ) {
    const { page = 1, limit = 10, status: status } = options;

    const where = {
      merchantId,
      ...(status && { status })};

    const [cycles, total] = await Promise.all([
      db.billingCycle.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              status: true,
              dueDate: true}}},
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit}),

      db.billingCycle.count({ where  })]);

    return {
      cycles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)}};
  }

  /**
   * Analyse des tendances de revenus
   */
  async getRevenueTrends(
    merchantId: string,
    startDate: Date,
    endDate: Date,
    groupBy: "DAY" | "WEEK" | "MONTH" = "DAY",
  ) {
    const payments = await db.payment.findMany({
      where: {
        delivery: { merchantId },
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate}},
      select: {
        amount: true,
        createdAt: true},
      orderBy: { createdAt: "asc" }});

    // Grouper les données selon la période
    const groupedData = payments.reduce(
      (acc, payment) => {
        let key: string;
        const date = payment.createdAt;

        switch (groupBy) {
          case "DAY":
            key = date.toISOString().split("T")[0];
            break;
          case "WEEK":
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - date.getDay());
            key = startOfWeek.toISOString().split("T")[0];
            break;
          case "MONTH":
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            break;
        }

        if (!acc[key]) {
          acc[key] = {
            period: key,
            amount: 0,
            count: 0};
        }

        acc[key].amount += parseFloat(payment.amount.toString());
        acc[key].count += 1;

        return acc;
      },
      {} as Record<string, { period: string; amount: number; count: number }>,
    );

    return Object.values(groupedData);
  }

  /**
   * Résumé des documents d'un merchant
   */
  async getMerchantDocumentsSummary(userId: string) {
    const documents = await db.document.groupBy({
      by: ["type", "status"],
      where: { userId },
      count: { id }});

    const summary = documents.reduce(
      (acc, doc) => {
        if (!acc[doc.type]) {
          acc[doc.type] = { total: 0, byStatus: {} };
        }
        acc[doc.type].total += doc.count.id;
        acc[doc.type].byStatus[doc.status] = doc.count.id;
        return acc;
      },
      {} as Record<string, { total: number; byStatus: Record<string, number> }>,
    );

    return summary;
  }
}

// Export de l'instance du service
export const merchantService = new MerchantService();
