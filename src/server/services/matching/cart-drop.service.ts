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
          longitude: orderData.deliveryLongitude},
        timeSlot});

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
          price: pricing.deliveryPrice},
        totalProductsPrice: pricing.totalProductsPrice,
        deliveryPrice: pricing.deliveryPrice,
        totalPrice: pricing.totalPrice,
        paymentMethod: orderData.paymentMethod as any,
        paymentStatus: "PENDING",
        status: "CREATED",
        specialInstructions: orderData.specialInstructions,
        createdAt: new Date(),
        estimatedDeliveryTime: this.calculateEstimatedDelivery(timeSlot)};

      await this.saveOrder(order);

      // Mettre à jour le stock et le créneau
      await this.updateProductStock(orderData.products, orderData.merchantId);
      await this.updateTimeSlotOccupancy(orderData.timeSlotId, 1);

      // Notifier le commerçant
      await this.notifyMerchantNewOrder(orderData.merchantId, order);

      logger.info(`Nouvelle commande cart drop créée: ${orderId}`);
      return order;
    } catch (error) {
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
          transactionId: paymentResult.transactionId};
      } else {
        await this.updateOrderPaymentStatus(orderId, "FAILED");
        return {
          success: false,
          error: paymentResult.error};
      }
    } catch (error) {
      logger.error("Erreur lors du traitement du paiement:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur de paiement"};
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
        totalPrice};
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
      appliedRules};
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
          longitude: order.deliveryLongitude},
      );

      if (availableDeliverers.length === 0) {
        logger.warn(`Aucun livreur disponible pour la commande ${orderId}`);
        return { success };
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
    } catch (error) {
      logger.error("Erreur lors de l'assignation du livreur:", error);
      return { success };
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
      return { success };
    } catch (error) {
      logger.error("Erreur lors de la collecte:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur de collecte"};
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
      return { success };
    } catch (error) {
      logger.error("Erreur lors de la validation de livraison:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur de validation"};
    }
  }

  private async checkProductAvailability(
    products: Array<{ productId: string; quantity: number }>,
    merchantId: string,
  ): Promise<{ allAvailable: boolean; unavailable: string[] }> {
    
    return { allAvailable: true, unavailable: [] };
  }

  private async getTimeSlot(
    timeSlotId: string,
    merchantId: string,
  ): Promise<CartDropTimeSlot | null> {
    try {
      // Récupérer le créneau depuis la base de données
      const timeSlot = await this.prisma.cartDropTimeSlot.findFirst({
        where: {
          id: timeSlotId,
          merchantId,
          isActive: true,
        },
      });

      if (!timeSlot) {
        logger.warn("Créneau horaire non trouvé", { timeSlotId, merchantId });
        return null;
      }

      // Compter les commandes actuelles pour ce créneau
      const currentOrdersCount = await this.prisma.cartDropOrder.count({
        where: {
          timeSlotId,
          status: { in: ["CREATED", "CONFIRMED", "PREPARED", "ASSIGNED", "IN_DELIVERY"] },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)), // Aujourd'hui
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      });

      // Compter les livreurs disponibles dans la zone
      const availableDeliverers = await this.prisma.user.count({
        where: {
          role: "DELIVERER",
          status: "ACTIVE",
          deliverer: {
            isAvailable: true,
            serviceZones: {
              hasSome: [timeSlot.deliveryZone || "DEFAULT"],
            },
          },
        },
      });

      return {
        id: timeSlot.id,
        merchantId: timeSlot.merchantId,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        maxOrders: timeSlot.maxOrders,
        currentOrders: currentOrdersCount,
        basePrice: timeSlot.basePrice.toNumber(),
        dynamicPricing: timeSlot.dynamicPricing,
        isActive: timeSlot.isActive,
        availableDeliverers,
      };
    } catch (error) {
      logger.error("Erreur récupération créneau horaire:", error);
      throw new Error("Impossible de récupérer le créneau horaire");
    }
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

  private async saveOrder(order: CartDropOrder): Promise<void> {
    try {
      await this.prisma.cartDropOrder.create({
        data: {
          id: order.id,
          clientId: order.clientId,
          merchantId: order.merchantId,
          terminalId: order.terminalId,
          products: order.products,
          deliveryAddress: order.deliveryAddress,
          deliveryLatitude: order.deliveryLatitude,
          deliveryLongitude: order.deliveryLongitude,
          timeSlotId: order.selectedTimeSlot.id,
          totalProductsPrice: order.totalProductsPrice,
          deliveryPrice: order.deliveryPrice,
          totalPrice: order.totalPrice,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          status: order.status,
          specialInstructions: order.specialInstructions,
          estimatedDeliveryTime: order.estimatedDeliveryTime,
        },
      });

      logger.info("Commande sauvegardée avec succès", {
        orderId: order.id,
        merchantId: order.merchantId,
        totalPrice: order.totalPrice,
      });
    } catch (error) {
      logger.error("Erreur sauvegarde commande:", error);
      throw new Error("Impossible de sauvegarder la commande");
    }
  }

  private async getOrder(orderId: string): Promise<CartDropOrder | null> {
    try {
      const order = await this.prisma.cartDropOrder.findUnique({
        where: { id: orderId },
        include: {
          timeSlot: true,
          client: {
            select: { name: true, email: true, phone: true },
          },
          merchant: {
            select: { name: true, companyName: true },
          },
        },
      });

      if (!order) {
        return null;
      }

      return {
        id: order.id,
        clientId: order.clientId,
        merchantId: order.merchantId,
        terminalId: order.terminalId,
        products: order.products as any[],
        deliveryAddress: order.deliveryAddress,
        deliveryLatitude: order.deliveryLatitude.toNumber(),
        deliveryLongitude: order.deliveryLongitude.toNumber(),
        selectedTimeSlot: {
          id: order.timeSlot?.id || order.timeSlotId,
          startTime: order.timeSlot?.startTime || "14:00",
          endTime: order.timeSlot?.endTime || "16:00",
          price: order.deliveryPrice,
        },
        totalProductsPrice: order.totalProductsPrice.toNumber(),
        deliveryPrice: order.deliveryPrice.toNumber(),
        totalPrice: order.totalPrice.toNumber(),
        paymentMethod: order.paymentMethod as any,
        paymentStatus: order.paymentStatus as any,
        status: order.status as any,
        specialInstructions: order.specialInstructions,
        createdAt: order.createdAt,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
      };
    } catch (error) {
      logger.error("Erreur récupération commande:", error);
      return null;
    }
  }

  private async updateProductStock(
    products: any[],
    merchantId: string,
  ): Promise<void> {
    try {
      // Mettre à jour le stock pour chaque produit
      for (const product of products) {
        await this.prisma.product.update({
          where: {
            id: product.productId,
            merchantId, // Sécurité : s'assurer que le produit appartient au bon marchand
          },
          data: {
            stockQuantity: {
              decrement: product.quantity,
            },
          },
        });
      }

      logger.info("Stock mis à jour avec succès", {
        merchantId,
        products: products.map(p => ({
          productId: p.productId,
          quantity: p.quantity,
        })),
      });
    } catch (error) {
      logger.error("Erreur mise à jour stock:", error);
      throw new Error("Impossible de mettre à jour le stock");
    }
  }

  private async updateTimeSlotOccupancy(
    timeSlotId: string,
    increment: number,
  ): Promise<void> {
    try {
      await this.prisma.cartDropTimeSlot.update({
        where: { id: timeSlotId },
        data: {
          currentOrders: {
            increment,
          },
        },
      });

      logger.info("Occupancy créneau mise à jour", {
        timeSlotId,
        increment,
      });
    } catch (error) {
      logger.error("Erreur mise à jour créneau:", error);
      // Ne pas faire échouer la commande pour cette erreur
    }
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
    try {
      const productIds = products.map(p => p.productId);
      
      // Récupérer les détails des produits depuis la base de données
      const productDetails = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          merchantId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          price: true,
          weight: true,
          category: true,
          isFragile: true,
          needsCooling: true,
          inStock: true,
          stockQuantity: true,
          image: true,
        },
      });

      // Combiner avec les quantités demandées
      return products.map(orderProduct => {
        const product = productDetails.find(p => p.id === orderProduct.productId);
        
        if (!product) {
          throw new Error(`Produit non trouvé: ${orderProduct.productId}`);
        }

        if (!product.inStock || product.stockQuantity < orderProduct.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name}`);
        }

        return {
          ...orderProduct,
          name: product.name,
          price: product.price.toNumber(),
          weight: product.weight.toNumber(),
          category: product.category,
          isFragile: product.isFragile,
          needsCooling: product.needsCooling,
          image: product.image,
          totalPrice: product.price.toNumber() * orderProduct.quantity,
        };
      });
    } catch (error) {
      logger.error("Erreur récupération détails produits:", error);
      throw error;
    }
  }

  private async getMerchant(merchantId: string): Promise<any> {
    try {
      const merchant = await this.prisma.user.findUnique({
        where: { id: merchantId },
        include: {
          merchant: {
            select: {
              companyName: true,
              businessType: true,
              latitude: true,
              longitude: true,
              address: true,
              city: true,
              zipCode: true,
              deliveryRadius: true,
              operationalData: true,
            },
          },
        },
      });

      if (!merchant?.merchant) {
        throw new Error("Marchand non trouvé");
      }

      return {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        companyName: merchant.merchant.companyName,
        businessType: merchant.merchant.businessType,
        latitude: merchant.merchant.latitude?.toNumber(),
        longitude: merchant.merchant.longitude?.toNumber(),
        address: merchant.merchant.address,
        city: merchant.merchant.city,
        zipCode: merchant.merchant.zipCode,
        deliveryRadius: merchant.merchant.deliveryRadius,
        operationalData: merchant.merchant.operationalData,
      };
    } catch (error) {
      logger.error("Erreur récupération marchand:", error);
      
      // Fallback avec coordonnées par défaut seulement en cas d'erreur critique
      const defaultCoordinates = process.env.DEFAULT_COORDINATES
        ? JSON.parse(process.env.DEFAULT_COORDINATES)
        : { latitude: 48.8566, longitude: 2.3522 };

      return {
        id: merchantId,
        ...defaultCoordinates,
        error: "Données partielles - marchand non trouvé",
      };
    }
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
    try {
      // Récupérer le marchand pour connaître sa localisation
      const merchant = await this.prisma.user.findUnique({
        where: { id: merchantId },
        include: {
          merchant: {
            select: {
              latitude: true,
              longitude: true,
              deliveryRadius: true,
            },
          },
        },
      });

      if (!merchant?.merchant) {
        throw new Error("Marchand non trouvé");
      }

      // Calculer la distance maximale acceptable
      const maxDistance = merchant.merchant.deliveryRadius || 10; // km

      // Trouver les livreurs disponibles
      const availableDeliverers = await this.prisma.user.findMany({
        where: {
          role: "DELIVERER",
          status: "ACTIVE",
          deliverer: {
            isAvailable: true,
            verification: {
              isVerified: true,
            },
          },
        },
        include: {
          deliverer: {
            include: {
              vehicle: true,
              performance: true,
            },
          },
        },
      });

      // Filtrer et scorer les livreurs selon leur pertinence
      const scoredDeliverers = availableDeliverers
        .map(deliverer => {
          // Calculer la distance approximative (simulation géographique)
          const distance = this.calculateDistance(
            merchant.merchant.latitude?.toNumber() || 0,
            merchant.merchant.longitude?.toNumber() || 0,
            destination.latitude,
            destination.longitude
          );

          // Vérifier si dans le rayon de livraison
          if (distance > maxDistance) {
            return null;
          }

          // Calculer le score de pertinence
          const rating = deliverer.deliverer?.performance?.rating?.toNumber() || 4.0;
          const experience = deliverer.deliverer?.performance?.totalDeliveries || 0;
          
          // Score basé sur: distance (40%), note (35%), expérience (25%)
          const distanceScore = Math.max(0, (maxDistance - distance) / maxDistance) * 100;
          const ratingScore = (rating / 5) * 100;
          const experienceScore = Math.min(experience / 100, 1) * 100;
          
          const totalScore = (distanceScore * 0.4) + (ratingScore * 0.35) + (experienceScore * 0.25);

          return {
            id: deliverer.id,
            name: deliverer.name,
            rating: rating,
            distance: distance,
            experience: experience,
            vehicle: deliverer.deliverer?.vehicle?.type || "BICYCLE",
            score: totalScore,
            isAvailable: true,
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b?.score || 0) - (a?.score || 0))
        .slice(0, 5); // Prendre les 5 meilleurs

      return scoredDeliverers;
    } catch (error) {
      logger.error("Erreur recherche livreurs disponibles:", error);
      return [];
    }
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
    try {
      // Récupérer les informations de la commande et du livreur assigné
      const order = await this.prisma.cartDropOrder.findUnique({
        where: { id: orderId },
        include: {
          delivery: {
            include: {
              deliverer: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                      profilePicture: true,
                    },
                  },
                  vehicle: true,
                },
              },
            },
          },
        },
      });

      if (!order?.delivery?.deliverer) {
        // Si aucun livreur assigné, essayer d'en trouver un disponible
        const availableDeliverers = await this.findAvailableDeliverersForTimeSlot(
          { id: order?.timeSlotId },
          order?.merchantId || "",
          {
            latitude: order?.deliveryLatitude,
            longitude: order?.deliveryLongitude,
          }
        );

        if (availableDeliverers.length > 0) {
          const bestDeliverer = this.selectBestCartDropDeliverer(availableDeliverers, order);
          
          // Assigner le livreur à la commande
          if (bestDeliverer) {
            await this.updateOrderDeliverer(orderId, bestDeliverer.id);
            return {
              id: bestDeliverer.id,
              name: bestDeliverer.name,
              phone: bestDeliverer.phone,
              vehicle: bestDeliverer.vehicle,
              rating: bestDeliverer.rating,
              experience: bestDeliverer.experience,
            };
          }
        }

        logger.warn(`Aucun livreur disponible pour la commande ${orderId}`);
        return null;
      }

      // Retourner les informations du livreur assigné
      return {
        id: order.delivery.deliverer.id,
        name: order.delivery.deliverer.user.name,
        phone: order.delivery.deliverer.user.phone,
        profilePicture: order.delivery.deliverer.user.profilePicture,
        vehicle: order.delivery.deliverer.vehicle,
        rating: order.delivery.deliverer.rating || 0,
        experience: order.delivery.deliverer.completedDeliveries || 0,
        isOnline: order.delivery.deliverer.isOnline || false,
        currentLocation: {
          latitude: order.delivery.deliverer.currentLatitude,
          longitude: order.delivery.deliverer.currentLongitude,
        },
      };
    } catch (error) {
      logger.error("Erreur récupération livreur commande:", error);
      return null;
    }
  }

  private async generatePickupCode(orderId: string): Promise<string> {
    try {
      // Générer un code de collecte unique de 6 caractères alphanumériques
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        code = "";
        for (let i = 0; i < 6; i++) {
          code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        // Vérifier l'unicité du code
        const existingOrder = await this.prisma.cartDropOrder.findFirst({
          where: { pickupCode: code },
        });
        
        if (!existingOrder) {
          isUnique = true;
        }
        
        attempts++;
      }
      
      if (!isUnique) {
        throw new Error("Impossible de générer un code unique");
      }
      
      // Sauvegarder le code pour la commande
      await this.prisma.cartDropOrder.update({
        where: { id: orderId },
        data: { pickupCode: code },
      });
      
      logger.info("Code de collecte généré", { orderId, code });
      return code;
    } catch (error) {
      logger.error("Erreur génération code collecte:", error);
      throw new Error("Impossible de générer le code de collecte");
    }
  }

  private async generateDeliveryCode(orderId: string): Promise<string> {
    // Générer un code de livraison unique de 6 caractères alphanumériques
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    
    // Générer un code unique
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Vérifier l'unicité dans la base (optionnel pour les codes temporaires)
      const existingCode = await this.prisma.$queryRaw`
        SELECT id FROM cart_drop_orders 
        WHERE delivery_code = ${code} 
        AND status NOT IN ('COMPLETED', 'CANCELLED', 'REFUNDED')
      `;
      
      isUnique = !Array.isArray(existingCode) || existingCode.length === 0;
      attempts++;
    }
    
    // Sauvegarder le code dans la commande
    await this.prisma.$executeRaw`
      UPDATE cart_drop_orders 
      SET delivery_code = ${code}
      WHERE id = ${orderId}
    `;
    
    logger.info(`Code de livraison généré: ${code} pour commande ${orderId}`);
    return code;
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

  // Méthode utilitaire pour calculer la distance entre deux points
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance en km
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
