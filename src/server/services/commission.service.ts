import { db } from '../db';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentService } from './payment.service';
import { walletService } from './wallet.service';
import { TRPCError } from '@trpc/server';
import { endOfMonth, startOfMonth, format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { invoiceService } from './invoice.service';
import { CommissionStatus, ServiceType, UserRole } from '@prisma/client';

// Vérifier si le wallet service est correctement initialisé
const isWalletServiceAvailable = () => {
  try {
    return walletService && typeof walletService.getUserWallet === 'function';
  } catch (error) {
    console.warn("WalletService n'est pas disponible:", error);
    return false;
  }
};

/**
 * Taux de commission par défaut pour chaque type de service
 */
export const DEFAULT_COMMISSION_RATES = {
  DELIVERY: 0.15, // 15% pour les livraisons
  SERVICE: 0.2, // 20% pour les services
  STORAGE: 0.1, // 10% pour le stockage
  CUSTOM: 0.12, // 12% pour les services personnalisés
};

/**
 * Service de gestion des commissions
 */
export const commissionService = {
  /**
   * Taux de commission par défaut
   */
  DEFAULT_RATES: {
    DELIVERY: 0.15, // 15% sur les livraisons
    SERVICE: 0.2, // 20% sur les services
    SUBSCRIPTION: 0, // Pas de commission sur les abonnements
  },

  /**
   * Calcule et enregistre la commission pour un paiement
   */
  async calculateCommission(paymentId: string) {
    // Récupérer le paiement complet
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        delivery: true,
        service: true,
        subscription: true,
      },
    });

    if (!payment) {
      throw new Error('Paiement non trouvé');
    }

    if (payment.status !== 'COMPLETED') {
      throw new Error('Impossible de calculer la commission pour un paiement non complété');
    }

    // Vérifier si une commission existe déjà
    const existingCommission = await db.commission.findUnique({
      where: { paymentId },
    });

    if (existingCommission) {
      return existingCommission;
    }

    // Déterminer le type de paiement et le taux de commission applicable
    let type = 'UNKNOWN';
    let rate = 0;

    if (payment.deliveryId) {
      type = 'DELIVERY';
      rate = payment.commissionRate ? Number(payment.commissionRate) : this.DEFAULT_RATES.DELIVERY;
    } else if (payment.serviceId) {
      type = 'SERVICE';
      rate = payment.commissionRate ? Number(payment.commissionRate) : this.DEFAULT_RATES.SERVICE;
    } else if (payment.subscriptionId) {
      type = 'SUBSCRIPTION';
      rate = this.DEFAULT_RATES.SUBSCRIPTION;
    }

    // Chercher des promotions actives qui pourraient modifier le taux
    const promotion = await db.promotionRecord.findFirst({
      where: {
        isActive: true,
        serviceType: type,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Appliquer la promotion si elle existe
    const originalRate = rate;
    let discountAmount = new Decimal(0);

    if (promotion) {
      rate = Number(promotion.rate);
      discountAmount = new Decimal(payment.amount).times(originalRate - rate);
    }

    // Calculer le montant de la commission
    const commissionAmount = new Decimal(payment.amount).times(rate);

    // Créer l'enregistrement de la commission
    const commission = await db.commission.create({
      data: {
        paymentId,
        amount: commissionAmount,
        rate: new Decimal(rate),
        type,
        status: 'PENDING',
        calculatedAt: new Date(),
        promotionId: promotion?.id,
        originalRate: promotion ? new Decimal(originalRate) : undefined,
        discountAmount: promotion ? discountAmount : undefined,
      },
    });

    return commission;
  },

  /**
   * Traite le paiement de la commission (déduction du portefeuille du prestataire/livreur)
   */
  async processCommission(commissionId: string) {
    const commission = await db.commission.findUnique({
      where: { id: commissionId },
      include: {
        payment: {
          include: {
            delivery: {
              include: {
                deliverer: true,
              },
            },
            service: {
              include: {
                provider: true,
              },
            },
          },
        },
      },
    });

    if (!commission) {
      throw new Error('Commission non trouvée');
    }

    if (commission.status !== 'PENDING') {
      throw new Error(`Cette commission est déjà ${commission.status.toLowerCase()}`);
    }

    const payment = commission.payment;

    // Déterminer l'utilisateur et le portefeuille
    let userId: string | undefined;

    if (payment.delivery?.deliverer) {
      userId = payment.delivery.delivererId as string;
    } else if (payment.service?.provider) {
      userId = payment.service.providerId as string;
    }

    if (!userId) {
      throw new Error("Impossible de déterminer l'utilisateur pour cette commission");
    }

    // Récupérer le portefeuille de l'utilisateur
    const wallet = await db.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('Portefeuille non trouvé pour cet utilisateur');
    }

    // Déduire la commission du portefeuille
    try {
      await walletService.deductFunds(
        wallet.id,
        Number(commission.amount),
        `commission-${commission.id}`,
        'PLATFORM_FEE',
        `Commission EcoDeli pour ${
          payment.deliveryId ? 'livraison' : 'service'
        } (${commission.rate.times(100)}%)`
      );

      // Mettre à jour le statut de la commission
      await db.commission.update({
        where: { id: commissionId },
        data: {
          status: 'PROCESSED',
          paidAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        commission: await db.commission.findUnique({ where: { id: commissionId } }),
      };
    } catch (error) {
      console.error('Erreur lors du traitement de la commission:', error);

      // Mettre à jour le statut en cas d'échec
      await db.commission.update({
        where: { id: commissionId },
        data: {
          status: 'FAILED',
          updatedAt: new Date(),
        },
      });

      throw error;
    }
  },

  /**
   * Récupère les commissions sur une période
   */
  async getCommissions(filters: {
    startDate?: Date;
    endDate?: Date;
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { startDate, endDate, type, status, page = 1, limit = 20 } = filters;

    // Construire les filtres
    const where: any = {};

    if (startDate && endDate) {
      where.calculatedAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    // Calculer le décalage pour la pagination
    const skip = (page - 1) * limit;

    // Récupérer les commissions
    const [commissions, total] = await Promise.all([
      db.commission.findMany({
        where,
        include: {
          payment: {
            include: {
              delivery: true,
              service: true,
            },
          },
        },
        orderBy: { calculatedAt: 'desc' },
        skip,
        take: limit,
      }),
      db.commission.count({ where }),
    ]);

    // Calculer les totaux
    const totalAmount = commissions.reduce(
      (sum, commission) => sum.plus(commission.amount),
      new Decimal(0)
    );

    // Préparer les métadonnées de pagination
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      commissions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
      summary: {
        totalAmount,
        count: commissions.length,
      },
    };
  },

  /**
   * Génère un rapport de commissions pour une période
   */
  async generateCommissionReport(startDate: Date, endDate: Date) {
    // Récupérer toutes les commissions de la période
    const commissions = await db.commission.findMany({
      where: {
        calculatedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'PROCESSED',
      },
      include: {
        payment: {
          include: {
            delivery: true,
            service: true,
          },
        },
      },
    });

    // Calculer les statistiques par type
    const byType = commissions.reduce((acc: any, commission) => {
      if (!acc[commission.type]) {
        acc[commission.type] = {
          count: 0,
          total: new Decimal(0),
        };
      }

      acc[commission.type].count++;
      acc[commission.type].total = acc[commission.type].total.plus(commission.amount);

      return acc;
    }, {});

    // Calculer les totaux
    const totalCommissions = commissions.reduce(
      (sum, commission) => sum.plus(commission.amount),
      new Decimal(0)
    );

    // Préparer les données du rapport
    const reportData = {
      period: {
        startDate,
        endDate,
      },
      summary: {
        totalCommissions,
        commissionCount: commissions.length,
        byType,
      },
      details: commissions,
    };

    // Créer l'enregistrement de rapport financier
    const report = await db.financialReport.create({
      data: {
        name: `Rapport de commissions ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
        type: 'COMMISSION',
        period: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
        startDate,
        endDate,
        data: reportData,
        totalRevenue: totalCommissions,
        totalCommissions,
        transactionCount: commissions.length,
        status: 'GENERATED',
        generatedAt: new Date(),
      },
    });

    return {
      report,
      data: reportData,
    };
  },

  /**
   * Met à jour les taux de commission par défaut (admin seulement)
   */
  async updateCommissionRates(newRates: {
    DELIVERY?: number;
    SERVICE?: number;
    SUBSCRIPTION?: number;
  }) {
    // Cette fonction simule la mise à jour des taux de commission
    // Dans un système réel, ces taux pourraient être stockés dans la base de données

    if (newRates.DELIVERY !== undefined) {
      if (newRates.DELIVERY < 0 || newRates.DELIVERY > 1) {
        throw new Error('Le taux de commission doit être entre 0 et 1');
      }
      this.DEFAULT_RATES.DELIVERY = newRates.DELIVERY;
    }

    if (newRates.SERVICE !== undefined) {
      if (newRates.SERVICE < 0 || newRates.SERVICE > 1) {
        throw new Error('Le taux de commission doit être entre 0 et 1');
      }
      this.DEFAULT_RATES.SERVICE = newRates.SERVICE;
    }

    if (newRates.SUBSCRIPTION !== undefined) {
      if (newRates.SUBSCRIPTION < 0 || newRates.SUBSCRIPTION > 1) {
        throw new Error('Le taux de commission doit être entre 0 et 1');
      }
      this.DEFAULT_RATES.SUBSCRIPTION = newRates.SUBSCRIPTION;
    }

    // Créer un enregistrement de promotion pour suivre ce changement
    await db.promotionRecord.create({
      data: {
        type: 'COMMISSION_RATE_CHANGE',
        serviceType: null, // Affecte tous les services
        rate: new Decimal(0), // Non utilisé pour ce type d'enregistrement
        startDate: new Date(),
        endDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 ans
        isActive: true,
        description: `Mise à jour des taux de commission: Livraison=${this.DEFAULT_RATES.DELIVERY}, Service=${this.DEFAULT_RATES.SERVICE}, Abonnement=${this.DEFAULT_RATES.SUBSCRIPTION}`,
      },
    });

    return {
      success: true,
      rates: { ...this.DEFAULT_RATES },
    };
  },

  /**
   * Crée une promotion temporaire sur les commissions
   */
  async createCommissionPromotion(data: {
    serviceType: string;
    rate: number;
    startDate: Date;
    endDate: Date;
    description: string;
  }) {
    const { serviceType, rate, startDate, endDate, description } = data;

    // Vérifier que le taux est valide
    if (rate < 0 || rate > 1) {
      throw new Error('Le taux de commission doit être entre 0 et 1');
    }

    // Vérifier que les dates sont valides
    if (startDate >= endDate) {
      throw new Error('La date de début doit être antérieure à la date de fin');
    }

    // Créer la promotion
    const promotion = await db.promotionRecord.create({
      data: {
        type: 'COMMISSION',
        serviceType,
        rate: new Decimal(rate),
        startDate,
        endDate,
        isActive: true,
        description,
      },
    });

    return promotion;
  },

  async getActiveCommissionRates() {
    return db.commission.findMany({
      where: { isActive: true },
    });
  },

  async calculateCommission(amount: number, serviceType: string, userRole: string) {
    // Trouver la commission applicable
    const commission = await db.commission.findFirst({
      where: {
        isActive: true,
        serviceType,
        applicableRoles: {
          has: userRole,
        },
      },
    });

    if (!commission) {
      return {
        rate: 0.05, // Taux par défaut de 5%
        amount: amount * 0.05,
      };
    }

    let commissionAmount = 0;

    if (commission.calculationType === 'PERCENTAGE') {
      commissionAmount = amount * Number(commission.rate);
    } else if (commission.calculationType === 'FLAT_FEE') {
      commissionAmount = Number(commission.flatFee || 0);
    }

    // Appliquer min/max si définis
    if (commission.minimumAmount && commissionAmount < Number(commission.minimumAmount)) {
      commissionAmount = Number(commission.minimumAmount);
    }

    if (commission.maximumAmount && commissionAmount > Number(commission.maximumAmount)) {
      commissionAmount = Number(commission.maximumAmount);
    }

    return {
      rate: Number(commission.rate),
      amount: commissionAmount,
    };
  },

  async processServiceCommission(serviceId: string, totalAmount: number) {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: {
        provider: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!service) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Service non trouvé',
      });
    }

    // Calculer la commission
    const { amount: commissionAmount } = await this.calculateCommission(
      totalAmount,
      'SERVICE',
      'PROVIDER'
    );

    // Créer l'enregistrement de commission
    const commission = await db.commission.create({
      data: {
        rate: commissionAmount / totalAmount,
        serviceType: 'SERVICE',
        calculationType: 'PERCENTAGE',
        isActive: true,
        applicableRoles: ['PROVIDER'],
        description: `Commission sur service #${serviceId}`,
      },
    });

    // Ajouter le montant au portefeuille du prestataire (moins la commission)
    const providerWallet = await walletService.getWallet(service.provider.userId);
    await walletService.createTransaction(providerWallet.id, {
      amount: totalAmount - commissionAmount,
      type: 'EARNING',
      description: `Paiement pour service #${serviceId} (commission déduite)`,
      metadata: {
        serviceId,
        commissionId: commission.id,
        commissionAmount,
      },
    });

    return {
      totalAmount,
      commissionAmount,
      providerAmount: totalAmount - commissionAmount,
    };
  },

  async processDeliveryCommission(deliveryId: string, totalAmount: number) {
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        deliverer: true,
      },
    });

    if (!delivery || !delivery.delivererId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Livraison non trouvée ou livreur non assigné',
      });
    }

    // Calculer la commission
    const { amount: commissionAmount } = await this.calculateCommission(
      totalAmount,
      'DELIVERY',
      'DELIVERER'
    );

    // Créer l'enregistrement de commission
    const commission = await db.commission.create({
      data: {
        rate: commissionAmount / totalAmount,
        serviceType: 'DELIVERY',
        calculationType: 'PERCENTAGE',
        isActive: true,
        applicableRoles: ['DELIVERER'],
        description: `Commission sur livraison #${deliveryId}`,
      },
    });

    // Ajouter le montant au portefeuille du livreur (moins la commission)
    const delivererWallet = await walletService.getWallet(delivery.delivererId);
    await walletService.createTransaction(delivererWallet.id, {
      amount: totalAmount - commissionAmount,
      type: 'EARNING',
      description: `Paiement pour livraison #${deliveryId} (commission déduite)`,
      metadata: {
        deliveryId,
        commissionId: commission.id,
        commissionAmount,
      },
    });

    return {
      totalAmount,
      commissionAmount,
      delivererAmount: totalAmount - commissionAmount,
    };
  },

  /**
   * Calcule la commission pour un paiement
   */
  async calculateCommission(
    amount: number,
    serviceType: ServiceType,
    userRole: UserRole
  ): Promise<{
    commissionAmount: number;
    commissionRate: number;
    netAmount: number;
  }> {
    // Récupérer le taux de commission actif pour ce type de service et rôle
    const activeCommission = await db.commission.findFirst({
      where: {
        serviceType,
        applicableRoles: { has: userRole },
        isActive: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Utiliser le taux par défaut si aucune commission personnalisée n'est trouvée
    const commissionRate = activeCommission
      ? Number(activeCommission.rate)
      : DEFAULT_COMMISSION_RATES[serviceType] || 0.15;

    // Calculer le montant de la commission
    const commissionAmount = amount * commissionRate;

    // Montant net après commission
    const netAmount = amount - commissionAmount;

    return {
      commissionAmount,
      commissionRate,
      netAmount,
    };
  },

  /**
   * Enregistre une commission pour un paiement
   */
  async createCommission(data: {
    paymentId: string;
    amount: number;
    rate: number;
    serviceType: ServiceType;
    description: string;
    userId: string;
    deliveryId?: string;
    serviceId?: string;
    metadata?: Record<string, any>;
  }) {
    const {
      paymentId,
      amount,
      rate,
      serviceType,
      description,
      userId,
      deliveryId,
      serviceId,
      metadata = {},
    } = data;

    // Vérifier que le paiement existe
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Paiement non trouvé',
      });
    }

    // Créer l'enregistrement de commission
    const commission = await db.commission.create({
      data: {
        amount: new Decimal(amount),
        rate: new Decimal(rate),
        status: CommissionStatus.PENDING,
        serviceType,
        description,
        userId,
        paymentId,
        deliveryId,
        serviceId,
        isActive: true,
        applicableRoles: [userId ? await this._getUserRole(userId) : 'DELIVERER'],
        metadata,
      },
    });

    return commission;
  },

  /**
   * Génère les factures de commission pour une période donnée
   */
  async generateMonthlyCommissionInvoices(
    options: {
      month?: number; // 0-11, mois actuel par défaut
      year?: number; // année actuelle par défaut
      roleFilter?: UserRole[];
    } = {}
  ) {
    const now = new Date();
    const targetMonth = options.month !== undefined ? options.month : now.getMonth();
    const targetYear = options.year !== undefined ? options.year : now.getFullYear();

    // Période pour laquelle générer les factures (mois précédent par défaut)
    const startDate = startOfMonth(new Date(targetYear, targetMonth));
    const endDate = endOfMonth(new Date(targetYear, targetMonth));

    console.log(
      `Génération des factures de commission du ${format(startDate, 'dd/MM/yyyy')} au ${format(endDate, 'dd/MM/yyyy')}`
    );

    // Récupérer les commissions pour la période
    const commissions = await db.commission.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: CommissionStatus.PENDING,
        ...(options.roleFilter
          ? {
              applicableRoles: {
                hasSome: options.roleFilter,
              },
            }
          : {}),
      },
      include: {
        user: true,
        payment: true,
      },
    });

    if (commissions.length === 0) {
      return {
        success: true,
        generated: 0,
        message: 'Aucune commission à facturer pour cette période',
      };
    }

    // Grouper les commissions par utilisateur
    const commissionsByUser: Record<string, typeof commissions> = {};

    for (const commission of commissions) {
      if (!commission.userId) continue;

      if (!commissionsByUser[commission.userId]) {
        commissionsByUser[commission.userId] = [];
      }

      commissionsByUser[commission.userId].push(commission);
    }

    // Générer une facture par utilisateur
    const results = [];
    const period = {
      start: startDate,
      end: endDate,
    };

    for (const [userId, userCommissions] of Object.entries(commissionsByUser)) {
      try {
        // Calculer le total
        const totalAmount = userCommissions.reduce((sum, comm) => sum + Number(comm.amount), 0);

        if (totalAmount <= 0) continue;

        // Créer les éléments de facture
        const invoiceItems = userCommissions.map(comm => ({
          commissionId: comm.id,
          description: comm.description || `Commission sur ${comm.serviceType.toLowerCase()}`,
          commissionAmount: Number(comm.amount),
          serviceId: comm.serviceId,
          deliveryId: comm.deliveryId,
        }));

        // Générer la facture
        const invoice = await invoiceService.createCommissionInvoice(userId, invoiceItems, period);

        // Mettre à jour le statut des commissions
        await db.commission.updateMany({
          where: {
            id: {
              in: userCommissions.map(c => c.id),
            },
          },
          data: {
            status: CommissionStatus.INVOICED,
            invoiceId: invoice.id,
          },
        });

        results.push({
          userId,
          commissionCount: userCommissions.length,
          totalAmount,
          invoiceId: invoice.id,
          success: true,
        });
      } catch (error) {
        console.error(
          `Erreur lors de la génération de la facture pour l'utilisateur ${userId}:`,
          error
        );
        results.push({
          userId,
          commissionCount: userCommissions.length,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          success: false,
        });
      }
    }

    return {
      success: true,
      generated: results.filter(r => r.success).length,
      total: Object.keys(commissionsByUser).length,
      results,
      period: {
        start: format(startDate, 'MMMM yyyy', { locale: fr }),
        end: format(endDate, 'dd MMMM yyyy', { locale: fr }),
      },
    };
  },

  /**
   * Récupère le résumé des commissions d'un utilisateur par mois
   */
  async getUserCommissionSummary(userId: string, months: number = 6) {
    const endDate = new Date();
    const startDate = subMonths(endDate, months);

    // Récupérer toutes les commissions de l'utilisateur pour la période
    const commissions = await db.commission.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Grouper par mois
    const monthlySummary: Record<
      string,
      {
        month: string;
        total: number;
        count: number;
        avgRate: number;
      }
    > = {};

    for (const commission of commissions) {
      const date = new Date(commission.createdAt);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMMM yyyy', { locale: fr });

      if (!monthlySummary[monthKey]) {
        monthlySummary[monthKey] = {
          month: monthLabel,
          total: 0,
          count: 0,
          avgRate: 0,
        };
      }

      monthlySummary[monthKey].total += Number(commission.amount);
      monthlySummary[monthKey].count += 1;
    }

    // Calculer les taux moyens
    for (const key in monthlySummary) {
      const summary = monthlySummary[key];
      if (summary.count > 0) {
        summary.avgRate = Number((summary.total / summary.count).toFixed(2));
      }
    }

    return {
      summary: Object.values(monthlySummary),
      total: commissions.reduce((sum, c) => sum + Number(c.amount), 0),
      count: commissions.length,
    };
  },

  /**
   * Ajuste le taux de commission pour un utilisateur spécifique
   */
  async adjustUserCommissionRate(userId: string, serviceType: ServiceType, newRate: number) {
    // Vérifier que l'utilisateur existe
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Vérifier que le taux est valide
    if (newRate < 0 || newRate > 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Le taux de commission doit être compris entre 0 et 1',
      });
    }

    // Déterminer le rôle de l'utilisateur
    const userRole = await this._getUserRole(userId);

    // Désactiver les anciennes commissions pour ce type de service et cet utilisateur
    await db.commission.updateMany({
      where: {
        userId,
        serviceType,
        isActive: true,
        applicableRoles: {
          has: userRole,
        },
      },
      data: {
        isActive: false,
      },
    });

    // Créer une nouvelle commission avec le nouveau taux
    const commission = await db.commission.create({
      data: {
        rate: new Decimal(newRate),
        serviceType,
        description: `Taux de commission personnalisé pour ${serviceType.toLowerCase()}`,
        userId,
        isActive: true,
        applicableRoles: [userRole],
        status: CommissionStatus.ACTIVE,
        metadata: {
          isCustomRate: true,
          previousRate: DEFAULT_COMMISSION_RATES[serviceType],
        },
      },
    });

    return commission;
  },

  /**
   * Récupère le rôle d'un utilisateur
   * @private
   */
  async _getUserRole(userId: string): Promise<UserRole> {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    return user.role;
  },
};

// Export des fonctions individuelles pour faciliter les tests et l'utilisation
export const {
  calculateCommission,
  processCommission,
  getCommissions,
  generateCommissionReport,
  updateCommissionRates,
  createCommissionPromotion,
  getActiveCommissionRates,
  processServiceCommission,
  processDeliveryCommission,
  createCommission,
} = commissionService;
