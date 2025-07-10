import { prisma } from '@/lib/db'
import { z } from 'zod'

export interface AnalyticsTimeRange {
  startDate: Date
  endDate: Date
  period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  timezone?: string
}

export interface RevenueMetrics {
  totalRevenue: number
  previousPeriodRevenue: number
  growthRate: number
  averageOrderValue: number
  totalOrders: number
  revenueByDay: Array<{
    date: string
    revenue: number
    orders: number
  }>
  topProducts: Array<{
    productId: string
    productName: string
    revenue: number
    quantity: number
    growthRate: number
  }>
}

export interface CustomerMetrics {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  customerRetentionRate: number
  averageCustomerLifetimeValue: number
  customersBySegment: Array<{
    segment: string
    count: number
    revenue: number
    percentage: number
  }>
  topCustomers: Array<{
    customerId: string
    customerName: string
    totalOrders: number
    totalRevenue: number
    lastOrderDate: Date
  }>
}

export interface DeliveryMetrics {
  totalDeliveries: number
  successfulDeliveries: number
  failedDeliveries: number
  averageDeliveryTime: number
  onTimeDeliveryRate: number
  deliveryZonePerformance: Array<{
    zone: string
    deliveries: number
    averageTime: number
    successRate: number
    revenue: number
  }>
  deliveryMethodBreakdown: Array<{
    method: string
    count: number
    percentage: number
    averageCost: number
  }>
}

export interface CartDropMetrics {
  totalCartDropOrders: number
  cartDropRevenue: number
  averageCartValue: number
  popularTimeSlots: Array<{
    timeSlot: string
    orders: number
    revenue: number
  }>
  zonePerformance: Array<{
    postalCode: string
    orders: number
    revenue: number
    averageDeliveryFee: number
  }>
  conversionRate: number
  abandonmentRate: number
}

export interface MarketingMetrics {
  totalPromotions: number
  activePromotions: number
  promotionRevenue: number
  promotionConversionRate: number
  topPerformingPromotions: Array<{
    promotionId: string
    promotionName: string
    usageCount: number
    revenue: number
    conversionRate: number
  }>
  customerAcquisitionCost: number
  marketingROI: number
}

export interface OperationalMetrics {
  inventoryTurnover: number
  stockoutEvents: number
  orderFulfillmentTime: number
  customerSatisfactionScore: number
  disputeRate: number
  refundRate: number
  operationalCosts: number
  profitMargin: number
}

export interface CompetitiveAnalysis {
  marketPosition: number
  competitorCount: number
  averageMarketPrice: number
  priceCompetitiveness: number
  marketShare: number
  competitiveAdvantages: string[]
  improvementAreas: string[]
}

export interface PredictiveInsights {
  forecastedRevenue: Array<{
    period: string
    predicted: number
    confidence: number
  }>
  seasonalTrends: Array<{
    period: string
    multiplier: number
    category: string
  }>
  riskFactors: Array<{
    factor: string
    impact: 'low' | 'medium' | 'high'
    probability: number
    mitigation: string
  }>
  opportunities: Array<{
    opportunity: string
    potentialRevenue: number
    effort: 'low' | 'medium' | 'high'
    timeline: string
  }>
}

export interface AnalyticsDashboard {
  overview: {
    revenue: RevenueMetrics
    customers: CustomerMetrics
    deliveries: DeliveryMetrics
    cartDrop: CartDropMetrics
  }
  marketing: MarketingMetrics
  operations: OperationalMetrics
  competitive: CompetitiveAnalysis
  insights: PredictiveInsights
  lastUpdated: Date
}

