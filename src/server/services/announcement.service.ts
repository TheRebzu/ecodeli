import { db } from '../db';
import {
  AnnouncementStatus,
  AnnouncementPriority,
  AnnouncementFilters,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  Announcement,
  GeoSearchParams,
} from '@/types/announcement';
import { Prisma } from '@prisma/client';
import { AuditService } from './audit.service';

/**
 * Calcule la distance en kilomètres entre deux points géographiques
 * en utilisant la formule de Haversine
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

  /**
   * Recherche des annonces à proximité d'un point géographique
   */
  async findNearby(params: GeoSearchParams) {
    const { latitude, longitude, radiusKm, limit = 10, offset = 0 } = params;

    try {
      // Récupérer toutes les annonces avec coordonnées
      const announcements = await db.announcement.findMany({
        where: {
          status: AnnouncementStatus.PUBLISHED,
          pickupLatitude: { not: null },
          pickupLongitude: { not: null },
          deliveryLatitude: { not: null },
          deliveryLongitude: { not: null },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Calculer la distance pour chaque annonce et filtrer
      const nearbyAnnouncements = announcements
        .map((announcement: any) => {
          // Distance du point de ramassage
          const pickupDistance = calculateDistance(
            latitude,
            longitude,
            announcement.pickupLatitude!,
            announcement.pickupLongitude!
          );

          // Distance du point de livraison
          const deliveryDistance = calculateDistance(
            latitude,
            longitude,
            announcement.deliveryLatitude!,
            announcement.deliveryLongitude!
          );

          // Prendre la distance la plus courte
          const distance = Math.min(pickupDistance, deliveryDistance);

          return {
            ...announcement,
            distance,
          };
        })
        .filter((announcement: any) => announcement.distance <= radiusKm)
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(offset, offset + limit);

      const totalCount = nearbyAnnouncements.length;

      return {
        announcements: nearbyAnnouncements,
        totalCount,
        pagination: {
          limit,
          offset,
          hasMore: offset + nearbyAnnouncements.length < totalCount,
        },
      };
    } catch (error) {
      console.error("Erreur lors de la recherche d'annonces à proximité:", error);
      throw new Error("Erreur lors de la recherche d'annonces à proximité");
    }
  },

  /**
   * Suggère des annonces compatibles avec les itinéraires d'un livreur
   */
  async suggestForDeliverer(delivererId: string) {
    try {
      // Récupérer les informations du livreur
      const deliverer = await db.deliverer.findUnique({
        where: { userId: delivererId },
      });

      if (!deliverer) {
        throw new Error('Livreur non trouvé');
      }

      // Récupérer les annonces assignées au livreur pour connaître ses itinéraires habituels
      const delivererAnnouncements = await db.announcement.findMany({
        where: {
          delivererId,
          status: {
            in: [
              AnnouncementStatus.ASSIGNED,
              AnnouncementStatus.IN_PROGRESS,
              AnnouncementStatus.COMPLETED,
            ],
          },
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });

      // Si le livreur n'a pas encore d'historique, retourner les annonces les plus récentes
      if (delivererAnnouncements.length === 0) {
        return await db.announcement.findMany({
          where: {
            status: AnnouncementStatus.PUBLISHED,
          },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        });
      }

      // Extraire les coordonnées des itinéraires précédents
      const routes = delivererAnnouncements.map(ann => ({
        pickupLat: ann.pickupLatitude,
        pickupLng: ann.pickupLongitude,
        deliveryLat: ann.deliveryLatitude,
        deliveryLng: ann.deliveryLongitude,
      }));

      // Calculer le centre approximatif des itinéraires précédents
      const avgCoordinates = routes.reduce(
        (acc, route) => {
          if (route.pickupLat && route.pickupLng && route.deliveryLat && route.deliveryLng) {
            acc.lat += (route.pickupLat + route.deliveryLat) / 2;
            acc.lng += (route.pickupLng + route.deliveryLng) / 2;
            acc.count += 1;
          }
          return acc;
        },
        { lat: 0, lng: 0, count: 0 }
      );

      // Si aucune coordonnée valide n'a été trouvée, retourner les annonces récentes
      if (avgCoordinates.count === 0) {
        return await db.announcement.findMany({
          where: {
            status: AnnouncementStatus.PUBLISHED,
          },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        });
      }

      const centerLat = avgCoordinates.lat / avgCoordinates.count;
      const centerLng = avgCoordinates.lng / avgCoordinates.count;

      // Chercher des annonces dans un rayon de 20km du centre
      return await this.findNearby({
        latitude: centerLat,
        longitude: centerLng,
        radiusKm: 20,
        limit: 10,
      });
    } catch (error) {
      console.error("Erreur lors de la suggestion d'annonces pour le livreur:", error);
      throw new Error("Erreur lors de la suggestion d'annonces");
    }
  },

  /**
   * Marque ou démarque une annonce comme favorite pour un livreur
   */
  async toggleFavorite(id: string, delivererId: string): Promise<{ isFavorite: boolean }> {
    try {
      // Vérifier que l'annonce existe
      const announcement = await db.announcement.findUnique({
        where: { id },
      });

      if (!announcement) {
        throw new Error('Annonce non trouvée');
      }

      // Vérifier si cette annonce est déjà en favoris pour ce livreur
      const existingFavorite = await db.delivererFavorite.findUnique({
        where: {
          delivererId_announcementId: {
            delivererId,
            announcementId: id,
          },
        },
      });

      if (existingFavorite) {
        // Supprimer des favoris
        await db.delivererFavorite.delete({
          where: {
            id: existingFavorite.id,
          },
        });
        return { isFavorite: false };
      } else {
        // Ajouter aux favoris
        await db.delivererFavorite.create({
          data: {
            delivererId,
            announcementId: id,
          },
        });
        return { isFavorite: true };
      }
    } catch (error) {
      console.error('Erreur lors de la modification des favoris:', error);
      throw new Error('Erreur lors de la modification des favoris');
    }
  },

  /**
   * Récupère les annonces favorites d'un livreur
   */
  async getFavorites(delivererId: string) {
    try {
      const favorites = await db.delivererFavorite.findMany({
        where: { delivererId },
        include: {
          announcement: {
            include: {
              client: {
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

      return favorites.map(fav => ({
        ...fav.announcement,
        isFavorite: true,
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des favoris:', error);
      throw new Error('Erreur lors de la récupération des favoris');
    }
  },

  /**
   * Accepte la proposition d'un livreur pour une annonce
   */
  async acceptDelivererProposal(announcementId: string, applicationId: string, clientId: string) {
    try {
      // Vérifier que l'annonce appartient au client
      const announcement = await db.announcement.findFirst({
        where: {
          id: announcementId,
          clientId,
        },
      });

      if (!announcement) {
        throw new Error("Annonce non trouvée ou vous n'êtes pas autorisé à la modifier");
      }

      // Vérifier que l'application existe
      const application = await db.deliveryApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application || application.announcementId !== announcementId) {
        throw new Error('Candidature non trouvée ou invalide');
      }

      // Mettre à jour le statut de l'annonce et assigner le livreur
      await db.announcement.update({
        where: { id: announcementId },
        data: {
          status: AnnouncementStatus.ASSIGNED,
          delivererId: application.delivererId,
          finalPrice: application.proposedPrice,
        },
      });

      // Mettre à jour le statut de l'application
      await db.deliveryApplication.update({
        where: { id: applicationId },
        data: {
          status: 'ACCEPTED',
        },
      });

      // Refuser automatiquement toutes les autres applications
      await db.deliveryApplication.updateMany({
        where: {
          announcementId,
          id: { not: applicationId },
        },
        data: {
          status: 'REJECTED',
        },
      });

      // Créer une notification pour le livreur
      await db.notification.create({
        data: {
          userId: application.delivererId,
          title: 'Proposition acceptée',
          message: `Votre proposition pour l'annonce "${announcement.title}" a été acceptée.`,
          type: 'ANNOUNCEMENT',
          read: false,
          metadata: {
            announcementId,
          },
        },
      });

      // Journaliser l'action
      await AuditService.log({
        action: 'DELIVERER_PROPOSAL_ACCEPTED',
        userId: clientId,
        details: {
          announcementId,
          applicationId,
          delivererId: application.delivererId,
        },
      });

      return {
        success: true,
        message: 'Proposition acceptée avec succès',
      };
    } catch (error) {
      console.error("Erreur lors de l'acceptation de la proposition:", error);
      throw new Error("Erreur lors de l'acceptation de la proposition");
    }
  },

  /**
   * Met à jour les coordonnées GPS d'une annonce
   */
  async updateGpsCoordinates(
    id: string,
    data: {
      pickupLatitude?: number;
      pickupLongitude?: number;
      deliveryLatitude?: number;
      deliveryLongitude?: number;
    }
  ) {
    try {
      // Vérifier que l'annonce existe
      const announcement = await db.announcement.findUnique({
        where: { id },
      });

      if (!announcement) {
        throw new Error('Annonce non trouvée');
      }

      // Mettre à jour les coordonnées
      await db.announcement.update({
        where: { id },
        data,
      });

      // Si toutes les coordonnées sont fournies, calculer la distance estimée
      if (
        data.pickupLatitude !== undefined &&
        data.pickupLongitude !== undefined &&
        data.deliveryLatitude !== undefined &&
        data.deliveryLongitude !== undefined
      ) {
        const distance = calculateDistance(
          data.pickupLatitude,
          data.pickupLongitude,
          data.deliveryLatitude,
          data.deliveryLongitude
        );

        // Estimer la durée (à environ 50 km/h en moyenne)
        const durationMinutes = Math.round((distance / 50) * 60);

        await db.announcement.update({
          where: { id },
          data: {
            estimatedDistance: distance,
            estimatedDuration: durationMinutes,
          },
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la mise à jour des coordonnées GPS:', error);
      throw new Error('Erreur lors de la mise à jour des coordonnées GPS');
    }
  },

  /**
   * Trouve les livreurs compatibles pour une annonce avec système de matching avancé
   */
  async findMatchingDeliverers(
    announcementId: string,
    filters: {
      maxDistance?: number;
      availableOnly?: boolean;
      minRating?: number;
      sortBy?: 'distance' | 'rating' | 'price' | 'experience';
      maxResults?: number;
    } = {}
  ) {
    try {
      const {
        maxDistance = 15, // Distance maximum en km
        availableOnly = true,
        minRating = 0,
        sortBy = 'distance',
        maxResults = 20,
      } = filters;

      // Récupérer l'annonce avec ses coordonnées
      const announcement = await db.announcement.findUnique({
        where: { id: announcementId },
      });

      if (!announcement) {
        throw new Error('Annonce non trouvée');
      }

      if (!announcement.pickupLatitude || !announcement.pickupLongitude) {
        throw new Error('Les coordonnées de collecte sont requises pour le matching');
      }

      // Construire la requête pour les livreurs
      const delivererFilters: any = {
        verification: {
          status: 'VERIFIED', // Seuls les livreurs vérifiés
        },
        user: {
          isActive: true,
          isEmailVerified: true,
        },
      };

      // Filtrer par disponibilité si requis
      if (availableOnly) {
        delivererFilters.isAvailable = true;
      }

      // Récupérer tous les livreurs potentiels
      const deliverers = await db.deliverer.findMany({
        where: delivererFilters,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          verification: true,
          // Inclure les évaluations pour calculer la note moyenne
          receivedRatings: {
            select: {
              rating: true,
            },
          },
          // Historique des livraisons pour calculer l'expérience
          assignedAnnouncements: {
            where: {
              status: 'COMPLETED',
            },
            select: {
              id: true,
              type: true,
              completedAt: true,
            },
          },
          // Applications en cours pour vérifier la charge de travail
          applications: {
            where: {
              status: 'PENDING',
            },
            select: {
              id: true,
            },
          },
        },
      });

      // Calculer le score et les métriques pour chaque livreur
      const scoredDeliverers = deliverers
        .map((deliverer: any) => {
          // Calculer la distance si les coordonnées du livreur sont disponibles
          let distance = null;
          if (deliverer.currentLatitude && deliverer.currentLongitude) {
            distance = calculateDistance(
              announcement.pickupLatitude!,
              announcement.pickupLongitude!,
              deliverer.currentLatitude,
              deliverer.currentLongitude
            );
          }

          // Calculer la note moyenne
          const ratings = deliverer.receivedRatings;
          const averageRating =
            ratings.length > 0
              ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
              : 0;

          // Calculer l'expérience (nombre de livraisons complétées)
          const experienceCount = deliverer.assignedAnnouncements.length;

          // Calculer l'expérience spécialisée (même type d'annonce)
          const specializedExperience = deliverer.assignedAnnouncements.filter(
            (ann: any) => ann.type === announcement.type
          ).length;

          // Calculer la charge de travail actuelle
          const currentWorkload = deliverer.applications.length;

          // Calculer un score de compatibilité global (0-100)
          let compatibilityScore = 0;

          // Score de distance (plus proche = meilleur)
          if (distance !== null) {
            const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
            compatibilityScore += distanceScore * 0.3; // 30% du score
          }

          // Score de rating (0-5 étoiles -> 0-100)
          const ratingScore = (averageRating / 5) * 100;
          compatibilityScore += ratingScore * 0.25; // 25% du score

          // Score d'expérience
          const experienceScore = Math.min(100, experienceCount * 5); // Max 100 à 20 livraisons
          compatibilityScore += experienceScore * 0.2; // 20% du score

          // Score d'expérience spécialisée
          const specializedScore = Math.min(100, specializedExperience * 10); // Max 100 à 10 livraisons du même type
          compatibilityScore += specializedScore * 0.15; // 15% du score

          // Score de disponibilité (moins de charge = meilleur)
          const availabilityScore = Math.max(0, 100 - currentWorkload * 10);
          compatibilityScore += availabilityScore * 0.1; // 10% du score

          return {
            id: deliverer.id,
            userId: deliverer.userId,
            user: deliverer.user,
            isAvailable: deliverer.isAvailable,
            currentLatitude: deliverer.currentLatitude,
            currentLongitude: deliverer.currentLongitude,
            vehicleType: deliverer.vehicleType,
            maxCapacity: deliverer.maxCapacity,
            distance,
            averageRating,
            totalRatings: ratings.length,
            experienceCount,
            specializedExperience,
            currentWorkload,
            compatibilityScore: Math.round(compatibilityScore),
            // Indicateurs de compatibilité
            isWithinRange: distance === null || distance <= maxDistance,
            meetsMilRating: averageRating >= minRating,
            canCarryWeight:
              !announcement.weight ||
              !deliverer.maxCapacity ||
              announcement.weight <= deliverer.maxCapacity,
            hasAvailableCapacity: currentWorkload < 3, // Max 3 demandes en cours
          };
        })
        .filter((deliverer: any) => {
          // Filtrer selon les critères
          return (
            deliverer.isWithinRange &&
            deliverer.meetsMilRating &&
            deliverer.canCarryWeight &&
            deliverer.hasAvailableCapacity
          );
        });

      // Trier selon le critère demandé
      const sortedDeliverers = scoredDeliverers.sort((a: any, b: any) => {
        switch (sortBy) {
          case 'distance':
            if (a.distance === null && b.distance === null) return 0;
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          case 'rating':
            return b.averageRating - a.averageRating;
          case 'experience':
            return b.experienceCount - a.experienceCount;
          case 'price':
            // Pour le prix, on pourrait implémenter un système de prix préférés
            return b.compatibilityScore - a.compatibilityScore;
          default:
            return b.compatibilityScore - a.compatibilityScore;
        }
      });

      // Limiter les résultats
      const finalResults = sortedDeliverers.slice(0, maxResults);

      return {
        matchingDeliverers: finalResults,
        totalMatches: finalResults.length,
        searchCriteria: {
          announcementId,
          maxDistance,
          availableOnly,
          minRating,
          sortBy,
        },
        matchingStats: {
          averageDistance:
            finalResults.reduce((sum: number, d: any) => sum + (d.distance || 0), 0) /
            finalResults.length,
          averageRating:
            finalResults.reduce((sum: number, d: any) => sum + d.averageRating, 0) /
            finalResults.length,
          averageExperience:
            finalResults.reduce((sum: number, d: any) => sum + d.experienceCount, 0) /
            finalResults.length,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la recherche de livreurs compatibles:', error);
      throw new Error('Erreur lors de la recherche de livreurs compatibles');
    }
  },

  /**
   * Notifie automatiquement les livreurs compatibles d'une nouvelle annonce
   */
  async notifyMatchingDeliverers(
    announcementId: string,
    options: {
      maxDeliverers?: number;
      onlyTopMatches?: boolean;
      minCompatibilityScore?: number;
    } = {}
  ) {
    try {
      const { maxDeliverers = 10, onlyTopMatches = true, minCompatibilityScore = 60 } = options;

      // Trouver les livreurs compatibles
      const matchingResult = await this.findMatchingDeliverers(announcementId, {
        maxResults: onlyTopMatches ? maxDeliverers : 50,
        sortBy: 'distance',
      });

      const announcement = await db.announcement.findUnique({
        where: { id: announcementId },
      });

      if (!announcement) {
        throw new Error('Annonce non trouvée');
      }

      // Filtrer par score de compatibilité minimum
      const eligibleDeliverers = matchingResult.matchingDeliverers
        .filter((deliverer: any) => deliverer.compatibilityScore >= minCompatibilityScore)
        .slice(0, maxDeliverers);

      // Créer les notifications
      const notifications = eligibleDeliverers.map((deliverer: any) => ({
        userId: deliverer.userId,
        title: 'Nouvelle opportunité de livraison',
        message: `Une nouvelle annonce "${announcement.title}" correspond à votre profil. Score de compatibilité: ${deliverer.compatibilityScore}%`,
        type: 'ANNOUNCEMENT_MATCH',
        read: false,
        metadata: {
          announcementId,
          compatibilityScore: deliverer.compatibilityScore,
          distance: deliverer.distance,
          estimatedEarnings: announcement.suggestedPrice,
        },
      }));

      if (notifications.length > 0) {
        await db.notification.createMany({
          data: notifications,
        });
      }

      // Journaliser l'action
      await AuditService.createAuditLog(
        'announcement',
        announcementId,
        'DELIVERERS_NOTIFIED',
        announcement.clientId,
        null,
        {
          notifiedCount: notifications.length,
          totalMatches: matchingResult.totalMatches,
          minCompatibilityScore,
        }
      );

      return {
        success: true,
        notifiedDeliverers: notifications.length,
        totalMatches: matchingResult.totalMatches,
        eligibleDeliverers: eligibleDeliverers.map((d: any) => ({
          id: d.id,
          name: d.user.name,
          compatibilityScore: d.compatibilityScore,
          distance: d.distance,
        })),
      };
    } catch (error) {
      console.error('Erreur lors de la notification des livreurs:', error);
      throw new Error('Erreur lors de la notification des livreurs');
    }
  },

  /**
   * Suggère un prix optimal basé sur les données historiques et la demande
   */
  async suggestOptimalPrice(announcementData: {
    type: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    weight?: number;
    priority: string;
  }) {
    try {
      // Calculer la distance si les coordonnées sont fournies
      let distance = 0;
      if (
        announcementData.pickupLatitude &&
        announcementData.pickupLongitude &&
        announcementData.deliveryLatitude &&
        announcementData.deliveryLongitude
      ) {
        distance = calculateDistance(
          announcementData.pickupLatitude,
          announcementData.pickupLongitude,
          announcementData.deliveryLatitude,
          announcementData.deliveryLongitude
        );
      }

      // Récupérer les annonces similaires complétées dans les 3 derniers mois
      const similarAnnouncements = await db.announcement.findMany({
        where: {
          type: announcementData.type,
          status: 'COMPLETED',
          finalPrice: { not: null },
          completedAt: {
            gte: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000), // 3 mois
          },
        },
        select: {
          finalPrice: true,
          estimatedDistance: true,
          weight: true,
          priority: true,
        },
      });

      if (similarAnnouncements.length === 0) {
        // Prix de base par défaut selon le type
        const basePrices: Record<string, number> = {
          PACKAGE_DELIVERY: 8,
          GROCERY_SHOPPING: 12,
          PERSON_TRANSPORT: 15,
          AIRPORT_TRANSFER: 25,
          FOREIGN_PURCHASE: 20,
          PET_CARE: 18,
          HOME_SERVICES: 25,
        };

        const basePrice = basePrices[announcementData.type] || 10;
        const distancePrice = distance * 0.8; // 0.8€ par km
        const weightMultiplier = announcementData.weight
          ? Math.min(1.5, 1 + announcementData.weight / 20)
          : 1;
        const priorityMultiplier =
          announcementData.priority === 'URGENT'
            ? 1.5
            : announcementData.priority === 'HIGH'
              ? 1.2
              : 1;

        const suggestedPrice = Math.round(
          (basePrice + distancePrice) * weightMultiplier * priorityMultiplier
        );

        return {
          suggestedPrice,
          priceRange: {
            min: Math.round(suggestedPrice * 0.8),
            max: Math.round(suggestedPrice * 1.3),
          },
          basedOn: 'DEFAULT_PRICING',
          confidence: 'LOW',
          factors: {
            basePrice,
            distancePrice,
            weightMultiplier,
            priorityMultiplier,
          },
        };
      }

      // Analyser les prix des annonces similaires
      const prices = similarAnnouncements.map(a => a.finalPrice!);
      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];

      // Ajustements selon la distance
      let distanceAdjustment = 1;
      if (distance > 0) {
        const avgDistance =
          similarAnnouncements
            .filter(a => a.estimatedDistance)
            .reduce((sum, a) => sum + a.estimatedDistance!, 0) /
          similarAnnouncements.filter(a => a.estimatedDistance).length;

        if (avgDistance > 0) {
          distanceAdjustment = distance / avgDistance;
        }
      }

      // Ajustements selon le poids
      let weightAdjustment = 1;
      if (announcementData.weight) {
        const avgWeight =
          similarAnnouncements.filter(a => a.weight).reduce((sum, a) => sum + a.weight!, 0) /
          similarAnnouncements.filter(a => a.weight).length;

        if (avgWeight > 0) {
          weightAdjustment = Math.min(1.5, announcementData.weight / avgWeight);
        }
      }

      // Ajustement selon la priorité
      const priorityMultiplier =
        announcementData.priority === 'URGENT'
          ? 1.3
          : announcementData.priority === 'HIGH'
            ? 1.15
            : 1;

      // Calculer le prix suggéré
      const basePrice = medianPrice; // Utiliser la médiane comme base
      const adjustedPrice = basePrice * distanceAdjustment * weightAdjustment * priorityMultiplier;
      const suggestedPrice = Math.round(adjustedPrice);

      // Calculer l'intervalle de confiance
      const priceStdDev = Math.sqrt(
        prices.reduce((sum, price) => sum + Math.pow(price - averagePrice, 2), 0) / prices.length
      );

      return {
        suggestedPrice,
        priceRange: {
          min: Math.round(Math.max(suggestedPrice - priceStdDev, suggestedPrice * 0.7)),
          max: Math.round(suggestedPrice + priceStdDev),
        },
        basedOn: 'HISTORICAL_DATA',
        confidence: similarAnnouncements.length >= 10 ? 'HIGH' : 'MEDIUM',
        sampleSize: similarAnnouncements.length,
        marketData: {
          averagePrice: Math.round(averagePrice),
          medianPrice: Math.round(medianPrice),
          priceRange: {
            min: Math.min(...prices),
            max: Math.max(...prices),
          },
        },
        adjustments: {
          distanceAdjustment,
          weightAdjustment,
          priorityMultiplier,
        },
      };
    } catch (error) {
      console.error('Erreur lors du calcul du prix optimal:', error);
      throw new Error('Erreur lors du calcul du prix optimal');
    }
  },

  /**
   * Analyse la demande actuelle pour un type d'annonce dans une zone géographique
   */
  async analyzeDemand(params: {
    type?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  }) {
    try {
      const { type, latitude, longitude, radiusKm = 10 } = params;

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Construire les filtres pour les annonces
      const baseFilters: any = {
        createdAt: { gte: oneMonthAgo },
      };

      if (type) {
        baseFilters.type = type;
      }

      // Récupérer les annonces pour l'analyse
      let announcements = await db.announcement.findMany({
        where: baseFilters,
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          pickupLatitude: true,
          pickupLongitude: true,
          applicationsCount: true,
          finalPrice: true,
        },
      });

      // Filtrer par zone géographique si les coordonnées sont fournies
      if (latitude && longitude) {
        announcements = announcements.filter(ann => {
          if (!ann.pickupLatitude || !ann.pickupLongitude) return false;
          const distance = calculateDistance(
            latitude,
            longitude,
            ann.pickupLatitude,
            ann.pickupLongitude
          );
          return distance <= radiusKm;
        });
      }

      // Séparer les données par période
      const recentAnnouncements = announcements.filter(ann => ann.createdAt >= oneWeekAgo);
      const completedAnnouncements = announcements.filter(ann => ann.status === 'COMPLETED');

      // Calculer les métriques
      const totalDemand = announcements.length;
      const recentDemand = recentAnnouncements.length;
      const completionRate =
        totalDemand > 0 ? (completedAnnouncements.length / totalDemand) * 100 : 0;

      const averageApplications =
        totalDemand > 0
          ? announcements.reduce((sum, ann) => sum + ann.applicationsCount, 0) / totalDemand
          : 0;

      const demandTrend =
        recentDemand >= (totalDemand - recentDemand) / 3 ? 'INCREASING' : 'STABLE';

      // Analyser la compétition (nombre d'applications moyen)
      let competitionLevel = 'LOW';
      if (averageApplications > 5) competitionLevel = 'HIGH';
      else if (averageApplications > 2) competitionLevel = 'MEDIUM';

      // Analyser les prix si disponibles
      const pricesData = completedAnnouncements
        .filter(ann => ann.finalPrice)
        .map(ann => ann.finalPrice!);

      let priceAnalysis = null;
      if (pricesData.length > 0) {
        const avgPrice = pricesData.reduce((sum, price) => sum + price, 0) / pricesData.length;
        const minPrice = Math.min(...pricesData);
        const maxPrice = Math.max(...pricesData);

        priceAnalysis = {
          averagePrice: Math.round(avgPrice),
          minPrice,
          maxPrice,
          sampleSize: pricesData.length,
        };
      }

      return {
        analysis: {
          totalDemand,
          recentDemand,
          demandTrend,
          completionRate: Math.round(completionRate),
          averageApplications: Math.round(averageApplications * 10) / 10,
          competitionLevel,
        },
        timeframe: {
          totalPeriodDays: 30,
          recentPeriodDays: 7,
        },
        geographicScope:
          latitude && longitude
            ? {
                centerLatitude: latitude,
                centerLongitude: longitude,
                radiusKm,
              }
            : null,
        priceAnalysis,
        recommendations: {
          optimal:
            completionRate > 80 && averageApplications > 3
              ? 'GOOD_MARKET'
              : completionRate < 50
                ? 'OVERSUPPLIED'
                : 'MODERATE_MARKET',
          suggestions: [
            completionRate < 50 ? 'Considérez réduire le prix pour attirer plus de livreurs' : null,
            averageApplications < 2
              ? 'Le marché semble peu compétitif, vous pourriez obtenir un bon prix'
              : null,
            demandTrend === 'INCREASING'
              ? 'La demande est en hausse, bon moment pour publier'
              : null,
          ].filter(Boolean),
        },
      };
    } catch (error) {
      console.error("Erreur lors de l'analyse de la demande:", error);
      throw new Error("Erreur lors de l'analyse de la demande");
    }
  },

  /**
   * Récupère les propositions pour une annonce (vue client)
   */
  async getProposalsForClient(announcementId: string, clientId: string) {
    try {
      // Vérifier que l'annonce appartient au client
      const announcement = await db.announcement.findFirst({
        where: {
          id: announcementId,
          clientId: clientId,
        },
      });

      if (!announcement) {
        throw new Error('Annonce non trouvée ou accès non autorisé');
      }

      // Récupérer toutes les propositions avec détails des livreurs
      const proposals = await db.delivererApplication.findMany({
        where: {
          announcementId: announcementId,
        },
        include: {
          deliverer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              receivedRatings: {
                select: {
                  rating: true,
                },
              },
              assignedAnnouncements: {
                where: {
                  status: 'COMPLETED',
                },
                select: {
                  id: true,
                },
              },
              verification: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Enrichir les propositions avec des métriques calculées
      const enrichedProposals = proposals.map((proposal: any) => {
        const deliverer = proposal.deliverer;

        // Calculer la note moyenne
        const ratings = deliverer.receivedRatings;
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
            : 0;

        // Calculer le nombre de livraisons complétées
        const completedDeliveries = deliverer.assignedAnnouncements.length;

        // Calculer la distance si les coordonnées sont disponibles
        let distance = null;
        if (
          announcement.pickupLatitude &&
          announcement.pickupLongitude &&
          deliverer.currentLatitude &&
          deliverer.currentLongitude
        ) {
          distance = calculateDistance(
            announcement.pickupLatitude,
            announcement.pickupLongitude,
            deliverer.currentLatitude,
            deliverer.currentLongitude
          );
        }

        // Calculer un score de compatibilité
        let compatibilityScore = 70; // Score de base

        // Bonus pour rating élevé
        compatibilityScore += (averageRating / 5) * 20;

        // Bonus pour expérience
        compatibilityScore += Math.min(10, completedDeliveries * 0.5);

        // Malus/bonus selon la distance
        if (distance !== null) {
          if (distance <= 5) compatibilityScore += 10;
          else if (distance <= 10) compatibilityScore += 5;
          else if (distance > 15) compatibilityScore -= 10;
        }

        // Bonus pour vérification
        if (deliverer.verification?.status === 'VERIFIED') {
          compatibilityScore += 5;
        }

        return {
          id: proposal.id,
          announcementId: proposal.announcementId,
          delivererId: proposal.delivererId,
          deliverer: {
            id: deliverer.id,
            name: deliverer.user.name,
            image: deliverer.user.image,
            rating: Math.round(averageRating * 10) / 10,
            completedDeliveries,
            averageResponseTime: deliverer.averageResponseTime || null,
            verificationStatus: deliverer.verification?.status || 'UNVERIFIED',
            transportMethods: deliverer.vehicleType ? [deliverer.vehicleType] : [],
          },
          status: proposal.status,
          proposedPrice: proposal.proposedPrice || announcement.suggestedPrice || 0,
          estimatedDeliveryTime: proposal.estimatedDeliveryTime,
          message: proposal.message || '',
          hasRequiredEquipment: proposal.hasRequiredEquipment || true,
          canPickupAtScheduledTime: proposal.canPickupAtScheduledTime || true,
          createdAt: proposal.createdAt,
          compatibilityScore: Math.min(100, Math.max(0, Math.round(compatibilityScore))),
          distance: distance ? Math.round(distance * 10) / 10 : null,
        };
      });

      return {
        proposals: enrichedProposals,
        total: enrichedProposals.length,
        pending: enrichedProposals.filter(p => p.status === 'PENDING').length,
        accepted: enrichedProposals.filter(p => p.status === 'ACCEPTED').length,
        rejected: enrichedProposals.filter(p => p.status === 'REJECTED').length,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des propositions:', error);
      throw error;
    }
  },

  /**
   * Accepte une proposition de livreur (action client)
   */
  async acceptProposal(announcementId: string, proposalId: string, clientId: string) {
    try {
      // Vérifier que l'annonce appartient au client
      const announcement = await db.announcement.findFirst({
        where: {
          id: announcementId,
          clientId: clientId,
        },
      });

      if (!announcement) {
        throw new Error('Annonce non trouvée ou accès non autorisé');
      }

      // Vérifier que la proposition existe et est en attente
      const proposal = await db.delivererApplication.findFirst({
        where: {
          id: proposalId,
          announcementId: announcementId,
          status: 'PENDING',
        },
        include: {
          deliverer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!proposal) {
        throw new Error('Proposition non trouvée ou déjà traitée');
      }

      // Transaction pour accepter la proposition et rejeter les autres
      const result = await db.$transaction(async tx => {
        // Accepter la proposition sélectionnée
        const acceptedProposal = await tx.delivererApplication.update({
          where: { id: proposalId },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        });

        // Rejeter toutes les autres propositions pour cette annonce
        await tx.delivererApplication.updateMany({
          where: {
            announcementId: announcementId,
            id: { not: proposalId },
            status: 'PENDING',
          },
          data: {
            status: 'REJECTED',
            rejectedAt: new Date(),
          },
        });

        // Mettre à jour le statut de l'annonce
        const updatedAnnouncement = await tx.announcement.update({
          where: { id: announcementId },
          data: {
            status: 'IN_PROGRESS',
            assignedDelivererId: proposal.delivererId,
            acceptedPrice: proposal.proposedPrice || announcement.suggestedPrice,
          },
        });

        // Créer la livraison associée
        const delivery = await tx.delivery.create({
          data: {
            announcementId: announcementId,
            delivererId: proposal.delivererId,
            clientId: clientId,
            status: 'PENDING_PICKUP',
            agreedPrice: proposal.proposedPrice || announcement.suggestedPrice || 0,
            pickupAddress: announcement.pickupAddress,
            pickupLatitude: announcement.pickupLatitude,
            pickupLongitude: announcement.pickupLongitude,
            deliveryAddress: announcement.deliveryAddress,
            deliveryLatitude: announcement.deliveryLatitude,
            deliveryLongitude: announcement.deliveryLongitude,
            estimatedDeliveryTime: proposal.estimatedDeliveryTime,
          },
        });

        return {
          acceptedProposal,
          updatedAnnouncement,
          delivery,
        };
      });

      return result;
    } catch (error) {
      console.error("Erreur lors de l'acceptation de la proposition:", error);
      throw error;
    }
  },

  /**
   * Rejette une proposition de livreur (action client)
   */
  async rejectProposal(
    announcementId: string,
    proposalId: string,
    clientId: string,
    reason?: string
  ) {
    try {
      // Vérifier que l'annonce appartient au client
      const announcement = await db.announcement.findFirst({
        where: {
          id: announcementId,
          clientId: clientId,
        },
      });

      if (!announcement) {
        throw new Error('Annonce non trouvée ou accès non autorisé');
      }

      // Vérifier que la proposition existe et est en attente
      const proposal = await db.delivererApplication.findFirst({
        where: {
          id: proposalId,
          announcementId: announcementId,
          status: 'PENDING',
        },
        include: {
          deliverer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!proposal) {
        throw new Error('Proposition non trouvée ou déjà traitée');
      }

      // Rejeter la proposition
      const rejectedProposal = await db.delivererApplication.update({
        where: { id: proposalId },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      });

      return rejectedProposal;
    } catch (error) {
      console.error('Erreur lors du rejet de la proposition:', error);
      throw error;
    }
  },

  /**
   * Récupère un résumé des propositions pour toutes les annonces d'un client
   */
  async getMyProposalsSummary(clientId: string) {
    try {
      const proposalsSummary = await db.delivererApplication.groupBy({
        by: ['announcementId', 'status'],
        where: {
          announcement: {
            clientId: clientId,
          },
        },
        _count: {
          id: true,
        },
      });

      // Organiser les données par annonce
      const summary: Record<
        string,
        { total: number; pending: number; accepted: number; rejected: number }
      > = {};

      proposalsSummary.forEach(item => {
        if (!summary[item.announcementId]) {
          summary[item.announcementId] = {
            total: 0,
            pending: 0,
            accepted: 0,
            rejected: 0,
          };
        }

        summary[item.announcementId].total += item._count.id;

        switch (item.status) {
          case 'PENDING':
            summary[item.announcementId].pending = item._count.id;
            break;
          case 'ACCEPTED':
            summary[item.announcementId].accepted = item._count.id;
            break;
          case 'REJECTED':
            summary[item.announcementId].rejected = item._count.id;
            break;
        }
      });

      return { proposalsSummary: summary };
    } catch (error) {
      console.error('Erreur lors de la récupération du résumé des propositions:', error);
      throw error;
    }
  },

  /**
   * Récupère les statistiques client
   */
  async getClientStats(clientId: string) {
    try {
      const [announcements, completedDeliveries, applications, payments] = await Promise.all([
        // Toutes les annonces du client
        db.announcement.findMany({
          where: { clientId },
          select: {
            id: true,
            status: true,
            suggestedPrice: true,
            acceptedPrice: true,
            createdAt: true,
          },
        }),

        // Livraisons complétées
        db.delivery.findMany({
          where: {
            clientId,
            status: 'COMPLETED',
          },
          select: {
            agreedPrice: true,
            completedAt: true,
            createdAt: true,
          },
        }),

        // Applications/propositions reçues
        db.delivererApplication.findMany({
          where: {
            announcement: {
              clientId,
            },
          },
          select: {
            id: true,
            status: true,
            announcementId: true,
          },
        }),

        // Paiements effectués
        db.payment.findMany({
          where: {
            clientId,
            status: 'COMPLETED',
          },
          select: {
            amount: true,
          },
        }),
      ]);

      // Calculer les statistiques
      const totalAnnouncements = announcements.length;
      const activeAnnouncements = announcements.filter(
        a => a.status === 'PUBLISHED' || a.status === 'IN_PROGRESS'
      ).length;
      const completedAnnouncementsCount = announcements.filter(
        a => a.status === 'COMPLETED'
      ).length;
      const totalSpent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalProposals = applications.length;
      const averageProposalsPerAnnouncement =
        totalAnnouncements > 0 ? totalProposals / totalAnnouncements : 0;

      // Calculer le temps moyen de livraison
      const deliveryTimes = completedDeliveries
        .filter(d => d.completedAt && d.createdAt)
        .map(
          d =>
            (new Date(d.completedAt!).getTime() - new Date(d.createdAt).getTime()) /
            (1000 * 60 * 60)
        ); // en heures

      const averageDeliveryTime =
        deliveryTimes.length > 0
          ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
          : 0;

      return {
        totalAnnouncements,
        activeAnnouncements,
        completedDeliveries: completedAnnouncementsCount,
        totalSpent,
        averageDeliveryTime: Math.round(averageDeliveryTime * 10) / 10,
        totalProposals,
        averageProposalsPerAnnouncement: Math.round(averageProposalsPerAnnouncement * 10) / 10,
        satisfactionScore: 0, // TODO: Implémenter système de satisfaction
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques client:', error);
      throw error;
    }
  },
};
