/**
 * Service de gestion des paiements sécurisés (Escrow)
 * Gère la séquestration des fonds jusqu'à validation de livraison
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/utils/logger";

export type EscrowStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "HELD"
  | "RELEASED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "DISPUTED"
  | "CANCELLED"
  | "EXPIRED";

export type PaymentMethod =
  | "CARD"
  | "BANK_TRANSFER"
  | "DIGITAL_WALLET"
  | "CASH";

export interface EscrowTransaction {
  id: string;
  announcementId: string;
  clientId: string;
  delivererId?: string;
  merchantId?: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: EscrowStatus;

  // Détails du paiement
  paymentIntentId?: string; // Stripe Payment Intent
  cardLast4?: string;
  bankAccountLast4?: string;

  // Répartition des fonds
  breakdown: {
    serviceAmount: number;
    deliveryFee: number;
    platformFee: number;
    vatAmount: number;
    insuranceFee?: number;
  };

  // Gestion temporelle
  authorizedAt?: Date;
  capturedAt?: Date;
  heldUntil: Date;
  releasedAt?: Date;
  refundedAt?: Date;

  // Métadonnées
  metadata: {
    ipAddress: string;
    userAgent: string;
    paymentSource: "WEB" | "MOBILE" | "API";
    riskScore?: number;
  };

  // Événements
  events: EscrowEvent[];

  createdAt: Date;
  updatedAt: Date;
}

export interface EscrowEvent {
  id: string;
  escrowTransactionId: string;
  eventType: string;
  fromStatus: EscrowStatus;
  toStatus: EscrowStatus;
  triggeredBy: string;
  triggeredAt: Date;
  metadata?: Record<string, any>;
  reason?: string;
}

export interface EscrowReleaseRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    deliveryValidated: boolean;
    clientConfirmation: boolean;
    photoProofRequired: boolean;
    signatureRequired: boolean;
    minimumHoldPeriod: number; // heures
    maximumHoldPeriod: number; // heures
    autoReleaseAfter: number; // heures sans action client
  };
  isActive: boolean;
}

export interface EscrowConfig {
  defaultHoldPeriodHours: number;
  maxHoldPeriodHours: number;
  autoReleaseAfterHours: number;
  platformFeePercentage: number;
  maxRefundPeriodDays: number;
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  paymentMethods: {
    enabled: PaymentMethod[];
    cardProcessor: "STRIPE" | "PAYPAL";
    bankTransferEnabled: boolean;
  };
}

export class EscrowPaymentService {
  constructor(
    private prisma: PrismaClient,
    private config: EscrowConfig,
  ) {}

  /**
   * Initie un paiement sécurisé (escrow)
   */
  async initiateEscrowPayment(params: {
    announcementId: string;
    clientId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentDetails: Record<string, any>;
    metadata: {
      ipAddress: string;
      userAgent: string;
      paymentSource: "WEB" | "MOBILE" | "API";
    };
  }): Promise<EscrowTransaction> {
    try {
      // Calculer la répartition des montants
      const breakdown = this.calculatePaymentBreakdown(params.amount);

      // Évaluer le risque
      const riskScore = await this.assessPaymentRisk(params);

      // Créer la transaction escrow
      const escrowTransaction: EscrowTransaction = {
        id: this.generateTransactionId(),
        announcementId: params.announcementId,
        clientId: params.clientId,
        amount: params.amount,
        currency: params.currency,
        paymentMethod: params.paymentMethod,
        status: "PENDING",
        breakdown,
        heldUntil: new Date(
          Date.now() + this.config.defaultHoldPeriodHours * 60 * 60 * 1000,
        ),
        metadata: {
          ...params.metadata,
          riskScore},
        events: [],
        createdAt: new Date(),
        updatedAt: new Date()};

      // Sauvegarder la transaction
      await this.saveEscrowTransaction(escrowTransaction);

      // Traiter l'autorisation selon la méthode de paiement
      switch (params.paymentMethod) {
        case "CARD":
          await this.processCardAuthorization(
            escrowTransaction,
            params.paymentDetails,
          );
          break;
        case "BANK_TRANSFER":
          await this.processBankTransfer(
            escrowTransaction,
            params.paymentDetails,
          );
          break;
        case "DIGITAL_WALLET":
          await this.processDigitalWalletPayment(
            escrowTransaction,
            params.paymentDetails,
          );
          break;
        case "CASH":
          await this.processCashPayment(escrowTransaction);
          break;
      }

      await this.logEvent(
        escrowTransaction.id,
        "ESCROW_INITIATED",
        "PENDING",
        "AUTHORIZED",
        "SYSTEM",
        { amount: params.amount, paymentMethod: params.paymentMethod },
      );

      logger.info(
        `Paiement escrow initié: ${escrowTransaction.id} pour ${params.amount}${params.currency}`,
      );
      return escrowTransaction;
    } catch (error) {
      logger.error("Erreur lors de l'initiation du paiement escrow:", error);
      throw error;
    }
  }

  /**
   * Capture et séquestre les fonds
   */
  async captureAndHoldFunds(
    escrowTransactionId: string,
    delivererId?: string,
  ): Promise<boolean> {
    try {
      const transaction = await this.getEscrowTransaction(escrowTransactionId);
      if (!transaction) {
        throw new Error("Transaction escrow non trouvée");
      }

      if (transaction.status !== "AUTHORIZED") {
        throw new Error("Transaction non autorisée");
      }

      // Capturer les fonds selon la méthode de paiement
      const captureResult = await this.captureFunds(transaction);
      if (!captureResult.success) {
        throw new Error(`Échec de capture: ${captureResult.error}`);
      }

      // Mettre à jour la transaction
      transaction.status = "HELD";
      transaction.capturedAt = new Date();
      transaction.delivererId = delivererId;
      transaction.updatedAt = new Date();

      await this.updateEscrowTransaction(transaction);

      await this.logEvent(
        escrowTransactionId,
        "FUNDS_CAPTURED_AND_HELD",
        "AUTHORIZED",
        "HELD",
        "SYSTEM",
        { delivererId, captureId: captureResult.captureId },
      );

      // Programmer la libération automatique
      await this.scheduleAutoRelease(escrowTransactionId);

      logger.info(`Fonds capturés et séquestrés: ${escrowTransactionId}`);
      return true;
    } catch (error) {
      logger.error("Erreur lors de la capture et séquestration:", error);
      return false;
    }
  }

  /**
   * Libère les fonds au livreur après validation
   */
  async releaseFunds(
    escrowTransactionId: string,
    validatedBy: string,
    validationData: {
      deliveryValidated: boolean;
      clientRating?: number;
      clientComment?: string;
      photos?: string[];
      signature?: string;
    },
  ): Promise<boolean> {
    try {
      const transaction = await this.getEscrowTransaction(escrowTransactionId);
      if (!transaction) {
        throw new Error("Transaction escrow non trouvée");
      }

      if (transaction.status !== "HELD") {
        throw new Error("Fonds non séquestrés");
      }

      // Vérifier les conditions de libération
      const releaseRules = await this.getApplicableReleaseRules();
      const canRelease = await this.validateReleaseConditions(
        transaction,
        validationData,
        releaseRules,
      );

      if (!canRelease.isValid) {
        throw new Error(
          `Conditions de libération non remplies: ${canRelease.reason}`,
        );
      }

      // Calculer la répartition finale (avec d'éventuelles pénalités)
      const finalBreakdown = await this.calculateFinalBreakdown(
        transaction,
        validationData,
      );

      // Effectuer les transferts
      const transferResults = await this.executeTransfers(
        transaction,
        finalBreakdown,
      );

      if (transferResults.success) {
        // Mettre à jour la transaction
        transaction.status = "RELEASED";
        transaction.releasedAt = new Date();
        transaction.updatedAt = new Date();

        await this.updateEscrowTransaction(transaction);

        await this.logEvent(
          escrowTransactionId,
          "FUNDS_RELEASED",
          "HELD",
          "RELEASED",
          validatedBy,
          { validationData, finalBreakdown, transferResults },
        );

        // Notifier les parties concernées
        await this.notifyFundsReleased(transaction, finalBreakdown);

        logger.info(`Fonds libérés: ${escrowTransactionId}`);
        return true;
      } else {
        throw new Error(`Échec des transferts: ${transferResults.error}`);
      }
    } catch (error) {
      logger.error("Erreur lors de la libération des fonds:", error);
      return false;
    }
  }

  /**
   * Traite un remboursement
   */
  async processRefund(
    escrowTransactionId: string,
    refundAmount: number,
    reason: string,
    initiatedBy: string,
  ): Promise<boolean> {
    try {
      const transaction = await this.getEscrowTransaction(escrowTransactionId);
      if (!transaction) {
        throw new Error("Transaction escrow non trouvée");
      }

      if (!["HELD", "RELEASED"].includes(transaction.status)) {
        throw new Error("Statut de transaction incorrect pour remboursement");
      }

      // Vérifier la fenêtre de remboursement
      const daysSinceTransaction =
        (Date.now() - transaction.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceTransaction > this.config.maxRefundPeriodDays) {
        throw new Error("Période de remboursement expirée");
      }

      // Vérifier le montant de remboursement
      if (refundAmount > transaction.amount) {
        throw new Error(
          "Montant de remboursement supérieur au montant de la transaction",
        );
      }

      // Effectuer le remboursement selon la méthode de paiement
      const refundResult = await this.executeRefund(
        transaction,
        refundAmount,
        reason,
      );

      if (refundResult.success) {
        // Mettre à jour le statut
        const newStatus =
          refundAmount === transaction.amount
            ? "REFUNDED"
            : "PARTIALLY_REFUNDED";

        transaction.status = newStatus;
        transaction.refundedAt = new Date();
        transaction.updatedAt = new Date();

        await this.updateEscrowTransaction(transaction);

        await this.logEvent(
          escrowTransactionId,
          "REFUND_PROCESSED",
          "HELD",
          newStatus,
          initiatedBy,
          { refundAmount, reason, refundId: refundResult.refundId },
        );

        // Notifier les parties concernées
        await this.notifyRefundProcessed(transaction, refundAmount, reason);

        logger.info(
          `Remboursement traité: ${escrowTransactionId} - ${refundAmount}${transaction.currency}`,
        );
        return true;
      } else {
        throw new Error(`Échec du remboursement: ${refundResult.error}`);
      }
    } catch (error) {
      logger.error("Erreur lors du traitement du remboursement:", error);
      return false;
    }
  }

  /**
   * Gère les disputes de paiement
   */
  async handlePaymentDispute(
    escrowTransactionId: string,
    disputeData: {
      disputeType:
        | "UNAUTHORIZED"
        | "DUPLICATE"
        | "FRAUDULENT"
        | "PRODUCT_NOT_RECEIVED"
        | "PRODUCT_UNACCEPTABLE";
      description: string;
      evidence?: string[];
      disputedBy: string;
    },
  ): Promise<void> {
    try {
      const transaction = await this.getEscrowTransaction(escrowTransactionId);
      if (!transaction) {
        throw new Error("Transaction escrow non trouvée");
      }

      // Mettre en statut de dispute
      transaction.status = "DISPUTED";
      transaction.updatedAt = new Date();

      await this.updateEscrowTransaction(transaction);

      await this.logEvent(
        escrowTransactionId,
        "DISPUTE_INITIATED",
        transaction.status,
        "DISPUTED",
        disputeData.disputedBy,
        { disputeData },
      );

      // Bloquer la libération automatique des fonds
      await this.cancelAutoRelease(escrowTransactionId);

      // Notifier l'équipe de résolution de disputes
      await this.notifyDisputeTeam(transaction, disputeData);

      // Créer un dossier de dispute
      await this.createDisputeCase(transaction, disputeData);

      logger.info(
        `Dispute initiée pour la transaction: ${escrowTransactionId}`,
      );
    } catch (error) {
      logger.error("Erreur lors de la gestion de dispute:", error);
      throw error;
    }
  }

  /**
   * Libération automatique des fonds
   */
  async autoReleaseFunds(escrowTransactionId: string): Promise<void> {
    try {
      const transaction = await this.getEscrowTransaction(escrowTransactionId);
      if (!transaction) {
        return;
      }

      if (transaction.status !== "HELD") {
        return;
      }

      // Vérifier si la période de libération automatique est atteinte
      const holdPeriodExpired = Date.now() > transaction.heldUntil.getTime();
      const autoReleaseTime = transaction.capturedAt
        ? new Date(
            transaction.capturedAt.getTime() +
              this.config.autoReleaseAfterHours * 60 * 60 * 1000,
          )
        : new Date(
            Date.now() + this.config.autoReleaseAfterHours * 60 * 60 * 1000,
          );

      if (holdPeriodExpired || Date.now() > autoReleaseTime.getTime()) {
        await this.releaseFunds(escrowTransactionId, "SYSTEM", {
          deliveryValidated: true, // Validation automatique
        });

        logger.info(`Libération automatique des fonds: ${escrowTransactionId}`);
      }
    } catch (error) {
      logger.error("Erreur lors de la libération automatique:", error);
    }
  }

  // Méthodes privées de calcul et utilitaires
  private calculatePaymentBreakdown(
    totalAmount: number,
  ): EscrowTransaction["breakdown"] {
    const platformFee = totalAmount * (this.config.platformFeePercentage / 100);
    const vatAmount = totalAmount * 0.2; // TVA 20%
    const serviceAmount = totalAmount - platformFee - vatAmount;

    return {
      serviceAmount,
      deliveryFee: serviceAmount * 0.8, // 80% pour la livraison
      platformFee,
      vatAmount,
      insuranceFee: totalAmount > 100 ? 2.5 : 0, // Assurance pour montants > 100€
    };
  }

  private async assessPaymentRisk(params: any): Promise<number> {
    const riskScore = 0;

    if (params.amount > 500) riskScore += 10;
    if (params.paymentMethod === "CARD") riskScore += 5;
    if (!params.metadata.ipAddress) riskScore += 20;

    // Dans une vraie implémentation, utiliser des services comme Stripe Radar
    return Math.min(riskScore, 100);
  }

  private generateTransactionId(): string {
    return `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async validateReleaseConditions(
    transaction: EscrowTransaction,
    validationData: any,
    rules: EscrowReleaseRule[],
  ): Promise<{ isValid: boolean; reason?: string }> {
    // Vérifier les conditions selon les règles applicables
    for (const rule of rules) {
      if (!rule.isActive) continue;

      const conditions = rule.conditions;

      if (conditions.deliveryValidated && !validationData.deliveryValidated) {
        return { isValid: false, reason: "Livraison non validée" };
      }

      if (
        conditions.photoProofRequired &&
        (!validationData.photos || validationData.photos.length === 0)
      ) {
        return { isValid: false, reason: "Preuve photo requise" };
      }

      if (conditions.signatureRequired && !validationData.signature) {
        return { isValid: false, reason: "Signature requise" };
      }

      // Vérifier la période de détention minimale
      const holdPeriod =
        (Date.now() - (transaction.capturedAt?.getTime() || Date.now())) /
        (1000 * 60 * 60);
      if (holdPeriod < conditions.minimumHoldPeriod) {
        return {
          isValid: false,
          reason: `Période de détention minimale non atteinte (${conditions.minimumHoldPeriod}h)`};
      }
    }

    return { isValid };
  }

  private async calculateFinalBreakdown(
    transaction: EscrowTransaction,
    validationData: any,
  ): Promise<EscrowTransaction["breakdown"]> {
    const breakdown = { ...transaction.breakdown };

    // Appliquer des bonus/pénalités selon la qualité de service
    if (validationData.clientRating) {
      if (validationData.clientRating >= 4.5) {
        // Bonus pour excellent service
        breakdown.deliveryFee *= 1.05;
      } else if (validationData.clientRating < 3) {
        // Pénalité pour service médiocre
        breakdown.deliveryFee *= 0.95;
      }
    }

    return breakdown;
  }

  private async processCardAuthorization(
    transaction: EscrowTransaction,
    paymentDetails: any,
  ): Promise<void> {
    
    transaction.paymentIntentId = `pi_${Math.random().toString(36).substr(2, 20)}`;
    transaction.cardLast4 = paymentDetails.cardNumber?.slice(-4) || "4242";
    transaction.status = "AUTHORIZED";
    transaction.authorizedAt = new Date();
  }

  private async processBankTransfer(
    transaction: EscrowTransaction,
    paymentDetails: any,
  ): Promise<void> {
    
    transaction.bankAccountLast4 = paymentDetails.iban?.slice(-4) || "0123";
    transaction.status = "AUTHORIZED";
    transaction.authorizedAt = new Date();
  }

  private async processDigitalWalletPayment(
    transaction: EscrowTransaction,
    paymentDetails: any,
  ): Promise<void> {
    
    transaction.status = "AUTHORIZED";
    transaction.authorizedAt = new Date();
  }

  private async processCashPayment(
    transaction: EscrowTransaction,
  ): Promise<void> {
    // Paiement en espèces - autorisation immédiate
    transaction.status = "AUTHORIZED";
    transaction.authorizedAt = new Date();
  }

  private async captureFunds(
    transaction: EscrowTransaction,
  ): Promise<{ success: boolean; captureId?: string; error?: string }> {
    
    return {
      success: true,
      captureId: `capture_${Math.random().toString(36).substr(2, 20)}`};
  }

  private async executeTransfers(
    transaction: EscrowTransaction,
    breakdown: EscrowTransaction["breakdown"],
  ): Promise<{ success: boolean; transferIds?: string[]; error?: string }> {
    
    const transferIds = [
      `transfer_deliverer_${Math.random().toString(36).substr(2, 10)}`,
      `transfer_platform_${Math.random().toString(36).substr(2, 10)}`];

    return {
      success: true,
      transferIds};
  }

  private async executeRefund(
    transaction: EscrowTransaction,
    amount: number,
    reason: string,
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    
    return {
      success: true,
      refundId: `refund_${Math.random().toString(36).substr(2, 20)}`};
  }

  private async saveEscrowTransaction(
    transaction: EscrowTransaction,
  ): Promise<void> {
    logger.info(`Transaction escrow sauvegardée: ${transaction.id}`);
  }

  private async updateEscrowTransaction(
    transaction: EscrowTransaction,
  ): Promise<void> {
    logger.info(`Transaction escrow mise à jour: ${transaction.id}`);
  }

  private async getEscrowTransaction(
    id: string,
  ): Promise<EscrowTransaction | null> {
    
    return null;
  }

  private async getApplicableReleaseRules(): Promise<EscrowReleaseRule[]> {
    
    return [
      {
        id: "standard",
        name: "Règle standard",
        description: "Conditions standard de libération",
        conditions: {
          deliveryValidated: true,
          clientConfirmation: false,
          photoProofRequired: true,
          signatureRequired: false,
          minimumHoldPeriod: 1,
          maximumHoldPeriod: 168, // 7 jours
          autoReleaseAfter: 48, // 48 heures
        },
        isActive: true}];
  }

  private async scheduleAutoRelease(
    escrowTransactionId: string,
  ): Promise<void> {
    // Programmer la libération automatique
    setTimeout(
      () => {
        this.autoReleaseFunds(escrowTransactionId);
      },
      this.config.autoReleaseAfterHours * 60 * 60 * 1000,
    );

    logger.info(
      `Libération automatique programmée pour ${escrowTransactionId}`,
    );
  }

  private async cancelAutoRelease(escrowTransactionId: string): Promise<void> {
    // Annuler la libération automatique programmée
    logger.info(`Libération automatique annulée pour ${escrowTransactionId}`);
  }

  private async createDisputeCase(
    transaction: EscrowTransaction,
    disputeData: any,
  ): Promise<void> {
    logger.info(`Dossier de dispute créé pour ${transaction.id}`);
  }

  // Méthodes d'événements
  private async logEvent(
    escrowTransactionId: string,
    eventType: string,
    fromStatus: EscrowStatus,
    toStatus: EscrowStatus,
    triggeredBy: string,
    metadata?: Record<string, any>,
    reason?: string,
  ): Promise<void> {
    const event: EscrowEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      escrowTransactionId,
      eventType,
      fromStatus,
      toStatus,
      triggeredBy,
      triggeredAt: new Date(),
      metadata,
      reason};

    logger.info(
      `Événement escrow: ${eventType} pour ${escrowTransactionId} (${fromStatus} → ${toStatus})`,
    );
  }

  private async notifyFundsReleased(
    transaction: EscrowTransaction,
    breakdown: any,
  ): Promise<void> {
    logger.info(`Notification libération fonds envoyée pour ${transaction.id}`);
  }

  private async notifyRefundProcessed(
    transaction: EscrowTransaction,
    amount: number,
    reason: string,
  ): Promise<void> {
    logger.info(
      `Notification remboursement envoyée pour ${transaction.id}: ${amount}`,
    );
  }

  private async notifyDisputeTeam(
    transaction: EscrowTransaction,
    disputeData: any,
  ): Promise<void> {
    logger.info(`Notification équipe dispute envoyée pour ${transaction.id}`);
  }
}
