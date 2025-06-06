import { db } from '../db';
import { TRPCError } from '@trpc/server';
import {
  DeliveryStatus,
  DocumentVerificationStatus,
  ApplicationStatus,
  MatchingStatus,
  RequiredDocumentType,
} from '@prisma/client';
import type {
  DeliveryFilters,
  DeliveryStatusUpdate,
  DeliveryCoordinatesInput,
  DeliveryConfirmation,
  DeliveryRatingInput,
} from '@/types/delivery';
import { NotificationService } from './notification.service';

export const DeliveryService = {
  /**
   * Récupère les statistiques de livraisons
   */
  async getStats(startDate: Date, endDate: Date) {
    try {
      const [
        totalDeliveries,
        pendingDeliveries,
        inProgressDeliveries,
        completedDeliveries,
        cancelledDeliveries,
      ] = await Promise.all([
        db.delivery.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        db.delivery.count({
          where: {
            status: DeliveryStatus.PENDING,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        db.delivery.count({
          where: {
            status: { in: [DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT] },
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        db.delivery.count({
          where: {
            status: DeliveryStatus.DELIVERED,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        db.delivery.count({
          where: {
            status: DeliveryStatus.CANCELLED,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
      ]);

      return {
        totalDeliveries,
        pendingDeliveries,
        inProgressDeliveries,
        completedDeliveries,
        cancelledDeliveries,
        completionRate: totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0,
        timeRange: { startDate, endDate },
      };
    } catch (error) {
      console.error('Erreur dans getStats:', error);
      throw error;
    }
  },

  /**
   * Récupère toutes les livraisons avec filtres
   */
  async getAll(filters: DeliveryFilters, userId: string, userRole: string) {
    const where: any = {};

    // Filtrage par rôle utilisateur
    if (userRole === 'DELIVERER') {
      where.delivererId = userId;
    } else if (userRole === 'CLIENT') {
      where.clientId = userId;
    }

    // Application des filtres
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }
    if (filters.search) {
      where.OR = [
        { trackingCode: { contains: filters.search, mode: 'insensitive' } },
        { announcement: { title: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    return await db.delivery.findMany({
      where,
      include: {
        announcement: {
          select: {
            title: true,
            pickupAddress: true,
            deliveryAddress: true,
            pickupDate: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            client: {
              select: { phone: true },
            },
          },
        },
        deliverer: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            deliverer: {
              select: { phone: true },
            },
          },
        },
        coordinates: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Récupère une livraison par ID avec détails complets
   */
  async getById(id: string, userId: string, userRole: string) {
    const delivery = await db.delivery.findUnique({
      where: { id },
      include: {
        announcement: true,
        client: {
          include: { client: true },
        },
        deliverer: {
          include: { deliverer: true },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
        },
        coordinates: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
        proofs: true,
        ratings: true,
      },
    });

    if (!delivery) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Livraison introuvable' });
    }

    // Vérification des permissions
    if (userRole !== 'ADMIN' && delivery.clientId !== userId && delivery.delivererId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    return delivery;
  },

  /**
   * Assigne automatiquement une livraison au livreur le plus proche
   */
  async assignDelivery(announcementId: string) {
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: { proposals: { include: { deliverer: { include: { profile: true } } } } },
    });

    if (!announcement) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Annonce introuvable' });
    }

    // Logique d'assignment intelligent (proximité, évaluations, disponibilité)
    const bestDeliverer = await this.findBestDeliverer(announcement);

    if (!bestDeliverer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Aucun livreur disponible' });
    }

    const delivery = await db.delivery.create({
      data: {
        announcementId,
        delivererId: bestDeliverer.id,
        clientId: announcement.clientId,
        status: DeliveryStatus.PENDING,
        trackingCode: this.generateTrackingCode(),
        price: announcement.price,
      },
    });

    // Notification au livreur
    await NotificationService.sendToUser(bestDeliverer.id, {
      title: 'Nouvelle livraison assignée',
      body: `Livraison ${delivery.trackingCode} vous a été assignée`,
      data: { deliveryId: delivery.id, type: 'DELIVERY_ASSIGNED' },
    });

    return delivery;
  },

  /**
   * Met à jour le statut d'une livraison avec géolocalisation
   */
  async updateStatus(statusUpdate: DeliveryStatusUpdate, userId: string) {
    const delivery = await db.delivery.findUnique({
      where: { id: statusUpdate.deliveryId },
      include: { client: true, deliverer: true },
    });

    if (!delivery) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Livraison introuvable' });
    }

    if (delivery.delivererId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seul le livreur assigné peut modifier le statut',
      });
    }

    // Transaction pour mise à jour atomique
    const result = await db.$transaction(async tx => {
      // Mise à jour du statut
      const updatedDelivery = await tx.delivery.update({
        where: { id: statusUpdate.deliveryId },
        data: {
          status: statusUpdate.status,
          ...(statusUpdate.status === DeliveryStatus.PICKED_UP && { startTime: new Date() }),
          ...(statusUpdate.status === DeliveryStatus.DELIVERED && { completionTime: new Date() }),
        },
      });

      // Ajout du log
      await tx.deliveryLog.create({
        data: {
          deliveryId: statusUpdate.deliveryId,
          status: statusUpdate.status,
          message: statusUpdate.comment || `Statut mis à jour: ${statusUpdate.status}`,
          location: statusUpdate.location
            ? `${statusUpdate.location.latitude},${statusUpdate.location.longitude}`
            : null,
        },
      });

      // Enregistrement des coordonnées si fournies
      if (statusUpdate.location) {
        await tx.deliveryCoordinates.create({
          data: {
            deliveryId: statusUpdate.deliveryId,
            latitude: statusUpdate.location.latitude,
            longitude: statusUpdate.location.longitude,
          },
        });
      }

      return updatedDelivery;
    });

    // Notification au client
    await NotificationService.sendToUser(delivery.clientId, {
      title: 'Mise à jour de livraison',
      body: `Votre livraison ${delivery.trackingCode} : ${statusUpdate.status}`,
      data: { deliveryId: delivery.id, status: statusUpdate.status },
    });

    return result;
  },

  /**
   * Enregistre les coordonnées GPS du livreur en temps réel
   */
  async updateCoordinates(coordinates: DeliveryCoordinatesInput, userId: string) {
    const delivery = await db.delivery.findUnique({
      where: { id: coordinates.deliveryId },
    });

    if (!delivery) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Livraison introuvable' });
    }

    if (delivery.delivererId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    return await db.deliveryCoordinates.create({
      data: {
        deliveryId: coordinates.deliveryId,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
    });
  },

  /**
   * Valide le code de livraison pour confirmer la réception
   */
  async validateDeliveryCode(confirmation: DeliveryConfirmation, userId: string) {
    const delivery = await db.delivery.findUnique({
      where: { id: confirmation.deliveryId },
      include: { announcement: true },
    });

    if (!delivery) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Livraison introuvable' });
    }

    // Vérification du code (généré côté client lors de la création)
    const expectedCode = delivery.announcement.confirmationCode;
    if (confirmation.confirmationCode !== expectedCode) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Code de confirmation invalide' });
    }

    // Mise à jour du statut
    const confirmedDelivery = await db.delivery.update({
      where: { id: confirmation.deliveryId },
      data: {
        status: DeliveryStatus.DELIVERED,
        completionTime: new Date(),
      },
    });

    // Enregistrement de la preuve si fournie
    if (confirmation.proofType && confirmation.proofUrl) {
      await db.deliveryProof.create({
        data: {
          deliveryId: confirmation.deliveryId,
          type: confirmation.proofType,
          fileUrl: confirmation.proofUrl,
        },
      });
    }

    return confirmedDelivery;
  },

  /**
   * Trouve le meilleur livreur pour une annonce
   */
  async findBestDeliverer(announcement: any) {
    // Logique complexe d'assignment basée sur :
    // - Proximité géographique
    // - Évaluations du livreur
    // - Disponibilité
    // - Historique des livraisons
    const availableDeliverers = await db.user.findMany({
      where: {
        role: 'DELIVERER',
        isActive: true,
        verificationStatus: 'VERIFIED',
      },
      include: {
        profile: true,
        delivererDeliveries: {
          where: { status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] } },
        },
      },
    });

    // Filtre les livreurs non surchargés (max 3 livraisons actives)
    const eligibleDeliverers = availableDeliverers.filter(
      deliverer => deliverer.delivererDeliveries.length < 3
    );

    // Retourne le premier éligible (à améliorer avec un algorithme de scoring)
    return eligibleDeliverers[0] || null;
  },

  /**
   * Génère un code de suivi unique
   */
  generateTrackingCode(): string {
    return (
      'ECO' +
      Date.now().toString(36).toUpperCase() +
      Math.random().toString(36).substr(2, 3).toUpperCase()
    );
  },

  /**
   * Évalue une livraison
   */
  async rateDelivery(rating: DeliveryRatingInput, userId: string) {
    const delivery = await db.delivery.findUnique({
      where: { id: rating.deliveryId },
    });

    if (!delivery) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Livraison introuvable' });
    }

    if (delivery.status !== DeliveryStatus.DELIVERED) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'La livraison doit être terminée pour être évaluée',
      });
    }

    // Détermine qui évalue qui
    const isClientRating = delivery.clientId === userId;
    const targetId = isClientRating ? delivery.delivererId : delivery.clientId;

    return await db.deliveryRating.create({
      data: {
        deliveryId: rating.deliveryId,
        ratedById: userId,
        targetId,
        rating: rating.rating,
        comment: rating.comment,
      },
    });
  },

  // ===== GESTION PROFIL LIVREUR =====

  /**
   * Récupère le profil complet d'un livreur avec documents
   */
  async getDelivererProfile(delivererId: string, requesterId?: string) {
    const deliverer = await db.user.findUnique({
      where: { id: delivererId, role: 'DELIVERER' },
      include: {
        profile: true,
        stats: true,
        schedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
        routes: {
          where: { isActive: true },
          include: {
            zones: true,
          },
        },
        availabilities: {
          where: {
            endDate: { gte: new Date() },
          },
          orderBy: { startDate: 'asc' },
        },
        preferences: true,
        delivererDeliveries: {
          where: {
            status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
          },
          include: {
            announcement: {
              select: { title: true, pickupAddress: true, deliveryAddress: true },
            },
          },
        },
      },
    });

    if (!deliverer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Livreur introuvable' });
    }

    return deliverer;
  },

  /**
   * Met à jour le profil d'un livreur
   */
  async updateDelivererProfile(delivererId: string, profileData: any, userId: string) {
    // Vérification des permissions
    if (delivererId !== userId) {
      const requester = await db.user.findUnique({ where: { id: userId } });
      if (requester?.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
      }
    }

    return await db.$transaction(async tx => {
      // Mise à jour du profil principal
      if (profileData.profile) {
        await tx.userProfile.update({
          where: { userId: delivererId },
          data: profileData.profile,
        });
      }

      // Mise à jour des préférences
      if (profileData.preferences) {
        await tx.delivererPreferences.upsert({
          where: { delivererId },
          create: {
            delivererId,
            ...profileData.preferences,
          },
          update: profileData.preferences,
        });
      }

      return await this.getDelivererProfile(delivererId);
    });
  },

  /**
   * Upload et validation des documents du livreur
   */
  async uploadDelivererDocument(delivererId: string, documentData: any, userId: string) {
    // Vérification des permissions
    if (delivererId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    // Créer une application fictive pour les documents du profil
    let application = await db.deliveryApplication.findFirst({
      where: { delivererId, announcementId: 'profile-documents' },
    });

    if (!application) {
      // Créer une application générique pour les documents du profil
      application = await db.deliveryApplication.create({
        data: {
          delivererId,
          announcementId: 'profile-documents', // ID spécial pour les documents de profil
          status: ApplicationStatus.PENDING,
          verificationStatus: DocumentVerificationStatus.PENDING,
        },
      });
    }

    return await db.$transaction(async tx => {
      // Calculer la version suivante
      const lastVersion = await tx.applicationDocument.findFirst({
        where: {
          applicationId: application.id,
          documentType: documentData.type,
        },
        orderBy: { version: 'desc' },
      });

      const newVersion = (lastVersion?.version || 0) + 1;

      // Créer le nouveau document
      const document = await tx.applicationDocument.create({
        data: {
          applicationId: application.id,
          documentType: documentData.type,
          documentUrl: documentData.url,
          status: DocumentVerificationStatus.PENDING,
          uploadedAt: new Date(),
          expiryDate: documentData.expiryDate,
          version: newVersion,
          fileSize: documentData.fileSize,
          mimeType: documentData.mimeType,
          checksum: documentData.checksum,
          previousVersionId: lastVersion?.id,
        },
      });

      // Créer l'audit log
      await tx.documentValidationAudit.create({
        data: {
          documentId: document.id,
          previousStatus: DocumentVerificationStatus.PENDING,
          newStatus: DocumentVerificationStatus.PENDING,
          actionBy: userId,
          actionType: 'UPLOAD',
          notes: `Document uploadé - version ${newVersion}`,
          automated: false,
        },
      });

      return document;
    });
  },

  /**
   * Récupère tous les documents d'un livreur avec historique
   */
  async getDelivererDocuments(delivererId: string, userId: string) {
    // Vérification des permissions
    if (delivererId !== userId) {
      const requester = await db.user.findUnique({ where: { id: userId } });
      if (requester?.role !== 'ADMIN') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
      }
    }

    const application = await db.deliveryApplication.findFirst({
      where: { delivererId, announcementId: 'profile-documents' },
      include: {
        requiredDocuments: {
          include: {
            auditLogs: {
              include: {
                actor: { select: { profile: { select: { firstName: true, lastName: true } } } },
              },
              orderBy: { createdAt: 'desc' },
            },
            verifier: {
              select: { profile: { select: { firstName: true, lastName: true } } },
            },
          },
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!application) {
      return [];
    }

    // Grouper par type de document pour avoir la dernière version
    const documentsByType = new Map();
    application.requiredDocuments.forEach(doc => {
      const existing = documentsByType.get(doc.documentType);
      if (!existing || doc.version > existing.version) {
        documentsByType.set(doc.documentType, doc);
      }
    });

    return Array.from(documentsByType.values());
  },

  /**
   * Validation automatique des documents avec OCR
   */
  async autoValidateDocument(documentId: string) {
    const document = await db.applicationDocument.findUnique({
      where: { id: documentId },
      include: { application: true },
    });

    if (!document) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Document introuvable' });
    }

    // Simulation de validation automatique (à remplacer par vrai OCR/AI)
    const validationScore = Math.random() * 100;
    const validationFlags = [];

    // Règles de validation basiques
    if (document.fileSize && document.fileSize > 10 * 1024 * 1024) {
      validationFlags.push('FILE_TOO_LARGE');
    }

    if (!document.mimeType?.includes('image') && !document.mimeType?.includes('pdf')) {
      validationFlags.push('INVALID_FILE_TYPE');
    }

    // Vérification de l'expiration
    if (document.expiryDate && document.expiryDate < new Date()) {
      validationFlags.push('DOCUMENT_EXPIRED');
    }

    const autoValidated = validationScore > 80 && validationFlags.length === 0;
    const newStatus = autoValidated
      ? DocumentVerificationStatus.APPROVED
      : DocumentVerificationStatus.PENDING;

    return await db.$transaction(async tx => {
      // Mettre à jour le document
      const updatedDocument = await tx.applicationDocument.update({
        where: { id: documentId },
        data: {
          autoValidated,
          validationScore,
          validationFlags,
          status: newStatus,
          ...(autoValidated && { verifiedAt: new Date(), verifiedBy: 'system' }),
        },
      });

      // Créer l'audit log
      await tx.documentValidationAudit.create({
        data: {
          documentId,
          previousStatus: document.status,
          newStatus,
          actionBy: 'system',
          actionType: autoValidated ? 'AUTO_APPROVE' : 'AUTO_REVIEW',
          notes: `Validation automatique - Score: ${validationScore}`,
          automated: true,
          validationData: { score: validationScore, flags: validationFlags },
          confidence: validationScore / 100,
        },
      });

      // Notification si validation réussie
      if (autoValidated) {
        await NotificationService.sendToUser(document.application.delivererId, {
          title: 'Document approuvé automatiquement',
          body: `Votre document ${document.documentType} a été validé automatiquement`,
          data: { documentId, type: 'DOCUMENT_AUTO_APPROVED' },
        });
      }

      return updatedDocument;
    });
  },

  /**
   * Validation admin des documents livreur
   */
  async validateDelivererDocument(documentId: string, validation: any, adminId: string) {
    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (admin?.role !== 'ADMIN') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Seuls les admins peuvent valider' });
    }

    const document = await db.applicationDocument.update({
      where: { id: documentId },
      data: {
        status: validation.status,
        verifiedAt: new Date(),
        verifiedBy: adminId,
        rejectionReason: validation.rejectionReason,
      },
      include: {
        application: {
          include: { deliverer: true },
        },
      },
    });

    // Notification au livreur
    await NotificationService.sendToUser(document.application.delivererId, {
      title: validation.status === 'APPROVED' ? 'Document approuvé' : 'Document rejeté',
      body: `Votre document ${document.documentType} a été ${validation.status === 'APPROVED' ? 'approuvé' : 'rejeté'}`,
      data: { documentId: document.id, status: validation.status },
    });

    return document;
  },

  // ===== SYSTÈME DE ROUTES ET MATCHING =====

  /**
   * Créer une route personnalisée pour un livreur
   */
  async createDelivererRoute(delivererId: string, routeData: any, userId: string) {
    if (delivererId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    return await db.$transaction(async tx => {
      const route = await tx.delivererRoute.create({
        data: {
          delivererId,
          name: routeData.name,
          description: routeData.description,
          priority: routeData.priority || 1,
          estimatedDuration: routeData.estimatedDuration,
          maxDeliveries: routeData.maxDeliveries || 5,
          vehicleType: routeData.vehicleType,
          trafficFactor: routeData.trafficFactor || 1.0,
          weatherSensitive: routeData.weatherSensitive || false,
          preferredTimeSlots: routeData.preferredTimeSlots || [],
          dayPreferences: routeData.dayPreferences || [1, 2, 3, 4, 5], // Lundi à Vendredi par défaut
        },
      });

      // Ajouter les zones géographiques
      if (routeData.zones && routeData.zones.length > 0) {
        await tx.deliveryZone.createMany({
          data: routeData.zones.map((zone: any) => ({
            routeId: route.id,
            centerLatitude: zone.latitude,
            centerLongitude: zone.longitude,
            radiusKm: zone.radius,
            cityName: zone.cityName,
            postalCodes: zone.postalCodes || [],
            isPreferred: zone.isPreferred || false,
            trafficLevel: zone.trafficLevel || 'NORMAL',
            parkingDifficulty: zone.parkingDifficulty || 'EASY',
            accessNotes: zone.accessNotes,
            timeRestrictions: zone.timeRestrictions || [],
            vehicleRestrictions: zone.vehicleRestrictions || [],
            weatherSensitive: zone.weatherSensitive || false,
          })),
        });
      }

      return await tx.delivererRoute.findUnique({
        where: { id: route.id },
        include: { zones: true },
      });
    });
  },

  /**
   * Optimise automatiquement les routes d'un livreur
   */
  async optimizeDelivererRoutes(delivererId: string) {
    const deliverer = await db.user.findUnique({
      where: { id: delivererId },
      include: {
        routes: {
          include: {
            zones: true,
            statistics: {
              where: {
                date: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
                },
              },
            },
          },
        },
        delivererDeliveries: {
          where: {
            status: DeliveryStatus.DELIVERED,
            completionTime: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            announcement: true,
          },
        },
      },
    });

    if (!deliverer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Livreur introuvable' });
    }

    // Analyser les performances des routes existantes
    const routeAnalysis = [];
    for (const route of deliverer.routes) {
      const stats = route.statistics;
      const avgEarnings = stats.reduce((sum, s) => sum + s.totalEarnings, 0) / (stats.length || 1);
      const avgTime = stats.reduce((sum, s) => sum + (s.averageTime || 0), 0) / (stats.length || 1);
      const successRate =
        stats.reduce((sum, s) => sum + (s.onTimeRate || 0), 0) / (stats.length || 1);

      routeAnalysis.push({
        routeId: route.id,
        name: route.name,
        efficiency: avgEarnings / (avgTime || 1), // Gains par minute
        successRate,
        totalDeliveries: stats.reduce((sum, s) => sum + s.completedDeliveries, 0),
        recommendation: this.generateRouteRecommendation(avgEarnings, avgTime, successRate),
      });
    }

    // Identifier les zones populaires non couvertes
    const popularZones = await this.findPopularDeliveryZones(deliverer.delivererDeliveries);
    const uncoveredZones = popularZones.filter(
      zone =>
        !deliverer.routes.some(route =>
          route.zones.some(
            rzone =>
              this.calculateDistanceSync(
                zone.lat,
                zone.lng,
                rzone.centerLatitude,
                rzone.centerLongitude
              ) <= rzone.radiusKm
          )
        )
    );

    return {
      currentRoutes: routeAnalysis,
      uncoveredOpportunities: uncoveredZones,
      recommendations: this.generateOptimizationRecommendations(routeAnalysis, uncoveredZones),
    };
  },

  /**
   * Suggestions de routes intelligentes basées sur l'historique
   */
  async getRoutesSuggestions(delivererId: string) {
    const recentDeliveries = await db.delivery.findMany({
      where: {
        delivererId,
        status: DeliveryStatus.DELIVERED,
        completionTime: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 derniers jours
        },
      },
      include: {
        announcement: true,
      },
    });

    // Analyser les patterns de livraisons
    const deliveryPatterns = this.analyzeDeliveryPatterns(recentDeliveries);

    // Générer des suggestions basées sur les patterns
    const suggestions = [];
    for (const pattern of deliveryPatterns) {
      if (pattern.frequency >= 3) {
        // Au moins 3 livraisons dans cette zone
        const suggestion = {
          from: pattern.mostCommonPickup,
          to: pattern.mostCommonDelivery,
          estimatedEarnings: pattern.averageEarnings,
          estimatedTime: pattern.averageTime,
          frequency: pattern.frequency,
          successRate: pattern.successRate,
          bestTimeSlots: pattern.bestTimeSlots,
          priority: this.calculateSuggestionPriority(pattern),
        };
        suggestions.push(suggestion);
      }
    }

    return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5);
  },

  /**
   * Met à jour les statistiques d'une route après livraison
   */
  async updateRouteStatistics(deliveryId: string) {
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        announcement: true,
        deliverer: {
          include: {
            routes: {
              include: { zones: true },
            },
          },
        },
      },
    });

    if (!delivery || delivery.status !== DeliveryStatus.DELIVERED) {
      return;
    }

    // Trouver la route correspondante
    const matchingRoute = delivery.deliverer.routes.find(route =>
      route.zones.some(
        zone =>
          this.calculateDistanceSync(
            delivery.announcement.pickupLatitude!,
            delivery.announcement.pickupLongitude!,
            zone.centerLatitude,
            zone.centerLongitude
          ) <= zone.radiusKm
      )
    );

    if (!matchingRoute) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculer les métriques
    const deliveryTime =
      delivery.completionTime && delivery.startTime
        ? (delivery.completionTime.getTime() - delivery.startTime.getTime()) / (1000 * 60)
        : null;

    await db.routeStatistics.upsert({
      where: {
        routeId_date: {
          routeId: matchingRoute.id,
          date: today,
        },
      },
      create: {
        routeId: matchingRoute.id,
        date: today,
        totalDeliveries: 1,
        completedDeliveries: 1,
        averageTime: deliveryTime,
        totalDistance: 0, // À calculer avec GPS
        totalEarnings: delivery.price,
        dayOfWeek: today.getDay(),
      },
      update: {
        totalDeliveries: { increment: 1 },
        completedDeliveries: { increment: 1 },
        totalEarnings: { increment: delivery.price },
      },
    });

    // Mettre à jour les stats de la route
    await db.delivererRoute.update({
      where: { id: matchingRoute.id },
      data: {
        completedDeliveries: { increment: 1 },
        lastUsed: new Date(),
      },
    });
  },

  /**
   * Calcule le matching score pour une annonce et un livreur
   */
  async calculateMatchingScore(announcementId: string, delivererId: string) {
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
    });

    const deliverer = await db.user.findUnique({
      where: { id: delivererId },
      include: {
        stats: true,
        routes: {
          include: { zones: true },
        },
        availabilities: {
          where: {
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
            isAvailable: true,
          },
        },
        preferences: true,
      },
    });

    if (!announcement || !deliverer) {
      return null;
    }

    let totalScore = 0;
    let distanceScore = 0;
    let ratingScore = 0;
    let availabilityScore = 0;
    let preferenceScore = 0;

    // 1. Score de distance (30%)
    const distance = await this.calculateDistance(
      announcement.pickupLatitude!,
      announcement.pickupLongitude!,
      deliverer.availabilities[0]?.currentLat || 0,
      deliverer.availabilities[0]?.currentLng || 0
    );

    distanceScore = Math.max(0, 100 - distance * 2); // 2 points par km

    // 2. Score d'évaluation (25%)
    ratingScore = (deliverer.stats?.averageRating || 3) * 20; // Sur 100

    // 3. Score de disponibilité (20%)
    availabilityScore = deliverer.availabilities.length > 0 ? 100 : 0;

    // 4. Score de préférence (15%)
    const hasPreferredType = deliverer.preferences?.preferredTypes.includes(announcement.type);
    preferenceScore = hasPreferredType ? 100 : 50;

    // 5. Score de route (10%)
    const isInRoute = await this.isAnnouncementInRoute(announcement, deliverer.routes);
    const routeScore = isInRoute ? 100 : 30;

    // Calcul du score final pondéré
    totalScore =
      distanceScore * 0.3 +
      ratingScore * 0.25 +
      availabilityScore * 0.2 +
      preferenceScore * 0.15 +
      routeScore * 0.1;

    // Enregistrer le résultat du matching
    await db.announcementMatching.upsert({
      where: {
        announcementId_delivererId: {
          announcementId,
          delivererId,
        },
      },
      create: {
        announcementId,
        delivererId,
        matchingScore: totalScore,
        distanceScore,
        ratingScore,
        availabilityScore,
        preferenceScore,
        distance,
        estimatedTime: Math.round(distance * 2), // 2 min par km
        isInRoute,
        isAvailable: availabilityScore > 0,
      },
      update: {
        matchingScore: totalScore,
        distanceScore,
        ratingScore,
        availabilityScore,
        preferenceScore,
        distance,
        estimatedTime: Math.round(distance * 2),
        isInRoute,
        isAvailable: availabilityScore > 0,
        updatedAt: new Date(),
      },
    });

    return {
      totalScore,
      distanceScore,
      ratingScore,
      availabilityScore,
      preferenceScore,
      distance,
      isInRoute,
    };
  },

  /**
   * Trouve les meilleurs matchs pour une annonce
   */
  async findBestMatches(announcementId: string, limit: number = 5) {
    // Récupérer tous les livreurs actifs
    const deliverers = await db.user.findMany({
      where: {
        role: 'DELIVERER',
        isActive: true,
        verificationStatus: 'VERIFIED',
      },
    });

    // Calculer le score pour chaque livreur
    const matchingPromises = deliverers.map(deliverer =>
      this.calculateMatchingScore(announcementId, deliverer.id)
    );

    await Promise.all(matchingPromises);

    // Récupérer les meilleurs matchs
    return await db.announcementMatching.findMany({
      where: {
        announcementId,
        matchingScore: { gte: 60 }, // Score minimum
      },
      include: {
        deliverer: {
          include: {
            profile: true,
            stats: true,
          },
        },
      },
      orderBy: { matchingScore: 'desc' },
      take: limit,
    });
  },

  // ===== GESTION PLANNING ET DISPONIBILITÉS =====

  /**
   * Met à jour le planning hebdomadaire d'un livreur
   */
  async updateDelivererSchedule(delivererId: string, schedules: any[], userId: string) {
    if (delivererId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    return await db.$transaction(async tx => {
      // Supprimer l'ancien planning
      await tx.delivererSchedule.deleteMany({
        where: { delivererId },
      });

      // Créer le nouveau planning
      if (schedules.length > 0) {
        await tx.delivererSchedule.createMany({
          data: schedules.map(schedule => ({
            delivererId,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isAvailable: schedule.isAvailable,
            maxDeliveries: schedule.maxDeliveries || 3,
            isRecurring: schedule.isRecurring ?? true,
            breakStart: schedule.breakStart,
            breakEnd: schedule.breakEnd,
            timeSlots: schedule.timeSlots || 4,
            preferredZones: schedule.preferredZones || [],
          })),
        });
      }

      return await tx.delivererSchedule.findMany({
        where: { delivererId },
        include: { exceptions: true },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  },

  /**
   * Ajoute une exception au planning (congés, indisponibilité)
   */
  async addScheduleException(delivererId: string, exceptionData: any, userId: string) {
    if (delivererId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    const schedule = await db.delivererSchedule.findFirst({
      where: {
        delivererId,
        dayOfWeek: new Date(exceptionData.date).getDay(),
      },
    });

    if (!schedule) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Planning non trouvé pour ce jour' });
    }

    return await db.scheduleException.create({
      data: {
        scheduleId: schedule.id,
        date: new Date(exceptionData.date),
        isAvailable: exceptionData.isAvailable,
        startTime: exceptionData.startTime,
        endTime: exceptionData.endTime,
        reason: exceptionData.reason,
      },
    });
  },

  /**
   * Récupère le planning optimisé d'un livreur avec suggestions
   */
  async getOptimizedSchedule(delivererId: string, startDate: Date, endDate: Date) {
    const [schedule, exceptions, recentStats] = await Promise.all([
      db.delivererSchedule.findMany({
        where: { delivererId },
        include: { exceptions: true },
        orderBy: { dayOfWeek: 'asc' },
      }),
      db.scheduleException.findMany({
        where: {
          schedule: { delivererId },
          date: { gte: startDate, lte: endDate },
        },
      }),
      db.routeStatistics.findMany({
        where: {
          route: { delivererId },
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        include: { route: true },
      }),
    ]);

    // Analyser les créneaux les plus rentables
    const profitableTimeSlots = this.analyzeProfitableTimeSlots(recentStats);

    // Générer des suggestions d'optimisation
    const optimizationSuggestions = [];
    for (const daySchedule of schedule) {
      const dayStats = recentStats.filter(s => s.dayOfWeek === daySchedule.dayOfWeek);
      const avgEarnings =
        dayStats.reduce((sum, s) => sum + s.totalEarnings, 0) / (dayStats.length || 1);

      if (avgEarnings < 50) {
        // Seuil configurable
        optimizationSuggestions.push({
          day: daySchedule.dayOfWeek,
          type: 'LOW_EARNINGS',
          suggestion: 'Envisager de modifier les créneaux horaires',
          potentialImprovement: profitableTimeSlots[daySchedule.dayOfWeek] || null,
        });
      }
    }

    return {
      schedule,
      exceptions,
      optimizationSuggestions,
      profitableTimeSlots,
      weeklyEarningsProjection: this.calculateWeeklyProjection(schedule, recentStats),
    };
  },

  /**
   * Met à jour la disponibilité temps réel d'un livreur
   */
  async updateDelivererAvailability(delivererId: string, availabilityData: any, userId: string) {
    if (delivererId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
    }

    return await db.delivererAvailability.upsert({
      where: { delivererId },
      create: {
        delivererId,
        startDate: availabilityData.startDate || new Date(),
        endDate: availabilityData.endDate || new Date(Date.now() + 8 * 60 * 60 * 1000), // 8h par défaut
        isAvailable: availabilityData.isAvailable,
        reason: availabilityData.reason,
        currentLat: availabilityData.latitude,
        currentLng: availabilityData.longitude,
      },
      update: {
        isAvailable: availabilityData.isAvailable,
        reason: availabilityData.reason,
        currentLat: availabilityData.latitude,
        currentLng: availabilityData.longitude,
        lastUpdate: new Date(),
      },
    });
  },

  /**
   * Récupère les livreurs disponibles dans une zone
   */
  async getAvailableDeliverersInArea(latitude: number, longitude: number, radiusKm: number = 10) {
    const availableDeliverers = await db.user.findMany({
      where: {
        role: 'DELIVERER',
        isActive: true,
        verificationStatus: 'VERIFIED',
        availabilities: {
          some: {
            isAvailable: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
      },
      include: {
        profile: true,
        stats: true,
        availabilities: {
          where: {
            isAvailable: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
        delivererDeliveries: {
          where: {
            status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
          },
        },
      },
    });

    // Filtrer par distance et charge de travail
    const filtered = [];
    for (const deliverer of availableDeliverers) {
      const availability = deliverer.availabilities[0];
      if (!availability?.currentLat || !availability?.currentLng) continue;

      const distance = await this.calculateDistance(
        latitude,
        longitude,
        availability.currentLat,
        availability.currentLng
      );

      if (distance <= radiusKm && deliverer.delivererDeliveries.length < 3) {
        filtered.push({
          ...deliverer,
          distance,
          currentLoad: deliverer.delivererDeliveries.length,
        });
      }
    }

    return filtered.sort((a, b) => a.distance - b.distance);
  },

  // ===== MÉTHODES POUR APP MOBILE =====

  /**
   * Dashboard mobile pour livreur
   */
  async getMobileDelivererDashboard(delivererId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [activeDeliveries, todayDeliveries, stats, notifications] = await Promise.all([
      // Livraisons actives
      db.delivery.findMany({
        where: {
          delivererId,
          status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
        },
        include: {
          announcement: {
            select: {
              title: true,
              pickupAddress: true,
              deliveryAddress: true,
              pickupDate: true,
            },
          },
          coordinates: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Livraisons du jour
      db.delivery.count({
        where: {
          delivererId,
          createdAt: { gte: today, lt: tomorrow },
        },
      }),

      // Statistiques
      db.delivererStats.findUnique({
        where: { delivererId },
      }),

      // Notifications non lues
      db.delivererNotification.count({
        where: {
          delivererId,
          status: 'SENT',
          readAt: null,
        },
      }),
    ]);

    return {
      activeDeliveries,
      todayDeliveries,
      stats,
      unreadNotifications: notifications,
      earnings: {
        today: 0, // À calculer selon la logique métier
        week: 0,
        month: 0,
      },
    };
  },

  /**
   * Accepter/Refuser une proposition de livraison
   */
  async respondToDeliveryProposal(
    matchingId: string,
    response: 'ACCEPTED' | 'DECLINED',
    delivererId: string
  ) {
    const matching = await db.announcementMatching.findUnique({
      where: { id: matchingId },
      include: { announcement: true },
    });

    if (!matching || matching.delivererId !== delivererId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Proposition introuvable' });
    }

    if (response === 'ACCEPTED') {
      // Créer la livraison
      const delivery = await db.delivery.create({
        data: {
          announcementId: matching.announcementId,
          delivererId,
          clientId: matching.announcement.clientId,
          status: DeliveryStatus.ACCEPTED,
          trackingCode: this.generateTrackingCode(),
          price: matching.announcement.suggestedPrice || 0,
        },
      });

      // Mettre à jour le matching
      await db.announcementMatching.update({
        where: { id: matchingId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });

      // Notification au client
      await NotificationService.sendToUser(matching.announcement.clientId, {
        title: 'Livreur trouvé !',
        body: `Un livreur a accepté votre annonce "${matching.announcement.title}"`,
        data: { deliveryId: delivery.id, announcementId: matching.announcementId },
      });

      return delivery;
    } else {
      // Refuser la proposition
      await db.announcementMatching.update({
        where: { id: matchingId },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
        },
      });

      return { success: true, message: 'Proposition refusée' };
    }
  },

  /**
   * Mise à jour de position en temps réel (pour app mobile)
   */
  async updateLiveLocation(delivererId: string, location: { latitude: number; longitude: number }) {
    // Mettre à jour la disponibilité
    await db.delivererAvailability.updateMany({
      where: {
        delivererId,
        isAvailable: true,
      },
      data: {
        currentLat: location.latitude,
        currentLng: location.longitude,
        lastUpdate: new Date(),
      },
    });

    // Mettre à jour les coordonnées des livraisons actives
    const activeDeliveries = await db.delivery.findMany({
      where: {
        delivererId,
        status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
      },
    });

    if (activeDeliveries.length > 0) {
      await db.deliveryCoordinates.createMany({
        data: activeDeliveries.map(delivery => ({
          deliveryId: delivery.id,
          latitude: location.latitude,
          longitude: location.longitude,
        })),
      });
    }

    return { success: true, updated: activeDeliveries.length };
  },

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Calcule la distance entre deux points GPS
   */
  async calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Vérifie si une annonce est dans les routes d'un livreur
   */
  async isAnnouncementInRoute(announcement: any, routes: any[]): Promise<boolean> {
    for (const route of routes) {
      for (const zone of route.zones) {
        const distance = await this.calculateDistance(
          announcement.pickupLatitude,
          announcement.pickupLongitude,
          zone.centerLatitude,
          zone.centerLongitude
        );
        if (distance <= zone.radiusKm) {
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Version synchrone du calcul de distance pour les boucles
   */
  calculateDistanceSync(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Analyse les patterns de livraisons pour suggestions de routes
   */
  analyzeDeliveryPatterns(deliveries: any[]) {
    const patterns = new Map();

    for (const delivery of deliveries) {
      const key = `${delivery.announcement.pickupCity}-${delivery.announcement.deliveryCity}`;

      if (!patterns.has(key)) {
        patterns.set(key, {
          mostCommonPickup: delivery.announcement.pickupAddress,
          mostCommonDelivery: delivery.announcement.deliveryAddress,
          frequency: 0,
          totalEarnings: 0,
          totalTime: 0,
          deliveries: [],
          timeSlots: [],
        });
      }

      const pattern = patterns.get(key);
      pattern.frequency++;
      pattern.totalEarnings += delivery.price;
      pattern.deliveries.push(delivery);

      if (delivery.completionTime && delivery.startTime) {
        const duration =
          (delivery.completionTime.getTime() - delivery.startTime.getTime()) / (1000 * 60);
        pattern.totalTime += duration;
      }

      // Analyser les créneaux horaires
      const hour = delivery.createdAt.getHours();
      pattern.timeSlots.push(hour);
    }

    // Calculer les moyennes et métriques finales
    return Array.from(patterns.values()).map(pattern => ({
      ...pattern,
      averageEarnings: pattern.totalEarnings / pattern.frequency,
      averageTime: pattern.totalTime / pattern.frequency,
      successRate: 100, // À calculer selon la logique métier
      bestTimeSlots: this.findMostCommonTimeSlots(pattern.timeSlots),
    }));
  },

  /**
   * Trouve les créneaux horaires les plus communs
   */
  findMostCommonTimeSlots(timeSlots: number[]): string[] {
    const hourCounts = new Map();

    for (const hour of timeSlots) {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour}:00-${hour + 1}:00`);
  },

  /**
   * Calcule la priorité d'une suggestion de route
   */
  calculateSuggestionPriority(pattern: any): number {
    let priority = 0;

    // Fréquence (40%)
    priority += pattern.frequency * 10 * 0.4;

    // Rentabilité (35%)
    priority += (pattern.averageEarnings / 10) * 0.35;

    // Efficacité temps (25%)
    const efficiency = pattern.averageEarnings / (pattern.averageTime || 60);
    priority += efficiency * 25 * 0.25;

    return Math.min(100, priority);
  },

  /**
   * Génère une recommandation pour une route
   */
  generateRouteRecommendation(avgEarnings: number, avgTime: number, successRate: number): string {
    if (successRate < 80) {
      return 'Améliorer la ponctualité';
    } else if (avgEarnings < 40) {
      return 'Optimiser la rentabilité';
    } else if (avgTime > 90) {
      return 'Réduire les temps de trajet';
    } else {
      return 'Route performante';
    }
  },

  /**
   * Trouve les zones de livraison populaires
   */
  async findPopularDeliveryZones(deliveries: any[]) {
    const zoneCounts = new Map();

    for (const delivery of deliveries) {
      const key = `${delivery.announcement.deliveryCity}`;

      if (!zoneCounts.has(key)) {
        zoneCounts.set(key, {
          lat: delivery.announcement.deliveryLatitude,
          lng: delivery.announcement.deliveryLongitude,
          city: delivery.announcement.deliveryCity,
          count: 0,
          totalEarnings: 0,
        });
      }

      const zone = zoneCounts.get(key);
      zone.count++;
      zone.totalEarnings += delivery.price;
    }

    return Array.from(zoneCounts.values())
      .filter(zone => zone.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  },

  /**
   * Génère des recommandations d'optimisation
   */
  generateOptimizationRecommendations(routeAnalysis: any[], uncoveredZones: any[]): string[] {
    const recommendations = [];

    // Routes peu performantes
    const underperformingRoutes = routeAnalysis.filter(r => r.efficiency < 0.5);
    if (underperformingRoutes.length > 0) {
      recommendations.push('Revoir les routes peu rentables');
    }

    // Zones non couvertes
    if (uncoveredZones.length > 0) {
      recommendations.push(`Créer des routes pour ${uncoveredZones.length} zones populaires`);
    }

    // Routes trop chargées
    const overloadedRoutes = routeAnalysis.filter(r => r.totalDeliveries > 50);
    if (overloadedRoutes.length > 0) {
      recommendations.push('Diviser les routes surchargées');
    }

    return recommendations;
  },

  /**
   * Analyse les créneaux les plus rentables
   */
  analyzeProfitableTimeSlots(stats: any[]): Record<number, any> {
    const dayAnalysis: Record<number, any> = {};

    for (let day = 0; day < 7; day++) {
      const dayStats = stats.filter(s => s.dayOfWeek === day);

      if (dayStats.length > 0) {
        const bestEarnings = Math.max(...dayStats.map(s => s.totalEarnings));
        const bestStat = dayStats.find(s => s.totalEarnings === bestEarnings);

        dayAnalysis[day] = {
          bestTimeSlot: this.estimateTimeSlotFromStats(bestStat),
          averageEarnings: dayStats.reduce((sum, s) => sum + s.totalEarnings, 0) / dayStats.length,
          totalDeliveries: dayStats.reduce((sum, s) => sum + s.completedDeliveries, 0),
        };
      }
    }

    return dayAnalysis;
  },

  /**
   * Estime le créneau horaire à partir des statistiques
   */
  estimateTimeSlotFromStats(stat: any): string {
    // Logique simplifiée - à améliorer avec de vraies données temporelles
    const hours = [8, 12, 18]; // Heures de pointe typiques
    const randomHour = hours[Math.floor(Math.random() * hours.length)];
    return `${randomHour}:00-${randomHour + 2}:00`;
  },

  /**
   * Calcule la projection hebdomadaire des gains
   */
  calculateWeeklyProjection(schedule: any[], recentStats: any[]): number {
    let weeklyProjection = 0;

    for (const daySchedule of schedule) {
      if (daySchedule.isAvailable) {
        const dayStats = recentStats.filter(s => s.dayOfWeek === daySchedule.dayOfWeek);
        const avgDailyEarnings =
          dayStats.length > 0
            ? dayStats.reduce((sum, s) => sum + s.totalEarnings, 0) / dayStats.length
            : 30; // Valeur par défaut

        weeklyProjection += avgDailyEarnings;
      }
    }

    return weeklyProjection;
  },

  /**
   * Récupère les livraisons actives pour un utilisateur
   */
  async getActiveDeliveries(userId: string) {
    try {
      const where: any = {
        OR: [{ clientId: userId }, { delivererId: userId }],
        status: {
          in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'],
        },
      };

      const deliveries = await db.delivery.findMany({
        where,
        include: {
          announcement: {
            select: {
              title: true,
              pickupAddress: true,
              deliveryAddress: true,
              pickupDate: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              client: {
                select: { phone: true },
              },
            },
          },
          deliverer: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              deliverer: {
                select: { phone: true },
              },
            },
          },
          coordinates: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return deliveries;
    } catch (error) {
      console.error('Erreur getActiveDeliveries:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des livraisons actives',
      });
    }
  },
};
