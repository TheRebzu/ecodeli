import { PrismaClient, Prisma } from "@prisma/client";
import {
  CreateAnnouncementParams,
  UpdateAnnouncementParams,
  Coordinates,
  AnnouncementStatus,
} from "@/shared/types/announcement.types";
import { getDistanceFromLatLonInKm } from "@/lib/utils/geo";

const prisma = new PrismaClient();

export class AnnouncementService {
  /**
   * Crée une nouvelle annonce pour un client
   */
  static async createAnnouncement(
    userId: string,
    data: CreateAnnouncementParams
  ) {
    try {
      // Validation préliminaire
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Création de l'annonce
      const announcement = await prisma.announcement.create({
        data: {
          title: data.title,
          description: data.description,
          packageType: data.packageType,
          weight: data.weight,
          width: data.width,
          height: data.height,
          length: data.length,
          isFragile: data.isFragile,
          requiresRefrigeration: data.requiresRefrigeration,
          pickupAddress: data.pickupAddress,
          pickupCity: data.pickupCity,
          pickupPostalCode: data.pickupPostalCode,
          pickupCountry: data.pickupCountry,
          pickupCoordinates: data.pickupCoordinates,
          deliveryAddress: data.deliveryAddress,
          deliveryCity: data.deliveryCity,
          deliveryPostalCode: data.deliveryPostalCode,
          deliveryCountry: data.deliveryCountry,
          deliveryCoordinates: data.deliveryCoordinates,
          pickupDate: data.pickupDate,
          deliveryDeadline: data.deliveryDeadline,
          price: data.price,
          isNegotiable: data.isNegotiable,
          insuranceOption: data.insuranceOption,
          insuranceAmount: data.insuranceAmount,
          packageImages: data.packageImages,
          status: "PENDING",
          customerId: userId,
        },
      });

      return { success: true, data: announcement };
    } catch (error) {
      console.error("Error creating announcement:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Met à jour une annonce existante
   */
  static async updateAnnouncement(
    userId: string,
    data: UpdateAnnouncementParams
  ) {
    try {
      // Vérification que l'annonce existe et appartient à l'utilisateur
      const existingAnnouncement = await prisma.announcement.findFirst({
        where: {
          id: data.id,
          customerId: userId,
        },
      });

      if (!existingAnnouncement) {
        return {
          success: false,
          error: "Announcement not found or not authorized",
        };
      }

      // Vérification que l'annonce peut être modifiée
      if (
        existingAnnouncement.status !== "PENDING" &&
        existingAnnouncement.status !== "PUBLISHED"
      ) {
        return {
          success: false,
          error: "Cannot update announcement in its current status",
        };
      }

      // Mise à jour de l'annonce
      const updateData = { ...data };
      delete updateData.id; // Retirer l'ID des données à mettre à jour

      const updatedAnnouncement = await prisma.announcement.update({
        where: {
          id: data.id,
        },
        data: updateData as Prisma.AnnouncementUpdateInput,
      });

      return { success: true, data: updatedAnnouncement };
    } catch (error) {
      console.error("Error updating announcement:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Supprime une annonce (soft delete)
   */
  static async deleteAnnouncement(userId: string, announcementId: string) {
    try {
      // Vérification que l'annonce existe et appartient à l'utilisateur
      const existingAnnouncement = await prisma.announcement.findFirst({
        where: {
          id: announcementId,
          customerId: userId,
        },
      });

      if (!existingAnnouncement) {
        return {
          success: false,
          error: "Announcement not found or not authorized",
        };
      }

      // Vérification que l'annonce peut être supprimée
      if (
        existingAnnouncement.status !== "PENDING" &&
        existingAnnouncement.status !== "PUBLISHED" &&
        existingAnnouncement.status !== "EXPIRED"
      ) {
        return {
          success: false,
          error: "Cannot delete announcement in its current status",
        };
      }

      // Soft delete
      const deletedAnnouncement = await prisma.announcement.update({
        where: {
          id: announcementId,
        },
        data: {
          deletedAt: new Date(),
          status: "CANCELLED",
        },
      });

      return { success: true, data: deletedAnnouncement };
    } catch (error) {
      console.error("Error deleting announcement:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Publie une annonce
   */
  static async publishAnnouncement(userId: string, announcementId: string) {
    try {
      // Vérification que l'annonce existe et appartient à l'utilisateur
      const existingAnnouncement = await prisma.announcement.findFirst({
        where: {
          id: announcementId,
          customerId: userId,
        },
      });

      if (!existingAnnouncement) {
        return {
          success: false,
          error: "Announcement not found or not authorized",
        };
      }

      // Vérification que l'annonce peut être publiée
      if (existingAnnouncement.status !== "PENDING") {
        return {
          success: false,
          error: "Only pending announcements can be published",
        };
      }

      // Publication de l'annonce
      const publishedAnnouncement = await prisma.announcement.update({
        where: {
          id: announcementId,
        },
        data: {
          status: "PUBLISHED",
        },
      });

      return { success: true, data: publishedAnnouncement };
    } catch (error) {
      console.error("Error publishing announcement:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Récupère les annonces d'un client
   */
  static async getClientAnnouncements(userId: string, filters?: {
    status?: string;
    search?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
    try {
      // Construction des filtres
      const where: Prisma.AnnouncementWhereInput = {
        customerId: userId,
        deletedAt: null,
      };

      // Filtre par statut
      if (filters?.status) {
        where.status = filters.status;
      }

      // Filtre par date
      if (filters?.fromDate || filters?.toDate) {
        where.pickupDate = {};
        
        if (filters.fromDate) {
          where.pickupDate.gte = filters.fromDate;
        }
        
        if (filters.toDate) {
          where.pickupDate.lte = filters.toDate;
        }
      }

      // Filtre par texte
      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
          { pickupCity: { contains: filters.search, mode: "insensitive" } },
          { deliveryCity: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      // Récupération des annonces
      const announcements = await prisma.announcement.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          bids: {
            select: {
              id: true,
              price: true,
              status: true,
              createdAt: true,
              courier: {
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

      return { success: true, data: announcements };
    } catch (error) {
      console.error("Error fetching client announcements:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Récupère une annonce par son ID
   */
  static async getAnnouncementById(announcementId: string, userId?: string) {
    try {
      // Configuration de la requête
      const where: Prisma.AnnouncementWhereInput = {
        id: announcementId,
        deletedAt: null,
      };

      // Si un userId est fourni, vérifier que l'annonce est visible pour cet utilisateur
      if (userId) {
        where.OR = [
          { customerId: userId }, // Le client qui a créé l'annonce
          { deliveryPersonId: userId }, // Le livreur assigné
          { status: "PUBLISHED" }, // Les annonces publiées sont visibles par tous
        ];
      }

      // Récupération de l'annonce
      const announcement = await prisma.announcement.findFirst({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              image: true,
              rating: true,
            },
          },
          deliveryPerson: userId
            ? {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  rating: true,
                },
              }
            : false,
          bids: userId
            ? {
                select: {
                  id: true,
                  price: true,
                  message: true,
                  status: true,
                  createdAt: true,
                  courier: {
                    select: {
                      id: true,
                      name: true,
                      image: true,
                      rating: true,
                    },
                  },
                },
                where: {
                  OR: [
                    { courierId: userId }, // Les offres de l'utilisateur
                    { status: "ACCEPTED" }, // Les offres acceptées
                  ],
                },
              }
            : false,
        },
      });

      if (!announcement) {
        return {
          success: false,
          error: "Announcement not found or not accessible",
        };
      }

      return { success: true, data: announcement };
    } catch (error) {
      console.error("Error fetching announcement:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Calcule un prix recommandé en fonction de la distance et du poids
   */
  static calculateRecommendedPrice(
    pickupCoordinates: Coordinates,
    deliveryCoordinates: Coordinates,
    weight: number,
    isFragile: boolean,
    requiresRefrigeration: boolean
  ) {
    try {
      // Calcul de la distance
      const distance = getDistanceFromLatLonInKm(
        pickupCoordinates.lat,
        pickupCoordinates.lng,
        deliveryCoordinates.lat,
        deliveryCoordinates.lng
      );

      // Tarif de base par km
      const baseRatePerKm = 0.5; // 0.50€ par km

      // Tarif de base par kg
      const baseRatePerKg = 0.3; // 0.30€ par kg

      // Prix minimum
      const minimumPrice = 5.0; // 5€ minimum

      // Calcul du prix de base
      let price = distance * baseRatePerKm + weight * baseRatePerKg;

      // Frais supplémentaires
      if (isFragile) {
        price *= 1.2; // +20% pour les objets fragiles
      }

      if (requiresRefrigeration) {
        price *= 1.3; // +30% pour la réfrigération
      }

      // Assurer le prix minimum
      price = Math.max(price, minimumPrice);

      // Arrondir à 2 décimales
      price = Math.round(price * 100) / 100;

      return { success: true, data: price };
    } catch (error) {
      console.error("Error calculating recommended price:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
} 