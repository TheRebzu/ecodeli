import { prisma } from "@/lib/db";

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  commissionRevenue: number;
  subscriptionRevenue: number;
  serviceRevenue: number;
  deliveryRevenue: number;
  growthRate: number;
  period: string;
}

export interface CashFlowData {
  date: Date;
  income: number;
  expenses: number;
  netFlow: number;
  runningBalance: number;
}

export interface RevenueBreakdown {
  commissions: {
    deliveries: number;
    services: number;
    storage: number;
  };
  subscriptions: {
    free: number;
    starter: number;
    premium: number;
  };
  fees: {
    processing: number;
    platform: number;
  };
}

export interface ExpenseBreakdown {
  operational: {
    salaries: number;
    infrastructure: number;
    marketing: number;
  };
  payments: {
    delivererPayouts: number;
    providerPayouts: number;
    refunds: number;
  };
  fees: {
    stripe: number;
    banking: number;
    legal: number;
  };
}

export interface FinancialMetrics {
  cac: number; // Customer Acquisition Cost
  ltv: number; // Lifetime Value
  churnRate: number;
  arpu: number; // Average Revenue Per User
  grossMargin: number;
  netMargin: number;
}

export class FinancialManagementService {
  /**
   * Obtenir le résumé financier pour une période
   */
  static async getFinancialSummary(
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialSummary> {
    try {
      const [revenue, expenses, previousPeriod] = await Promise.all([
        this.calculateRevenue(startDate, endDate),
        this.calculateExpenses(startDate, endDate),
        this.getPreviousPeriodData(startDate, endDate),
      ]);

      const netProfit = revenue.total - expenses.total;
      const previousNetProfit =
        previousPeriod.revenue - previousPeriod.expenses;

      const growthRate =
        previousNetProfit > 0
          ? ((netProfit - previousNetProfit) / previousNetProfit) * 100
          : 0;

      return {
        totalRevenue: revenue.total,
        totalExpenses: expenses.total,
        netProfit,
        commissionRevenue: revenue.commissions,
        subscriptionRevenue: revenue.subscriptions,
        serviceRevenue: revenue.services,
        deliveryRevenue: revenue.deliveries,
        growthRate,
        period: `${startDate.toISOString().split("T")[0]} au ${endDate.toISOString().split("T")[0]}`,
      };
    } catch (error) {
      console.error("Erreur calcul résumé financier:", error);
      throw error;
    }
  }

  /**
   * Calculer les revenus pour une période
   */
  private static async calculateRevenue(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    // Revenus des commissions sur livraisons (payments liés aux deliveries)
    const deliveryCommissions = await prisma.payment.aggregate({
      where: {
        deliveryId: { not: null },
        status: "COMPLETED",
        paidAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // Revenus des commissions sur services (payments liés aux bookings)
    const serviceCommissions = await prisma.payment.aggregate({
      where: {
        bookingId: { not: null },
        status: "COMPLETED",
        paidAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // Revenus des abonnements (payments avec paymentMethod STRIPE et montants récurrents)
    const subscriptionRevenue = await prisma.payment.aggregate({
      where: {
        paymentMethod: "STRIPE",
        status: "COMPLETED",
        paidAt: { gte: startDate, lte: endDate },
        amount: { in: [9.9, 19.99] }, // Montants des abonnements Starter et Premium
      },
      _sum: { amount: true },
    });

    // Revenus du stockage (payments liés aux storage boxes)
    const storageRevenue = await prisma.payment.aggregate({
      where: {
        paymentMethod: "STRIPE",
        status: "COMPLETED",
        paidAt: { gte: startDate, lte: endDate },
        metadata: { path: ["type"], equals: "STORAGE" },
      },
      _sum: { amount: true },
    });

    const deliveries = (deliveryCommissions._sum.amount || 0) * 0.15; // Commission 15%
    const services = (serviceCommissions._sum.amount || 0) * 0.15; // Commission 15%
    const subscriptions = subscriptionRevenue._sum.amount || 0;
    const storage = storageRevenue._sum.amount || 0;
    const commissions = deliveries + services;

    return {
      deliveries,
      services,
      subscriptions,
      storage,
      commissions,
      total: deliveries + services + subscriptions + storage,
    };
  }

  /**
   * Calculer les dépenses pour une période
   */
  private static async calculateExpenses(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    // Paiements aux livreurs (wallet operations de type CREDIT)
    const delivererPayouts = await prisma.walletOperation.aggregate({
      where: {
        type: "CREDIT",
        status: "COMPLETED",
        description: { contains: "livraison" },
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // Paiements aux prestataires (payments avec paymentMethod BANK_TRANSFER)
    const providerPayouts = await prisma.payment.aggregate({
      where: {
        paymentMethod: "BANK_TRANSFER",
        status: "COMPLETED",
        paidAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    // Frais Stripe (estimation 2.9% + 0.30€)
    const totalPayments = await prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        paidAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalAmount = totalPayments._sum.amount || 0;
    const paymentCount = totalPayments._count.id || 0;
    const stripeFees = totalAmount * 0.029 + paymentCount * 0.3;

    // Frais opérationnels (estimation)
    const operationalExpenses = totalAmount * 0.05; // 5% des revenus

    const delivererPayoutsAmount = delivererPayouts._sum.amount || 0;
    const providerPayoutsAmount = providerPayouts._sum.amount || 0;

    return {
      delivererPayouts: delivererPayoutsAmount,
      providerPayouts: providerPayoutsAmount,
      stripeFees,
      operationalExpenses,
      total:
        delivererPayoutsAmount +
        providerPayoutsAmount +
        stripeFees +
        operationalExpenses,
    };
  }

  /**
   * Obtenir les données de la période précédente pour calculer la croissance
   */
  private static async getPreviousPeriodData(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate.getTime());

    const [revenue, expenses] = await Promise.all([
      this.calculateRevenue(previousStartDate, previousEndDate),
      this.calculateExpenses(previousStartDate, previousEndDate),
    ]);

    return {
      revenue: revenue.total,
      expenses: expenses.total,
    };
  }

  /**
   * Obtenir les données de cash flow
   */
  static async getCashFlowData(
    startDate: Date,
    endDate: Date,
    interval: "daily" | "weekly" | "monthly" = "daily",
  ): Promise<CashFlowData[]> {
    try {
      const dateRange = this.generateDateRange(startDate, endDate, interval);
      const cashFlowData: CashFlowData[] = [];
      let runningBalance = await this.getStartingBalance(startDate);

      for (const date of dateRange) {
        const nextDate = new Date(date);
        if (interval === "daily") {
          nextDate.setDate(nextDate.getDate() + 1);
        } else if (interval === "weekly") {
          nextDate.setDate(nextDate.getDate() + 7);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        // Revenus du jour
        const income = await prisma.payment.aggregate({
          where: {
            status: "COMPLETED",
            paidAt: { gte: date, lt: nextDate },
          },
          _sum: { amount: true },
        });

        // Dépenses du jour
        const expenses = await prisma.walletOperation.aggregate({
          where: {
            type: "CREDIT",
            status: "COMPLETED",
            createdAt: { gte: date, lt: nextDate },
          },
          _sum: { amount: true },
        });

        const incomeAmount = income._sum.amount || 0;
        const expensesAmount = expenses._sum.amount || 0;
        const netFlow = incomeAmount - expensesAmount;
        runningBalance += netFlow;

        cashFlowData.push({
          date,
          income: incomeAmount,
          expenses: expensesAmount,
          netFlow,
          runningBalance,
        });
      }

      return cashFlowData;
    } catch (error) {
      console.error("Erreur calcul cash flow:", error);
      throw error;
    }
  }

  /**
   * Obtenir les métriques financières
   */
  static async getFinancialMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialMetrics> {
    try {
      const [cac, ltv, churnRate, arpu] = await Promise.all([
        this.calculateCAC(startDate, endDate),
        this.calculateLTV(),
        this.calculateChurnRate(startDate, endDate),
        this.calculateARPU(startDate, endDate),
      ]);

      // Calculer les marges
      const revenue = await this.calculateRevenue(startDate, endDate);
      const expenses = await this.calculateExpenses(startDate, endDate);

      const grossMargin =
        revenue.total > 0
          ? ((revenue.total - expenses.total) / revenue.total) * 100
          : 0;
      const netMargin =
        revenue.total > 0
          ? ((revenue.total - expenses.total) / revenue.total) * 100
          : 0;

      return {
        cac,
        ltv,
        churnRate,
        arpu,
        grossMargin,
        netMargin,
      };
    } catch (error) {
      console.error("Erreur calcul métriques financières:", error);
      throw error;
    }
  }

  /**
   * Calculer le CAC (Customer Acquisition Cost)
   */
  private static async calculateCAC(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Coût marketing estimé
    const marketingCost = 5000; // Estimation mensuelle

    // Nouveaux utilisateurs sur la période
    const newUsers = await prisma.user.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    return newUsers > 0 ? marketingCost / newUsers : 0;
  }

  /**
   * Calculer le LTV (Lifetime Value)
   */
  private static async calculateLTV(): Promise<number> {
    // Calcul basé sur l'ARPU moyen et la durée de vie moyenne
    const averageSubscriptionValue = await prisma.payment.aggregate({
      where: {
        paymentMethod: "STRIPE",
        status: "COMPLETED",
        amount: { in: [9.9, 19.99] },
      },
      _avg: { amount: true },
    });

    const avgValue = averageSubscriptionValue._avg.amount || 0;
    const averageLifespan = 12; // mois en moyenne

    return avgValue * averageLifespan;
  }

  /**
   * Calculer le taux de churn
   */
  private static async calculateChurnRate(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Utilisateurs actifs au début de la période
    const activeUsersStart = await prisma.user.count({
      where: {
        createdAt: { lt: startDate },
        updatedAt: {
          gte: new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000),
        }, // Actif dans les 30 derniers jours
      },
    });

    // Utilisateurs qui ont fait des paiements dans la période
    const activeUsersPeriod = await prisma.user.count({
      where: {
        payments: {
          some: {
            status: "COMPLETED",
            paidAt: { gte: startDate, lte: endDate },
          },
        },
      },
    });

    return activeUsersStart > 0
      ? ((activeUsersStart - activeUsersPeriod) / activeUsersStart) * 100
      : 0;
  }

  /**
   * Calculer l'ARPU (Average Revenue Per User)
   */
  private static async calculateARPU(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const [totalRevenue, activeUsers] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          paidAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.user.count({
        where: {
          payments: {
            some: {
              status: "COMPLETED",
              paidAt: { gte: startDate, lte: endDate },
            },
          },
        },
      }),
    ]);

    const revenue = totalRevenue._sum.amount || 0;
    return activeUsers > 0 ? revenue / activeUsers : 0;
  }

  /**
   * Obtenir le solde de départ pour le cash flow
   */
  private static async getStartingBalance(date: Date): Promise<number> {
    // Calculer le solde cumulé jusqu'à la date de début
    const totalIncome = await prisma.payment.aggregate({
      where: {
        status: "COMPLETED",
        paidAt: { lt: date },
      },
      _sum: { amount: true },
    });

    const totalExpenses = await prisma.walletOperation.aggregate({
      where: {
        type: "CREDIT",
        status: "COMPLETED",
        createdAt: { lt: date },
      },
      _sum: { amount: true },
    });

    return (totalIncome._sum.amount || 0) - (totalExpenses._sum.amount || 0);
  }

  /**
   * Générer une plage de dates selon l'intervalle
   */
  private static generateDateRange(
    start: Date,
    end: Date,
    interval: "daily" | "weekly" | "monthly",
  ): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));

      if (interval === "daily") {
        current.setDate(current.getDate() + 1);
      } else if (interval === "weekly") {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return dates;
  }

  /**
   * Obtenir un rapport financier détaillé
   */
  static async getDetailedFinancialReport(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    try {
      const [summary, revenueBreakdown, expenseBreakdown, cashFlow] =
        await Promise.all([
          this.getFinancialSummary(startDate, endDate),
          this.getDetailedRevenueBreakdown(startDate, endDate),
          this.getDetailedExpenseBreakdown(startDate, endDate),
          this.getCashFlowData(startDate, endDate, "daily"),
        ]);

      return {
        summary,
        revenueBreakdown,
        expenseBreakdown,
        cashFlow,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Erreur génération rapport détaillé:", error);
      throw error;
    }
  }

  /**
   * Obtenir la répartition détaillée des revenus
   */
  private static async getDetailedRevenueBreakdown(
    startDate: Date,
    endDate: Date,
  ): Promise<RevenueBreakdown> {
    // Cette méthode peut être étendue pour plus de détails
    return {
      commissions: {
        deliveries: 0,
        services: 0,
        storage: 0,
      },
      subscriptions: {
        free: 0,
        starter: 0,
        premium: 0,
      },
      fees: {
        processing: 0,
        platform: 0,
      },
    };
  }

  /**
   * Obtenir la répartition détaillée des dépenses
   */
  private static async getDetailedExpenseBreakdown(
    startDate: Date,
    endDate: Date,
  ): Promise<ExpenseBreakdown> {
    // Cette méthode peut être étendue pour plus de détails
    return {
      operational: {
        salaries: 0,
        infrastructure: 0,
        marketing: 0,
      },
      payments: {
        delivererPayouts: 0,
        providerPayouts: 0,
        refunds: 0,
      },
      fees: {
        stripe: 0,
        banking: 0,
        legal: 0,
      },
    };
  }
}
