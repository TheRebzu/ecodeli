import { db as prisma } from "@/lib/db";
import { ecoLogger } from "@/lib/logger";
import { z } from "zod";

export interface DeliveryZone {
  postalCode: string;
  deliveryFee: number;
  estimatedTime: number; // en minutes
  isActive: boolean;
}

export interface TimeSlot {
  day: string; // 'MONDAY', 'TUESDAY', etc.
  startTime: string; // '09:00'
  endTime: string; // '18:00'
  isActive: boolean;
  maxOrders: number;
}

export interface CartDropConfiguration {
  isActive: boolean;
  deliveryZones: DeliveryZone[];
  timeSlots: TimeSlot[];
  maxOrdersPerSlot: number;
  minOrderAmount: number;
  automaticConfirmation: boolean;
  preparationTime: number; // en minutes
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  clientEmail: string;
  totalAmount: number;
  deliveryFee: number;
  status: string;
  deliveryAddress: string;
  scheduledDate: Date;
  items: OrderItem[];
  createdAt: Date;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CartDropStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  popularTimeSlots: { slot: string; count: number }[];
  popularZones: { zone: string; count: number }[];
}

export class CartDropService {
  /**
   * Récupère la configuration lâcher de chariot d'un commerçant
   */
  static async getConfiguration(
    userId: string,
  ): Promise<CartDropConfiguration | null> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: {
        cartDropConfig: true,
      },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    if (!merchant.cartDropConfig) {
      return null;
    }

