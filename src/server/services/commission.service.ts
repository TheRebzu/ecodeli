import { db } from '../db';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentService } from './payment.service';
import { walletService } from './wallet.service';

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
 * Service de gestion des commissions
 */
export const CommissionService = {
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
};
