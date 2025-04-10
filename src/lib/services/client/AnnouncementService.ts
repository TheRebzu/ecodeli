import { Prisma } from "@prisma/client";
import {
  CreateAnnouncementParams,
  UpdateAnnouncementParams,
  Coordinates,
  AnnouncementStatus,
} from "@/shared/types/announcement.types";
import { getDistanceFromLatLonInKm } from "@/lib/utils/geo";
import { db } from "@/lib/db";
import { 
  CreateAnnouncementSchema, 
  UpdateAnnouncementSchema, 
  PublishAnnouncementSchema,
  AnnouncementFilterSchema
} from "@/lib/schema/announcement.schema";
import { auth } from "@/auth";
import { PrismaWhereInput } from "@/shared/types/onboarding.types";

// Utiliser notre db mock au lieu d'initialiser un nouveau PrismaClient
const prisma = db;

export class AnnouncementService {
  /**
   * Crée une nouvelle annonce pour l'utilisateur actuel
   */
  static async createAnnouncement(data: unknown) {
    // Vérifier si l'utilisateur est connecté
    const session = await auth();
    if (!session?.user) {
      throw new Error("Vous devez être connecté pour créer une annonce");
    }

    // Valider les données avec Zod
    const validatedData = CreateAnnouncementSchema.parse(data);
    
    // Ajouter l'ID du client à partir de la session
    const customerId = session.user.id;

    try {
      // Créer l'annonce dans la base de données
      const announcement = await prisma.announcement.create({
        data: {
          ...validatedData,
          customerId,
          status: "DRAFT", // Statut par défaut pour une nouvelle annonce
        },
      });

      return announcement;
    } catch (error) {
      console.error("Erreur lors de la création de l'annonce:", error);
      throw new Error("Impossible de créer l'annonce. Veuillez réessayer.");
    }
  }

