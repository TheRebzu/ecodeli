import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface SubscriptionCreateData {
  userId: string;
  planId: string;
  startDate: Date;
  paymentMethodId?: string;
}

export interface SubscriptionUpdateData {
  id: string;
  planId?: string;
  status?: string;
  renewalDate?: Date;
}

export interface SubscriptionFilter {
  userId?: string;
  status?: string;
  planId?: string;
}

export const SubscriptionService = {
  /**
   * Create a new subscription
   */
  createSubscription: async (data: SubscriptionCreateData) => {
    try {
      // Get plan details
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: data.planId },
      });
      
      if (!plan) {
        return {
          success: false,
          message: "Plan d'abonnement introuvable",
        };
      }
      
      // Calculate renewal date based on plan duration
      const renewalDate = new Date(data.startDate);
      renewalDate.setMonth(renewalDate.getMonth() + (plan.durationMonths || 1));
      
      const subscription = await prisma.subscription.create({
        data: {
          userId: data.userId,
          planId: data.planId,
          startDate: data.startDate,
          renewalDate,
          status: "ACTIVE",
          paymentMethodId: data.paymentMethodId,
        },
      });
      
      return {
        success: true,
        subscription,
      };
    } catch (error) {
      console.error("Create subscription error:", error);
      return {
        success: false,
        message: "Erreur lors de la création de l'abonnement",
      };
    }
  },
  
  /**
   * Update an existing subscription
   */
  updateSubscription: async (data: SubscriptionUpdateData) => {
    try {
      const subscription = await prisma.subscription.update({
        where: { id: data.id },
        data: {
          planId: data.planId,
          status: data.status,
          renewalDate: data.renewalDate,
        },
      });
      
      return {
        success: true,
        subscription,
      };
    } catch (error) {
      console.error("Update subscription error:", error);
      return {
        success: false,
        message: "Erreur lors de la mise à jour de l'abonnement",
      };
    }
  },
  
  /**
   * Cancel a subscription
   */
  cancelSubscription: async (id: string) => {
    try {
      const subscription = await prisma.subscription.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
      });
      
      return {
        success: true,
        subscription,
      };
    } catch (error) {
      console.error("Cancel subscription error:", error);
      return {
        success: false,
        message: "Erreur lors de l'annulation de l'abonnement",
      };
    }
  },
  
  /**
   * Get a subscription by ID
   */
  getSubscriptionById: async (id: string) => {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          plan: true,
        },
      });
      
      return {
        success: true,
        subscription,
      };
    } catch (error) {
      console.error("Get subscription error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération de l'abonnement",
      };
    }
  },
  
  /**
   * Get user's active subscription
   */
  getUserActiveSubscription: async (userId: string) => {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: "ACTIVE",
        },
        include: {
          plan: true,
        },
        orderBy: {
          startDate: "desc",
        },
      });
      
      return {
        success: true,
        subscription,
      };
    } catch (error) {
      console.error("Get user subscription error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération de l'abonnement",
      };
    }
  },
  
  /**
   * Get subscriptions with filters
   */
  getSubscriptions: async (filters: SubscriptionFilter = {}) => {
    try {
      const where: Record<string, unknown> = {};
      
      if (filters.userId) {
        where.userId = filters.userId;
      }
      
      if (filters.status) {
        where.status = filters.status;
      }
      
      if (filters.planId) {
        where.planId = filters.planId;
      }
      
      const subscriptions = await prisma.subscription.findMany({
        where,
        include: {
          plan: true,
        },
        orderBy: {
          startDate: "desc",
        },
      });
      
      return {
        success: true,
        subscriptions,
      };
    } catch (error) {
      console.error("Get subscriptions error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération des abonnements",
      };
    }
  },
  
  /**
   * Get all subscription plans
   */
  getSubscriptionPlans: async () => {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        orderBy: {
          price: "asc",
        },
      });
      
      return {
        success: true,
        plans,
      };
    } catch (error) {
      console.error("Get subscription plans error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération des plans d'abonnement",
      };
    }
  },
}; 