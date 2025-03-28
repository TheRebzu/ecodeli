import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface DeliveryCreateData {
  userId: string;
  pickupAddress: string;
  deliveryAddress: string;
  packageSize: string;
  scheduledDate: Date;
  notes?: string;
}

export interface DeliveryUpdateData {
  id: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  packageSize?: string;
  scheduledDate?: Date;
  status?: string;
  notes?: string;
}

export interface DeliveryFilter {
  userId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export const DeliveryService = {
  /**
   * Create a new delivery
   */
  createDelivery: async (data: DeliveryCreateData) => {
    try {
      const delivery = await prisma.delivery.create({
        data: {
          userId: data.userId,
          pickupAddress: data.pickupAddress,
          deliveryAddress: data.deliveryAddress,
          packageSize: data.packageSize,
          scheduledDate: data.scheduledDate,
          notes: data.notes,
          status: "PENDING",
        },
      });

      return {
        success: true,
        delivery,
      };
    } catch (error) {
      console.error("Create delivery error:", error);
      return {
        success: false,
        message: "Erreur lors de la création de la livraison",
      };
    }
  },

  /**
   * Update an existing delivery
   */
  updateDelivery: async (data: DeliveryUpdateData) => {
    try {
      const delivery = await prisma.delivery.update({
        where: { id: data.id },
        data: {
          pickupAddress: data.pickupAddress,
          deliveryAddress: data.deliveryAddress,
          packageSize: data.packageSize,
          scheduledDate: data.scheduledDate,
          status: data.status,
          notes: data.notes,
        },
      });

      return {
        success: true,
        delivery,
      };
    } catch (error) {
      console.error("Update delivery error:", error);
      return {
        success: false,
        message: "Erreur lors de la mise à jour de la livraison",
      };
    }
  },

  /**
   * Cancel a delivery
   */
  cancelDelivery: async (id: string) => {
    try {
      const delivery = await prisma.delivery.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
      });

      return {
        success: true,
        delivery,
      };
    } catch (error) {
      console.error("Cancel delivery error:", error);
      return {
        success: false,
        message: "Erreur lors de l'annulation de la livraison",
      };
    }
  },

  /**
   * Get a delivery by ID
   */
  getDeliveryById: async (id: string) => {
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id },
      });

      return {
        success: true,
        delivery,
      };
    } catch (error) {
      console.error("Get delivery error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération de la livraison",
      };
    }
  },

  /**
   * Get deliveries with filters
   */
  getDeliveries: async (filters: DeliveryFilter = {}) => {
    try {
      const where: any = {};

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.startDate || filters.endDate) {
        where.scheduledDate = {};

        if (filters.startDate) {
          where.scheduledDate.gte = filters.startDate;
        }

        if (filters.endDate) {
          where.scheduledDate.lte = filters.endDate;
        }
      }

      const deliveries = await prisma.delivery.findMany({
        where,
        orderBy: {
          scheduledDate: "desc",
        },
      });

      return {
        success: true,
        deliveries,
      };
    } catch (error) {
      console.error("Get deliveries error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération des livraisons",
      };
    }
  },

  /**
   * Track delivery status
   */
  trackDelivery: async (id: string) => {
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id },
        include: {
          trackingEvents: {
            orderBy: {
              timestamp: "desc",
            },
          },
        },
      });

      return {
        success: true,
        delivery,
      };
    } catch (error) {
      console.error("Track delivery error:", error);
      return {
        success: false,
        message: "Erreur lors du suivi de la livraison",
      };
    }
  },
}; 