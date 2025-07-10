import { prisma } from '@/lib/db'
import { z } from 'zod'

export interface Promotion {
  id: string
  merchantId: string
  name: string
  description: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING' | 'BUY_X_GET_Y' | 'MINIMUM_ORDER'
  code?: string
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'DISABLED'
  
  // Valeurs de réduction
  discountValue: number
  maxDiscountAmount?: number
  minimumOrderAmount?: number
  
  // Conditions spéciales
  buyQuantity?: number
  getQuantity?: number
  applicableProducts?: string[]
  applicableCategories?: string[]
  excludedProducts?: string[]
  
  // Limites d'utilisation
  usageLimit?: number
  usageLimitPerCustomer?: number
  currentUsageCount: number
  
  // Dates de validité
  startDate: Date
  endDate?: Date
  
  // Ciblage clients
  targetCustomerSegments?: string[]
  firstOrderOnly?: boolean
  
  // Paramètres avancés
  combinableWithOthers: boolean
  autoApply: boolean
  showOnWebsite: boolean
  
  createdAt: Date
  updatedAt: Date
}

export interface PromotionUsage {
  id: string
  promotionId: string
  orderId: string
  customerId: string
  discountAmount: number
  usedAt: Date
}

export interface PromotionStats {
  totalPromotions: number
  activePromotions: number
  totalUsage: number
  totalDiscountGiven: number
  revenueGenerated: number
  conversionRate: number
  topPerformingPromotions: Array<{
    promotionId: string
    name: string
    usageCount: number
    discountGiven: number
    revenueGenerated: number
    conversionRate: number
  }>
  promotionsByType: Array<{
    type: string
    count: number
    totalDiscount: number
    avgOrderValue: number
  }>
  monthlyTrends: Array<{
    month: string
    promotionsCreated: number
    totalUsage: number
    discountGiven: number
    revenue: number
  }>
}

export interface CampaignTemplate {
  id: string
  name: string
  description: string
  type: Promotion['type']
  recommendedSettings: Partial<Promotion>
  tags: string[]
  category: 'SEASONAL' | 'LOYALTY' | 'ACQUISITION' | 'RETENTION' | 'CLEARANCE'
}

