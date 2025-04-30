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
};