    const config = merchant.cartDropConfig;
    return {
      isActive: config.isActive,
      deliveryZones: Array.isArray(config.deliveryZones)
        ? (config.deliveryZones as DeliveryZone[])
        : [],
      timeSlots: Array.isArray(config.timeSlots)
        ? (config.timeSlots as TimeSlot[])
        : this.getDefaultTimeSlots(),
      maxOrdersPerSlot: config.maxOrdersPerSlot,
      minOrderAmount: 20.0, // Valeur par défaut
      automaticConfirmation: true,
      preparationTime: 30, // 30 minutes par défaut
    };
  }

  /**
   * Met à jour la configuration lâcher de chariot
   */
  static async updateConfiguration(
    userId: string,
    config: CartDropConfiguration,
  ): Promise<void> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    await prisma.cartDropConfig.upsert({
      where: { merchantId: merchant.id },
      create: {
        merchantId: merchant.id,
        isActive: config.isActive,
        deliveryZones: config.deliveryZones,
        timeSlots: config.timeSlots,
        maxOrdersPerSlot: config.maxOrdersPerSlot,
      },
      update: {
        isActive: config.isActive,
        deliveryZones: config.deliveryZones,
        timeSlots: config.timeSlots,
        maxOrdersPerSlot: config.maxOrdersPerSlot,
      },
    });
  }

  /**
   * Récupère les commandes lâcher de chariot d'un commerçant
   */
  static async getOrders(
    userId: string,
    filters: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    orders: OrderSummary[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = filters;
    const skip = (page - 1) * limit;

    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    const whereClause: any = {
      merchantId: merchant.id,
    };

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo);
      }
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          items: true,
          client: {
            select: { email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    const formattedOrders: OrderSummary[] = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      clientEmail: order.client.email,
      totalAmount: order.totalAmount,
      deliveryFee: order.deliveryFee,
      status: order.status,
      deliveryAddress: order.deliveryAddress,
      scheduledDate: order.scheduledDate || order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      createdAt: order.createdAt,
    }));

    return {
      orders: formattedOrders,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Crée une nouvelle commande lâcher de chariot
   */
  static async createOrder(
    userId: string,
    orderData: {
      clientEmail: string;
      deliveryAddress: string;
      scheduledDate: Date;
      items: { name: string; quantity: number; unitPrice: number }[];
      notes?: string;
    },
  ): Promise<OrderSummary> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    // Vérifier si la configuration est active
    const config = await this.getConfiguration(userId);
    if (!config?.isActive) {
      throw new Error("Service lâcher de chariot non activé");
    }

    // Calculer le total
    const itemsTotal = orderData.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    // Calculer les frais de livraison (simplifié)
    const deliveryFee = this.calculateDeliveryFee(
      orderData.deliveryAddress,
      config.deliveryZones,
    );

    const totalAmount = itemsTotal + deliveryFee;

    // Générer un numéro de commande unique
    const orderNumber = `CD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Trouver ou créer le client
    const client = await prisma.user.findUnique({
      where: { email: orderData.clientEmail },
    });

    if (!client) {
      throw new Error("Client non trouvé");
    }

    const order = await prisma.order.create({
      data: {
        merchantId: merchant.id,
        clientId: client.id,
        orderNumber,
        status: "PENDING",
        totalAmount,
        deliveryFee,
        deliveryAddress: orderData.deliveryAddress,
        scheduledDate: orderData.scheduledDate,
        notes: orderData.notes,
        items: {
          create: orderData.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        items: true,
        client: {
          select: { email: true },
        },
      },
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      clientEmail: order.client.email,
      totalAmount: order.totalAmount,
      deliveryFee: order.deliveryFee,
      status: order.status,
      deliveryAddress: order.deliveryAddress,
      scheduledDate: order.scheduledDate || order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      createdAt: order.createdAt,
    };
  }

  /**
   * Met à jour le statut d'une commande
   */
  static async updateOrderStatus(
    userId: string,
    orderId: string,
    status: string,
  ): Promise<void> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    // Vérifier que la commande appartient au commerçant
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId: merchant.id,
      },
    });

    if (!order) {
      throw new Error("Commande non trouvée ou accès non autorisé");
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as any,
        completedAt: status === "DELIVERED" ? new Date() : undefined,
      },
    });
  }

  /**
   * Récupère les statistiques lâcher de chariot
   */
  static async getStats(userId: string): Promise<CartDropStats> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new Error("Merchant profile not found");
    }

    const orders = await prisma.order.findMany({
      where: { merchantId: merchant.id },
      include: { items: true },
    });

    const totalOrders = orders.length;
    const activeOrders = orders.filter((o) =>
      [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "IN_TRANSIT",
      ].includes(o.status),
    ).length;
    const completedOrders = orders.filter(
      (o) => o.status === "DELIVERED",
    ).length;
    const totalRevenue = orders
      .filter((o) => o.status === "DELIVERED")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const averageOrderValue =
      completedOrders > 0 ? totalRevenue / completedOrders : 0;

    return {
      totalOrders,
      activeOrders,
      completedOrders,
      totalRevenue,
      averageOrderValue,
      popularTimeSlots: [], // À implémenter avec plus de données
      popularZones: [], // À implémenter avec plus de données
    };
  }

  /**
   * Calcule les frais de livraison selon la zone
   */
  private static calculateDeliveryFee(
    address: string,
    zones: DeliveryZone[],
  ): number {
    // Extraction simplifiée du code postal depuis l'adresse
    const postalCodeMatch = address.match(/\b\d{5}\b/);

    if (!postalCodeMatch) {
      return 5.0; // Frais par défaut
    }

    const postalCode = postalCodeMatch[0];
    const zone = zones.find((z) => z.postalCode === postalCode && z.isActive);

    return zone ? zone.deliveryFee : 8.0; // Frais pour zone non couverte
  }

  /**
   * Retourne les créneaux par défaut
   */
  private static getDefaultTimeSlots(): TimeSlot[] {
    return [
      {
        day: "MONDAY",
        startTime: "09:00",
        endTime: "18:00",
        isActive: true,
        maxOrders: 10,
      },
      {
        day: "TUESDAY",
        startTime: "09:00",
        endTime: "18:00",
        isActive: true,
        maxOrders: 10,
      },
      {
        day: "WEDNESDAY",
        startTime: "09:00",
        endTime: "18:00",
        isActive: true,
        maxOrders: 10,
      },
      {
        day: "THURSDAY",
        startTime: "09:00",
        endTime: "18:00",
        isActive: true,
        maxOrders: 10,
      },
      {
        day: "FRIDAY",
        startTime: "09:00",
        endTime: "18:00",
        isActive: true,
        maxOrders: 10,
      },
      {
        day: "SATURDAY",
        startTime: "10:00",
        endTime: "17:00",
        isActive: true,
        maxOrders: 8,
      },
    ];
  }

  /**
   * Vérifie la disponibilité d'un créneau
   */
  static async checkSlotAvailability(
    userId: string,
    scheduledDate: Date,
  ): Promise<boolean> {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      include: { cartDropConfig: true },
    });

    if (!merchant?.cartDropConfig) {
      return false;
    }

    const config = merchant.cartDropConfig;
    const maxOrders = config.maxOrdersPerSlot;

    // Compter les commandes pour ce créneau
    const startOfHour = new Date(scheduledDate);
    startOfHour.setMinutes(0, 0, 0);

    const endOfHour = new Date(startOfHour);
    endOfHour.setHours(endOfHour.getHours() + 1);

    const ordersInSlot = await prisma.order.count({
      where: {
        merchantId: merchant.id,
        scheduledDate: {
          gte: startOfHour,
          lt: endOfHour,
        },
        status: {
          not: "CANCELLED",
        },
      },
    });

    return ordersInSlot < maxOrders;
  }
}

// Schémas de validation Zod
export const cartDropConfigSchema = z.object({
  isActive: z.boolean(),
  deliveryZones: z.array(
    z.object({
      postalCode: z.string().length(5, "Code postal invalide"),
      deliveryFee: z.number().min(0, "Frais de livraison invalides"),
      estimatedTime: z.number().min(15, "Temps minimum 15 minutes"),
      isActive: z.boolean(),
    }),
  ),
  timeSlots: z.array(
    z.object({
      day: z.enum([
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ]),
      startTime: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format heure invalide"),
      endTime: z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format heure invalide"),
      isActive: z.boolean(),
      maxOrders: z.number().min(1, "Au moins 1 commande par créneau"),
    }),
  ),
  maxOrdersPerSlot: z.number().min(1, "Au moins 1 commande par créneau"),
  minOrderAmount: z.number().min(0, "Montant minimum invalide"),
  automaticConfirmation: z.boolean(),
  preparationTime: z
    .number()
    .min(15, "Temps de préparation minimum 15 minutes"),
});

export const createOrderSchema = z.object({
  clientEmail: z.string().email("Email client requis"),
  deliveryAddress: z.string().min(10, "Adresse de livraison requise"),
  scheduledDate: z.string().datetime("Date de livraison requise"),
  items: z
    .array(
      z.object({
        name: z.string().min(1, "Nom du produit requis"),
        quantity: z.number().positive("Quantité positive requise"),
        unitPrice: z.number().positive("Prix unitaire positif requis"),
      }),
    )
    .min(1, "Au moins un produit requis"),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "IN_TRANSIT",
    "DELIVERED",
    "CANCELLED",
  ]),
});
