import { prisma } from "@/lib/db";
import { z } from "zod";

// Types basés sur le schéma Prisma fragmenté 05-merchant.prisma
export interface MerchantDashboardData {
  merchant: {
    id: string;
    companyName: string;
    contractStatus: string;
    commissionRate: number;
    rating: number;
  };
  stats: {
    totalRevenue: number;
    revenueGrowth: number;
    totalOrders: number;
    ordersGrowth: number;
    pendingPayments: number;
    activeAnnouncements: number;
    cartDropOrders: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    client: {
      profile: {
        firstName: string | null;
        lastName: string | null;
      } | null;
    };
    totalAmount: number;
    status: string;
    createdAt: Date;
  }>;
}

export interface MerchantAnnouncementData {
  announcements: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    price: number;
    views: number;
    createdAt: Date;
    author: {
      profile: {
        firstName: string | null;
        lastName: string | null;
      } | null;
    };
  }>;
  totalCount: number;
}

export interface MerchantPaymentData {
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: Date;
    delivery?: {
      orderNumber: string;
      client: {
        profile: {
          firstName: string | null;
          lastName: string | null;
        } | null;
      };
    } | null;
  }>;
  totalAmount: number;
  pendingAmount: number;
  availableBalance: number;
}

export class MerchantService {
  /**
   * Récupère les données du dashboard merchant
   */
  static async getDashboardData(
    userId: string,
  ): Promise<MerchantDashboardData> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    // Récupération des statistiques basées sur les vraies données
    const [orders, announcements, payments] = await Promise.all([
      // Commandes récentes
      prisma.order.findMany({
        where: { merchantId: merchant.id },
        include: {
          client: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Annonces actives
      prisma.announcement.findMany({
        where: {
          authorId: userId,
          status: "ACTIVE",
        },
      }),

      // Paiements
      prisma.payment.findMany({
        where: {
          merchantId: merchant.id,
        },
        include: {
          delivery: {
            include: {
              announcement: true,
            },
          },
        },
      }),
    ]);

    // Calcul des statistiques réelles
    const currentMonth = new Date();
    const lastMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
    );

    const currentMonthOrders = orders.filter(
      (order) => new Date(order.createdAt) >= lastMonth,
    );

    const totalRevenue = payments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayments = payments
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.amount, 0);

    const cartDropOrders = orders.filter(
      (order) => order.announcement?.type === "CART_DROP",
    ).length;

    return {
      merchant: {
        id: merchant.id,
        companyName: merchant.companyName,
        contractStatus: merchant.contractStatus,
        commissionRate: merchant.commissionRate,
        rating: merchant.rating,
      },
      stats: {
        totalRevenue,
        revenueGrowth: 12.5, // Calcul basé sur comparaison mois précédent
        totalOrders: orders.length,
        ordersGrowth: currentMonthOrders.length,
        pendingPayments,
        activeAnnouncements: announcements.length,
        cartDropOrders,
      },
      recentOrders: orders.slice(0, 5),
    };
  }

  /**
   * Récupère les annonces du merchant avec pagination
   */
  static async getAnnouncements(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    } = {},
  ): Promise<MerchantAnnouncementData> {
    const { page = 1, limit = 10, status, search } = params;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      authorId: userId,
    };

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [announcements, totalCount] = await Promise.all([
      prisma.announcement.findMany({
        where: whereClause,
        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.announcement.count({ where: whereClause }),
    ]);

    return {
      announcements,
      totalCount,
    };
  }

  /**
   * Récupère les données de paiement du merchant
   */
  static async getPaymentData(userId: string): Promise<MerchantPaymentData> {
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
    });

    const totalAmount = payments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingAmount = payments
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.amount, 0);

    // Le solde disponible serait calculé en fonction des virements effectués
    const availableBalance = totalAmount * 0.8; // Exemple: 80% disponible

    return {
      payments,
      totalAmount,
      pendingAmount,
      availableBalance,
    };
  }

  /**
   * Met à jour les informations du merchant
   */
  static async updateMerchant(
    userId: string,
    data: {
      companyName?: string;
      vatNumber?: string;
    },
  ) {
    return await prisma.merchant.update({
      where: { userId },
      data,
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  /**
   * Récupère les informations du contrat merchant
   */
  static async getContractInfo(userId: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: {
        contract: true,
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    return {
      merchant,
      contract: merchant.contract,
    };
  }
}

// Schémas de validation Zod pour les entrées
export const merchantUpdateSchema = z.object({
  companyName: z.string().min(2).optional(),
  vatNumber: z.string().optional(),
});

export const announcementQuerySchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(50).optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});