export class MerchantAnalyticsService {
  /**
   * Récupère le dashboard analytics complet
   */
  static async getDashboard(
    merchantId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<AnalyticsDashboard> {
    try {
      // Récupérer toutes les métriques en parallèle
      const [
        revenueMetrics,
        customerMetrics,
        deliveryMetrics,
        cartDropMetrics,
        marketingMetrics,
        operationalMetrics,
        competitiveAnalysis,
        predictiveInsights
      ] = await Promise.all([
        this.getRevenueMetrics(merchantId, timeRange),
        this.getCustomerMetrics(merchantId, timeRange),
        this.getDeliveryMetrics(merchantId, timeRange),
        this.getCartDropMetrics(merchantId, timeRange),
        this.getMarketingMetrics(merchantId, timeRange),
        this.getOperationalMetrics(merchantId, timeRange),
        this.getCompetitiveAnalysis(merchantId, timeRange),
        this.getPredictiveInsights(merchantId, timeRange)
      ])

      return {
        overview: {
          revenue: revenueMetrics,
          customers: customerMetrics,
          deliveries: deliveryMetrics,
          cartDrop: cartDropMetrics
        },
        marketing: marketingMetrics,
        operations: operationalMetrics,
        competitive: competitiveAnalysis,
        insights: predictiveInsights,
        lastUpdated: new Date()
      }

    } catch (error) {
      console.error('Erreur récupération dashboard:', error)
      throw error
    }
  }

  /**
   * Métriques de revenus
   */
  static async getRevenueMetrics(
    merchantId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<RevenueMetrics> {
    try {
      // Période actuelle
      const currentOrders = await prisma.order.findMany({
        where: {
          merchantId,
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          },
          status: 'DELIVERED'
        },
        include: {
          items: true
        }
      })

      // Période précédente pour comparaison
      const periodDuration = timeRange.endDate.getTime() - timeRange.startDate.getTime()
      const previousStartDate = new Date(timeRange.startDate.getTime() - periodDuration)
      const previousEndDate = new Date(timeRange.endDate.getTime() - periodDuration)

      const previousOrders = await prisma.order.findMany({
        where: {
          merchantId,
          createdAt: {
            gte: previousStartDate,
            lte: previousEndDate
          },
          status: 'DELIVERED'
        }
      })

      // Calculs
      const totalRevenue = currentOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      const previousPeriodRevenue = previousOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      const growthRate = previousPeriodRevenue > 0 
        ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
        : 0

      const totalOrders = currentOrders.length
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // Revenus par jour
      const revenueByDay = this.groupRevenueByPeriod(currentOrders, timeRange.period)

      // Top produits
      const productRevenue = new Map<string, { revenue: number, quantity: number, name: string }>()
      
      currentOrders.forEach(order => {
        order.items.forEach(item => {
          const current = productRevenue.get(item.name) || { revenue: 0, quantity: 0, name: item.name }
          current.revenue += item.totalPrice
          current.quantity += item.quantity
          productRevenue.set(item.name, current)
        })
      })

      const topProducts = Array.from(productRevenue.entries())
        .map(([productName, data]) => ({
          productId: productName,
          productName: data.name,
          revenue: data.revenue,
          quantity: data.quantity,
          growthRate: 0 // À calculer avec données période précédente
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      return {
        totalRevenue,
        previousPeriodRevenue,
        growthRate,
        averageOrderValue,
        totalOrders,
        revenueByDay,
        topProducts
      }

    } catch (error) {
      console.error('Erreur métriques revenus:', error)
      throw error
    }
  }

  /**
   * Métriques clients
   */
  static async getCustomerMetrics(
    merchantId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<CustomerMetrics> {
    try {
      // Clients ayant commandé dans la période
      const orders = await prisma.order.findMany({
        where: {
          merchantId,
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          }
        },
        include: {
          client: {
            include: {
              profile: true
            }
          }
        }
      })

      const uniqueCustomers = new Set(orders.map(order => order.clientId))
      const totalCustomers = uniqueCustomers.size

      // Nouveaux clients (première commande dans la période)
      const newCustomerIds = new Set<string>()
      for (const customerId of uniqueCustomers) {
        const firstOrder = await prisma.order.findFirst({
          where: {
            clientId: customerId,
            merchantId
          },
          orderBy: { createdAt: 'asc' }
        })

        if (firstOrder && firstOrder.createdAt >= timeRange.startDate) {
          newCustomerIds.add(customerId)
        }
      }

      const newCustomers = newCustomerIds.size
      const returningCustomers = totalCustomers - newCustomers

      // Taux de rétention (clients qui ont commandé à nouveau)
      const customerRetentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0

      // Valeur vie client moyenne
      const customerLifetimeValues = await this.calculateCustomerLifetimeValues(merchantId, Array.from(uniqueCustomers))
      const averageCustomerLifetimeValue = customerLifetimeValues.length > 0
        ? customerLifetimeValues.reduce((sum, clv) => sum + clv, 0) / customerLifetimeValues.length
        : 0

      // Segmentation clients
      const customersBySegment = await this.segmentCustomers(merchantId, timeRange)

      // Top clients
      const customerStats = new Map<string, { orders: number, revenue: number, lastOrder: Date, name: string }>()
      
      orders.forEach(order => {
        const current = customerStats.get(order.clientId) || { 
          orders: 0, 
          revenue: 0, 
          lastOrder: order.createdAt,
          name: `${order.client.profile?.firstName || ''} ${order.client.profile?.lastName || ''}`.trim() || order.client.email
        }
        current.orders += 1
        current.revenue += order.totalAmount
        if (order.createdAt > current.lastOrder) {
          current.lastOrder = order.createdAt
        }
        customerStats.set(order.clientId, current)
      })

      const topCustomers = Array.from(customerStats.entries())
        .map(([customerId, stats]) => ({
          customerId,
          customerName: stats.name,
          totalOrders: stats.orders,
          totalRevenue: stats.revenue,
          lastOrderDate: stats.lastOrder
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10)

      return {
        totalCustomers,
        newCustomers,
        returningCustomers,
        customerRetentionRate,
        averageCustomerLifetimeValue,
        customersBySegment,
        topCustomers
      }

    } catch (error) {
      console.error('Erreur métriques clients:', error)
      throw error
    }
  }

  /**
   * Métriques de livraison
   */
  static async getDeliveryMetrics(
    merchantId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<DeliveryMetrics> {
    try {
      const deliveries = await prisma.delivery.findMany({
        where: {
          announcement: {
            author: {
              merchant: {
                id: merchantId
              }
            }
          },
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          }
        },
        include: {
          announcement: {
            include: {
              author: {
                include: {
                  merchant: true
                }
              }
            }
          }
        }
      })

      const totalDeliveries = deliveries.length
      const successfulDeliveries = deliveries.filter(d => d.status === 'DELIVERED').length
      const failedDeliveries = deliveries.filter(d => d.status === 'FAILED').length

      // Temps de livraison moyen
      const completedDeliveries = deliveries.filter(d => d.actualDeliveryDate && d.createdAt)
      const averageDeliveryTime = completedDeliveries.length > 0
        ? completedDeliveries.reduce((sum, d) => {
            const deliveryTime = d.actualDeliveryDate!.getTime() - d.createdAt.getTime()
            return sum + (deliveryTime / (1000 * 60 * 60)) // en heures
          }, 0) / completedDeliveries.length
        : 0

      // Taux de livraison à l'heure
      const onTimeDeliveries = completedDeliveries.filter(d => {
        if (!d.deliveryDate || !d.actualDeliveryDate) return false
        return d.actualDeliveryDate <= d.deliveryDate
      }).length
      const onTimeDeliveryRate = completedDeliveries.length > 0 
        ? (onTimeDeliveries / completedDeliveries.length) * 100 
        : 0

      // Performance par zone
      const zoneStats = new Map<string, { deliveries: number, totalTime: number, successful: number, revenue: number }>()
      
      deliveries.forEach(delivery => {
        const zone = this.extractZoneFromAddress(delivery.announcement.deliveryAddress || 'Paris')
        const current = zoneStats.get(zone) || { deliveries: 0, totalTime: 0, successful: 0, revenue: 0 }
        
        current.deliveries += 1
        current.revenue += delivery.price
        
        if (delivery.status === 'DELIVERED') {
          current.successful += 1
          if (delivery.actualDeliveryDate && delivery.createdAt) {
            current.totalTime += (delivery.actualDeliveryDate.getTime() - delivery.createdAt.getTime()) / (1000 * 60 * 60)
          }
        }
        
        zoneStats.set(zone, current)
      })

      const deliveryZonePerformance = Array.from(zoneStats.entries())
        .map(([zone, stats]) => ({
          zone,
          deliveries: stats.deliveries,
          averageTime: stats.successful > 0 ? stats.totalTime / stats.successful : 0,
          successRate: stats.deliveries > 0 ? (stats.successful / stats.deliveries) * 100 : 0,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.deliveries - a.deliveries)

      // Répartition par méthode de livraison
      const methodStats = new Map<string, { count: number, totalCost: number }>()
      
      deliveries.forEach(delivery => {
        const method = delivery.isPartial ? 'Partielle' : 'Standard'
        const current = methodStats.get(method) || { count: 0, totalCost: 0 }
        current.count += 1
        current.totalCost += delivery.delivererFee || 0
        methodStats.set(method, current)
      })

      const deliveryMethodBreakdown = Array.from(methodStats.entries())
        .map(([method, stats]) => ({
          method,
          count: stats.count,
          percentage: totalDeliveries > 0 ? (stats.count / totalDeliveries) * 100 : 0,
          averageCost: stats.count > 0 ? stats.totalCost / stats.count : 0
        }))

      return {
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        averageDeliveryTime,
        onTimeDeliveryRate,
        deliveryZonePerformance,
        deliveryMethodBreakdown
      }

    } catch (error) {
      console.error('Erreur métriques livraison:', error)
      throw error
    }
  }

  /**
   * Métriques Lâcher de Chariot
   */
  static async getCartDropMetrics(
    merchantId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<CartDropMetrics> {
    try {
      // Récupérer les commandes lâcher de chariot (en utilisant les notes pour identifier)
      const cartDropOrders = await prisma.order.findMany({
        where: {
          merchantId,
          notes: {
            contains: 'CART_DROP'
          },
          createdAt: {
            gte: timeRange.startDate,
            lte: timeRange.endDate
          }
        }
      })

      const totalCartDropOrders = cartDropOrders.length
      const cartDropRevenue = cartDropOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      const averageCartValue = totalCartDropOrders > 0 ? cartDropRevenue / totalCartDropOrders : 0

      // Créneaux populaires
      const slotStats = new Map<string, { orders: number, revenue: number }>()
      
      cartDropOrders.forEach(order => {
        if (order.scheduledDate) {
          const timeSlot = this.formatTimeSlot(order.scheduledDate)
          const current = slotStats.get(timeSlot) || { orders: 0, revenue: 0 }
          current.orders += 1
          current.revenue += order.totalAmount
          slotStats.set(timeSlot, current)
        }
      })

      const popularTimeSlots = Array.from(slotStats.entries())
        .map(([timeSlot, stats]) => ({
          timeSlot,
          orders: stats.orders,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 10)

      // Performance par zone
      const zoneStats = new Map<string, { orders: number, revenue: number, totalFees: number }>()
      
      cartDropOrders.forEach(order => {
        const postalCode = this.extractPostalCodeFromAddress(order.deliveryAddress)
        const current = zoneStats.get(postalCode) || { orders: 0, revenue: 0, totalFees: 0 }
        current.orders += 1
        current.revenue += order.totalAmount
        current.totalFees += order.deliveryFee || 0
        zoneStats.set(postalCode, current)
      })

      const zonePerformance = Array.from(zoneStats.entries())
        .map(([postalCode, stats]) => ({
          postalCode,
          orders: stats.orders,
          revenue: stats.revenue,
          averageDeliveryFee: stats.orders > 0 ? stats.totalFees / stats.orders : 0
        }))
        .sort((a, b) => b.orders - a.orders)

      // Taux de conversion et abandon (simulé)
      const conversionRate = 75.5 // Simulation - à calculer avec vraies données
      const abandonmentRate = 24.5

      return {
        totalCartDropOrders,
        cartDropRevenue,
        averageCartValue,
        popularTimeSlots,
        zonePerformance,
        conversionRate,
        abandonmentRate
      }

    } catch (error) {
      console.error('Erreur métriques cart drop:', error)
      throw error
    }
  }

  /**
   * Métriques marketing
   */
  static async getMarketingMetrics(
    merchantId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<MarketingMetrics> {
    try {
      // Simuler les données marketing pour l'instant
      // Dans une vraie app, récupérer depuis les tables promotions, coupons, etc.
      
      return {
        totalPromotions: 15,
        activePromotions: 8,
        promotionRevenue: 12500.50,
        promotionConversionRate: 18.5,
        topPerformingPromotions: [
          {
            promotionId: 'promo1',
            promotionName: 'Livraison gratuite -50€',
            usageCount: 245,
            revenue: 8750.00,
            conversionRate: 22.3
          },
          {
            promotionId: 'promo2',
            promotionName: '10% première commande',
            usageCount: 156,
            revenue: 3750.50,
            conversionRate: 15.8
          }
        ],
        customerAcquisitionCost: 25.80,
        marketingROI: 3.2
      }

    } catch (error) {
      console.error('Erreur métriques marketing:', error)
      throw error
    }
  }

  /**
   * Métriques opérationnelles
   */
  static async getOperationalMetrics(
    merchantId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<OperationalMetrics> {
    try {
      // Simuler les métriques opérationnelles
      // Dans une vraie app, calculer depuis les vraies données
      
      return {
        inventoryTurnover: 8.5,
        stockoutEvents: 12,
        orderFulfillmentTime: 2.3, // heures
        customerSatisfactionScore: 4.6,
        disputeRate: 2.1,
        refundRate: 1.8,
        operationalCosts: 15750.00,
        profitMargin: 18.5
      }

    } catch (error) {
      console.error('Erreur métriques opérationnelles:', error)
      throw error
    }
  }

  /**
   * Analyse concurrentielle
   */
  static async getCompetitiveAnalysis(
    merchantId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<CompetitiveAnalysis> {
    try {
      // Simuler l'analyse concurrentielle
      return {
        marketPosition: 3,
        competitorCount: 12,
        averageMarketPrice: 45.20,
        priceCompetitiveness: 92.5,
        marketShare: 8.7,
        competitiveAdvantages: [
          'Livraison rapide',
          'Service client excellent',
          'Produits locaux'
        ],
        improvementAreas: [
          'Prix plus compétitifs',
          'Gamme de produits plus large',
          'Marketing digital'
        ]
      }

    } catch (error) {
      console.error('Erreur analyse concurrentielle:', error)
      throw error
    }
  }

  /**
   * Insights prédictifs
   */
  static async getPredictiveInsights(
    merchantId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<PredictiveInsights> {
    try {
      // Simuler les insights prédictifs
      return {
        forecastedRevenue: [
          { period: 'Janvier 2025', predicted: 18500, confidence: 85 },
          { period: 'Février 2025', predicted: 19200, confidence: 82 },
          { period: 'Mars 2025', predicted: 21800, confidence: 78 }
        ],
        seasonalTrends: [
          { period: 'Hiver', multiplier: 1.2, category: 'Alimentaire' },
          { period: 'Printemps', multiplier: 0.9, category: 'Vêtements' },
          { period: 'Été', multiplier: 1.4, category: 'Loisirs' }
        ],
        riskFactors: [
          {
            factor: 'Augmentation des coûts de livraison',
            impact: 'medium',
            probability: 0.65,
            mitigation: 'Négocier de nouveaux tarifs avec les transporteurs'
          },
          {
            factor: 'Concurrence accrue',
            impact: 'high',
            probability: 0.45,
            mitigation: 'Différenciation par la qualité de service'
          }
        ],
        opportunities: [
          {
            opportunity: 'Expansion vers nouveaux quartiers',
            potentialRevenue: 25000,
            effort: 'medium',
            timeline: '3-6 mois'
          },
          {
            opportunity: 'Partenariat avec producteurs locaux',
            potentialRevenue: 15000,
            effort: 'low',
            timeline: '1-2 mois'
          }
        ]
      }

    } catch (error) {
      console.error('Erreur insights prédictifs:', error)
      throw error
    }
  }

  // Méthodes utilitaires privées
  private static groupRevenueByPeriod(orders: any[], period: string) {
    const grouped = new Map<string, { revenue: number, orders: number }>()
    
    orders.forEach(order => {
      const date = this.formatDateForPeriod(order.createdAt, period)
      const current = grouped.get(date) || { revenue: 0, orders: 0 }
      current.revenue += order.totalAmount
      current.orders += 1
      grouped.set(date, current)
    })

    return Array.from(grouped.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private static formatDateForPeriod(date: Date, period: string): string {
    switch (period) {
      case 'day':
        return date.toISOString().split('T')[0]
      case 'week':
        const week = this.getWeekNumber(date)
        return `${date.getFullYear()}-W${week}`
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1
        return `${date.getFullYear()}-Q${quarter}`
      case 'year':
        return String(date.getFullYear())
      default:
        return date.toISOString().split('T')[0]
    }
  }

  private static getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  private static async calculateCustomerLifetimeValues(merchantId: string, customerIds: string[]): Promise<number[]> {
    // Calculer la CLV pour chaque client
    const clvPromises = customerIds.map(async (customerId) => {
      const customerOrders = await prisma.order.findMany({
        where: {
          clientId: customerId,
          merchantId,
          status: 'DELIVERED'
        }
      })

      return customerOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    })

    return Promise.all(clvPromises)
  }

  private static async segmentCustomers(merchantId: string, timeRange: AnalyticsTimeRange) {
    // Segmentation simple basée sur la valeur des commandes
    const segments = [
      { segment: 'VIP (>500€)', min: 500, max: Infinity },
      { segment: 'Premium (200-500€)', min: 200, max: 500 },
      { segment: 'Standard (50-200€)', min: 50, max: 200 },
      { segment: 'Occasionnel (<50€)', min: 0, max: 50 }
    ]

    const segmentResults = await Promise.all(
      segments.map(async (seg) => {
        const customers = await prisma.order.groupBy({
          by: ['clientId'],
          where: {
            merchantId,
            createdAt: {
              gte: timeRange.startDate,
              lte: timeRange.endDate
            },
            status: 'DELIVERED'
          },
          _sum: {
            totalAmount: true
          },
          having: {
            totalAmount: {
              _sum: {
                gte: seg.min,
                ...(seg.max !== Infinity && { lt: seg.max })
              }
            }
          }
        })

        const count = customers.length
        const revenue = customers.reduce((sum, c) => sum + (c._sum.totalAmount || 0), 0)

        return {
          segment: seg.segment,
          count,
          revenue,
          percentage: 0 // Sera calculé après
        }
      })
    )

    const totalCustomers = segmentResults.reduce((sum, seg) => sum + seg.count, 0)
    
    return segmentResults.map(seg => ({
      ...seg,
      percentage: totalCustomers > 0 ? (seg.count / totalCustomers) * 100 : 0
    }))
  }

  private static extractZoneFromAddress(address: string): string {
    // Extraire la zone depuis l'adresse (code postal ou arrondissement)
    const postalCodeMatch = address.match(/\b\d{5}\b/)
    return postalCodeMatch ? postalCodeMatch[0] : 'Inconnu'
  }

  private static extractPostalCodeFromAddress(address: string): string {
    const postalCodeMatch = address.match(/\b\d{5}\b/)
    return postalCodeMatch ? postalCodeMatch[0] : 'Inconnu'
  }

  private static formatTimeSlot(date: Date): string {
    const hour = date.getHours()
    if (hour < 12) return 'Matin (8h-12h)'
    if (hour < 17) return 'Après-midi (12h-17h)'
    return 'Soirée (17h-20h)'
  }
}

// Schémas de validation
export const analyticsTimeRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
  timezone: z.string().optional()
})

export const analyticsFiltersSchema = z.object({
  timeRange: analyticsTimeRangeSchema,
  includeMetrics: z.array(z.string()).optional(),
  excludeMetrics: z.array(z.string()).optional(),
  granularity: z.enum(['summary', 'detailed']).optional()
}) 