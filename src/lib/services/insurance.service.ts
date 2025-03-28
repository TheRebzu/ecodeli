import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface InsuranceCreateData {
  userId: string;
  packageId?: string;
  deliveryId?: string;
  type: string;
  coverageAmount: number;
  startDate: Date;
  endDate: Date;
  paymentMethodId?: string;
}

export interface InsuranceUpdateData {
  id: string;
  type?: string;
  coverageAmount?: number;
  status?: string;
  endDate?: Date;
}

export interface InsuranceFilter {
  userId?: string;
  status?: string;
  packageId?: string;
  deliveryId?: string;
}

export const InsuranceService = {
  /**
   * Create a new insurance
   */
  createInsurance: async (data: InsuranceCreateData) => {
    try {
      const insurance = await prisma.insurance.create({
        data: {
          userId: data.userId,
          packageId: data.packageId,
          deliveryId: data.deliveryId,
          type: data.type,
          coverageAmount: data.coverageAmount,
          startDate: data.startDate,
          endDate: data.endDate,
          status: "ACTIVE",
          paymentMethodId: data.paymentMethodId,
        },
      });
      
      return {
        success: true,
        insurance,
      };
    } catch (error) {
      console.error("Create insurance error:", error);
      return {
        success: false,
        message: "Erreur lors de la création de l'assurance",
      };
    }
  },
  
  /**
   * Update an existing insurance
   */
  updateInsurance: async (data: InsuranceUpdateData) => {
    try {
      const insurance = await prisma.insurance.update({
        where: { id: data.id },
        data: {
          type: data.type,
          coverageAmount: data.coverageAmount,
          status: data.status,
          endDate: data.endDate,
        },
      });
      
      return {
        success: true,
        insurance,
      };
    } catch (error) {
      console.error("Update insurance error:", error);
      return {
        success: false,
        message: "Erreur lors de la mise à jour de l'assurance",
      };
    }
  },
  
  /**
   * Cancel an insurance
   */
  cancelInsurance: async (id: string) => {
    try {
      const insurance = await prisma.insurance.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
      });
      
      return {
        success: true,
        insurance,
      };
    } catch (error) {
      console.error("Cancel insurance error:", error);
      return {
        success: false,
        message: "Erreur lors de l'annulation de l'assurance",
      };
    }
  },
  
  /**
   * Get an insurance by ID
   */
  getInsuranceById: async (id: string) => {
    try {
      const insurance = await prisma.insurance.findUnique({
        where: { id },
      });
      
      return {
        success: true,
        insurance,
      };
    } catch (error) {
      console.error("Get insurance error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération de l'assurance",
      };
    }
  },
  
  /**
   * Get insurances with filters
   */
  getInsurances: async (filters: InsuranceFilter = {}) => {
    try {
      const where: Record<string, unknown> = {};
      
      if (filters.userId) {
        where.userId = filters.userId;
      }
      
      if (filters.status) {
        where.status = filters.status;
      }
      
      if (filters.packageId) {
        where.packageId = filters.packageId;
      }
      
      if (filters.deliveryId) {
        where.deliveryId = filters.deliveryId;
      }
      
      const insurances = await prisma.insurance.findMany({
        where,
        orderBy: {
          startDate: "desc",
        },
      });
      
      return {
        success: true,
        insurances,
      };
    } catch (error) {
      console.error("Get insurances error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération des assurances",
      };
    }
  },
  
  /**
   * Get all insurance plans
   */
  getInsurancePlans: async () => {
    try {
      const plans = await prisma.insurancePlan.findMany({
        orderBy: {
          price: "asc",
        },
      });
      
      return {
        success: true,
        plans,
      };
    } catch (error) {
      console.error("Get insurance plans error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération des plans d'assurance",
      };
    }
  },
  
  /**
   * File an insurance claim
   */
  fileInsuranceClaim: async (insuranceId: string, description: string, amount: number) => {
    try {
      const claim = await prisma.insuranceClaim.create({
        data: {
          insuranceId,
          description,
          claimAmount: amount,
          status: "PENDING",
        },
      });
      
      return {
        success: true,
        claim,
      };
    } catch (error) {
      console.error("File insurance claim error:", error);
      return {
        success: false,
        message: "Erreur lors du dépôt de la demande d'indemnisation",
      };
    }
  },
}; 