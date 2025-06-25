import { prisma } from '@/lib/db'

export interface FinancialSummary {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  commissionRevenue: number
  subscriptionRevenue: number
  serviceRevenue: number
  deliveryRevenue: number
  growthRate: number
  period: string
}

export interface CashFlowData {
  date: Date
  income: number
  expenses: number
  netFlow: number
  runningBalance: number
}

export interface RevenueBreakdown {
  commissions: {
    deliveries: number
    services: number
    storage: number
  }
  subscriptions: {
    free: number
    starter: number
    premium: number
  }
  fees: {
    processing: number
    platform: number
  }
}

export interface ExpenseBreakdown {
  operational: {
    salaries: number
    infrastructure: number
    marketing: number
  }
  payments: {
    delivererPayouts: number
    providerPayouts: number
    refunds: number
  }
  fees: {
    stripe: number
    banking: number
    legal: number
  }
}

export interface FinancialMetrics {
  cac: number // Customer Acquisition Cost
  ltv: number // Lifetime Value
  churnRate: number
  arpu: number // Average Revenue Per User
  grossMargin: number
  netMargin: number
}

export class FinancialManagementService {
  /**
   * Obtenir le résumé financier pour une période
   */
  static async getFinancialSummary(
    startDate: Date,
    endDate: Date
  ): Promise<FinancialSummary> {
    try {
      const [revenue, expenses, previousPeriod] = await Promise.all([
        this.calculateRevenue(startDate, endDate),
        this.calculateExpenses(startDate, endDate),
        this.getPreviousPeriodData(startDate, endDate)
      ])

      const netProfit = revenue.total - expenses.total
      const previousNetProfit = previousPeriod.revenue - previousPeriod.expenses
      
      const growthRate = previousNetProfit > 0 
        ? ((netProfit - previousNetProfit) / previousNetProfit) * 100 
        : 0

      return {
        totalRevenue: revenue.total,
        totalExpenses: expenses.total,
        netProfit,
        commissionRevenue: revenue.commissions,
        subscriptionRevenue: revenue.subscriptions,
        serviceRevenue: revenue.services,
        deliveryRevenue: revenue.deliveries,
        growthRate,
        period: `${startDate.toISOString().split('T')[0]} au ${endDate.toISOString().split('T')[0]}`
      }

    } catch (error) {
      console.error('Erreur calcul résumé financier:', error)
      throw error
    }
  }

