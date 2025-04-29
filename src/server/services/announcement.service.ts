import { db } from '../db';
import {
  AnnouncementStatus,
  AnnouncementPriority,
  AnnouncementFilters,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  Announcement,
} from '@/types/announcement';
import { Prisma } from '@prisma/client';
import { AuditService } from './audit.service';

/**
 * Service pour la gestion des annonces
 *
 * Ce service utilise des types personnalisés définis dans /src/types/announcement.ts
 * ainsi que les types générés par Prisma pour assurer la cohérence des données.
 */
export const AnnouncementService = {
  /**
   * Récupère toutes les annonces avec filtres optionnels
   */
  async getAll(filters: AnnouncementFilters) {
    const {
      type,
      status,
      priority,
      clientId,
      delivererId,
      fromDate,
      toDate,
      minPrice,
      maxPrice,
      keyword,
      tags,
      limit = 10,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Construction de la requête avec conditions
    const where: any = {};

    // Filtre par type
    if (type) {
      where.type = type;
    }

    // Filtre par statut
    if (status) {
      where.status = status;
    }

    // Filtre par priorité
    if (priority) {
      where.priority = priority;
    }

    // Filtre par client
    if (clientId) {
      where.clientId = clientId;
    }

    // Filtre par livreur
    if (delivererId) {
      where.delivererId = delivererId;
    }

    // Filtre par date
    if (fromDate || toDate) {
      where.createdAt = {};

      if (fromDate) {
        where.createdAt = { ...where.createdAt, gte: fromDate };
      }

      if (toDate) {
        where.createdAt = { ...where.createdAt, lte: toDate };
      }
    }

    // Filtre par prix
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.suggestedPrice = {};

      if (minPrice !== undefined) {
        where.suggestedPrice = { ...where.suggestedPrice, gte: minPrice };
      }

      if (maxPrice !== undefined) {
        where.suggestedPrice = { ...where.suggestedPrice, lte: maxPrice };
      }
    }

    // Recherche par mot-clé
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { pickupAddress: { contains: keyword, mode: 'insensitive' } },
        { deliveryAddress: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // Filtre par tags
    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }

    // Exécution de la requête
    try {
      // Utiliser l'API Prisma au lieu des requêtes SQL brutes
      const [announcements, totalCount] = await Promise.all([
        db.announcement.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            deliverer: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            applications: {
              include: {
                deliverer: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip: offset,
          take: limit,
        }),
        db.announcement.count({ where }),
      ]);

      // Formater les annonces pour le client
      const formattedAnnouncements = announcements.map((announcement: any) => ({
        ...announcement,
        applications: announcement.applications.map((app: any) => ({
          ...app,
          deliverer: app.deliverer
            ? {
                id: app.deliverer.id,
                name: app.deliverer.name,
                image: app.deliverer.image,
              }
            : null,
        })),
      }));

      return {
        announcements: formattedAnnouncements,
        totalCount,
        pagination: {
          limit,
          offset,
          hasMore: offset + announcements.length < totalCount,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des annonces:', error);
      throw new Error('Erreur lors de la récupération des annonces');
    }
  },

  /**
   * Récupère une annonce par son ID
   */
  async getById(id: string): Promise<Announcement> {
    try {
      const announcement = await db.announcement.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          deliverer: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          applications: {
            include: {
              deliverer: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      if (!announcement) {
        throw new Error('Annonce non trouvée');
      }

      // Incrémenter le compteur de vues
      await db.announcement.update({
        where: { id },
        data: {
          viewCount: { increment: 1 },
        },
      });

      // Convertir le modèle Prisma en type Announcement
      const formattedAnnouncement = {
        ...announcement,
        applications: announcement.applications.map((app: any) => ({
          ...app,
          deliverer: app.deliverer
            ? {
                id: app.deliverer.id,
                name: app.deliverer.name,
                image: app.deliverer.image,
              }
            : null,
        })),
      } as unknown as Announcement;

      return formattedAnnouncement;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'annonce:", error);
      throw new Error("Erreur lors de la récupération de l'annonce");
    }
  },

  /**
   * Crée une nouvelle annonce
   */
  async create(data: CreateAnnouncementInput, clientId: string) {
    const {
      title,
      description,
      type,
      priority = AnnouncementPriority.MEDIUM,
      pickupAddress,
      pickupLongitude,
      pickupLatitude,
      deliveryAddress,
      deliveryLongitude,
      deliveryLatitude,
      weight,
      width,
      height,
      length,
      isFragile = false,
      needsCooling = false,
      pickupDate,
      pickupTimeWindow,
      deliveryDate,
      deliveryTimeWindow,
      isFlexible = false,
      suggestedPrice,
      isNegotiable = true,
      tags = [],
      notes,
    } = data;

    try {
      // Vérifier si l'utilisateur est un client
      const user = await db.user.findUnique({
        where: { id: clientId },
        include: { client: true },
      });

      if (!user || !user.client) {
        throw new Error('Seuls les clients peuvent créer des annonces');
      }

      // Créer l'annonce
      const newAnnouncement = await db.announcement.create({
        data: {
          title,
          description,
          type,
          status: AnnouncementStatus.PENDING,
          priority,
          pickupAddress,
          pickupLongitude,
          pickupLatitude,
          deliveryAddress,
          deliveryLongitude,
          deliveryLatitude,
          weight,
          width,
          height,
          length,
          isFragile,
          needsCooling,
          pickupDate,
          pickupTimeWindow,
          deliveryDate,
          deliveryTimeWindow,
          isFlexible,
          suggestedPrice,
          isNegotiable,
          tags: tags || [],
          notes,
          client: {
            connect: { id: clientId },
          },
          viewCount: 0,
          applicationsCount: 0,
        },
      });

      // Récupérer l'annonce créée avec ses relations
      const announcement = await this.getById(newAnnouncement.id);

      // Créer une entrée dans l'audit log pour suivre la création
      await AuditService.createAuditLog(
        'announcement',
        announcement.id,
        'CREATE',
        clientId,
        null,
        announcement
      );

      return announcement;
    } catch (error) {
      console.error("Erreur lors de la création de l'annonce:", error);
      throw new Error("Erreur lors de la création de l'annonce");
    }
  },

  /**
   * Met à jour une annonce existante
   */
  async update(id: string, data: UpdateAnnouncementInput, userId: string) {
    try {
      // Récupérer l'annonce existante
      const existingAnnouncement = await this.getById(id);

      if (!existingAnnouncement) {
        throw new Error('Annonce non trouvée');
      }

      // Vérifier que l'utilisateur est le propriétaire de l'annonce
      if (existingAnnouncement.clientId !== userId) {
        throw new Error("Vous n'êtes pas autorisé à modifier cette annonce");
      }

      // Vérifier que l'annonce peut être modifiée
      if (
        existingAnnouncement.status !== AnnouncementStatus.DRAFT &&
        existingAnnouncement.status !== AnnouncementStatus.PENDING
      ) {
        throw new Error('Impossible de modifier une annonce qui a déjà été publiée ou assignée');
      }

      // Exclure l'ID de l'objet de mise à jour
      const { id: idToIgnore, ...updateData } = data;

      // Mettre à jour l'annonce
      await db.announcement.update({
        where: { id },
        data: updateData as any,
      });

      // Récupérer l'annonce mise à jour
      const updatedAnnouncement = await this.getById(id);

      // Créer une entrée dans l'audit log pour suivre la modification
      await AuditService.createAuditLog(
        'announcement',
        id,
        'UPDATE',
        userId,
        existingAnnouncement,
        updatedAnnouncement
      );

      return updatedAnnouncement;
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'annonce:", error);
      throw new Error("Erreur lors de la mise à jour de l'annonce");
    }
  },

  /**
   * Supprime une annonce
   */
  async delete(id: string, userId: string) {
    try {
      // Récupérer l'annonce existante
      const announcement = await this.getById(id);

      if (!announcement) {
        throw new Error('Annonce non trouvée');
      }

      // Vérifier l'autorisation (seul le client propriétaire ou un admin peut supprimer)
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { admin: true },
      });

      if (announcement.clientId !== userId && !user?.admin) {
        throw new Error("Vous n'êtes pas autorisé à supprimer cette annonce");
      }

      // Vérifier si l'annonce est supprimable
      if (
        announcement.status === AnnouncementStatus.IN_PROGRESS ||
        announcement.status === AnnouncementStatus.ASSIGNED
      ) {
        throw new Error('Une annonce en cours ne peut pas être supprimée');
      }

      // Créer une entrée dans l'audit log avant suppression
      await AuditService.createAuditLog('announcement', id, 'DELETE', userId, announcement, null);

      // Transaction pour supprimer l'annonce et ses candidatures
      await db.$transaction(async (tx: any) => {
        // Supprimer d'abord les candidatures associées
        await tx.deliveryApplication.deleteMany({
          where: { announcementId: id },
        });

        // Supprimer l'annonce
        await tx.announcement.delete({
          where: { id },
        });
      });

      return { success: true, message: 'Annonce supprimée avec succès' };
    } catch (error) {
      console.error("Erreur lors de la suppression de l'annonce:", error);
      throw new Error("Erreur lors de la suppression de l'annonce");
    }
  },

  /**
   * Ajoute une candidature pour une annonce
   */
  async applyForAnnouncement(
    announcementId: string,
    delivererId: string,
    data: { proposedPrice?: number; message?: string }
  ) {
    try {
      // Vérifier si l'annonce existe
      const announcement = await this.getById(announcementId);

      if (!announcement) {
        throw new Error('Annonce non trouvée');
      }

      // Vérifier si l'annonce est ouverte aux candidatures
      if (
        announcement.status !== AnnouncementStatus.PUBLISHED &&
        announcement.status !== AnnouncementStatus.PENDING
      ) {
        throw new Error("Cette annonce n'accepte plus de candidatures");
      }

      // Vérifier si l'utilisateur est un livreur
      const user = await db.user.findUnique({
        where: { id: delivererId },
        include: { deliverer: true },
      });

      if (!user || !user.deliverer) {
        throw new Error('Seuls les livreurs peuvent postuler aux annonces');
      }

      // Vérifier si le livreur a déjà postulé
      const existingApplication = await db.deliveryApplication.findFirst({
        where: {
          announcementId,
          delivererId,
        },
      });

      if (existingApplication) {
        throw new Error('Vous avez déjà postulé pour cette annonce');
      }

      // Créer la candidature et mettre à jour le compteur en une transaction
      const application = await db.$transaction(async (tx: any) => {
        const app = await tx.deliveryApplication.create({
          data: {
            announcementId,
            delivererId,
            proposedPrice: data.proposedPrice,
            message: data.message,
            status: 'PENDING',
          },
          include: {
            announcement: true,
            deliverer: true,
          },
        });

        // Mettre à jour le compteur de candidatures
        await tx.announcement.update({
          where: { id: announcementId },
          data: {
            applicationsCount: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        return app;
      });

      // Créer une entrée dans l'audit log
      await AuditService.createAuditLog(
        'announcement',
        announcementId,
        'APPLICATION_ADDED',
        delivererId,
        { applicationsCount: announcement.applicationsCount },
        { applicationsCount: announcement.applicationsCount + 1 }
      );

      return application;
    } catch (error) {
      console.error('Erreur lors de la candidature:', error);
      throw new Error('Erreur lors de la candidature');
    }
  },

  /**
   * Met à jour le statut d'une candidature
   */
  async updateApplicationStatus(applicationId: string, status: string, userId: string) {
    try {
      // Récupérer la candidature
      const application = await db.deliveryApplication.findUnique({
        where: { id: applicationId },
        include: { announcement: true },
      });

      if (!application) {
        throw new Error('Candidature non trouvée');
      }

      // Vérifier l'autorisation (seul le client propriétaire peut accepter/refuser)
      if (application.announcement.clientId !== userId) {
        throw new Error("Vous n'êtes pas autorisé à modifier cette candidature");
      }

      // Transaction pour mettre à jour le statut et gérer les effets secondaires
      const updatedApplication = await db.$transaction(async (tx: any) => {
        // Mettre à jour le statut de la candidature
        const updated = await tx.deliveryApplication.update({
          where: { id: applicationId },
          data: { status },
          include: {
            announcement: true,
            deliverer: true,
          },
        });

        // Si la candidature est acceptée
        if (status === 'ACCEPTED') {
          // Mettre à jour l'annonce
          await tx.announcement.update({
            where: { id: application.announcementId },
            data: {
              status: AnnouncementStatus.ASSIGNED,
              delivererId: application.delivererId,
              updatedAt: new Date(),
            },
          });

          // Refuser automatiquement les autres candidatures
          await tx.deliveryApplication.updateMany({
            where: {
              announcementId: application.announcementId,
              id: { not: applicationId },
            },
            data: {
              status: 'REJECTED',
              updatedAt: new Date(),
            },
          });
        }

        return updated;
      });

      // Créer une entrée dans l'audit log
      await AuditService.createAuditLog(
        'announcement',
        application.announcementId,
        'APPLICATION_STATUS_UPDATED',
        userId,
        { applicationId, oldStatus: application.status },
        { applicationId, newStatus: status }
      );

      // Si la candidature a été acceptée, créer un autre log pour le changement de statut
      if (status === 'ACCEPTED') {
        await AuditService.createAuditLog(
          'announcement',
          application.announcementId,
          'STATUS_CHANGED',
          userId,
          { status: application.announcement.status },
          { status: AnnouncementStatus.ASSIGNED }
        );
      }

      return updatedApplication;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de la candidature:', error);
      throw new Error('Erreur lors de la mise à jour du statut de la candidature');
    }
  },

  /**
   * Publie une annonce (changement de statut)
   */
  async publishAnnouncement(id: string, userId: string) {
    try {
      // Récupérer l'annonce
      const announcement = await this.getById(id);

      if (!announcement) {
        throw new Error('Annonce non trouvée');
      }

      // Vérifier l'autorisation
      if (announcement.clientId !== userId) {
        throw new Error("Vous n'êtes pas autorisé à publier cette annonce");
      }

      // Vérifier si l'annonce est en brouillon ou en attente
      if (
        announcement.status !== AnnouncementStatus.DRAFT &&
        announcement.status !== AnnouncementStatus.PENDING
      ) {
        throw new Error('Seules les annonces en brouillon ou en attente peuvent être publiées');
      }

      // Publier l'annonce
      await db.announcement.update({
        where: { id },
        data: {
          status: AnnouncementStatus.PUBLISHED,
          updatedAt: new Date(),
        },
      });

      // Récupérer l'annonce mise à jour
      const updatedAnnouncement = await this.getById(id);

      // Créer une entrée dans l'audit log
      await AuditService.createAuditLog(
        'announcement',
        id,
        'STATUS_CHANGED',
        userId,
        { status: announcement.status },
        { status: AnnouncementStatus.PUBLISHED }
      );

      return updatedAnnouncement;
    } catch (error) {
      console.error("Erreur lors de la publication de l'annonce:", error);
      throw new Error("Erreur lors de la publication de l'annonce");
    }
  },

  /**
   * Marque une annonce comme complétée
   */
  async completeAnnouncement(id: string, userId: string) {
    try {
      // Récupérer l'annonce
      const announcement = await this.getById(id);

      if (!announcement) {
        throw new Error('Annonce non trouvée');
      }

      // Vérifier l'autorisation (client ou livreur assigné)
      if (announcement.clientId !== userId && announcement.delivererId !== userId) {
        throw new Error("Vous n'êtes pas autorisé à marquer cette annonce comme complétée");
      }

      // Vérifier si l'annonce est en cours
      if (announcement.status !== AnnouncementStatus.IN_PROGRESS) {
        throw new Error('Seules les annonces en cours peuvent être marquées comme complétées');
      }

      // Compléter l'annonce
      await db.announcement.update({
        where: { id },
        data: {
          status: AnnouncementStatus.COMPLETED,
          updatedAt: new Date(),
        },
      });

      // Récupérer l'annonce mise à jour
      const updatedAnnouncement = await this.getById(id);

      // Créer une entrée dans l'audit log
      await AuditService.createAuditLog(
        'announcement',
        id,
        'STATUS_CHANGED',
        userId,
        { status: announcement.status },
        { status: AnnouncementStatus.COMPLETED }
      );

      return updatedAnnouncement;
    } catch (error) {
      console.error("Erreur lors de la complétion de l'annonce:", error);
      throw new Error("Erreur lors de la complétion de l'annonce");
    }
  },
};
