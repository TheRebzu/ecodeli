import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { PlanType, SubscriptionStatus } from '@prisma/client';
import { stripeService } from './stripe.service';
import { paymentService } from './payment.service';
import { invoiceService } from './invoice.service';
import { addMonths, addYears, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Configuration des plans d'abonnement
 */
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Gratuit',
    description: 'Plan de base avec fonctionnalités limitées',
    price: 0,
    features: ['Accès de base à la plateforme', "Jusqu'à 5 annonces par mois", 'Support par email'],
    limits: {
      announcements: 5,
      storageGb: 1,
      priorityLevel: 0,
      supportResponseTime: 48, // heures
      commissionRate: 0.15, // 15%
    },
    stripeId: 'price_free',
  },
  STARTER: {
    name: 'Starter',
    description: 'Pour les utilisateurs réguliers',
    price: 9.99,
    features: [
      'Toutes les fonctionnalités du plan gratuit',
      "Jusqu'à 20 annonces par mois",
      'Priorité normale pour les livraisons',
      'Support prioritaire par email',
    ],
    limits: {
      announcements: 20,
      storageGb: 5,
      priorityLevel: 1,
      supportResponseTime: 24, // heures
      commissionRate: 0.15, // 15%
    },
    stripeId: 'price_starter',
  },
  PREMIUM: {
    name: 'Premium',
    description: 'Pour les utilisateurs intensifs',
    price: 19.99,
    features: [
      'Toutes les fonctionnalités du plan Starter',
      'Annonces illimitées',
      'Priorité élevée pour les livraisons',
      'Commissions réduites (-10%)',
      'Support client dédié',
      'Fonctionnalités avancées de suivi',
    ],
    limits: {
      announcements: 999999, // illimité
      storageGb: 25,
      priorityLevel: 2,
      supportResponseTime: 12, // heures
      commissionRate: 0.135, // 13.5% (10% de réduction)
    },
    stripeId: 'price_premium',
  },
  CUSTOM: {
    name: 'Sur mesure',
    description: 'Contactez-nous pour une offre personnalisée',
    price: null,
    features: [
      'Solution entièrement personnalisée',
      'Intégration avec vos systèmes existants',
      'Contrat négocié individuellement',
      'Support dédié avec SLA garanti',
    ],
    limits: {
      announcements: 999999, // illimité
      storageGb: 100,
      priorityLevel: 3,
      supportResponseTime: 6, // heures
      commissionRate: 0.12, // 12%
    },
    stripeId: 'price_custom',
  },
};

/**
 * Service de gestion des abonnements
 */