  /**
   * Calculer les revenus pour une période
   */
  private static async calculateRevenue(startDate: Date, endDate: Date): Promise<any> {
    // Revenus des commissions sur livraisons
    const deliveryCommissions = await prisma.payment.aggregate({
      where: {
        type: 'DELIVERY',
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    // Revenus des commissions sur services
    const serviceCommissions = await prisma.payment.aggregate({
      where: {
        type: 'SERVICE',
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    // Revenus des abonnements
    const subscriptionRevenue = await prisma.payment.aggregate({
      where: {
        type: 'SUBSCRIPTION',
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    // Revenus du stockage
    const storageRevenue = await prisma.payment.aggregate({
      where: {
        type: 'STORAGE',
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    const deliveries = (deliveryCommissions._sum.amount || 0) * 0.15 // Commission 15%
    const services = (serviceCommissions._sum.amount || 0) * 0.15 // Commission 15%
    const subscriptions = subscriptionRevenue._sum.amount || 0
    const storage = storageRevenue._sum.amount || 0
    const commissions = deliveries + services

    return {
      deliveries,
      services,
      subscriptions,
      storage,
      commissions,
      total: deliveries + services + subscriptions + storage
    }
  }

  /**
   * Calculer les dépenses pour une période
   */
  private static async calculateExpenses(startDate: Date, endDate: Date): Promise<any> {
    // Paiements aux livreurs
    const delivererPayouts = await prisma.walletOperation.aggregate({
      where: {
        type: 'CREDIT',
        status: 'COMPLETED',
        description: { contains: 'livraison' },
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    // Paiements aux prestataires
    const providerPayouts = await prisma.payment.aggregate({
      where: {
        type: 'PROVIDER_MONTHLY',
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    // Frais Stripe (estimation 2.9% + 0.30€)
    const totalPayments = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true },
      _count: { id: true }
    })

    const stripeFees = ((totalPayments._sum.amount || 0) * 0.029) + (totalPayments._count.id * 0.30)

    // Remboursements
    const refunds = await prisma.payment.aggregate({
      where: {
        status: 'REFUNDED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    // Dépenses opérationnelles fixes (estimation mensuelle)
    const daysInPeriod = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    const monthlyOperational = 15000 // 15k€/mois estimation
    const operationalExpenses = (monthlyOperational / 30) * daysInPeriod

    const delivererCosts = delivererPayouts._sum.amount || 0
    const providerCosts = providerPayouts._sum.amount || 0
    const fees = stripeFees
    const refundCosts = refunds._sum.amount || 0
    const operational = operationalExpenses

    return {
      delivererCosts,
      providerCosts,
      fees,
      refundCosts,
      operational,
      total: delivererCosts + providerCosts + fees + refundCosts + operational
    }
  }

  /**
   * Obtenir les données de la période précédente
   */
  private static async getPreviousPeriodData(startDate: Date, endDate: Date): Promise<any> {
    const periodDuration = endDate.getTime() - startDate.getTime()
    const previousStart = new Date(startDate.getTime() - periodDuration)
    const previousEnd = new Date(endDate.getTime() - periodDuration)

    const [revenue, expenses] = await Promise.all([
      this.calculateRevenue(previousStart, previousEnd),
      this.calculateExpenses(previousStart, previousEnd)
    ])

    return {
      revenue: revenue.total,
      expenses: expenses.total
    }
  }

  /**
   * Obtenir les données de cash flow
   */
  static async getCashFlowData(
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<CashFlowData[]> {
    try {
      const cashFlow: CashFlowData[] = []
      let runningBalance = await this.getStartingBalance(startDate)

      const dates = this.generateDateRange(startDate, endDate, interval)

      for (let i = 0; i < dates.length - 1; i++) {
        const periodStart = dates[i]
        const periodEnd = dates[i + 1]

        const [income, expenses] = await Promise.all([
          this.calculateRevenue(periodStart, periodEnd),
          this.calculateExpenses(periodStart, periodEnd)
        ])

        const netFlow = income.total - expenses.total
        runningBalance += netFlow

        cashFlow.push({
          date: periodStart,
          income: income.total,
          expenses: expenses.total,
          netFlow,
          runningBalance
        })
      }

      return cashFlow

    } catch (error) {
      console.error('Erreur calcul cash flow:', error)
      throw error
    }
  }

  /**
   * Calculer les métriques financières
   */
  static async getFinancialMetrics(startDate: Date, endDate: Date): Promise<FinancialMetrics> {
    try {
      const [
        cac,
        ltv,
        churnRate,
        arpu,
        summary
      ] = await Promise.all([
        this.calculateCAC(startDate, endDate),
        this.calculateLTV(),
        this.calculateChurnRate(startDate, endDate),
        this.calculateARPU(startDate, endDate),
        this.getFinancialSummary(startDate, endDate)
      ])

      const grossMargin = summary.totalRevenue > 0 
        ? ((summary.totalRevenue - summary.totalExpenses * 0.7) / summary.totalRevenue) * 100 
        : 0

      const netMargin = summary.totalRevenue > 0 
        ? (summary.netProfit / summary.totalRevenue) * 100 
        : 0

      return {
        cac,
        ltv,
        churnRate,
        arpu,
        grossMargin,
        netMargin
      }

    } catch (error) {
      console.error('Erreur calcul métriques financières:', error)
      throw error
    }
  }

  /**
   * Calculer le coût d'acquisition client (CAC)
   */
  private static async calculateCAC(startDate: Date, endDate: Date): Promise<number> {
    // Estimation des coûts marketing (à ajuster selon les dépenses réelles)
    const marketingCosts = 5000 // 5k€ estimation

    const newClients = await prisma.client.count({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    })

    return newClients > 0 ? marketingCosts / newClients : 0
  }

  /**
   * Calculer la valeur vie client (LTV)
   */
  private static async calculateLTV(): Promise<number> {
    // Calcul basé sur l'ARPU moyen et la durée de vie moyenne
    const averageSubscriptionValue = await prisma.payment.aggregate({
      where: {
        type: 'SUBSCRIPTION',
        status: 'COMPLETED'
      },
      _avg: { amount: true }
    })

    const averageLifespanMonths = 24 // 24 mois estimation
    const monthlyARPU = averageSubscriptionValue._avg.amount || 0

    return monthlyARPU * averageLifespanMonths
  }

  /**
   * Calculer le taux de churn
   */
  private static async calculateChurnRate(startDate: Date, endDate: Date): Promise<number> {
    const startOfMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    const endOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

    const [startingCustomers, churnedCustomers] = await Promise.all([
      prisma.client.count({
        where: {
          createdAt: { lt: startOfMonth }
        }
      }),
      prisma.client.count({
        where: {
          user: {
            isActive: false,
            updatedAt: { gte: startOfMonth, lte: endOfMonth }
          }
        }
      })
    ])

    return startingCustomers > 0 ? (churnedCustomers / startingCustomers) * 100 : 0
  }

  /**
   * Calculer l'ARPU (Average Revenue Per User)
   */
  private static async calculateARPU(startDate: Date, endDate: Date): Promise<number> {
    const [totalRevenue, activeUsers] = await Promise.all([
      this.calculateRevenue(startDate, endDate),
      prisma.user.count({
        where: {
          isActive: true,
          role: { in: ['CLIENT', 'DELIVERER', 'PROVIDER'] }
        }
      })
    ])

    return activeUsers > 0 ? totalRevenue.total / activeUsers : 0
  }

  /**
   * Obtenir le solde initial
   */
  private static async getStartingBalance(date: Date): Promise<number> {
    // Calcul du solde cumulé jusqu'à la date donnée
    const balance = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { lt: date }
      },
      _sum: { amount: true }
    })

    return balance._sum.amount || 0
  }

  /**
   * Générer une plage de dates
   */
  private static generateDateRange(
    start: Date,
    end: Date,
    interval: 'daily' | 'weekly' | 'monthly'
  ): Date[] {
    const dates: Date[] = []
    const current = new Date(start)

    while (current <= end) {
      dates.push(new Date(current))

      switch (interval) {
        case 'daily':
          current.setDate(current.getDate() + 1)
          break
        case 'weekly':
          current.setDate(current.getDate() + 7)
          break
        case 'monthly':
          current.setMonth(current.getMonth() + 1)
          break
      }
    }

    dates.push(new Date(end))
    return dates
  }

  /**
   * Obtenir un rapport financier détaillé
   */
  static async getDetailedFinancialReport(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      const [
        summary,
        cashFlow,
        metrics,
        revenueBreakdown,
        expenseBreakdown
      ] = await Promise.all([
        this.getFinancialSummary(startDate, endDate),
        this.getCashFlowData(startDate, endDate, 'weekly'),
        this.getFinancialMetrics(startDate, endDate),
        this.getDetailedRevenueBreakdown(startDate, endDate),
        this.getDetailedExpenseBreakdown(startDate, endDate)
      ])

      return {
        summary,
        cashFlow,
        metrics,
        revenueBreakdown,
        expenseBreakdown,
        generatedAt: new Date(),
        period: {
          start: startDate,
          end: endDate
        }
      }

    } catch (error) {
      console.error('Erreur génération rapport financier:', error)
      throw error
    }
  }

  /**
   * Obtenir la répartition détaillée des revenus
   */
  private static async getDetailedRevenueBreakdown(
    startDate: Date,
    endDate: Date
  ): Promise<RevenueBreakdown> {
    // Implémentation détaillée de la répartition des revenus
    // (Code simplifié pour la démonstration)
    return {
      commissions: {
        deliveries: 0,
        services: 0,
        storage: 0
      },
      subscriptions: {
        free: 0,
        starter: 0,
        premium: 0
      },
      fees: {
        processing: 0,
        platform: 0
      }
    }
  }

  /**
   * Obtenir la répartition détaillée des dépenses
   */
  private static async getDetailedExpenseBreakdown(
    startDate: Date,
    endDate: Date
  ): Promise<ExpenseBreakdown> {
    // Implémentation détaillée de la répartition des dépenses
    // (Code simplifié pour la démonstration)
    return {
      operational: {
        salaries: 0,
        infrastructure: 0,
        marketing: 0
      },
      payments: {
        delivererPayouts: 0,
        providerPayouts: 0,
        refunds: 0
      },
      fees: {
        stripe: 0,
        banking: 0,
        legal: 0
      }
    }
  }
}