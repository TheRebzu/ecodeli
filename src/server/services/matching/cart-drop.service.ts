/**
 * Service de gestion du Cart Drop
 * Intégration avec les systèmes de caisse des commerçants
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/utils/logger";
import { getDistance } from "@/server/utils/distance-calculator.util";

export interface CartDropProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  weight: number;
  category: string;
  isFragile: boolean;
  needsCooling: boolean;
  barcode?: string;
  image?: string;
  merchantId: string;
  inStock: boolean;
  stockQuantity: number;
}

export interface CartDropOrder {
  id: string;
  clientId: string;
  merchantId: string;
  terminalId: string;
  products: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  selectedTimeSlot: {
    id: string;
    startTime: string;
    endTime: string;
    price: number;
  };
  totalProductsPrice: number;
  deliveryPrice: number;
  totalPrice: number;
  paymentMethod: "CARD" | "CASH" | "DIGITAL_WALLET";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  status:
    | "CREATED"
    | "CONFIRMED"
    | "PREPARED"
    | "ASSIGNED"
    | "IN_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";
  specialInstructions?: string;
  createdAt: Date;
  estimatedDeliveryTime: Date;
}

export interface CartDropTimeSlot {
  id: string;
  merchantId: string;
  startTime: string;
  endTime: string;
  maxOrders: number;
  currentOrders: number;
  basePrice: number;
  dynamicPricing: boolean;
  isActive: boolean;
  availableDeliverers: number;
}

export interface CartDropTerminal {
  id: string;
  merchantId: string;
  name: string;
  location: string;
  isActive: boolean;
  capabilities: string[];
  lastHeartbeat: Date;
  dailyStats: {
    orders: number;
    revenue: number;
    deliveries: number;
    avgRating: number;
  };
}

export interface PricingRule {
  id: string;
  merchantId: string;
  type: "DISTANCE" | "WEIGHT" | "TIME_SLOT" | "DEMAND" | "SPECIAL";
  condition: {
    field: string;
    operator: "GT" | "LT" | "EQ" | "BETWEEN";
    value: number | string;
    valueMax?: number;
  };
  adjustment: {
    type: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
  };
  isActive: boolean;
}

export class CartDropService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Crée une nouvelle commande cart drop
   */
  async createCartDropOrder(orderData: {
    clientInfo: any;
    merchantId: string;
    terminalId: string;
    products: Array<{ productId: string; quantity: number }>;
    deliveryAddress: string;
    deliveryLatitude: number;
    deliveryLongitude: number;
    timeSlotId: string;
    paymentMethod: string;
    specialInstructions?: string;
  }): Promise<CartDropOrder> {
    try {
      // Vérifier la disponibilité des produits
      const availableProducts = await this.checkProductAvailability(
        orderData.products,
        orderData.merchantId,
      );

      if (!availableProducts.allAvailable) {
        throw new Error(
          `Produits non disponibles: ${availableProducts.unavailable.join(", ")}`,
        );
      }

      // Vérifier la disponibilité du créneau
      const timeSlot = await this.getTimeSlot(
        orderData.timeSlotId,
        orderData.merchantId,
      );
      if (
        !timeSlot ||
        !timeSlot.isActive ||
        timeSlot.currentOrders >= timeSlot.maxOrders
      ) {
        throw new Error("Créneau de livraison non disponible");
      }

      // Calculer les prix
      const pricing = await this.calculateOrderPricing({
        merchantId: orderData.merchantId,
        products: orderData.products,
        deliveryAddress: {
          latitude: orderData.deliveryLatitude,
          longitude: orderData.deliveryLongitude,
        },
        timeSlot,
      });

      // Créer la commande
      const orderId = `CART-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const order: CartDropOrder = {
        id: orderId,
        clientId: orderData.clientInfo.id,
        merchantId: orderData.merchantId,
        terminalId: orderData.terminalId,
        products: pricing.products,
        deliveryAddress: orderData.deliveryAddress,
        deliveryLatitude: orderData.deliveryLatitude,
        deliveryLongitude: orderData.deliveryLongitude,
        selectedTimeSlot: {
          id: timeSlot.id,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          price: pricing.deliveryPrice,
        },
        totalProductsPrice: pricing.totalProductsPrice,
        deliveryPrice: pricing.deliveryPrice,
        totalPrice: pricing.totalPrice,
        paymentMethod: orderData.paymentMethod as any,
        paymentStatus: "PENDING",
        status: "CREATED",
        specialInstructions: orderData.specialInstructions,
        createdAt: new Date(),
        estimatedDeliveryTime: this.calculateEstimatedDelivery(timeSlot),
      };

      // Sauvegarder en base (simulation)
      await this.saveOrder(order);

      // Mettre à jour le stock et le créneau
      await this.updateProductStock(orderData.products, orderData.merchantId);
      await this.updateTimeSlotOccupancy(orderData.timeSlotId, 1);

      // Notifier le commerçant
      await this.notifyMerchantNewOrder(orderData.merchantId, order);

      logger.info(`Nouvelle commande cart drop créée: ${orderId}`);
      return order;
    } catch (_error) {
      logger.error("Erreur lors de la création de commande cart drop:", error);
      throw error;
    }
  }

  /**
   * Traite le paiement d'une commande
   */
  async processOrderPayment(
    orderId: string,
    paymentDetails: {
      method: string;
      cardToken?: string;
      amount: number;
    },
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error("Commande non trouvée");
      }

      if (order.paymentStatus !== "PENDING") {
        throw new Error("Paiement déjà traité");
      }

      // Vérifier le montant
      if (Math.abs(paymentDetails.amount - order.totalPrice) > 0.01) {
        throw new Error("Montant du paiement incorrect");
      }

      // Traiter le paiement selon la méthode
      let paymentResult;
      switch (paymentDetails.method) {
        case "CARD":
          paymentResult = await this.processCardPayment(
            paymentDetails.cardToken!,
            paymentDetails.amount,
          );
          break;
        case "DIGITAL_WALLET":
          paymentResult = await this.processDigitalWalletPayment(
            paymentDetails.amount,
          );
          break;
        case "CASH":
          paymentResult = await this.processCashPayment(paymentDetails.amount);
          break;
        default:
          throw new Error("Méthode de paiement non supportée");
      }

      if (paymentResult.success) {
        // Mettre à jour le statut de la commande
        await this.updateOrderPaymentStatus(orderId, "PAID");
        await this.updateOrderStatus(orderId, "CONFIRMED");

        // Déclencher la préparation
        await this.triggerOrderPreparation(orderId);

        return {
          success: true,
          transactionId: paymentResult.transactionId,
        };
      } else {
        await this.updateOrderPaymentStatus(orderId, "FAILED");
        return {
          success: false,
          error: paymentResult.error,
        };
      }
    } catch (_error) {
      logger.error("Erreur lors du traitement du paiement:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur de paiement",
      };
    }
  }

  /**
   * Calcule la tarification dynamique
   */
  async calculateOrderPricing(params: {
    merchantId: string;
    products: Array<{ productId: string; quantity: number }>;
    deliveryAddress: { latitude: number; longitude: number };
    timeSlot: CartDropTimeSlot;
  }): Promise<{
    products: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    totalProductsPrice: number;
    deliveryPrice: number;
    totalPrice: number;
    appliedRules: string[];
  }> {
    // Récupérer les informations des produits
    const productDetails = await this.getProductDetails(
      params.products,
      params.merchantId,
    );

    // Calculer le prix des produits
    const totalProductsPrice = 0;
    const productsWithPricing = productDetails.map((product) => {
      const totalPrice = product.price * product.quantity;
      totalProductsPrice += totalPrice;

      return {
        productId: product.id,
        quantity: product.quantity,
        unitPrice: product.price,
        totalPrice,
      };
    });

    // Calculer le prix de livraison de base
    const merchant = await this.getMerchant(params.merchantId);
    const distance = getDistance(
      merchant.latitude,
      merchant.longitude,
      params.deliveryAddress.latitude,
      params.deliveryAddress.longitude,
    );

    const deliveryPrice = params.timeSlot.basePrice;
    const appliedRules: string[] = [];

    // Appliquer les règles de tarification
    const pricingRules = await this.getPricingRules(params.merchantId);

    for (const rule of pricingRules) {
      if (!rule.isActive) continue;

      const shouldApply = false;

      // Vérifier les conditions
      switch (rule.condition.field) {
        case "distance":
          shouldApply = this.checkCondition(distance, rule.condition);
          break;
        case "weight":
          const totalWeight = productDetails.reduce(
            (sum, p) => sum + p.weight * p.quantity,
            0,
          );
          shouldApply = this.checkCondition(totalWeight, rule.condition);
          break;
        case "order_value":
          shouldApply = this.checkCondition(totalProductsPrice, rule.condition);
          break;
        case "time_slot_demand":
          const demandRatio =
            params.timeSlot.currentOrders / params.timeSlot.maxOrders;
          shouldApply = this.checkCondition(demandRatio * 100, rule.condition);
          break;
      }

      if (shouldApply) {
        if (rule.adjustment.type === "PERCENTAGE") {
          deliveryPrice *= 1 + rule.adjustment.value / 100;
        } else {
          deliveryPrice += rule.adjustment.value;
        }
        appliedRules.push(rule.id);
      }
    }

    // Arrondir le prix de livraison
    deliveryPrice = Math.round(deliveryPrice * 100) / 100;
    const totalPrice = totalProductsPrice + deliveryPrice;

    return {
      products: productsWithPricing,
      totalProductsPrice,
      deliveryPrice,
      totalPrice,
      appliedRules,
    };
  }

  /**
   * Assigne un livreur à une commande
   */
  async assignDelivererToOrder(
    orderId: string,
  ): Promise<{ success: boolean; delivererId?: string }> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error("Commande non trouvée");
      }

      if (order.status !== "PREPARED") {
        throw new Error("Commande pas encore prête pour l'assignation");
      }

      // Trouver les livreurs disponibles dans le créneau
      const availableDeliverers = await this.findAvailableDeliverersForTimeSlot(
        order.selectedTimeSlot,
        order.merchantId,
        {
          latitude: order.deliveryLatitude,
          longitude: order.deliveryLongitude,
        },
      );

      if (availableDeliverers.length === 0) {
        logger.warn(`Aucun livreur disponible pour la commande ${orderId}`);
        return { success: false };
      }

      // Sélectionner le meilleur livreur
      const bestDeliverer = this.selectBestCartDropDeliverer(
        availableDeliverers,
        order,
      );

      // Assigner le livreur
      await this.updateOrderDeliverer(orderId, bestDeliverer.id);
      await this.updateOrderStatus(orderId, "ASSIGNED");

      // Notifier le livreur
      await this.notifyDelivererAssignment(bestDeliverer.id, order);

      logger.info(
        `Livreur ${bestDeliverer.id} assigné à la commande ${orderId}`,
      );
      return { success: true, delivererId: bestDeliverer.id };
    } catch (_error) {
      logger.error("Erreur lors de l'assignation du livreur:", error);
      return { success: false };
    }
  }

  /**
   * Gère la collecte de la commande par le livreur
   */
  async handleOrderPickup(
    orderId: string,
    delivererId: string,
    pickupCode: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error("Commande non trouvée");
      }

      // Vérifier le code de collecte
      const expectedCode = await this.generatePickupCode(orderId);
      if (pickupCode !== expectedCode) {
        throw new Error("Code de collecte invalide");
      }

      // Vérifier que c'est le bon livreur
      const orderDeliverer = await this.getOrderDeliverer(orderId);
      if (orderDeliverer?.id !== delivererId) {
        throw new Error("Livreur non autorisé pour cette commande");
      }

      // Mettre à jour le statut
      await this.updateOrderStatus(orderId, "IN_DELIVERY");

      // Notifier le client du début de livraison
      await this.notifyClientDeliveryStarted(order.clientId, order);

      // Créer le suivi en temps réel
      await this.initializeRealTimeTracking(orderId, delivererId);

      logger.info(
        `Collecte de commande réussie: ${orderId} par ${delivererId}`,
      );
      return { success: true };
    } catch (_error) {
      logger.error("Erreur lors de la collecte:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur de collecte",
      };
    }
  }

  /**
   * Gère la validation de livraison
   */
  async validateOrderDelivery(
    orderId: string,
    delivererId: string,
    validationData: {
      code: string;
      location: { latitude: number; longitude: number };
      photos: string[];
      signature?: string;
    },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) {
        throw new Error("Commande non trouvée");
      }

      // Vérifier le code de validation
      const expectedCode = await this.generateDeliveryCode(orderId);
      if (validationData.code !== expectedCode) {
        throw new Error("Code de validation invalide");
      }

      // Vérifier la position (tolérance de 100m)
      const distance = getDistance(
        validationData.location.latitude,
        validationData.location.longitude,
        order.deliveryLatitude,
        order.deliveryLongitude,
      );

      if (distance > 0.1) {
        // 100m
        throw new Error(
          "Position de livraison trop éloignée de l'adresse de destination",
        );
      }

      // Finaliser la livraison
      await this.updateOrderStatus(orderId, "DELIVERED");
      await this.saveDeliveryProof(orderId, validationData);

      // Déclencher le paiement du livreur
      await this.processDelivererPayment(delivererId, orderId);

      // Notifier le client
      await this.notifyClientDeliveryCompleted(order.clientId, order);

      // Mettre à jour les statistiques
      await this.updateMerchantStats(order.merchantId, order);
      await this.updateDelivererStats(delivererId, order);

      logger.info(`Livraison validée avec succès: ${orderId}`);
      return { success: true };
    } catch (_error) {
      logger.error("Erreur lors de la validation de livraison:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur de validation",
      };
    }
  }

  // Méthodes utilitaires et de simulation
  private async checkProductAvailability(
    products: Array<{ productId: string; quantity: number }>,
    merchantId: string,
  ): Promise<{ allAvailable: boolean; unavailable: string[] }> {
    // Simulation de vérification de stock
    return { allAvailable: true, unavailable: [] };
  }

  private async getTimeSlot(
    timeSlotId: string,
    merchantId: string,
  ): Promise<CartDropTimeSlot | null> {
    // Simulation de récupération de créneau
    return {
      id: timeSlotId,
      merchantId,
      startTime: "14:00",
      endTime: "16:00",
      maxOrders: 20,
      currentOrders: 12,
      basePrice: 5.9,
      dynamicPricing: true,
      isActive: true,
      availableDeliverers: 4,
    };
  }

  private calculateEstimatedDelivery(timeSlot: CartDropTimeSlot): Date {
    const today = new Date();
    const [hours, minutes] = timeSlot.startTime.split(":").map(Number);
    const estimatedTime = new Date(today);
    estimatedTime.setHours(hours, minutes, 0, 0);

    // Si c'est déjà passé aujourd'hui, prévoir pour demain
    if (estimatedTime < today) {
      estimatedTime.setDate(estimatedTime.getDate() + 1);
    }

    return estimatedTime;
  }

  private checkCondition(value: number, condition: any): boolean {
    switch (condition.operator) {
      case "GT":
        return value > condition.value;
      case "LT":
        return value < condition.value;
      case "EQ":
        return value === condition.value;
      case "BETWEEN":
        return (
          value >= condition.value &&
          value <= (condition.valueMax || condition.value)
        );
      default:
        return false;
    }
  }

  private selectBestCartDropDeliverer(
    deliverers: any[],
    order: CartDropOrder,
  ): any {
    // Algorithme de sélection basé sur la proximité, la note et l'expérience
    return deliverers.sort((a, b) => {
      const scoreA =
        a.rating * 0.4 + (100 - a.distance) * 0.3 + a.cartDropExperience * 0.3;
      const scoreB =
        b.rating * 0.4 + (100 - b.distance) * 0.3 + b.cartDropExperience * 0.3;
      return scoreB - scoreA;
    })[0];
  }

  // Méthodes de simulation (à implémenter avec la vraie logique)
  private async saveOrder(order: CartDropOrder): Promise<void> {
    logger.info(`Commande sauvegardée: ${order.id}`);
  }

  private async getOrder(orderId: string): Promise<CartDropOrder | null> {
    // Simulation de récupération de commande
    return null;
  }

  private async updateProductStock(
    products: any[],
    merchantId: string,
  ): Promise<void> {
    logger.info(`Stock mis à jour pour le commerçant ${merchantId}`);
  }

  private async updateTimeSlotOccupancy(
    timeSlotId: string,
    increment: number,
  ): Promise<void> {
    logger.info(`Créneau ${timeSlotId} mis à jour: +${increment} commande(s)`);
  }

  private async notifyMerchantNewOrder(
    merchantId: string,
    order: CartDropOrder,
  ): Promise<void> {
    logger.info(
      `Notification nouvelle commande envoyée au commerçant ${merchantId}`,
    );
  }

  private async getProductDetails(
    products: any[],
    merchantId: string,
  ): Promise<any[]> {
    // Simulation de récupération de détails produits
    return products.map((p) => ({ ...p, price: 10, weight: 1 }));
  }

  private async getMerchant(merchantId: string): Promise<any> {
    return { latitude: 48.8566, longitude: 2.3522 };
  }

  private async getPricingRules(merchantId: string): Promise<PricingRule[]> {
    return [];
  }

  private async processCardPayment(
    cardToken: string,
    amount: number,
  ): Promise<any> {
    return { success: true, transactionId: `tx_${Date.now()}` };
  }

  private async processDigitalWalletPayment(amount: number): Promise<any> {
    return { success: true, transactionId: `wallet_${Date.now()}` };
  }

  private async processCashPayment(amount: number): Promise<any> {
    return { success: true, transactionId: `cash_${Date.now()}` };
  }

  private async updateOrderPaymentStatus(
    orderId: string,
    status: string,
  ): Promise<void> {
    logger.info(`Statut paiement mis à jour: ${orderId} -> ${status}`);
  }

  private async updateOrderStatus(
    orderId: string,
    status: string,
  ): Promise<void> {
    logger.info(`Statut commande mis à jour: ${orderId} -> ${status}`);
  }

  private async triggerOrderPreparation(orderId: string): Promise<void> {
    logger.info(`Préparation déclenchée pour la commande ${orderId}`);
  }

  private async findAvailableDeliverersForTimeSlot(
    timeSlot: any,
    merchantId: string,
    destination: any,
  ): Promise<any[]> {
    return [
      {
        id: "deliverer-1",
        rating: 4.8,
        distance: 2.1,
        cartDropExperience: 156,
      },
    ];
  }

  private async updateOrderDeliverer(
    orderId: string,
    delivererId: string,
  ): Promise<void> {
    logger.info(`Livreur assigné: ${orderId} -> ${delivererId}`);
  }

  private async notifyDelivererAssignment(
    delivererId: string,
    order: CartDropOrder,
  ): Promise<void> {
    logger.info(`Notification assignation envoyée au livreur ${delivererId}`);
  }

  private async getOrderDeliverer(orderId: string): Promise<any> {
    return { id: "deliverer-1" };
  }

  private async generatePickupCode(orderId: string): Promise<string> {
    return "PICKUP123";
  }

  private async generateDeliveryCode(orderId: string): Promise<string> {
    return "DELIV456";
  }

  private async notifyClientDeliveryStarted(
    clientId: string,
    order: CartDropOrder,
  ): Promise<void> {
    logger.info(`Notification début livraison envoyée au client ${clientId}`);
  }

  private async initializeRealTimeTracking(
    orderId: string,
    delivererId: string,
  ): Promise<void> {
    logger.info(`Suivi temps réel initialisé: ${orderId}`);
  }

  private async saveDeliveryProof(
    orderId: string,
    validationData: any,
  ): Promise<void> {
    logger.info(`Preuve de livraison sauvegardée: ${orderId}`);
  }

  private async processDelivererPayment(
    delivererId: string,
    orderId: string,
  ): Promise<void> {
    logger.info(`Paiement livreur traité: ${delivererId} pour ${orderId}`);
  }

  private async notifyClientDeliveryCompleted(
    clientId: string,
    order: CartDropOrder,
  ): Promise<void> {
    logger.info(
      `Notification livraison terminée envoyée au client ${clientId}`,
    );
  }

  private async updateMerchantStats(
    merchantId: string,
    order: CartDropOrder,
  ): Promise<void> {
    logger.info(`Statistiques commerçant mises à jour: ${merchantId}`);
  }

  private async updateDelivererStats(
    delivererId: string,
    order: CartDropOrder,
  ): Promise<void> {
    logger.info(`Statistiques livreur mises à jour: ${delivererId}`);
  }
}
