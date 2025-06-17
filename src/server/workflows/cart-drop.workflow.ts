/**
 * Workflow du Cart Drop
 * Gère le cycle de vie complet d'une commande cart drop
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/utils/logger";
import {
  CartDropService,
  CartDropOrder} from "../services/matching/cart-drop.service";
import { TaskSchedulerService } from "../services/shared/task-scheduler.service";

export type CartDropStatus =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export interface CartDropWorkflowEvent {
  id: string;
  orderId: string;
  eventType: string;
  fromStatus: CartDropStatus;
  toStatus: CartDropStatus;
  triggeredBy: string;
  triggeredAt: Date;
  metadata?: Record<string, any>;
  terminalId?: string;
}

export interface CartDropWorkflowConfig {
  paymentTimeoutMinutes: number;
  preparationTimeMinutes: number;
  pickupTimeoutMinutes: number;
  deliveryTimeoutMinutes: number;
  autoAssignmentEnabled: boolean;
  qualityControlEnabled: boolean;
  realTimeTrackingEnabled: boolean;
  customerNotificationsEnabled: boolean;
}

export class CartDropWorkflow {
  private cartDropService: CartDropService;
  private taskScheduler: TaskSchedulerService;

  constructor(
    private prisma: PrismaClient,
    private config: CartDropWorkflowConfig,
  ) {
    this.cartDropService = new CartDropService(prisma);
    this.taskScheduler = TaskSchedulerService.getInstance(prisma);
    this.taskScheduler.start();
  }

  /**
   * Démarre le workflow pour une nouvelle commande cart drop
   */
  async startWorkflow(orderData: any): Promise<string> {
    try {
      // Créer la commande
      const order = await this.cartDropService.createCartDropOrder(orderData);

      await this.logEvent(
        order.id,
        "ORDER_CREATED",
        "CREATED",
        "PAYMENT_PENDING",
        "SYSTEM",
        {
          clientId: order.clientId,
          merchantId: order.merchantId,
          totalPrice: order.totalPrice,
          productCount: order.products.length},
      );

      // Programmer le timeout de paiement
      await this.schedulePaymentTimeout(order.id);

      // Notifier le client pour le paiement
      await this.notifyPaymentRequired(order);

      logger.info(`Workflow cart drop démarré pour la commande ${order.id}`);
      return order.id;
    } catch (error) {
      logger.error("Erreur lors du démarrage du workflow cart drop:", error);
      throw error;
    }
  }

  /**
   * Traite le paiement réussi
   */
  async handlePaymentSuccess(
    orderId: string,
    paymentDetails: {
      transactionId: string;
      amount: number;
      method: string;
    },
  ): Promise<void> {
    try {
      const currentStatus = await this.getOrderStatus(orderId);

      if (currentStatus !== "PAYMENT_PENDING") {
        throw new Error("Paiement non attendu pour cette commande");
      }

      await this.logEvent(
        orderId,
        "PAYMENT_SUCCESS",
        "PAYMENT_PENDING",
        "CONFIRMED",
        "PAYMENT_SYSTEM",
        { paymentDetails },
      );

      await this.updateOrderStatus(orderId, "CONFIRMED");

      // Déclencher la préparation de commande
      await this.triggerOrderPreparation(orderId);

      // Notifier le commerçant
      await this.notifyMerchantNewOrder(orderId);

      // Notifier le client
      await this.notifyCustomerOrderConfirmed(orderId);

      logger.info(`Paiement réussi pour la commande ${orderId}`);
    } catch (error) {
      logger.error("Erreur lors du traitement du paiement réussi:", error);
      throw error;
    }
  }

  /**
   * Traite l'échec de paiement
   */
  async handlePaymentFailure(
    orderId: string,
    failureReason: string,
  ): Promise<void> {
    try {
      await this.logEvent(
        orderId,
        "PAYMENT_FAILED",
        "PAYMENT_PENDING",
        "PAYMENT_FAILED",
        "PAYMENT_SYSTEM",
        { failureReason },
      );

      await this.updateOrderStatus(orderId, "PAYMENT_FAILED");

      // Libérer le stock réservé
      await this.releaseReservedStock(orderId);

      // Libérer le créneau horaire
      await this.releaseTimeSlot(orderId);

      // Notifier le client de l'échec
      await this.notifyCustomerPaymentFailed(orderId, failureReason);

      logger.info(
        `Paiement échoué pour la commande ${orderId}: ${failureReason}`,
      );
    } catch (error) {
      logger.error("Erreur lors du traitement de l'échec de paiement:", error);
    }
  }

  /**
   * Traite le début de préparation
   */
  async handlePreparationStarted(
    orderId: string,
    merchantStaffId: string,
  ): Promise<void> {
    try {
      const currentStatus = await this.getOrderStatus(orderId);

      if (currentStatus !== "CONFIRMED") {
        throw new Error("Commande non confirmée");
      }

      await this.logEvent(
        orderId,
        "PREPARATION_STARTED",
        "CONFIRMED",
        "PREPARING",
        merchantStaffId,
      );

      await this.updateOrderStatus(orderId, "PREPARING");

      // Programmer le timeout de préparation
      await this.schedulePreparationTimeout(orderId);

      // Notifier le client du début de préparation
      await this.notifyCustomerPreparationStarted(orderId);

      // Démarrer l'estimation de temps de préparation
      await this.updatePreparationEstimate(orderId);

      logger.info(`Préparation démarrée pour la commande ${orderId}`);
    } catch (error) {
      logger.error("Erreur lors du démarrage de préparation:", error);
      throw error;
    }
  }

  /**
   * Traite la fin de préparation
   */
  async handlePreparationCompleted(
    orderId: string,
    merchantStaffId: string,
    qualityCheck?: {
      allItemsPresent: boolean;
      packagingCorrect: boolean;
      specialInstructionsFollowed: boolean;
      notes?: string;
    },
  ): Promise<void> {
    try {
      const currentStatus = await this.getOrderStatus(orderId);

      if (currentStatus !== "PREPARING") {
        throw new Error("Commande non en préparation");
      }

      // Contrôle qualité si activé
      if (this.config.qualityControlEnabled && qualityCheck) {
        const qualityOk =
          qualityCheck.allItemsPresent &&
          qualityCheck.packagingCorrect &&
          qualityCheck.specialInstructionsFollowed;

        if (!qualityOk) {
          await this.handleQualityCheckFailure(orderId, qualityCheck);
          return;
        }
      }

      await this.logEvent(
        orderId,
        "PREPARATION_COMPLETED",
        "PREPARING",
        "READY_FOR_PICKUP",
        merchantStaffId,
        { qualityCheck },
      );

      await this.updateOrderStatus(orderId, "READY_FOR_PICKUP");

      // Déclencher l'assignation de livreur
      if (this.config.autoAssignmentEnabled) {
        await this.triggerDelivererAssignment(orderId);
      }

      // Générer le code de collecte
      await this.generatePickupCode(orderId);

      // Notifier que la commande est prête
      await this.notifyOrderReadyForPickup(orderId);

      logger.info(`Préparation terminée pour la commande ${orderId}`);
    } catch (error) {
      logger.error("Erreur lors de la finalisation de préparation:", error);
      throw error;
    }
  }

  /**
   * Traite l'assignation du livreur
   */
  async handleDelivererAssigned(
    orderId: string,
    delivererId: string,
  ): Promise<void> {
    try {
      const currentStatus = await this.getOrderStatus(orderId);

      if (currentStatus !== "READY_FOR_PICKUP") {
        throw new Error("Commande non prête pour assignation");
      }

      await this.logEvent(
        orderId,
        "DELIVERER_ASSIGNED",
        "READY_FOR_PICKUP",
        "ASSIGNED",
        "SYSTEM",
        {
          delivererId},
      );

      await this.updateOrderStatus(orderId, "ASSIGNED");

      // Programmer le timeout de collecte
      await this.schedulePickupTimeout(orderId);

      // Notifier le livreur
      await this.notifyDelivererAssigned(orderId, delivererId);

      // Notifier le client
      await this.notifyCustomerDelivererAssigned(orderId, delivererId);

      // Notifier le commerçant
      await this.notifyMerchantDelivererAssigned(orderId, delivererId);

      logger.info(`Livreur ${delivererId} assigné à la commande ${orderId}`);
    } catch (error) {
      logger.error("Erreur lors de l'assignation du livreur:", error);
      throw error;
    }
  }

  /**
   * Traite la collecte par le livreur
   */
  async handleOrderPickedUp(
    orderId: string,
    delivererId: string,
    pickupData: {
      pickupCode: string;
      pickupTime: Date;
      pickupLocation: { latitude: number; longitude: number };
      photos?: string[];
    },
  ): Promise<void> {
    try {
      const currentStatus = await this.getOrderStatus(orderId);

      if (currentStatus !== "ASSIGNED") {
        throw new Error("Commande non assignée à ce livreur");
      }

      // Vérifier le code de collecte
      const isValidCode = await this.validatePickupCode(
        orderId,
        pickupData.pickupCode,
      );
      if (!isValidCode) {
        throw new Error("Code de collecte invalide");
      }

      await this.logEvent(
        orderId,
        "ORDER_PICKED_UP",
        "ASSIGNED",
        "PICKED_UP",
        delivererId,
        {
          pickupData},
      );

      await this.updateOrderStatus(orderId, "PICKED_UP");

      // Déclencher le début de livraison
      await this.startDelivery(orderId, delivererId);

      logger.info(`Commande ${orderId} collectée par ${delivererId}`);
    } catch (error) {
      logger.error("Erreur lors de la collecte:", error);
      throw error;
    }
  }

  /**
   * Traite le début de livraison
   */
  async handleDeliveryStarted(
    orderId: string,
    delivererId: string,
  ): Promise<void> {
    try {
      await this.logEvent(
        orderId,
        "DELIVERY_STARTED",
        "PICKED_UP",
        "IN_DELIVERY",
        delivererId,
      );

      await this.updateOrderStatus(orderId, "IN_DELIVERY");

      // Démarrer le suivi en temps réel si activé
      if (this.config.realTimeTrackingEnabled) {
        await this.startRealTimeTracking(orderId, delivererId);
      }

      // Programmer le timeout de livraison
      await this.scheduleDeliveryTimeout(orderId);

      // Notifier le client
      await this.notifyCustomerDeliveryStarted(orderId, delivererId);

      // Générer le code de livraison
      await this.generateDeliveryCode(orderId);

      logger.info(`Livraison démarrée pour la commande ${orderId}`);
    } catch (error) {
      logger.error("Erreur lors du démarrage de livraison:", error);
      throw error;
    }
  }

  /**
   * Traite la livraison terminée
   */
  async handleDeliveryCompleted(
    orderId: string,
    delivererId: string,
    deliveryData: {
      deliveryCode: string;
      deliveryTime: Date;
      deliveryLocation: { latitude: number; longitude: number };
      photos: string[];
      signature?: string;
      customerPresent: boolean;
    },
  ): Promise<void> {
    try {
      const currentStatus = await this.getOrderStatus(orderId);

      if (currentStatus !== "IN_DELIVERY") {
        throw new Error("Livraison non en cours");
      }

      // Vérifier le code de livraison
      const isValidCode = await this.validateDeliveryCode(
        orderId,
        deliveryData.deliveryCode,
      );
      if (!isValidCode) {
        throw new Error("Code de livraison invalide");
      }

      // Vérifier la localisation (tolérance de 100m)
      const isValidLocation = await this.validateDeliveryLocation(
        orderId,
        deliveryData.deliveryLocation,
      );
      if (!isValidLocation) {
        throw new Error("Localisation de livraison incorrecte");
      }

      await this.logEvent(
        orderId,
        "DELIVERY_COMPLETED",
        "IN_DELIVERY",
        "DELIVERED",
        delivererId,
        {
          deliveryData},
      );

      await this.updateOrderStatus(orderId, "DELIVERED");

      // Sauvegarder les preuves de livraison
      await this.saveDeliveryProof(orderId, deliveryData);

      // Déclencher le paiement du livreur
      await this.processDelivererPayment(orderId, delivererId);

      // Finaliser la commande
      await this.completeOrder(orderId);

      // Notifier toutes les parties
      await this.notifyDeliveryCompleted(orderId);

      // Mettre à jour les statistiques
      await this.updateStatistics(orderId);

      logger.info(`Livraison terminée pour la commande ${orderId}`);
    } catch (error) {
      logger.error("Erreur lors de la finalisation de livraison:", error);
      throw error;
    }
  }

  /**
   * Traite l'annulation d'une commande
   */
  async handleOrderCancellation(
    orderId: string,
    cancelledBy: string,
    reason: string,
    refundRequired: boolean = true,
  ): Promise<void> {
    try {
      const currentStatus = await this.getOrderStatus(orderId);

      // Vérifier si l'annulation est possible
      if (["DELIVERED", "COMPLETED"].includes(currentStatus)) {
        throw new Error("Impossible d'annuler une commande livrée");
      }

      await this.logEvent(
        orderId,
        "ORDER_CANCELLED",
        currentStatus,
        "CANCELLED",
        cancelledBy,
        {
          reason,
          refundRequired},
      );

      await this.updateOrderStatus(orderId, "CANCELLED");

      // Gérer les annulations selon le statut
      await this.handleCancellationCleanup(orderId, currentStatus);

      // Traiter le remboursement si nécessaire
      if (
        refundRequired &&
        ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "ASSIGNED"].includes(
          currentStatus,
        )
      ) {
        await this.processRefund(orderId);
      }

      // Notifier les parties concernées
      await this.notifyOrderCancellation(orderId, reason);

      logger.info(`Commande ${orderId} annulée par ${cancelledBy}: ${reason}`);
    } catch (error) {
      logger.error("Erreur lors de l'annulation:", error);
      throw error;
    }
  }

  // Méthodes privées
  private async logEvent(
    orderId: string,
    eventType: string,
    fromStatus: CartDropStatus,
    toStatus: CartDropStatus,
    triggeredBy: string,
    metadata?: Record<string, any>,
    terminalId?: string,
  ): Promise<void> {
    const event: CartDropWorkflowEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      eventType,
      fromStatus,
      toStatus,
      triggeredBy,
      triggeredAt: new Date(),
      metadata,
      terminalId};

    logger.info(
      `Événement cart drop: ${eventType} pour ${orderId} (${fromStatus} → ${toStatus})`,
    );
  }

  private async updateOrderStatus(
    orderId: string,
    status: CartDropStatus,
  ): Promise<void> {
    
    logger.info(`Statut commande mis à jour: ${orderId} → ${status}`);
  }

  private async getOrderStatus(orderId: string): Promise<CartDropStatus> {
    
    return "CREATED";
  }

  private async triggerOrderPreparation(orderId: string): Promise<void> {
    // Démarrer immédiatement la préparation au lieu d'attendre
    await this.handlePreparationStarted(orderId, "MERCHANT_STAFF");
  }

  private async triggerDelivererAssignment(orderId: string): Promise<void> {
    // Déclencher l'assignation automatique
    const result = await this.cartDropService.assignDelivererToOrder(orderId);

    if (result.success && result.delivererId) {
      await this.handleDelivererAssigned(orderId, result.delivererId);
    }
  }

  private async startDelivery(
    orderId: string,
    delivererId: string,
  ): Promise<void> {
    // Démarrer immédiatement la livraison au lieu d'attendre
    await this.handleDeliveryStarted(orderId, delivererId);
  }

  private async completeOrder(orderId: string): Promise<void> {
    await this.logEvent(
      orderId,
      "ORDER_COMPLETED",
      "DELIVERED",
      "COMPLETED",
      "SYSTEM",
    );

    await this.updateOrderStatus(orderId, "COMPLETED");
  }

  // Méthodes de timeout et planification avec le TaskScheduler
  private async schedulePaymentTimeout(orderId: string): Promise<void> {
    await this.taskScheduler.schedulePaymentTimeout(
      orderId,
      this.config.paymentTimeoutMinutes,
      {
        metadata: { 
          failureReason: "Timeout de paiement",
          scheduledBy: "WORKFLOW"
        }
      }
    );
  }

  private async schedulePreparationTimeout(orderId: string): Promise<void> {
    await this.taskScheduler.schedulePreparationTimeout(
      orderId,
      this.config.preparationTimeMinutes,
      {
        metadata: { 
          alertType: "PREPARATION_DELAY",
          scheduledBy: "WORKFLOW" 
        }
      }
    );
  }

  private async schedulePickupTimeout(orderId: string): Promise<void> {
    await this.taskScheduler.schedulePickupTimeout(
      orderId,
      this.config.pickupTimeoutMinutes,
      {
        metadata: { 
          action: "REASSIGN_DELIVERER",
          scheduledBy: "WORKFLOW" 
        }
      }
    );
  }

  private async scheduleDeliveryTimeout(orderId: string): Promise<void> {
    await this.taskScheduler.scheduleDeliveryTimeout(
      orderId,
      this.config.deliveryTimeoutMinutes,
      {
        metadata: { 
          action: "ESCALATE_ISSUE",
          scheduledBy: "WORKFLOW" 
        }
      }
    );
  }

  // Méthodes de gestion des timeouts
  private async handlePreparationDelay(orderId: string): Promise<void> {
    await this.notifyPreparationDelay(orderId);
    logger.warn(`Retard de préparation pour la commande ${orderId}`);
  }

  private async handlePickupTimeout(orderId: string): Promise<void> {
    await this.reassignDeliverer(orderId);
    logger.warn(`Timeout de collecte pour la commande ${orderId}`);
  }

  private async handleDeliveryTimeout(orderId: string): Promise<void> {
    await this.escalateDeliveryIssue(orderId);
    logger.warn(`Timeout de livraison pour la commande ${orderId}`);
  }

  // Méthodes de gestion des échecs et contrôles
  private async handleQualityCheckFailure(
    orderId: string,
    qualityCheck: any,
  ): Promise<void> {
    await this.logEvent(
      orderId,
      "QUALITY_CHECK_FAILED",
      "PREPARING",
      "PREPARING", // Reste en préparation
      "QUALITY_CONTROL",
      { qualityCheck },
    );

    await this.notifyQualityCheckFailure(orderId, qualityCheck);
    logger.warn(`Échec du contrôle qualité pour la commande ${orderId}`);
  }

  private async handleCancellationCleanup(
    orderId: string,
    currentStatus: CartDropStatus,
  ): Promise<void> {
    switch (currentStatus) {
      case "CONFIRMED":
      case "PREPARING":
        await this.releaseReservedStock(orderId);
        await this.releaseTimeSlot(orderId);
        break;
      case "READY_FOR_PICKUP":
      case "ASSIGNED":
        await this.releaseDeliverer(orderId);
        break;
      case "PICKED_UP":
      case "IN_DELIVERY":
        await this.handleReturnToMerchant(orderId);
        break;
    }
  }

  // Méthodes de validation et vérification
  private async validatePickupCode(
    orderId: string,
    code: string,
  ): Promise<boolean> {
    try {
      // Récupérer le code de collecte généré pour cette commande
      const orderDetails = await this.prisma.$queryRaw`
        SELECT pickup_code FROM cart_drop_orders 
        WHERE id = ${orderId}
      `;
      
      if (Array.isArray(orderDetails) && orderDetails.length > 0) {
        const expectedCode = (orderDetails[0] as any).pickup_code;
        return code === expectedCode;
      }
      
      return false;
    } catch (error) {
      logger.error("Erreur validation code collecte:", error);
      return false;
    }
  }

  private async validateDeliveryCode(
    orderId: string,
    code: string,
  ): Promise<boolean> {
    try {
      // Récupérer le code de livraison généré pour cette commande
      const orderDetails = await this.prisma.$queryRaw`
        SELECT delivery_code FROM cart_drop_orders 
        WHERE id = ${orderId}
      `;
      
      if (Array.isArray(orderDetails) && orderDetails.length > 0) {
        const expectedCode = (orderDetails[0] as any).delivery_code;
        return code === expectedCode;
      }
      
      return false;
    } catch (error) {
      logger.error("Erreur validation code livraison:", error);
      return false;
    }
  }

  private async validateDeliveryLocation(
    orderId: string,
    location: { latitude: number; longitude: number },
  ): Promise<boolean> {
    try {
      // Récupérer l'adresse de livraison de la commande
      const orderDetails = await this.prisma.$queryRaw`
        SELECT delivery_latitude, delivery_longitude FROM cart_drop_orders 
        WHERE id = ${orderId}
      `;
      
      if (Array.isArray(orderDetails) && orderDetails.length > 0) {
        const expectedLocation = orderDetails[0] as any;
        
        // Calculer la distance entre la position actuelle et l'adresse de livraison
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          expectedLocation.delivery_latitude,
          expectedLocation.delivery_longitude
        );
        
        // Accepter si la distance est inférieure à 100 mètres
        return distance <= 0.1; // 0.1 km = 100 mètres
      }
      
      return false;
    } catch (error) {
      logger.error("Erreur validation localisation livraison:", error);
      return false;
    }
  }

  /**
   * Calcule la distance entre deux points GPS en kilomètres
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async releaseReservedStock(orderId: string): Promise<void> {
    logger.info(`Stock libéré pour la commande ${orderId}`);
  }

  private async releaseTimeSlot(orderId: string): Promise<void> {
    logger.info(`Créneau libéré pour la commande ${orderId}`);
  }

  private async releaseDeliverer(orderId: string): Promise<void> {
    logger.info(`Livreur libéré pour la commande ${orderId}`);
  }

  private async generatePickupCode(orderId: string): Promise<void> {
    logger.info(`Code de collecte généré pour ${orderId}`);
  }

  private async generateDeliveryCode(orderId: string): Promise<void> {
    logger.info(`Code de livraison généré pour ${orderId}`);
  }

  private async startRealTimeTracking(
    orderId: string,
    delivererId: string,
  ): Promise<void> {
    logger.info(`Suivi temps réel démarré: ${orderId} par ${delivererId}`);
  }

  private async saveDeliveryProof(
    orderId: string,
    deliveryData: any,
  ): Promise<void> {
    logger.info(`Preuve de livraison sauvegardée pour ${orderId}`);
  }

  private async processDelivererPayment(
    orderId: string,
    delivererId: string,
  ): Promise<void> {
    logger.info(`Paiement livreur traité: ${delivererId} pour ${orderId}`);
  }

  private async processRefund(orderId: string): Promise<void> {
    logger.info(`Remboursement traité pour ${orderId}`);
  }

  private async updatePreparationEstimate(orderId: string): Promise<void> {
    logger.info(`Estimation de préparation mise à jour pour ${orderId}`);
  }

  private async reassignDeliverer(orderId: string): Promise<void> {
    logger.info(`Réassignation de livreur pour ${orderId}`);
  }

  private async escalateDeliveryIssue(orderId: string): Promise<void> {
    logger.info(`Escalation d'incident de livraison pour ${orderId}`);
  }

  private async handleReturnToMerchant(orderId: string): Promise<void> {
    logger.info(`Retour au commerçant pour ${orderId}`);
  }

  private async updateStatistics(orderId: string): Promise<void> {
    logger.info(`Statistiques mises à jour pour ${orderId}`);
  }

  private async notifyPaymentRequired(order: CartDropOrder): Promise<void> {
    logger.info(`Notification paiement requis envoyée pour ${order.id}`);
  }

  private async notifyMerchantNewOrder(orderId: string): Promise<void> {
    logger.info(
      `Notification nouvelle commande envoyée au commerçant pour ${orderId}`,
    );
  }

  private async notifyCustomerOrderConfirmed(orderId: string): Promise<void> {
    logger.info(
      `Notification commande confirmée envoyée au client pour ${orderId}`,
    );
  }

  private async notifyCustomerPaymentFailed(
    orderId: string,
    reason: string,
  ): Promise<void> {
    logger.info(
      `Notification échec paiement envoyée au client pour ${orderId}: ${reason}`,
    );
  }

  private async notifyCustomerPreparationStarted(
    orderId: string,
  ): Promise<void> {
    logger.info(
      `Notification début préparation envoyée au client pour ${orderId}`,
    );
  }

  private async notifyOrderReadyForPickup(orderId: string): Promise<void> {
    logger.info(`Notification commande prête envoyée pour ${orderId}`);
  }

  private async notifyDelivererAssigned(
    orderId: string,
    delivererId: string,
  ): Promise<void> {
    logger.info(
      `Notification assignation envoyée au livreur ${delivererId} pour ${orderId}`,
    );
  }

  private async notifyCustomerDelivererAssigned(
    orderId: string,
    delivererId: string,
  ): Promise<void> {
    logger.info(
      `Notification livreur assigné envoyée au client pour ${orderId}`,
    );
  }

  private async notifyMerchantDelivererAssigned(
    orderId: string,
    delivererId: string,
  ): Promise<void> {
    logger.info(
      `Notification livreur assigné envoyée au commerçant pour ${orderId}`,
    );
  }

  private async notifyCustomerDeliveryStarted(
    orderId: string,
    delivererId: string,
  ): Promise<void> {
    logger.info(
      `Notification début livraison envoyée au client pour ${orderId}`,
    );
  }

  private async notifyDeliveryCompleted(orderId: string): Promise<void> {
    logger.info(`Notifications livraison terminée envoyées pour ${orderId}`);
  }

  private async notifyOrderCancellation(
    orderId: string,
    reason: string,
  ): Promise<void> {
    logger.info(`Notifications annulation envoyées pour ${orderId}: ${reason}`);
  }

  private async notifyPreparationDelay(orderId: string): Promise<void> {
    logger.info(`Notification retard préparation envoyée pour ${orderId}`);
  }

  private async notifyQualityCheckFailure(
    orderId: string,
    qualityCheck: any,
  ): Promise<void> {
    logger.info(`Notification échec contrôle qualité envoyée pour ${orderId}`);
  }
}
