import { PrismaClient, Prisma } from "@prisma/client";
import {
  CreateBidParams,
  UpdateBidParams,
} from "@/shared/types/announcement.types";

const prisma = new PrismaClient();

export class BidService {
  /**
   * Crée une nouvelle offre sur une annonce
   */
  static async createBid(userId: string, data: CreateBidParams) {
    try {
      // Validation préliminaire
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Vérification que l'annonce existe et peut recevoir des offres
      const announcement = await prisma.announcement.findFirst({
        where: {
          id: data.announcementId,
          status: "PUBLISHED",
          deletedAt: null,
        },
      });

      if (!announcement) {
        return {
          success: false,
          error: "Announcement not found or not available for bidding",
        };
      }

      // Vérification que l'utilisateur n'est pas le créateur de l'annonce
      if (announcement.customerId === userId) {
        return {
          success: false,
          error: "You cannot bid on your own announcement",
        };
      }

      // Vérification que l'utilisateur n'a pas déjà fait une offre sur cette annonce
      const existingBid = await prisma.bid.findFirst({
        where: {
          announcementId: data.announcementId,
          courierId: userId,
        },
      });

      if (existingBid) {
        return {
          success: false,
          error: "You have already made a bid on this announcement",
        };
      }

      // Création de l'offre
      const bid = await prisma.bid.create({
        data: {
          price: data.price,
          message: data.message,
          status: "PENDING",
          announcementId: data.announcementId,
          courierId: userId,
        },
        include: {
          courier: {
            select: {
              id: true,
              name: true,
              image: true,
              rating: true,
            },
          },
        },
      });

      return { success: true, data: bid };
    } catch (error) {
      console.error("Error creating bid:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Met à jour une offre existante
   */
  static async updateBid(userId: string, data: UpdateBidParams) {
    try {
      // Vérification que l'offre existe et appartient à l'utilisateur
      const existingBid = await prisma.bid.findFirst({
        where: {
          id: data.id,
          courierId: userId,
        },
        include: {
          announcement: true,
        },
      });

      if (!existingBid) {
        return {
          success: false,
          error: "Bid not found or not authorized",
        };
      }

      // Vérification que l'offre peut être modifiée
      if (existingBid.status !== "PENDING") {
        return {
          success: false,
          error: "Only pending bids can be updated",
        };
      }

      // Mise à jour de l'offre
      const updateData: Prisma.BidUpdateInput = {};

      if (data.price !== undefined) {
        updateData.price = data.price;
      }

      if (data.message !== undefined) {
        updateData.message = data.message;
      }

      if (data.status !== undefined) {
        updateData.status = data.status;
      }

      const updatedBid = await prisma.bid.update({
        where: {
          id: data.id,
        },
        data: updateData,
        include: {
          courier: {
            select: {
              id: true,
              name: true,
              image: true,
              rating: true,
            },
          },
        },
      });

      return { 
        success: true, 
        data: { 
          ...updatedBid, 
          announcementId: existingBid.announcementId 
        }
      };
    } catch (error) {
      console.error("Error updating bid:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Accepte une offre
   */
  static async acceptBid(userId: string, bidId: string) {
    try {
      // Récupération de l'offre avec son annonce
      const bid = await prisma.bid.findUnique({
        where: {
          id: bidId,
        },
        include: {
          announcement: true,
        },
      });

      if (!bid) {
        return {
          success: false,
          error: "Bid not found",
        };
      }

      // Vérification que l'utilisateur est le propriétaire de l'annonce
      if (bid.announcement.customerId !== userId) {
        return {
          success: false,
          error: "Not authorized to accept this bid",
        };
      }

      // Vérification que l'offre est en attente
      if (bid.status !== "PENDING") {
        return {
          success: false,
          error: "Only pending bids can be accepted",
        };
      }

      // Vérification que l'annonce est en statut publiée
      if (bid.announcement.status !== "PUBLISHED") {
        return {
          success: false,
          error: "The announcement is not in a state to accept bids",
        };
      }

      // Démarrage d'une transaction pour mettre à jour l'offre et l'annonce
      const result = await prisma.$transaction(async (tx) => {
        // Mettre à jour l'offre
        const updatedBid = await tx.bid.update({
          where: {
            id: bidId,
          },
          data: {
            status: "ACCEPTED",
          },
        });

        // Rejeter toutes les autres offres
        await tx.bid.updateMany({
          where: {
            announcementId: bid.announcementId,
            id: {
              not: bidId,
            },
            status: "PENDING",
          },
          data: {
            status: "REJECTED",
          },
        });

        // Mettre à jour l'annonce
        const updatedAnnouncement = await tx.announcement.update({
          where: {
            id: bid.announcementId,
          },
          data: {
            status: "ASSIGNED",
            deliveryPersonId: bid.courierId,
          },
        });

        return { bid: updatedBid, announcement: updatedAnnouncement };
      });

      return { 
        success: true, 
        data: {
          ...result.bid,
          announcementId: bid.announcementId
        }
      };
    } catch (error) {
      console.error("Error accepting bid:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Rejette une offre
   */
  static async rejectBid(userId: string, bidId: string) {
    try {
      // Récupération de l'offre avec son annonce
      const bid = await prisma.bid.findUnique({
        where: {
          id: bidId,
        },
        include: {
          announcement: true,
        },
      });

      if (!bid) {
        return {
          success: false,
          error: "Bid not found",
        };
      }

      // Vérification que l'utilisateur est le propriétaire de l'annonce
      if (bid.announcement.customerId !== userId) {
        return {
          success: false,
          error: "Not authorized to reject this bid",
        };
      }

      // Vérification que l'offre est en attente
      if (bid.status !== "PENDING") {
        return {
          success: false,
          error: "Only pending bids can be rejected",
        };
      }

      // Mise à jour de l'offre
      const updatedBid = await prisma.bid.update({
        where: {
          id: bidId,
        },
        data: {
          status: "REJECTED",
        },
      });

      return { 
        success: true, 
        data: { 
          ...updatedBid, 
          announcementId: bid.announcementId 
        }
      };
    } catch (error) {
      console.error("Error rejecting bid:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Récupère les offres faites par un livreur
   */
  static async getCourierBids(userId: string, filters?: {
    status?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
    try {
      // Construction des filtres
      const where: Prisma.BidWhereInput = {
        courierId: userId,
      };

      // Filtre par statut
      if (filters?.status) {
        where.status = filters.status;
      }

      // Filtre par date
      if (filters?.fromDate || filters?.toDate) {
        where.createdAt = {};
        
        if (filters.fromDate) {
          where.createdAt.gte = filters.fromDate;
        }
        
        if (filters.toDate) {
          where.createdAt.lte = filters.toDate;
        }
      }

      // Récupération des offres
      const bids = await prisma.bid.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          announcement: {
            select: {
              id: true,
              title: true,
              pickupCity: true,
              deliveryCity: true,
              pickupDate: true,
              deliveryDeadline: true,
              status: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  rating: true,
                },
              },
            },
          },
        },
      });

      return { success: true, data: bids };
    } catch (error) {
      console.error("Error fetching courier bids:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Récupère les offres pour une annonce
   */
  static async getAnnouncementBids(announcementId: string, userId: string) {
    try {
      // Vérification que l'annonce appartient à l'utilisateur
      const announcement = await prisma.announcement.findFirst({
        where: {
          id: announcementId,
          customerId: userId,
        },
      });

      if (!announcement) {
        return {
          success: false,
          error: "Announcement not found or not authorized",
        };
      }

      // Récupération des offres
      const bids = await prisma.bid.findMany({
        where: {
          announcementId,
        },
        orderBy: {
          price: "asc",
        },
        include: {
          courier: {
            select: {
              id: true,
              name: true,
              image: true,
              rating: true,
            },
          },
        },
      });

      return { success: true, data: bids };
    } catch (error) {
      console.error("Error fetching announcement bids:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
} 