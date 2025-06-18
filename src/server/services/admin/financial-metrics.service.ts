import { PrismaClient } from "@prisma/client";

export interface FinancialMetrics {
  totalRevenue: number;
  netProfit: number;
  pendingPayments: number;
  averageTransactionValue: number;
  transactionCount: number;
  monthlyGrowth: number;
  totalCommissions: number;
  totalPayouts: number;
  refunds: number;
  topRevenueSources: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
}

export interface RevenueBreakdown {
  deliveryFees: number;
  serviceFees: number;
  subscriptions: number;
  commissions: number;
  other: number;
}

export interface PaymentStats {
  byMethod: Array<{
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  byStatus: Array<{
    status: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}

export class FinancialMetricsService {
  constructor(private db: PrismaClient) {}

  /**
   * Get comprehensive financial metrics
   */
  async getFinancialMetrics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<FinancialMetrics> {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(endDate, timeRange);
      const previousStartDate = this.getPreviousStartDate(startDate, timeRange);

      // Get payments within the period
      const payments = await this.db.payment.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'COMPLETED'
        },
        select: {
          amount: true,
          currency: true,
          type: true,
          createdAt: true,
        }
      });

      // Get payments from previous period for growth calculation
      const previousPayments = await this.db.payment.findMany({
        where: {
          createdAt: {
            gte: previousStartDate,
            lt: startDate
          },
          status: 'COMPLETED'
        },
        select: {
          amount: true
        }
      });

      // Calculate basic metrics
      const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const previousRevenue = previousPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const monthlyGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Get commissions
      const commissions = await this.db.commission.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          amount: true,
          status: true
        }
      });

      const totalCommissions = commissions.reduce((sum, commission) => sum + commission.amount, 0);

      // Get withdrawal requests (payouts)
      const withdrawals = await this.db.withdrawalRequest.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'COMPLETED'
        },
        select: {
          amount: true
        }
      });

      const totalPayouts = withdrawals.reduce((sum, withdrawal) => sum + withdrawal.amount, 0);

      // Calculate net profit (simplified)
      const operatingCosts = totalRevenue * 0.3; // Assume 30% operating costs
      const netProfit = totalRevenue - totalCommissions - operatingCosts;

      // Get pending payments
      const pendingPayments = await this.db.payment.aggregate({
        where: {
          status: 'PENDING'
        },
        _sum: {
          amount: true
        }
      });

      // Calculate average transaction value
      const transactionCount = payments.length;
      const averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

      // Get refunds
      const refunds = await this.db.payment.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'REFUNDED'
        },
        _sum: {
          amount: true
        }
      });

      // Calculate top revenue sources
      const revenueByType = payments.reduce((acc, payment) => {
        const type = payment.type || 'OTHER';
        acc[type] = (acc[type] || 0) + payment.amount;
        return acc;
      }, {} as Record<string, number>);

      const topRevenueSources = Object.entries(revenueByType)
        .map(([source, amount]) => ({
          source,
          amount,
          percentage: (amount / totalRevenue) * 100
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        totalRevenue,
        netProfit,
        pendingPayments: pendingPayments._sum.amount || 0,
        averageTransactionValue,
        transactionCount,
        monthlyGrowth,
        totalCommissions,
        totalPayouts,
        refunds: refunds._sum.amount || 0,
        topRevenueSources
      };
    } catch (error) {
      console.error('Error getting financial metrics:', error);
      throw error;
    }
  }

  /**
   * Get revenue breakdown by category
   */
  async getRevenueBreakdown(timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<RevenueBreakdown> {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(endDate, timeRange);

      // Get deliveries for delivery fees
      const deliveries = await this.db.delivery.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'DELIVERED'
        },
        _sum: {
          totalAmount: true
        }
      });

      // Get service bookings for service fees
      const serviceBookings = await this.db.serviceBooking.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          totalPrice: true
        }
      });

      // Get subscriptions
      const subscriptions = await this.db.subscription.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'ACTIVE'
        },
        _sum: {
          amount: true
        }
      });

      // Get commissions
      const commissions = await this.db.commission.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true
        }
      });

      const deliveryFees = deliveries._sum.totalAmount || 0;
      const serviceFees = serviceBookings._sum.totalPrice || 0;
      const subscriptionFees = subscriptions._sum.amount || 0;
      const commissionFees = commissions._sum.amount || 0;

      // Calculate other revenue
      const totalRevenue = deliveryFees + serviceFees + subscriptionFees + commissionFees;
      const payments = await this.db.payment.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          status: 'COMPLETED'
        },
        _sum: {
          amount: true
        }
      });

      const otherRevenue = (payments._sum.amount || 0) - totalRevenue;

      return {
        deliveryFees,
        serviceFees,
        subscriptions: subscriptionFees,
        commissions: commissionFees,
        other: Math.max(0, otherRevenue)
      };
    } catch (error) {
      console.error('Error getting revenue breakdown:', error);
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<PaymentStats> {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(endDate, timeRange);

      const payments = await this.db.payment.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          paymentMethod: true
        }
      });

      const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const totalCount = payments.length;

      // Group by payment method
      const byMethodMap = payments.reduce((acc, payment) => {
        const method = payment.paymentMethod?.type || 'UNKNOWN';
        if (!acc[method]) {
          acc[method] = { amount: 0, count: 0 };
        }
        acc[method].amount += payment.amount;
        acc[method].count += 1;
        return acc;
      }, {} as Record<string, { amount: number; count: number }>);

      const byMethod = Object.entries(byMethodMap).map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
      }));

      // Group by status
      const byStatusMap = payments.reduce((acc, payment) => {
        const status = payment.status;
        if (!acc[status]) {
          acc[status] = { amount: 0, count: 0 };
        }
        acc[status].amount += payment.amount;
        acc[status].count += 1;
        return acc;
      }, {} as Record<string, { amount: number; count: number }>);

      const byStatus = Object.entries(byStatusMap).map(([status, data]) => ({
        status,
        amount: data.amount,
        count: data.count,
        percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0
      }));

      return {
        byMethod,
        byStatus
      };
    } catch (error) {
      console.error('Error getting payment stats:', error);
      throw error;
    }
  }

  private getStartDate(endDate: Date, timeRange: string): Date {
    const start = new Date(endDate);
    switch (timeRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return start;
  }

  private getPreviousStartDate(startDate: Date, timeRange: string): Date {
    const previousStart = new Date(startDate);
    switch (timeRange) {
      case '7d':
        previousStart.setDate(previousStart.getDate() - 7);
        break;
      case '30d':
        previousStart.setDate(previousStart.getDate() - 30);
        break;
      case '90d':
        previousStart.setDate(previousStart.getDate() - 90);
        break;
      case '1y':
        previousStart.setFullYear(previousStart.getFullYear() - 1);
        break;
    }
    return previousStart;
  }
}