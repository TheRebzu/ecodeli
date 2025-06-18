import { db } from "@/server/db";
import { Decimal } from "@prisma/client/runtime/library";
import { paymentService } from "@/server/services/shared/payment.service";
import { walletService } from "@/server/services/shared/wallet.service";
import { TRPCError } from "@trpc/server";
import { endOfMonth, startOfMonth, format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { invoiceService } from "@/server/services/shared/invoice.service";
import { CommissionStatus, ServiceType, UserRole } from "@prisma/client";

// Vérifier si le wallet service est correctement initialisé
const isWalletServiceAvailable = () => {
  try {
    return walletService && typeof walletService.getWallet === "function";
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
  _DEFAULT_RATES: {
    DELIVERY: 0.15, // 15% sur les livraisons
    SERVICE: 0.2, // 20% sur les services
    SUBSCRIPTION: 0, // Pas de commission sur les abonnements
  },

  /**
   * Calcule et enregistre la commission pour un paiement
   */
  async calculateAndCreateCommission(paymentId: string) {
    // Récupérer le paiement complet
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        delivery: true,
        service: true,
        subscription: true
      }
    });

    if (!payment) {
      throw new Error("Paiement non trouvé");
    }

    if (payment.status !== "COMPLETED") {
      throw new Error(
        "Impossible de calculer la commission pour un paiement non complété",
      );
    }

    // Vérifier si une commission existe déjà
    const existingCommission = await db.commission.findFirst({
      where: {
        payments: {
          some: { id: paymentId }
        }
      }
    });

    if (existingCommission) {
      return existingCommission;
    }

    // Déterminer le type de paiement et le taux de commission applicable
    let serviceType = "DELIVERY";
    let rate = 0;

    if (payment.deliveryId) {
      serviceType = "DELIVERY";
      rate = this._DEFAULT_RATES.DELIVERY;
    } else if (payment.serviceId) {
      serviceType = "SERVICE";
      rate = this._DEFAULT_RATES.SERVICE;
    } else if (payment.subscriptionId) {
      serviceType = "SUBSCRIPTION";
      rate = this._DEFAULT_RATES.SUBSCRIPTION;
    }

    // Chercher des promotions actives qui pourraient modifier le taux
    const promotion = await db.promotionRecord.findFirst({
      where: {
        isActive: true,
        serviceType: serviceType,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      orderBy: {
        createdAt: "desc"
      }
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
        rate: new Decimal(rate),
        serviceType,
        description: `Commission sur ${serviceType.toLowerCase()} - Paiement #${paymentId}`,
        isActive: true,
        calculationType: "PERCENTAGE",
        currency: payment.currency,
        promotionId: promotion?.id
      }
    });

    // Mettre à jour le paiement avec les informations de commission
    await db.payment.update({
      where: { id: paymentId },
      data: {
        commissionAmount,
        commissionId: commission.id
      }
    });

    return commission;
  },

  /**
   * Traite le paiement de la commission (déduction du portefeuille du prestataire/livreur)
   */
  async processCommission(commissionId: string, paymentId: string) {
    const commission = await db.commission.findUnique({
      where: { id: commissionId },
      include: {
        payments: {
          where: { id: paymentId },
          include: {
            delivery: {
              include: { deliverer: true }
            },
            service: {
              include: { provider: true }
            }
          }
        }
      }
    });

    if (!commission) {
      throw new Error("Commission non trouvée");
    }

    const payment = commission.payments[0];
    if (!payment) {
      throw new Error("Paiement associé non trouvé");
    }

    // Déterminer l'utilisateur et le portefeuille
    let userId: string | undefined;

    if (payment.delivery?.delivererId) {
      userId = payment.delivery.delivererId;
    } else if (payment.service?.providerId) {
      userId = payment.service.providerId;
    }

    if (!userId) {
      throw new Error(
        "Impossible de déterminer l'utilisateur pour cette commission",
      );
    }

    // Récupérer le portefeuille de l'utilisateur
    const wallet = await walletService.getOrCreateWallet(userId);

    if (!wallet) {
      throw new Error("Portefeuille non trouvé pour cet utilisateur");
    }

    // Calculer le montant de commission basé sur le paiement
    const commissionAmount = Number(payment.commissionAmount || 0);

    // Créer une transaction de déduction dans le portefeuille
    try {
      await walletService.createWalletTransaction(wallet.id, {
        amount: -commissionAmount, // Montant négatif pour déduction
        type: "PLATFORM_FEE",
        description: `Commission EcoDeli pour ${
          payment.deliveryId ? "livraison" : "service"
        } (${Number(commission.rate) * 100}%)`,
        reference: `commission-${commission.id}`,
        paymentId: payment.id,
        metadata: {
          commissionId: commission.id,
          commissionRate: Number(commission.rate),
          originalAmount: Number(payment.amount)}});

      return {
        success: true,
        commission,
        commissionAmount};
    } catch (error) {
      console.error("Erreur lors du traitement de la commission:", error);
      throw error;
    }
  },

  /**
   * Récupère les commissions sur une période
   */
  async getCommissions(filters: {
    startDate?: Date;
    endDate?: Date;
    serviceType?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const {
      startDate,
      endDate,
      serviceType,
      isActive,
      page = 1,
      limit = 20} = filters;

    // Construire les filtres
    const where: any = {};

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate};
    }

    if (serviceType) {
      where.serviceType = serviceType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Calculer le décalage pour la pagination
    const skip = (page - 1) * limit;

    // Récupérer les commissions
    const [commissions, total] = await Promise.all([
      db.commission.findMany({
        where,
        include: {
          payments: {
            include: {
              delivery: true,
              service: true}}},
        orderBy: { createdAt: "desc" },
        skip,
        take: limit}),
      db.commission.count({ where  })]);

    // Calculer les totaux
    const totalAmount = commissions.reduce((sum, commission) => {
      const commissionPayments = commission.payments || [];
      const paymentSum = commissionPayments.reduce(
        (paySum, payment) => paySum.plus(payment.commissionAmount || 0),
        new Decimal(0),
      );
      return sum.plus(paymentSum);
    }, new Decimal(0));

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
        hasMore},
      summary: {
        totalAmount,
        count: commissions.length}};
  },

  /**
   * Génère un rapport de commissions pour une période
   */
  async generateCommissionReport(startDate: Date, endDate: Date) {
    // Récupérer toutes les commissions de la période
    const commissions = await db.commission.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate}},
      include: {
        payments: {
          include: {
            delivery: true,
            service: true}}}});

    // Calculer les statistiques par type
    const byType = commissions.reduce((acc: any, commission) => {
      if (!acc[commission.serviceType]) {
        acc[commission.serviceType] = {
          count: 0,
          total: new Decimal(0)};
      }

      acc[commission.serviceType].count++;

      // Calculer le total des commissions pour ce type
      const commissionTotal = commission.payments.reduce(
        (sum, payment) => sum.plus(payment.commissionAmount || 0),
        new Decimal(0),
      );
      acc[commission.serviceType].total =
        acc[commission.serviceType].total.plus(commissionTotal);

      return acc;
    }, {});

    // Calculer les totaux généraux
    const totalCommissions = commissions.reduce((sum, commission) => {
      const commissionTotal = commission.payments.reduce(
        (paySum, payment) => paySum.plus(payment.commissionAmount || 0),
        new Decimal(0),
      );
      return sum.plus(commissionTotal);
    }, new Decimal(0));

    // Préparer les données du rapport
    const reportData = {
      period: {
        startDate,
        endDate},
      summary: {
        totalCommissions,
        commissionCount: commissions.length,
        byType},
      details: commissions};

    // Créer l'enregistrement de rapport financier
    const report = await db.financialReport.create({
      data: {
        reportType: "COMMISSION",
        periodStart: startDate,
        periodEnd: endDate,
        data: reportData,
        totalRevenue: totalCommissions,
        totalCommissions,
        status: "GENERATED",
        generatedAt: new Date()}});

    return {
      report,
      data: reportData};
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
        throw new Error("Le taux de commission doit être entre 0 et 1");
      }
      this.DEFAULT_RATES.DELIVERY = newRates.DELIVERY;
    }

    if (newRates.SERVICE !== undefined) {
      if (newRates.SERVICE < 0 || newRates.SERVICE > 1) {
        throw new Error("Le taux de commission doit être entre 0 et 1");
      }
      this.DEFAULT_RATES.SERVICE = newRates.SERVICE;
    }

    if (newRates.SUBSCRIPTION !== undefined) {
      if (newRates.SUBSCRIPTION < 0 || newRates.SUBSCRIPTION > 1) {
        throw new Error("Le taux de commission doit être entre 0 et 1");
      }
      this.DEFAULT_RATES.SUBSCRIPTION = newRates.SUBSCRIPTION;
    }

    // Créer un enregistrement de promotion pour suivre ce changement
    await db.promotionRecord.create({
      data: {
        type: "COMMISSION_RATE_CHANGE",
        serviceType: null, // Affecte tous les services
        rate: new Decimal(0), // Non utilisé pour ce type d'enregistrement
        startDate: new Date(),
        endDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 ans
        isActive: true,
        description: `Mise à jour des taux de commission: Livraison=${this.DEFAULT_RATES.DELIVERY}, Service=${this.DEFAULT_RATES.SERVICE}, Abonnement=${this.DEFAULT_RATES.SUBSCRIPTION}`}});

    return {
      success: true,
      rates: { ...this.DEFAULT_RATES }};
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
    const {
      serviceType: serviceType,
      rate: rate,
      startDate: startDate,
      endDate: endDate,
      description: description} = data;

    // Vérifier que le taux est valide
    if (rate < 0 || rate > 1) {
      throw new Error("Le taux de commission doit être entre 0 et 1");
    }

    // Vérifier que les dates sont valides
    if (startDate >= endDate) {
      throw new Error("La date de début doit être antérieure à la date de fin");
    }

    // Créer la promotion
    const promotion = await db.promotionRecord.create({
      data: {
        type: "COMMISSION",
        serviceType,
        rate: new Decimal(rate),
        startDate,
        endDate,
        isActive: true,
        description}});

    return promotion;
  },

  /**
   * Récupère les taux de commission actifs
   */
  async getActiveCommissionRates() {
    return db.commission.findMany({
      where: { isActive }});
  },

  /**
   * Calcule la commission pour un paiement
   */
  async calculateCommission(
    amount: number,
    serviceType: ServiceType,
    userRole: UserRole,
  ): Promise<{
    commissionAmount: number;
    commissionRate: number;
    netAmount: number;
  }> {
    // Récupérer le taux de commission actif pour ce type de service
    const activeCommission = await db.commission.findFirst({
      where: {
        serviceType,
        isActive: true},
      orderBy: {
        updatedAt: "desc"}});

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
      netAmount};
  },

  /**
   * Enregistre une commission pour un paiement
   */
  async createCommissionRecord(data: {
    rate: number;
    serviceType: ServiceType;
    description: string;
    paymentIds?: string[];
    metadata?: Record<string, any>;
  }) {
    const {
      rate,
      serviceType,
      description,
      paymentIds = [],
      metadata = {}} = data;

    // Créer l'enregistrement de commission
    const commission = await db.commission.create({
      data: {
        rate: new Decimal(rate),
        serviceType,
        description,
        isActive: true,
        calculationType: "PERCENTAGE"}});

    // Connecter les paiements si fournis
    if (paymentIds.length > 0) {
      await db.payment.updateMany({
        where: {
          id: { in: paymentIds }
        },
        data: {
          commissionId: commission.id
        }
      });
    }

    return commission;
  },

  /**
   * Récupère le rôle d'un utilisateur
   * @private
   */
  async getUserRole(userId: string): Promise<UserRole> {
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new TRPCError({ 
        code: "NOT_FOUND",
        message: "Utilisateur non trouvé" 
      });
    }

    return user.role;
  }
};

/**
 * Fonction utilitaire pour créer une commission
 * Exportée pour compatibilité avec payment.service.ts
 */
export async function createCommission(data: {
  paymentId: string;
  amount: number;
  rate: number;
  serviceType: ServiceType;
  description?: string;
}) {
  const {
    paymentId,
    amount,
    rate,
    serviceType,
    description
  } = data;

  // Calculer le montant de la commission
  const commissionAmount = amount * rate;

  // Créer l'enregistrement de commission
  const commission = await db.commission.create({
    data: {
      rate: new Decimal(rate),
      serviceType,
      description: description || `Commission sur ${serviceType.toLowerCase()}`,
      isActive: true,
      calculationType: "PERCENTAGE"
    }
  });

  // Mettre à jour le paiement avec les informations de commission
  await db.payment.update({
    where: { id: paymentId },
    data: {
      commissionAmount: new Decimal(commissionAmount),
      commissionId: commission.id
    }
  });

  return {
    commission,
    commissionAmount,
    netAmount: amount - commissionAmount
  };
}

// Export principal du service
// Utilisez commissionService.methodName() pour accéder aux méthodes
export default commissionService;
