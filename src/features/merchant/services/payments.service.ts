import { prisma } from "@/lib/db";
import { z } from "zod";

export interface PaymentFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaymentStats {
  totalAmount: number;
  pendingAmount: number;
  availableBalance: number;
  completedPayments: number;
  pendingPayments: number;
  monthlyRevenue: number;
  monthlyGrowth: number;
}

export interface WithdrawalRequest {
  amount: number;
  bankAccount: string;
  reference?: string;
}

export class MerchantPaymentsService {
  /**
   * Récupère les statistiques de paiement
   */
  static async getPaymentStats(userId: string): Promise<PaymentStats> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    const payments = await prisma.payment.findMany({
      where: {
        merchantId: merchant.id,
      },
      include: {
        delivery: true,
      },
    });

    const completedPayments = payments.filter((p) => p.status === "COMPLETED");
    const pendingPayments = payments.filter((p) => p.status === "PENDING");

    const totalAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calcul du solde disponible (80% du total - exemple de commission)
    const availableBalance = totalAmount * 0.8;

    // Revenus du mois actuel
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );

    const monthlyPayments = completedPayments.filter(
      (p) => new Date(p.createdAt) >= firstDayOfMonth,
    );
    const monthlyRevenue = monthlyPayments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );

    // Calcul de la croissance (simulation)
    const monthlyGrowth = Math.random() * 20 - 5; // Entre -5% et +15%

    return {
      totalAmount,
      pendingAmount,
      availableBalance,
      completedPayments: completedPayments.length,
      pendingPayments: pendingPayments.length,
      monthlyRevenue,
      monthlyGrowth,
    };
  }

  /**
   * Récupère l'historique des paiements
   */
  static async getPaymentHistory(userId: string, filters: PaymentFilters = {}) {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = filters;
    const skip = (page - 1) * limit;

    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    const whereClause: any = {
      merchantId: merchant.id,
    };

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo);
      }
    }

    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
        include: {
          delivery: {
            include: {
              announcement: true,
              client: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where: whereClause }),
    ]);

    return {
      payments,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Demande un virement
   */
  static async requestWithdrawal(
    userId: string,
    withdrawalData: WithdrawalRequest,
  ) {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    // Vérifier le solde disponible
    const stats = await this.getPaymentStats(userId);

    if (withdrawalData.amount > stats.availableBalance) {
      throw new Error("Montant supérieur au solde disponible");
    }

    // Dans un vrai système, on créerait une demande de virement
    // Pour l'instant, on simule avec un paiement "WITHDRAWAL"
    const withdrawal = await prisma.payment.create({
      data: {
        merchantId: merchant.id,
        amount: -withdrawalData.amount, // Montant négatif pour un retrait
        status: "PENDING",
        type: "WITHDRAWAL",
        stripePaymentId: `withdrawal_${Date.now()}`,
        metadata: {
          bankAccount: withdrawalData.bankAccount,
          reference: withdrawalData.reference,
        },
      },
    });

    return withdrawal;
  }

  /**
   * Récupère les demandes de virement
   */
  static async getWithdrawals(userId: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    const withdrawals = await prisma.payment.findMany({
      where: {
        merchantId: merchant.id,
        type: "WITHDRAWAL",
      },
      orderBy: { createdAt: "desc" },
    });

    return withdrawals;
  }

  /**
   * Récupère les analytics de revenus
   */
  static async getRevenueAnalytics(
    userId: string,
    period: "week" | "month" | "year" = "month",
  ) {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    const payments = await prisma.payment.findMany({
      where: {
        merchantId: merchant.id,
        status: "COMPLETED",
      },
      include: {
        delivery: {
          include: {
            announcement: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Grouper les paiements par période
    const groupedData = new Map();

    payments.forEach((payment) => {
      let key: string;
      const date = new Date(payment.createdAt);

      switch (period) {
        case "week":
          // Grouper par semaine
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
          break;
        case "month":
          // Grouper par mois
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "year":
          // Grouper par année
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split("T")[0];
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          period: key,
          revenue: 0,
          transactions: 0,
          avgTransaction: 0,
        });
      }

      const periodData = groupedData.get(key);
      periodData.revenue += payment.amount;
      periodData.transactions += 1;
      periodData.avgTransaction = periodData.revenue / periodData.transactions;
    });

    return Array.from(groupedData.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  }
}

// Schémas de validation Zod
export const paymentFiltersSchema = z.object({
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(50).optional(),
});

export const withdrawalRequestSchema = z.object({
  amount: z.number().positive("Le montant doit être positif"),
  bankAccount: z.string().min(10, "Compte bancaire requis"),
  reference: z.string().optional(),
});
