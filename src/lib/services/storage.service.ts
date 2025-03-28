import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface StorageBoxCreateData {
  userId: string;
  size: string;
  location: string;
  startDate: Date;
  endDate?: Date;
  paymentMethodId?: string;
}

export interface StorageBoxUpdateData {
  id: string;
  size?: string;
  location?: string;
  status?: string;
  endDate?: Date;
}

export interface StorageItemCreateData {
  boxId: string;
  name: string;
  description?: string;
  category?: string;
  isFragile?: boolean;
}

export interface StorageBoxFilter {
  userId?: string;
  location?: string;
  status?: string;
  size?: string;
}

export const StorageService = {
  /**
   * Create a new storage box
   */
  createStorageBox: async (data: StorageBoxCreateData) => {
    try {
      const storageBox = await prisma.storageBox.create({
        data: {
          userId: data.userId,
          size: data.size,
          location: data.location,
          startDate: data.startDate,
          endDate: data.endDate,
          status: "ACTIVE",
          paymentMethodId: data.paymentMethodId,
        },
      });
      
      return {
        success: true,
        storageBox,
      };
    } catch (error) {
      console.error("Create storage box error:", error);
      return {
        success: false,
        message: "Erreur lors de la création du box de stockage",
      };
    }
  },
  
  /**
   * Update an existing storage box
   */
  updateStorageBox: async (data: StorageBoxUpdateData) => {
    try {
      const storageBox = await prisma.storageBox.update({
        where: { id: data.id },
        data: {
          size: data.size,
          location: data.location,
          status: data.status,
          endDate: data.endDate,
        },
      });
      
      return {
        success: true,
        storageBox,
      };
    } catch (error) {
      console.error("Update storage box error:", error);
      return {
        success: false,
        message: "Erreur lors de la mise à jour du box de stockage",
      };
    }
  },
  
  /**
   * Cancel a storage box reservation
   */
  cancelStorageBox: async (id: string) => {
    try {
      const storageBox = await prisma.storageBox.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
      });
      
      return {
        success: true,
        storageBox,
      };
    } catch (error) {
      console.error("Cancel storage box error:", error);
      return {
        success: false,
        message: "Erreur lors de l'annulation du box de stockage",
      };
    }
  },
  
  /**
   * Get a storage box by ID
   */
  getStorageBoxById: async (id: string) => {
    try {
      const storageBox = await prisma.storageBox.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });
      
      return {
        success: true,
        storageBox,
      };
    } catch (error) {
      console.error("Get storage box error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération du box de stockage",
      };
    }
  },
  
  /**
   * Get storage boxes with filters
   */
  getStorageBoxes: async (filters: StorageBoxFilter = {}) => {
    try {
      const where: Record<string, unknown> = {};
      
      if (filters.userId) {
        where.userId = filters.userId;
      }
      
      if (filters.location) {
        where.location = filters.location;
      }
      
      if (filters.status) {
        where.status = filters.status;
      }
      
      if (filters.size) {
        where.size = filters.size;
      }
      
      const storageBoxes = await prisma.storageBox.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: {
          startDate: "desc",
        },
      });
      
      return {
        success: true,
        storageBoxes,
      };
    } catch (error) {
      console.error("Get storage boxes error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération des boxes de stockage",
      };
    }
  },
  
  /**
   * Add an item to a storage box
   */
  addStorageItem: async (data: StorageItemCreateData) => {
    try {
      const item = await prisma.storageItem.create({
        data: {
          boxId: data.boxId,
          name: data.name,
          description: data.description,
          category: data.category,
          isFragile: data.isFragile,
        },
      });
      
      return {
        success: true,
        item,
      };
    } catch (error) {
      console.error("Add storage item error:", error);
      return {
        success: false,
        message: "Erreur lors de l'ajout de l'objet au box de stockage",
      };
    }
  },
  
  /**
   * Remove an item from a storage box
   */
  removeStorageItem: async (itemId: string) => {
    try {
      await prisma.storageItem.delete({
        where: { id: itemId },
      });
      
      return {
        success: true,
        message: "Objet supprimé avec succès",
      };
    } catch (error) {
      console.error("Remove storage item error:", error);
      return {
        success: false,
        message: "Erreur lors de la suppression de l'objet du box de stockage",
      };
    }
  },
  
  /**
   * Get available storage locations
   */
  getStorageLocations: async () => {
    try {
      const locations = await prisma.storageLocation.findMany({
        orderBy: {
          name: "asc",
        },
      });
      
      return {
        success: true,
        locations,
      };
    } catch (error) {
      console.error("Get storage locations error:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération des emplacements de stockage",
      };
    }
  },
}; 