export const subscriptionService = {
  /**
   * Récupère la liste des plans disponibles
   */
  async getPlans() {
    return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
      key,
    }));
  },

  /**
   * Récupère les détails d'un plan par son identifiant
   */
  getPlan(planType: PlanType) {
    return SUBSCRIPTION_PLANS[planType] || null;
  },

  /**
   * Crée un nouvel abonnement pour un utilisateur
   */
  async createSubscription(userId: string, planType: PlanType, options = {}) {
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

    // Vérifier que le plan est valide
    const plan = this.getPlan(planType);
    if (!plan) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "Plan d'abonnement invalide",
      });
    }

    // Vérifier si l'utilisateur a déjà un abonnement actif
    const existingSubscription = await db.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    });

    if (existingSubscription) {
      // Si l'utilisateur passe à un plan inférieur ou égal, il faut annuler l'abonnement actuel
      if (this._isPlanDowngrade(existingSubscription.planType, planType)) {
        await this._downgradeSubscription(existingSubscription.id, planType);
        return await this._createSubscriptionRecord(userId, planType, options);
      }

      // Si l'utilisateur passe à un plan supérieur, on met à jour l'abonnement
      if (this._isPlanUpgrade(existingSubscription.planType, planType)) {
        return await this._upgradeSubscription(existingSubscription.id, planType);
      }

      // Si c'est le même plan, on ne fait rien
      if (existingSubscription.planType === planType) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Vous êtes déjà abonné à ce plan',
        });
      }
    }

    // Créer un nouvel abonnement
    return await this._createSubscriptionRecord(userId, planType, options);
  },

  /**
   * Met à jour un abonnement existant
   */
  async updateSubscription(
    subscriptionId: string,
    data: {
      autoRenew?: boolean;
      planType?: PlanType;
      metadata?: Record<string, any>;
      cancelAtPeriodEnd?: boolean;
      customPlanFeatures?: Record<string, any>;
    }
  ) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Abonnement non trouvé',
      });
    }

    // Si on change de plan
    if (data.planType && data.planType !== subscription.planType) {
      if (this._isPlanUpgrade(subscription.planType, data.planType)) {
        return await this._upgradeSubscription(subscriptionId, data.planType);
      }

      if (this._isPlanDowngrade(subscription.planType, data.planType)) {
        return await this._downgradeSubscription(subscriptionId, data.planType);
      }
    }

    // Mise à jour simple des autres champs
    const updateData: any = {};

    if (data.autoRenew !== undefined) {
      updateData.autoRenew = data.autoRenew;
    }

    if (data.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = data.cancelAtPeriodEnd;

      // Si on annule à la fin de la période
      if (data.cancelAtPeriodEnd) {
        updateData.cancelledAt = new Date();
      } else {
        updateData.cancelledAt = null;
      }
    }

    if (data.metadata) {
      updateData.metadata = {
        ...(subscription.metadata || {}),
        ...data.metadata,
      };
    }

    if (data.customPlanFeatures && subscription.planType === 'CUSTOM') {
      updateData.metadata = {
        ...(subscription.metadata || {}),
        customPlanFeatures: data.customPlanFeatures,
      };
    }

    // Mettre à jour l'abonnement
    return await db.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });
  },

  /**
   * Annule un abonnement
   */
  async cancelSubscription(userId: string, options = { cancelAtPeriodEnd: true, reason: '' }) {
    // Vérifier que l'utilisateur a un abonnement actif
    const subscription = await db.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Aucun abonnement actif trouvé',
      });
    }

    // En mode démo, on simule l'annulation directement
    if (process.env.DEMO_MODE === 'true') {
      // Mettre à jour l'abonnement
      return await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelAtPeriodEnd: options.cancelAtPeriodEnd,
          metadata: {
            ...(subscription.metadata || {}),
            cancellationReason: options.reason,
            cancelledInDemo: true,
          },
        },
      });
    }

    // En production, annuler via Stripe si c'est un abonnement payant
    if (subscription.stripeSubscriptionId) {
      await stripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        options.cancelAtPeriodEnd
      );
    }

    // Mettre à jour l'abonnement dans notre base de données
    return await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: options.cancelAtPeriodEnd
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelAtPeriodEnd: options.cancelAtPeriodEnd,
        metadata: {
          ...(subscription.metadata || {}),
          cancellationReason: options.reason,
        },
      },
    });
  },

  /**
   * Récupère les détails d'un abonnement avec toutes les informations associées
   */
  async getSubscriptionDetails(subscriptionId: string) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Abonnement non trouvé',
      });
    }

    // Récupérer les détails du plan
    const plan = this.getPlan(subscription.planType);

    // Récupérer les factures liées à cet abonnement
    const invoices = await db.invoice.findMany({
      where: {
        metadata: {
          path: ['subscriptionId'],
          equals: subscriptionId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Calculer les avantages spécifiques au plan
    const benefits = this._calculatePlanBenefits(subscription.planType, subscription);

    // Calculer quand le prochain renouvellement aura lieu
    const nextRenewalDate = subscription.currentPeriodEnd || subscription.endDate;

    // Informations sur le statut
    const statusInfo = this._getSubscriptionStatusInfo(subscription);

    return {
      subscription,
      plan,
      invoices,
      benefits,
      nextRenewalDate,
      statusInfo,
      // Ajouter des informations simulées pour la démo
      demo:
        process.env.DEMO_MODE === 'true'
          ? {
              remainingTrialDays: subscription.trialEndsAt
                ? Math.ceil(
                    (subscription.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                : 0,
              usageStats: {
                announcementsUsed: Math.floor(Math.random() * 20),
                storageUsed: (Math.random() * 5).toFixed(2),
                apiCallsThisMonth: Math.floor(Math.random() * 1000),
              },
            }
          : undefined,
    };
  },

  /**
   * Traite le renouvellement d'un abonnement spécifique
   */
  async processRenewal(subscriptionId: string) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Abonnement non trouvé',
      });
    }

    // Vérifier que l'abonnement est actif et doit être renouvelé
    if (
      subscription.status !== SubscriptionStatus.ACTIVE ||
      !subscription.autoRenew ||
      (subscription.endDate && subscription.endDate > new Date())
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cet abonnement ne peut pas être renouvelé maintenant',
      });
    }

    const plan = this.getPlan(subscription.planType);

    // Ignorer les plans gratuits
    if (!plan || !plan.price || plan.price <= 0) {
      return {
        success: true,
        message: 'Plan gratuit - aucun renouvellement nécessaire',
        subscription: await db.subscription.update({
          where: { id: subscriptionId },
          data: {
            currentPeriodStart: new Date(),
            currentPeriodEnd: addMonths(new Date(), 1),
            endDate: addMonths(new Date(), 1),
          },
        }),
      };
    }

    try {
      // Créer une facture pour le renouvellement
      const invoice = await invoiceService.createSubscriptionInvoice(
        subscription.userId,
        subscription.id,
        subscription.planType,
        Number(plan.price)
      );

      // Simuler un paiement pour le renouvellement
      await paymentService.initiatePayment({
        userId: subscription.userId,
        amount: Number(plan.price),
        description: `Renouvellement ${plan.name}`,
        currency: 'EUR',
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        metadata: {
          isRenewal: true,
          planType: subscription.planType,
          isDemo: process.env.DEMO_MODE === 'true',
        },
      });

      // Mettre à jour la période de l'abonnement
      const updatedSubscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          currentPeriodStart: new Date(),
          currentPeriodEnd: addMonths(new Date(), 1),
          endDate: addMonths(new Date(), 1),
          renewalCount: {
            increment: 1,
          },
        },
      });

      return {
        success: true,
        message: 'Abonnement renouvelé avec succès',
        subscription: updatedSubscription,
        invoiceId: invoice.id,
      };
    } catch (error) {
      console.error(`Erreur lors du renouvellement de l'abonnement ${subscriptionId}:`, error);

      // En cas d'échec, marquer l'abonnement comme problématique
      const updatedSubscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.PAST_DUE,
          lastPaymentFailure: new Date(),
          paymentFailureCount: {
            increment: 1,
          },
        },
      });

      return {
        success: false,
        message: 'Échec du renouvellement',
        subscription: updatedSubscription,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  },

  /**
   * Applique des réductions selon la formule d'abonnement
   */
  async applyDiscounts(
    userId: string,
    amount: number,
    options: {
      type: 'DELIVERY' | 'SERVICE' | 'STORAGE' | 'SUBSCRIPTION';
      itemId?: string;
    }
  ) {
    // Récupérer l'abonnement actif de l'utilisateur
    const subscription = await db.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    if (!subscription) {
      // Sans abonnement, pas de remise
      return {
        originalAmount: amount,
        discountedAmount: amount,
        discountPercent: 0,
        discountAmount: 0,
        planType: 'FREE' as PlanType,
      };
    }

    const plan = this.getPlan(subscription.planType);

    if (!plan) {
      return {
        originalAmount: amount,
        discountedAmount: amount,
        discountPercent: 0,
        discountAmount: 0,
        planType: subscription.planType,
      };
    }

    // Calcul des remises en fonction du plan et du type d'opération
    let discountPercent = 0;

    switch (subscription.planType) {
      case 'PREMIUM':
        // Les utilisateurs Premium ont des remises sur différents services
        if (options.type === 'DELIVERY') discountPercent = 10;
        if (options.type === 'STORAGE') discountPercent = 15;
        if (options.type === 'SERVICE') discountPercent = 5;
        break;

      case 'STARTER':
        // Les utilisateurs Starter ont des petites remises
        if (options.type === 'DELIVERY') discountPercent = 5;
        if (options.type === 'STORAGE') discountPercent = 7;
        break;

      case 'CUSTOM':
        // Pour les plans personnalisés, on peut avoir défini des remises spécifiques
        const customFeatures = subscription.metadata?.customPlanFeatures || {};
        if (customFeatures.discounts) {
          discountPercent = customFeatures.discounts[options.type] || 0;
        }
        break;

      default:
        // Pas de remise pour le plan FREE
        discountPercent = 0;
    }

    // Appliquer le pourcentage de remise
    const discountAmount = (amount * discountPercent) / 100;
    const discountedAmount = amount - discountAmount;

    // Enregistrer cette remise dans l'historique si on est en mode production
    if (process.env.DEMO_MODE !== 'true' && discountAmount > 0) {
      await db.discountHistory.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          originalAmount: new Decimal(amount),
          discountedAmount: new Decimal(discountedAmount),
          discountAmount: new Decimal(discountAmount),
          discountPercent,
          itemType: options.type,
          itemId: options.itemId,
          appliedAt: new Date(),
        },
      });
    }

    return {
      originalAmount: amount,
      discountedAmount,
      discountPercent,
      discountAmount,
      planType: subscription.planType,
    };
  },

  /**
   * Crée un enregistrement d'abonnement et simule le paiement en mode démo
   * @private
   */
  async _createSubscriptionRecord(userId: string, planType: PlanType, options = {}) {
    const plan = this.getPlan(planType);
    const now = new Date();

    // Déterminer la date de fin en fonction du plan
    const endDate =
      planType === 'FREE'
        ? addYears(now, 100) // Pratiquement illimité pour le plan gratuit
        : addMonths(now, 1); // 1 mois pour les plans payants

    // Créer l'abonnement dans la base de données
    const subscription = await db.subscription.create({
      data: {
        userId,
        planType,
        status: SubscriptionStatus.ACTIVE,
        startDate: now,
        endDate,
        autoRenew: planType !== 'FREE',
        price: plan.price ? new Decimal(plan.price) : null,
        currency: 'EUR',
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        planName: plan.name,
        planDescription: plan.description,
        planFeatures: plan.features,
        metadata: {
          createdInDemo: process.env.DEMO_MODE === 'true',
          limits: plan.limits,
          ...options,
        },
      },
    });

    // Si c'est un plan payant et en mode démo, simuler un paiement
    if (plan.price && plan.price > 0 && process.env.DEMO_MODE === 'true') {
      // Créer une facture
      const invoice = await invoiceService.createSubscriptionInvoice(
        userId,
        subscription.id,
        planType,
        plan.price
      );

      // Simuler un paiement
      await paymentService.initiatePayment({
        userId,
        amount: plan.price,
        description: `Abonnement ${plan.name}`,
        currency: 'EUR',
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        metadata: {
          planType,
          isDemo: true,
        },
      });
    }

    return subscription;
  },

  /**
   * Met à niveau un abonnement vers un plan supérieur
   * @private
   */
  async _upgradeSubscription(subscriptionId: string, newPlanType: PlanType) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Abonnement non trouvé',
      });
    }

    const oldPlan = this.getPlan(subscription.planType);
    const newPlan = this.getPlan(newPlanType);

    // Calculer le prorata si nécessaire
    const proRataAmount = 0; // Simplifié pour la démo

    // Mettre à jour l'abonnement
    const updatedSubscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        planType: newPlanType,
        previousPlanType: subscription.planType,
        price: newPlan.price ? new Decimal(newPlan.price) : null,
        planName: newPlan.name,
        planDescription: newPlan.description,
        planFeatures: newPlan.features,
        upgradedAt: new Date(),
        metadata: {
          ...(subscription.metadata || {}),
          limits: newPlan.limits,
          previousLimits: subscription.metadata?.limits,
          upgradedFrom: subscription.planType,
          upgradedAt: new Date().toISOString(),
        },
      },
    });

    // En mode démo, simuler la facturation de la mise à niveau
    if (process.env.DEMO_MODE === 'true' && newPlan.price && newPlan.price > 0) {
      // Créer une facture pour la mise à niveau
      const invoice = await invoiceService.createInvoice({
        userId: subscription.userId,
        items: [
          {
            description: `Mise à niveau vers l'abonnement ${newPlan.name}`,
            quantity: 1,
            unitPrice: proRataAmount > 0 ? proRataAmount : newPlan.price,
            taxRate: 0.2,
          },
        ],
        notes: "Facturation de la mise à niveau d'abonnement",
        metadata: {
          subscriptionId,
          oldPlanType: subscription.planType,
          newPlanType,
          isUpgrade: true,
        },
      });

      // Simuler un paiement pour la mise à niveau
      if (proRataAmount > 0 || newPlan.price > 0) {
        await paymentService.initiatePayment({
          userId: subscription.userId,
          amount: proRataAmount > 0 ? proRataAmount : newPlan.price,
          description: `Mise à niveau vers ${newPlan.name}`,
          currency: 'EUR',
          subscriptionId,
          invoiceId: invoice.id,
          metadata: {
            isUpgrade: true,
            oldPlanType: subscription.planType,
            newPlanType,
            isDemo: true,
          },
        });
      }
    }

    return updatedSubscription;
  },

  /**
   * Rétrograde un abonnement vers un plan inférieur
   * @private
   */
  async _downgradeSubscription(subscriptionId: string, newPlanType: PlanType) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Abonnement non trouvé',
      });
    }

    const newPlan = this.getPlan(newPlanType);

    // Pour la démo, on permet la rétrogradation immédiate
    return await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: newPlanType === 'FREE' ? SubscriptionStatus.CANCELLED : SubscriptionStatus.ACTIVE,
        planType: newPlanType,
        price: newPlan.price ? new Decimal(newPlan.price) : null,
        planName: newPlan.name,
        planDescription: newPlan.description,
        planFeatures: newPlan.features,
        cancelledAt: new Date(),
        downgradedAt: new Date(),
        cancelAtPeriodEnd: newPlanType !== 'FREE',
        previousPlanType: subscription.planType,
        metadata: {
          ...(subscription.metadata || {}),
          limits: newPlan.limits,
          previousLimits: subscription.metadata?.limits,
          downgradedFrom: subscription.planType,
          downgradedAt: new Date().toISOString(),
          downgradedReasonInDemo: "Changement de plan par l'utilisateur",
        },
      },
    });
  },

  /**
   * Gère le renouvellement des abonnements (pour la démo)
   */
  async processSubscriptionRenewals() {
    if (process.env.DEMO_MODE !== 'true') {
      return { success: true, renewals: 0, message: 'Non exécuté - Mode démo désactivé' };
    }

    // Trouver les abonnements à renouveler
    const subscriptionsToRenew = await db.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        endDate: { lte: new Date() },
      },
      include: {
        user: true,
      },
    });

    let renewedCount = 0;
    let failedCount = 0;

    // Traiter chaque renouvellement
    for (const subscription of subscriptionsToRenew) {
      const result = await this.processRenewal(subscription.id).catch(error => {
        console.error(`Erreur lors du renouvellement de l'abonnement ${subscription.id}:`, error);
        return { success: false };
      });

      if (result.success) {
        renewedCount++;
      } else {
        failedCount++;
      }
    }

    return {
      success: true,
      renewals: renewedCount,
      failed: failedCount,
      total: subscriptionsToRenew.length,
      message: `${renewedCount} abonnements renouvelés sur ${subscriptionsToRenew.length} (${failedCount} échecs)`,
    };
  },

  /**
   * Calcule les avantages du plan d'abonnement
   */
  _calculatePlanBenefits(planType: PlanType, subscription: any) {
    const plan = this.getPlan(planType);
    if (!plan) return null;

    const limits = plan.limits;

    // Pour les plans custom, on peut avoir des limites personnalisées
    if (planType === 'CUSTOM' && subscription.metadata?.customPlanFeatures) {
      return {
        ...limits,
        ...subscription.metadata.customPlanFeatures,
      };
    }

    return limits;
  },

  /**
   * Génère des informations sur le statut de l'abonnement
   * @private
   */
  _getSubscriptionStatusInfo(subscription: any) {
    const now = new Date();

    let statusInfo = {
      label: '',
      description: '',
      color: '',
      isActive: false,
      isPastDue: false,
      isCancelled: false,
      isTrialing: false,
    };

    switch (subscription.status) {
      case 'ACTIVE':
        statusInfo.label = 'Actif';
        statusInfo.description = subscription.cancelAtPeriodEnd
          ? "Actif jusqu'à la fin de la période courante"
          : 'Abonnement actif';
        statusInfo.color = 'green';
        statusInfo.isActive = true;
        break;

      case 'PAST_DUE':
        statusInfo.label = 'Paiement en retard';
        statusInfo.description = "Paiement en attente pour continuer l'abonnement";
        statusInfo.color = 'amber';
        statusInfo.isPastDue = true;
        break;

      case 'UNPAID':
        statusInfo.label = 'Impayé';
        statusInfo.description = 'Plusieurs tentatives de paiement ont échoué';
        statusInfo.color = 'red';
        break;

      case 'CANCELLED':
        statusInfo.label = 'Annulé';
        statusInfo.description = "L'abonnement a été annulé";
        statusInfo.color = 'gray';
        statusInfo.isCancelled = true;
        break;

      case 'TRIAL':
        statusInfo.label = "Période d'essai";
        statusInfo.description = subscription.trialEndsAt
          ? `Période d'essai active jusqu'au ${subscription.trialEndsAt.toLocaleDateString()}`
          : "Période d'essai active";
        statusInfo.color = 'blue';
        statusInfo.isActive = true;
        statusInfo.isTrialing = true;
        break;

      case 'ENDED':
        statusInfo.label = 'Terminé';
        statusInfo.description = "L'abonnement est arrivé à terme";
        statusInfo.color = 'gray';
        break;

      default:
        statusInfo.label = 'Inconnu';
        statusInfo.description = 'Statut inconnu';
        statusInfo.color = 'gray';
    }

    return statusInfo;
  },

  /**
   * Détermine si un changement de plan est une mise à niveau
   * @private
   */
  _isPlanUpgrade(currentPlan: PlanType, newPlan: PlanType): boolean {
    const planRanking = {
      FREE: 0,
      STARTER: 1,
      PREMIUM: 2,
      CUSTOM: 3,
    };

    return planRanking[newPlan] > planRanking[currentPlan];
  },

  /**
   * Détermine si un changement de plan est une rétrogradation
   * @private
   */
  _isPlanDowngrade(currentPlan: PlanType, newPlan: PlanType): boolean {
    const planRanking = {
      FREE: 0,
      STARTER: 1,
      PREMIUM: 2,
      CUSTOM: 3,
    };

    return planRanking[newPlan] < planRanking[currentPlan];
  },
};

// Export des fonctions individuelles pour faciliter les tests et l'utilisation
export const {
  getPlans,
  getPlan,
  createSubscription,
  cancelSubscription,
  updateSubscription,
  getSubscriptionDetails,
  processRenewal,
  applyDiscounts,
  processSubscriptionRenewals,
} = subscriptionService;
