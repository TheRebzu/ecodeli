import { db } from "@/lib/db";
import { 
  AnnouncementFilterParams, 
  AnnouncementStatus,
  CreateAnnouncementParams,
  UpdateAnnouncementParams
} from "@/shared/types/announcement.types";
import { auth } from "@/auth";
import { PrismaWhereInput } from "@/shared/types/onboarding.types";

export class AnnouncementService {
  /**
   * Récupère la liste des annonces avec filtres
   */
  static async getAnnouncements(filters?: AnnouncementFilterParams) {
    try {
      const session = await auth();
      if (!session?.user) {
        throw new Error("Vous devez être connecté pour accéder à vos annonces");
      }

      const where: PrismaWhereInput = {
        customerId: session.user.id,
      };

      // Appliquer les filtres si disponibles
      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search } },
          { description: { contains: filters.search } }
        ];
      }

      // Récupérer les annonces
      const announcements = await db.announcement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters?.limit || 10,
        skip: filters?.offset || 0
      });

      // Compter le total
      const total = await db.announcement.count({ where });

      return {
        data: announcements,
        meta: {
          total,
          page: filters?.offset ? Math.floor(filters.offset / (filters?.limit || 10)) + 1 : 1,
          pageSize: filters?.limit || 10
        }
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des annonces:", error);
      throw new Error("Erreur lors de la récupération des annonces");
    }
  }

  /**
   * Récupère une annonce par son ID
   */
  static async getAnnouncementById(id: string) {
    try {
      const session = await auth();
      if (!session?.user) {
        throw new Error("Vous devez être connecté pour accéder à cette annonce");
      }

      const announcement = await db.announcement.findFirst({
        where: {
          id,
          customerId: session.user.id
        }
      });

      if (!announcement) {
        throw new Error("Annonce introuvable");
      }

      return announcement;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'annonce:", error);
      throw new Error("Erreur lors de la récupération de l'annonce");
    }
  }

  /**
   * Crée une nouvelle annonce
   */
  static async createAnnouncement(data: CreateAnnouncementParams) {
    try {
      const session = await auth();
      if (!session?.user) {
        throw new Error("Vous devez être connecté pour créer une annonce");
      }

      const announcement = await db.announcement.create({
        data: {
          ...data,
          status: AnnouncementStatus.DRAFT,
          customerId: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return announcement;
    } catch (error) {
      console.error("Erreur lors de la création de l'annonce:", error);
      throw new Error("Erreur lors de la création de l'annonce");
    }
  }

  /**
   * Met à jour une annonce
   */
  static async updateAnnouncement(id: string, data: UpdateAnnouncementParams) {
    try {
      const session = await auth();
      if (!session?.user) {
        throw new Error("Vous devez être connecté pour modifier cette annonce");
      }

      // Vérifier que l'annonce appartient à l'utilisateur
      const announcement = await db.announcement.findFirst({
        where: {
          id,
          customerId: session.user.id
        }
      });

      if (!announcement) {
        throw new Error("Annonce introuvable ou vous n'avez pas les droits pour la modifier");
      }

      // Vérifier que l'annonce est modifiable
      if (announcement.status !== AnnouncementStatus.DRAFT && 
          announcement.status !== AnnouncementStatus.REJECTED) {
        throw new Error("Vous ne pouvez pas modifier une annonce qui n'est pas en brouillon ou rejetée");
      }

      // Mettre à jour l'annonce
      const updatedAnnouncement = await db.announcement.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      return updatedAnnouncement;
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'annonce:", error);
      throw new Error("Erreur lors de la mise à jour de l'annonce");
    }
  }

  /**
   * Supprime une annonce
   */
  static async deleteAnnouncement(id: string) {
    try {
      const session = await auth();
      if (!session?.user) {
        throw new Error("Vous devez être connecté pour supprimer cette annonce");
      }

      // Vérifier que l'annonce appartient à l'utilisateur
      const announcement = await db.announcement.findFirst({
        where: {
          id,
          customerId: session.user.id
        }
      });

      if (!announcement) {
        throw new Error("Annonce introuvable ou vous n'avez pas les droits pour la supprimer");
      }

      // Simuler la suppression (soft delete)
      const deletedAnnouncement = await db.announcement.update({
        where: { id },
        data: {
          status: AnnouncementStatus.DELETED,
          updatedAt: new Date()
        }
      });

      return deletedAnnouncement;
    } catch (error) {
      console.error("Erreur lors de la suppression de l'annonce:", error);
      throw new Error("Erreur lors de la suppression de l'annonce");
    }
  }

  /**
   * Publie une annonce (change son statut)
   */
  static async publishAnnouncement(id: string) {
    try {
      const session = await auth();
      if (!session?.user) {
        throw new Error("Vous devez être connecté pour publier cette annonce");
      }

      // Vérifier que l'annonce appartient à l'utilisateur
      const announcement = await db.announcement.findFirst({
        where: {
          id,
          customerId: session.user.id
        }
      });

      if (!announcement) {
        throw new Error("Annonce introuvable ou vous n'avez pas les droits pour la publier");
      }

      // Vérifier que l'annonce est publiable
      if (announcement.status !== AnnouncementStatus.DRAFT && 
          announcement.status !== AnnouncementStatus.REJECTED) {
        throw new Error("Vous ne pouvez publier que des annonces en brouillon ou rejetées");
      }

      // Publier l'annonce
      const publishedAnnouncement = await db.announcement.update({
        where: { id },
        data: {
          status: AnnouncementStatus.PENDING,
          updatedAt: new Date()
        }
      });

      return publishedAnnouncement;
    } catch (error) {
      console.error("Erreur lors de la publication de l'annonce:", error);
      throw new Error("Erreur lors de la publication de l'annonce");
    }
  }
} 