  /**
   * Met à jour une annonce existante
   */
  static async updateAnnouncement(id: string, data: unknown) {
    // Vérifier si l'utilisateur est connecté
    const session = await auth();
    if (!session?.user) {
      throw new Error("Vous devez être connecté pour mettre à jour une annonce");
    }

    // Valider les données avec Zod
    const validatedData = UpdateAnnouncementSchema.parse(data);
    
    // Vérifier que l'annonce appartient à l'utilisateur
    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        customerId: session.user.id,
      },
    });

    if (!announcement) {
      throw new Error("Annonce introuvable ou vous n'avez pas les droits pour la modifier");
    }

    // Empêcher la modification d'une annonce déjà publiée
    if (announcement.status !== "DRAFT" && announcement.status !== "REJECTED") {
      throw new Error("Vous ne pouvez pas modifier une annonce qui a déjà été publiée");
    }

    try {
      // Mettre à jour l'annonce
      const updatedAnnouncement = await prisma.announcement.update({
        where: { id },
        data: validatedData,
      });

      return updatedAnnouncement;
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'annonce:", error);
      throw new Error("Impossible de mettre à jour l'annonce. Veuillez réessayer.");
    }
  }

  /**
   * Supprime une annonce
   */
  static async deleteAnnouncement(id: string) {
    // Vérifier si l'utilisateur est connecté
    const session = await auth();
    if (!session?.user) {
      throw new Error("Vous devez être connecté pour supprimer une annonce");
    }

    // Vérifier que l'annonce appartient à l'utilisateur
    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        customerId: session.user.id,
      },
    });

    if (!announcement) {
      throw new Error("Annonce introuvable ou vous n'avez pas les droits pour la supprimer");
    }

    // Empêcher la suppression d'une annonce qui est en cours de livraison
    if (announcement.status === "IN_PROGRESS" || announcement.status === "ASSIGNED") {
      throw new Error("Vous ne pouvez pas supprimer une annonce qui est en cours de livraison");
    }

    try {
      // Supprimer l'annonce (dans la version mock, on fait un update pour simuler)
      const deletedAnnouncement = await prisma.announcement.update({
        where: { id },
        data: { status: "DELETED" },
      });

      return deletedAnnouncement;
    } catch (error) {
      console.error("Erreur lors de la suppression de l'annonce:", error);
      throw new Error("Impossible de supprimer l'annonce. Veuillez réessayer.");
    }
  }

  /**
   * Publie une annonce (change le statut de DRAFT à PENDING)
   */
  static async publishAnnouncement(id: string, data: unknown) {
    // Vérifier si l'utilisateur est connecté
    const session = await auth();
    if (!session?.user) {
      throw new Error("Vous devez être connecté pour publier une annonce");
    }

    // Valider les données avec Zod si nécessaire
    const validatedData = PublishAnnouncementSchema.parse(data);

    // Vérifier que l'annonce appartient à l'utilisateur
    const announcement = await prisma.announcement.findFirst({
      where: {
        id,
        customerId: session.user.id,
      },
    });

    if (!announcement) {
      throw new Error("Annonce introuvable ou vous n'avez pas les droits pour la publier");
    }

    // Vérifier que l'annonce est au statut DRAFT
    if (announcement.status !== "DRAFT" && announcement.status !== "REJECTED") {
      throw new Error("Seules les annonces en brouillon ou rejetées peuvent être publiées");
    }

    try {
      // Publier l'annonce (changer son statut)
      const publishedAnnouncement = await prisma.announcement.update({
        where: { id },
        data: {
          status: "PENDING",
          ...validatedData,
        },
      });

      return publishedAnnouncement;
    } catch (error) {
      console.error("Erreur lors de la publication de l'annonce:", error);
      throw new Error("Impossible de publier l'annonce. Veuillez réessayer.");
    }
  }

  /**
   * Récupère une annonce par son ID
   */
  static async getAnnouncementById(id: string) {
    // Vérifier si l'utilisateur est connecté
    const session = await auth();
    if (!session?.user) {
      throw new Error("Vous devez être connecté pour consulter une annonce");
    }

    try {
      // Récupérer l'annonce
      const announcement = await prisma.announcement.findFirst({
        where: {
          id,
          customerId: session.user.id,
        },
      });

      if (!announcement) {
        throw new Error("Annonce introuvable ou vous n'avez pas les droits pour la consulter");
      }

      return announcement;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'annonce:", error);
      throw new Error("Impossible de récupérer l'annonce. Veuillez réessayer.");
    }
  }

  /**
   * Récupère toutes les annonces de l'utilisateur avec filtrage
   */
  static async getAnnouncements(filters?: unknown) {
    // Vérifier si l'utilisateur est connecté
    const session = await auth();
    if (!session?.user) {
      throw new Error("Vous devez être connecté pour consulter vos annonces");
    }

    try {
      // Valider les filtres avec Zod si fournis
      const validatedFilters = filters 
        ? AnnouncementFilterSchema.parse(filters)
        : {};

      // Construire la requête avec les filtres
      const where: PrismaWhereInput = {
        customerId: session.user.id,
      };

      // Ajouter les filtres de statut si spécifiés
      if (validatedFilters.status) {
        where.status = validatedFilters.status;
      }

      // Ajouter les filtres de recherche si spécifiés
      if (validatedFilters.search) {
        where.OR = [
          { title: { contains: validatedFilters.search, mode: "insensitive" } },
          { description: { contains: validatedFilters.search, mode: "insensitive" } },
        ];
      }

      // Récupérer les annonces avec pagination
      const announcements = await prisma.announcement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: validatedFilters.limit || 10,
        skip: validatedFilters.offset || 0,
      });

      // Compter le nombre total d'annonces (pour la pagination)
      const totalCount = await prisma.announcement.count({ where });

      return {
        data: announcements,
        meta: {
          total: totalCount,
          limit: validatedFilters.limit || 10,
          offset: validatedFilters.offset || 0,
        }
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des annonces:", error);
      throw new Error("Impossible de récupérer les annonces. Veuillez réessayer.");
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