export class MerchantPromotionsService {
  /**
   * Récupère toutes les promotions d'un commerçant
   */
  static async getPromotions(
    merchantId: string,
    filters?: {
      status?: string
      type?: string
      search?: string
      active?: boolean
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    }
  ): Promise<{
    promotions: Promotion[]
    total: number
    pagination: {
      page: number
      limit: number
      totalPages: number
    }
  }> {
    try {
      const page = filters?.page || 1
      const limit = filters?.limit || 20
      const skip = (page - 1) * limit

      // Construction des filtres
      const where: any = {
        merchantId
      }

      if (filters?.status) {
        where.status = filters.status
      }

      if (filters?.type) {
        where.type = filters.type
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } }
        ]
      }

      if (filters?.active) {
        const now = new Date()
        where.status = 'ACTIVE'
        where.startDate = { lte: now }
        where.OR = [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      }

      // Construction du tri
      const orderBy: any = {}
      if (filters?.sortBy) {
        orderBy[filters.sortBy] = filters.sortOrder || 'desc'
      } else {
        orderBy.createdAt = 'desc'
      }

      // Récupération des promotions
      const [promotions, total] = await Promise.all([
        prisma.promotion.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            _count: {
              select: {
                usages: true
              }
            }
          }
        }),
        prisma.promotion.count({ where })
      ])

      return {
        promotions: promotions.map(this.formatPromotion),
        total,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }

    } catch (error) {
      console.error('Erreur récupération promotions:', error)
      throw error
    }
  }

  /**
   * Récupère une promotion par ID
   */
  static async getPromotionById(promotionId: string, merchantId: string): Promise<Promotion | null> {
    try {
      const promotion = await prisma.promotion.findFirst({
        where: {
          id: promotionId,
          merchantId
        },
        include: {
          usages: {
            orderBy: { usedAt: 'desc' },
            take: 10,
            include: {
              order: {
                select: {
                  id: true,
                  totalAmount: true
                }
              },
              customer: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              usages: true
            }
          }
        }
      })

      return promotion ? this.formatPromotion(promotion) : null

    } catch (error) {
      console.error('Erreur récupération promotion:', error)
      throw error
    }
  }

  /**
   * Crée une nouvelle promotion
   */
  static async createPromotion(
    merchantId: string,
    promotionData: Omit<Promotion, 'id' | 'merchantId' | 'currentUsageCount' | 'createdAt' | 'updatedAt'>
  ): Promise<Promotion> {
    try {
      // Vérifier l'unicité du code si fourni
      if (promotionData.code) {
        const existingCode = await prisma.promotion.findFirst({
          where: {
            merchantId,
            code: promotionData.code,
            status: { not: 'DISABLED' }
          }
        })

        if (existingCode) {
          throw new Error('Une promotion avec ce code existe déjà')
        }
      }

      // Valider les dates
      if (promotionData.endDate && promotionData.endDate <= promotionData.startDate) {
        throw new Error('La date de fin doit être postérieure à la date de début')
      }

      // Valider les paramètres selon le type
      this.validatePromotionData(promotionData)

      const promotion = await prisma.promotion.create({
        data: {
          ...promotionData,
          merchantId,
          currentUsageCount: 0,
          applicableProducts: promotionData.applicableProducts ? JSON.stringify(promotionData.applicableProducts) : null,
          applicableCategories: promotionData.applicableCategories ? JSON.stringify(promotionData.applicableCategories) : null,
          excludedProducts: promotionData.excludedProducts ? JSON.stringify(promotionData.excludedProducts) : null,
          targetCustomerSegments: promotionData.targetCustomerSegments ? JSON.stringify(promotionData.targetCustomerSegments) : null
        }
      })

      return this.formatPromotion(promotion)

    } catch (error) {
      console.error('Erreur création promotion:', error)
      throw error
    }
  }

  /**
   * Met à jour une promotion
   */
  static async updatePromotion(
    promotionId: string,
    merchantId: string,
    updates: Partial<Promotion>
  ): Promise<Promotion> {
    try {
      // Vérifier que la promotion appartient au commerçant
      const existingPromotion = await prisma.promotion.findFirst({
        where: {
          id: promotionId,
          merchantId
        }
      })

      if (!existingPromotion) {
        throw new Error('Promotion non trouvée')
      }

      // Vérifier l'unicité du code si modifié
      if (updates.code && updates.code !== existingPromotion.code) {
        const existingCode = await prisma.promotion.findFirst({
          where: {
            merchantId,
            code: updates.code,
            id: { not: promotionId },
            status: { not: 'DISABLED' }
          }
        })

        if (existingCode) {
          throw new Error('Une promotion avec ce code existe déjà')
        }
      }

      // Empêcher la modification de certains champs si la promotion est active et utilisée
      if (existingPromotion.status === 'ACTIVE' && existingPromotion.currentUsageCount > 0) {
        const restrictedFields = ['type', 'discountValue', 'code']
        const hasRestrictedChanges = restrictedFields.some(field => 
          updates[field] !== undefined && updates[field] !== existingPromotion[field]
        )

        if (hasRestrictedChanges) {
          throw new Error('Impossible de modifier les paramètres principaux d\'une promotion active déjà utilisée')
        }
      }

      // Préparer les données de mise à jour
      const updateData: any = { ...updates }
      
      if (updates.applicableProducts) {
        updateData.applicableProducts = JSON.stringify(updates.applicableProducts)
      }
      
      if (updates.applicableCategories) {
        updateData.applicableCategories = JSON.stringify(updates.applicableCategories)
      }
      
      if (updates.excludedProducts) {
        updateData.excludedProducts = JSON.stringify(updates.excludedProducts)
      }
      
      if (updates.targetCustomerSegments) {
        updateData.targetCustomerSegments = JSON.stringify(updates.targetCustomerSegments)
      }

      delete updateData.id
      delete updateData.merchantId
      delete updateData.currentUsageCount
      delete updateData.createdAt
      delete updateData.updatedAt

      const promotion = await prisma.promotion.update({
        where: { id: promotionId },
        data: updateData
      })

      return this.formatPromotion(promotion)

    } catch (error) {
      console.error('Erreur mise à jour promotion:', error)
      throw error
    }
  }

  /**
   * Supprime une promotion
   */
  static async deletePromotion(promotionId: string, merchantId: string): Promise<void> {
    try {
      // Vérifier que la promotion appartient au commerçant
      const promotion = await prisma.promotion.findFirst({
        where: {
          id: promotionId,
          merchantId
        }
      })

      if (!promotion) {
        throw new Error('Promotion non trouvée')
      }

      // Vérifier qu'il n'y a pas d'utilisations en cours
      const activeUsages = await prisma.promotionUsage.count({
        where: {
          promotionId,
          order: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'PROCESSING']
            }
          }
        }
      })

      if (activeUsages > 0) {
        throw new Error('Impossible de supprimer une promotion avec des commandes en cours')
      }

      // Désactiver la promotion (soft delete)
      await prisma.promotion.update({
        where: { id: promotionId },
        data: {
          status: 'DISABLED',
          updatedAt: new Date()
        }
      })

    } catch (error) {
      console.error('Erreur suppression promotion:', error)
      throw error
    }
  }

  /**
   * Active/désactive une promotion
   */
  static async togglePromotionStatus(
    promotionId: string,
    merchantId: string,
    status: 'ACTIVE' | 'PAUSED'
  ): Promise<Promotion> {
    try {
      const promotion = await prisma.promotion.findFirst({
        where: {
          id: promotionId,
          merchantId
        }
      })

      if (!promotion) {
        throw new Error('Promotion non trouvée')
      }

      // Vérifier les conditions d'activation
      if (status === 'ACTIVE') {
        const now = new Date()
        
        if (promotion.startDate > now) {
          throw new Error('Impossible d\'activer une promotion avant sa date de début')
        }
        
        if (promotion.endDate && promotion.endDate <= now) {
          throw new Error('Impossible d\'activer une promotion expirée')
        }
      }

      const updatedPromotion = await prisma.promotion.update({
        where: { id: promotionId },
        data: { status }
      })

      return this.formatPromotion(updatedPromotion)

    } catch (error) {
      console.error('Erreur changement statut promotion:', error)
      throw error
    }
  }

  /**
   * Valide l'applicabilité d'une promotion à une commande
   */
  static async validatePromotionForOrder(
    promotionCode: string,
    orderId: string,
    customerId: string
  ): Promise<{
    valid: boolean
    promotion?: Promotion
    discountAmount?: number
    error?: string
  }> {
    try {
      // Récupérer la promotion
      const promotion = await prisma.promotion.findFirst({
        where: {
          code: promotionCode,
          status: 'ACTIVE'
        }
      })

      if (!promotion) {
        return { valid: false, error: 'Code promo invalide ou expiré' }
      }

      // Vérifier les dates
      const now = new Date()
      if (promotion.startDate > now) {
        return { valid: false, error: 'Cette promotion n\'est pas encore active' }
      }

      if (promotion.endDate && promotion.endDate <= now) {
        return { valid: false, error: 'Cette promotion a expiré' }
      }

      // Vérifier les limites d'utilisation
      if (promotion.usageLimit && promotion.currentUsageCount >= promotion.usageLimit) {
        return { valid: false, error: 'Cette promotion a atteint sa limite d\'utilisation' }
      }

      // Vérifier la limite par client
      if (promotion.usageLimitPerCustomer) {
        const customerUsage = await prisma.promotionUsage.count({
          where: {
            promotionId: promotion.id,
            customerId
          }
        })

        if (customerUsage >= promotion.usageLimitPerCustomer) {
          return { valid: false, error: 'Vous avez déjà utilisé cette promotion le nombre maximum de fois' }
        }
      }

      // Récupérer la commande pour validation
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      if (!order) {
        return { valid: false, error: 'Commande non trouvée' }
      }

      // Vérifier le montant minimum
      if (promotion.minimumOrderAmount && order.totalAmount < promotion.minimumOrderAmount) {
        return { 
          valid: false, 
          error: `Commande minimum de ${promotion.minimumOrderAmount}€ requise` 
        }
      }

      // Vérifier les produits applicables
      const applicableProducts = promotion.applicableProducts ? JSON.parse(promotion.applicableProducts) : null
      const excludedProducts = promotion.excludedProducts ? JSON.parse(promotion.excludedProducts) : null

      if (applicableProducts || excludedProducts) {
        const orderProductIds = order.items.map(item => item.productId)
        
        if (applicableProducts && !applicableProducts.some(id => orderProductIds.includes(id))) {
          return { valid: false, error: 'Cette promotion ne s\'applique pas aux produits de votre panier' }
        }

        if (excludedProducts && excludedProducts.some(id => orderProductIds.includes(id))) {
          return { valid: false, error: 'Certains produits de votre panier excluent cette promotion' }
        }
      }

      // Calculer le montant de la réduction
      const discountAmount = this.calculateDiscountAmount(promotion, order)

      return {
        valid: true,
        promotion: this.formatPromotion(promotion),
        discountAmount
      }

    } catch (error) {
      console.error('Erreur validation promotion:', error)
      return { valid: false, error: 'Erreur lors de la validation' }
    }
  }

  /**
   * Applique une promotion à une commande
   */
  static async applyPromotionToOrder(
    promotionId: string,
    orderId: string,
    customerId: string,
    discountAmount: number
  ): Promise<PromotionUsage> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Créer l'utilisation de promotion
        const usage = await tx.promotionUsage.create({
          data: {
            promotionId,
            orderId,
            customerId,
            discountAmount
          }
        })

        // Mettre à jour le compteur d'utilisation
        await tx.promotion.update({
          where: { id: promotionId },
          data: {
            currentUsageCount: {
              increment: 1
            }
          }
        })

        // Mettre à jour le montant de la commande
        await tx.order.update({
          where: { id: orderId },
          data: {
            discountAmount,
            totalAmount: {
              decrement: discountAmount
            }
          }
        })

        return usage
      })

    } catch (error) {
      console.error('Erreur application promotion:', error)
      throw error
    }
  }

  /**
   * Récupère les statistiques des promotions
   */
  static async getPromotionStats(merchantId: string, period?: string): Promise<PromotionStats> {
    try {
      const periodStart = this.getPeriodStart(period)

      const [
        totalPromotions,
        activePromotions,
        usageStats,
        topPromotions,
        promotionsByType,
        monthlyTrends
      ] = await Promise.all([
        // Total promotions
        prisma.promotion.count({
          where: { merchantId }
        }),

        // Promotions actives
        prisma.promotion.count({
          where: {
            merchantId,
            status: 'ACTIVE'
          }
        }),

        // Statistiques d'utilisation
        prisma.promotionUsage.aggregate({
          where: {
            promotion: { merchantId },
            usedAt: periodStart ? { gte: periodStart } : undefined
          },
          _count: true,
          _sum: {
            discountAmount: true
          }
        }),

        // Top promotions
        prisma.promotionUsage.groupBy({
          by: ['promotionId'],
          where: {
            promotion: { merchantId },
            usedAt: periodStart ? { gte: periodStart } : undefined
          },
          _count: true,
          _sum: {
            discountAmount: true
          },
          orderBy: {
            _count: {
              promotionId: 'desc'
            }
          },
          take: 10
        }),

        // Répartition par type
        prisma.promotion.groupBy({
          by: ['type'],
          where: { merchantId },
          _count: true
        }),

        // Tendances mensuelles (simulées)
        this.getMonthlyPromotionTrends(merchantId)
      ])

      // Calculs des métriques
      const totalUsage = usageStats._count || 0
      const totalDiscountGiven = usageStats._sum.discountAmount || 0

      // Revenue généré (estimation basée sur les commandes avec promotions)
      const revenueGenerated = await this.calculatePromotionRevenue(merchantId, periodStart)
      const conversionRate = totalUsage > 0 ? (totalUsage / totalPromotions) * 100 : 0

      // Top promotions avec détails
      const topPerformingPromotions = await Promise.all(
        topPromotions.map(async (promo) => {
          const promotion = await prisma.promotion.findUnique({
            where: { id: promo.promotionId },
            select: { name: true }
          })

          return {
            promotionId: promo.promotionId,
            name: promotion?.name || 'Promotion supprimée',
            usageCount: promo._count,
            discountGiven: promo._sum.discountAmount || 0,
            revenueGenerated: 0, // À calculer
            conversionRate: 0 // À calculer
          }
        })
      )

      // Répartition par type avec métriques
      const promotionsByTypeStats = promotionsByType.map(type => ({
        type: type.type,
        count: type._count,
        totalDiscount: 0, // À calculer
        avgOrderValue: 0 // À calculer
      }))

      return {
        totalPromotions,
        activePromotions,
        totalUsage,
        totalDiscountGiven,
        revenueGenerated,
        conversionRate,
        topPerformingPromotions,
        promotionsByType: promotionsByTypeStats,
        monthlyTrends: monthlyTrends
      }

    } catch (error) {
      console.error('Erreur statistiques promotions:', error)
      throw error
    }
  }

  /**
   * Récupère les templates de campagnes
   */
  static async getCampaignTemplates(): Promise<CampaignTemplate[]> {
    // Templates prédéfinis pour différents types de campagnes
    const templates: CampaignTemplate[] = [
      {
        id: 'welcome-new-customer',
        name: 'Bienvenue nouveau client',
        description: 'Réduction pour les nouveaux clients sur leur première commande',
        type: 'PERCENTAGE',
        category: 'ACQUISITION',
        tags: ['nouveaux-clients', 'acquisition', 'bienvenue'],
        recommendedSettings: {
          discountValue: 10,
          firstOrderOnly: true,
          usageLimitPerCustomer: 1,
          minimumOrderAmount: 30
        }
      },
      {
        id: 'seasonal-sale',
        name: 'Soldes saisonnières',
        description: 'Promotion saisonnière avec réduction sur toute la boutique',
        type: 'PERCENTAGE',
        category: 'SEASONAL',
        tags: ['soldes', 'saisonnier', 'boutique'],
        recommendedSettings: {
          discountValue: 20,
          showOnWebsite: true,
          autoApply: false
        }
      },
      {
        id: 'free-shipping',
        name: 'Livraison gratuite',
        description: 'Livraison offerte à partir d\'un montant minimum',
        type: 'FREE_SHIPPING',
        category: 'RETENTION',
        tags: ['livraison', 'gratuit', 'fidélisation'],
        recommendedSettings: {
          minimumOrderAmount: 50,
          autoApply: true
        }
      },
      {
        id: 'loyalty-reward',
        name: 'Récompense fidélité',
        description: 'Réduction pour les clients fidèles',
        type: 'FIXED_AMOUNT',
        category: 'LOYALTY',
        tags: ['fidélité', 'récompense', 'clients-vip'],
        recommendedSettings: {
          discountValue: 15,
          targetCustomerSegments: ['VIP', 'Premium']
        }
      },
      {
        id: 'clearance-sale',
        name: 'Déstockage',
        description: 'Liquidation de stock avec fortes réductions',
        type: 'PERCENTAGE',
        category: 'CLEARANCE',
        tags: ['déstockage', 'liquidation', 'fin-de-série'],
        recommendedSettings: {
          discountValue: 40,
          usageLimit: 100
        }
      }
    ]

    return templates
  }

  // Méthodes utilitaires privées
  private static formatPromotion(promotion: any): Promotion {
    return {
      ...promotion,
      applicableProducts: promotion.applicableProducts ? JSON.parse(promotion.applicableProducts) : undefined,
      applicableCategories: promotion.applicableCategories ? JSON.parse(promotion.applicableCategories) : undefined,
      excludedProducts: promotion.excludedProducts ? JSON.parse(promotion.excludedProducts) : undefined,
      targetCustomerSegments: promotion.targetCustomerSegments ? JSON.parse(promotion.targetCustomerSegments) : undefined
    }
  }

  private static validatePromotionData(data: any): void {
    switch (data.type) {
      case 'PERCENTAGE':
        if (data.discountValue <= 0 || data.discountValue > 100) {
          throw new Error('Le pourcentage de réduction doit être entre 1 et 100')
        }
        break
      
      case 'FIXED_AMOUNT':
        if (data.discountValue <= 0) {
          throw new Error('Le montant de réduction doit être positif')
        }
        break
      
      case 'BUY_X_GET_Y':
        if (!data.buyQuantity || !data.getQuantity) {
          throw new Error('Les quantités d\'achat et de gain sont requises')
        }
        break
    }
  }

  private static calculateDiscountAmount(promotion: any, order: any): number {
    switch (promotion.type) {
      case 'PERCENTAGE':
        const percentageDiscount = (order.totalAmount * promotion.discountValue) / 100
        return promotion.maxDiscountAmount 
          ? Math.min(percentageDiscount, promotion.maxDiscountAmount)
          : percentageDiscount

      case 'FIXED_AMOUNT':
        return Math.min(promotion.discountValue, order.totalAmount)

      case 'FREE_SHIPPING':
        return order.shippingCost || 0

      default:
        return 0
    }
  }

  private static getPeriodStart(period?: string): Date | null {
    if (!period) return null

    const now = new Date()
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      default:
        return null
    }
  }

  private static async calculatePromotionRevenue(merchantId: string, periodStart?: Date): Promise<number> {
    // Calculer le revenue généré par les promotions
    const orders = await prisma.order.findMany({
      where: {
        merchantId,
        status: 'COMPLETED',
        discountAmount: { gt: 0 },
        createdAt: periodStart ? { gte: periodStart } : undefined
      },
      select: {
        totalAmount: true,
        discountAmount: true
      }
    })

    return orders.reduce((sum, order) => sum + order.totalAmount, 0)
  }

  private static async getMonthlyPromotionTrends(merchantId: string) {
    // Simuler les tendances mensuelles
    // Dans une vraie app, calculer depuis les vraies données
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]

    return months.slice(-6).map(month => ({
      month,
      promotionsCreated: Math.floor(Math.random() * 10) + 1,
      totalUsage: Math.floor(Math.random() * 100) + 10,
      discountGiven: Math.floor(Math.random() * 1000) + 100,
      revenue: Math.floor(Math.random() * 5000) + 1000
    }))
  }
}

// Schémas de validation
export const promotionSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().min(10, 'La description doit faire au moins 10 caractères'),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING', 'BUY_X_GET_Y', 'MINIMUM_ORDER']),
  code: z.string().optional(),
  discountValue: z.number().positive('La valeur de réduction doit être positive'),
  maxDiscountAmount: z.number().positive().optional(),
  minimumOrderAmount: z.number().positive().optional(),
  buyQuantity: z.number().int().positive().optional(),
  getQuantity: z.number().int().positive().optional(),
  applicableProducts: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
  excludedProducts: z.array(z.string()).optional(),
  usageLimit: z.number().int().positive().optional(),
  usageLimitPerCustomer: z.number().int().positive().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  targetCustomerSegments: z.array(z.string()).optional(),
  firstOrderOnly: z.boolean().optional(),
  combinableWithOthers: z.boolean().optional(),
  autoApply: z.boolean().optional(),
  showOnWebsite: z.boolean().optional()
}) 