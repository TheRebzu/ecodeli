import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db } from '@/server/db';
import {
  deliveryStatusEnumSchema,
  updateLocationSchema,
  updateDeliveryStatusSchema,
  createCheckpointSchema,
  updateETASchema,
  deliveryCoordinatesUpdateSchema,
} from '@/schemas/delivery/delivery-tracking.schema';
import { DeliveryStatus, UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { Coordinates, GeoPoint } from '@/types/delivery-tracking';
import {
  DeliveryConfirmationData,
  DeliveryIssueData,
  DeliveryTrackingData,
  DeliveryTrackingPositionData,
  DeliveryStatusHistoryData,
  DeliveryCheckpointData,
  TrackingQueryFilters,
} from '@/components/deliverer/deliveries/delivery-tracking';

// Fonctions utilitaires pour les calculs géographiques
const calculateDistance = (start: Coordinates, end: Coordinates): number => {
  // Formule de Haversine pour calculer la distance en mètres entre deux points GPS
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371e3; // Rayon de la terre en mètres
  const φ1 = toRad(start.latitude);
  const φ2 = toRad(end.latitude);
  const Δφ = toRad(end.latitude - start.latitude);
  const Δλ = toRad(end.longitude - start.longitude);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateETA = (distanceInMeters: number, speedInKmh: number): number => {
  // Calcule le temps d'arrivée estimé en minutes
  // Convertir vitesse en m/s
  const speedInMetersPerSecond = (speedInKmh * 1000) / 3600;
  const timeInSeconds = distanceInMeters / speedInMetersPerSecond;
  return timeInSeconds / 60; // Convertir en minutes
};

const geoPointToCoordinates = (geoPoint: GeoPoint): Coordinates => {
  return {
    latitude: geoPoint.coordinates[1],
    longitude: geoPoint.coordinates[0],
  };
};

const coordinatesToGeoPoint = (coordinates: Coordinates): GeoPoint => {
  return {
    type: 'Point',
    coordinates: [coordinates.longitude, coordinates.latitude],
  };
};

const isPointInRadius = (
  center: Coordinates,
  point: Coordinates,
  radiusInMeters: number
): boolean => {
  const distance = calculateDistance(center, point);
  return distance <= radiusInMeters;
};

// Fonction pour simuler l'émission de mises à jour WebSocket
const emitDeliveryUpdate = (deliveryId: string, update: any) => {
  // Dans un environnement de production, ceci serait implémenté avec Socket.IO, WS, ou Pusher
  console.log(`[WebSocket] Émission de mise à jour pour la livraison ${deliveryId}:`, update);
  return true;
};

// Fonction pour simuler l'envoi de notifications
const sendNotification = async ({
  userId,
  title,
  message,
  type,
  link,
  data,
}: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link: string;
  data?: Record<string, any>;
}) => {
  // Dans un environnement de production, ceci serait implémenté avec un service de notification
  console.log(`[Notification] Envoi à l'utilisateur ${userId}: ${title} - ${message}`);
  return true;
};

export const deliveryTrackingService = {
  /**
   * Met à jour la position GPS d'une livraison (appelé par le livreur)
   */
  async updateDeliveryLocation({
    userId,
    deliveryId,
    location,
    accuracy,
    heading,
    speed,
    altitude,
    metadata,
  }: {
    userId: string;
    deliveryId: string;
    location: GeoPoint;
    accuracy?: number;
    heading?: number;
    speed?: number;
    altitude?: number;
    metadata?: Record<string, any>;
  }) {
    // Valider les données avec Zod
    updateLocationSchema.parse({
      deliveryId,
      location,
      accuracy,
      heading,
      speed,
      altitude,
      metadata,
    });

    // Vérifier que l'utilisateur est bien le livreur assigné à cette livraison
    const delivery = await db.delivery.findFirst({
      where: {
        id: deliveryId,
        delivererId: userId,
      },
    });

    if (!delivery) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à mettre à jour cette livraison",
      });
    }

    if (!delivery.trackingEnabled) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Le suivi est désactivé pour cette livraison',
      });
    }

    // Créer un nouvel enregistrement de position
    const trackingPosition = await db.deliveryTrackingPosition.create({
      data: {
        deliveryId,
        location,
        accuracy,
        heading,
        speed,
        altitude,
        metadata,
      },
    });

    // S'assurer que le tracking est actif
    await db.deliveryTracking.upsert({
      where: {
        deliveryId_delivererId: {
          deliveryId: deliveryId,
          delivererId: userId,
        },
      },
      create: {
        deliveryId,
        delivererId: userId,
        isActive: true,
        startedAt: new Date(),
      },
      update: {
        isActive: true,
        lastUpdatedAt: new Date(),
      },
    });

    // Mettre à jour les coordonnées actuelles de la livraison
    await db.delivery.update({
      where: { id: deliveryId },
      data: {
        currentLat: location.coordinates[1], // latitude
        currentLng: location.coordinates[0], // longitude
        lastLocationUpdate: new Date(),
      },
    });

    // Vérifier si nous devons mettre à jour le statut (ex: arrivée à proximité)
    await this.checkAndUpdateStatusBasedOnLocation(userId, deliveryId, location);

    // Émettre une mise à jour en temps réel
    this.notifyDeliveryUpdate(deliveryId, {
      type: 'LOCATION_UPDATE',
      location,
      accuracy,
      heading,
      speed,
      timestamp: new Date(),
    });

    return trackingPosition;
  },

  /**
   * Vérifie et met à jour automatiquement le statut d'une livraison en fonction de la position
   */
  async checkAndUpdateStatusBasedOnLocation(
    userId: string,
    deliveryId: string,
    location: GeoPoint
  ) {
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) return null;

    // Si le livreur est à moins de 300m de la destination et statut IN_TRANSIT
    if (delivery.currentStatus === 'IN_TRANSIT') {
      // Convertir l'adresse de livraison en coordonnées (simulation)
      // Dans un cas réel, utiliser un service de géocodage
      const destinationCoords: Coordinates = {
        latitude: delivery.deliveryAddress ? parseFloat(delivery.deliveryAddress.split(',')[0]) : 0,
        longitude: delivery.deliveryAddress
          ? parseFloat(delivery.deliveryAddress.split(',')[1])
          : 0,
      };

      // Si on ne peut pas extraire les coordonnées, on ne fait rien
      if (destinationCoords.latitude === 0 && destinationCoords.longitude === 0) {
        return null;
      }

      const currentCoords = geoPointToCoordinates(location);

      if (isPointInRadius(destinationCoords, currentCoords, 300)) {
        // Si à moins de 300m, passer en NEARBY
        return this.updateDeliveryStatus({
          userId,
          deliveryId,
          status: 'NEARBY' as DeliveryStatus,
          location,
          notes: 'À proximité de la destination',
        });
      }
    }
    // Si le livreur est à moins de 50m de la destination et statut NEARBY
    else if (delivery.currentStatus === 'NEARBY') {
      const destinationCoords: Coordinates = {
        latitude: delivery.deliveryAddress ? parseFloat(delivery.deliveryAddress.split(',')[0]) : 0,
        longitude: delivery.deliveryAddress
          ? parseFloat(delivery.deliveryAddress.split(',')[1])
          : 0,
      };

      if (destinationCoords.latitude === 0 && destinationCoords.longitude === 0) {
        return null;
      }

      const currentCoords = geoPointToCoordinates(location);

      if (isPointInRadius(destinationCoords, currentCoords, 50)) {
        // Si à moins de 50m, passer en ARRIVED
        return this.updateDeliveryStatus({
          userId,
          deliveryId,
          status: 'ARRIVED' as DeliveryStatus,
          location,
          notes: 'Arrivé à la destination',
        });
      }
    }

    return null;
  },

  /**
   * Met à jour le statut d'une livraison
   */
  async updateDeliveryStatus({
    userId,
    deliveryId,
    status,
    previousStatus,
    location,
    notes,
    reason,
    notifyCustomer = true,
  }: {
    userId: string;
    deliveryId: string;
    status: DeliveryStatus;
    previousStatus?: DeliveryStatus;
    location?: GeoPoint;
    notes?: string;
    reason?: string;
    notifyCustomer?: boolean;
  }) {
    try {
      // Valider les données avec Zod
      updateDeliveryStatusSchema.parse({
        deliveryId,
        status,
        previousStatus,
        location,
        notes,
        reason,
        notifyCustomer,
      });

      // Vérifier si l'utilisateur a les droits pour cette action
      const delivery = await db.delivery.findUnique({
        where: { id: deliveryId },
        include: { client: true },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison non trouvée',
        });
      }

      // Vérifier que l'utilisateur est soit le livreur, soit l'admin
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { admin: true },
      });

      const isDeliverer = delivery.delivererId === userId;
      const isAdmin = user?.admin !== null;
      const isClient = delivery.clientId === userId;

      if (!isDeliverer && !isAdmin && !isClient) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à mettre à jour le statut de cette livraison",
        });
      }

      // Vérifier si la transition de statut est valide
      const currentStatus = delivery.currentStatus as DeliveryStatus;
      if (!previousStatus) {
        previousStatus = currentStatus;
      }

      if (!this.isValidStatusTransition(currentStatus, status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Transition de statut invalide: ${currentStatus} -> ${status}`,
        });
      }

      // Mise à jour du statut dans l'historique et sur la livraison
      const [updatedDelivery, statusHistory] = await db.$transaction([
        // Mettre à jour la livraison
        db.delivery.update({
          where: { id: deliveryId },
          data: {
            currentStatus: status,
            // Si le statut est ARRIVED, mettre à jour l'heure d'arrivée
            ...(status === 'ARRIVED' ? { actualArrival: new Date() } : {}),
          },
        }),

        // Ajouter une entrée dans l'historique
        db.deliveryStatusHistory.create({
          data: {
            deliveryId,
            status,
            previousStatus,
            timestamp: new Date(),
            updatedById: userId,
            location,
            notes,
            reason,
            customerNotified: false, // Sera mis à jour après la notification
          },
        }),
      ]);

      // Si le statut a changé pour DELIVERED, ajouter un checkpoint
      if (status === 'DELIVERED' && location) {
        await this.createDeliveryCheckpoint({
          deliveryId,
          userId,
          type: 'DELIVERY',
          location,
          address: delivery.deliveryAddress,
          notes: notes || 'Livraison effectuée',
        });
      }

      // Mise à jour du temps d'arrivée estimé si nécessaire
      if (status === 'IN_TRANSIT' || status === 'NEARBY') {
        await this.recalculateETA(deliveryId);
      }

      // Notifier le client
      if (notifyCustomer) {
        const notified = await this.notifyClient(deliveryId, status, notes);

        if (notified) {
          await db.deliveryStatusHistory.update({
            where: { id: statusHistory.id },
            data: {
              customerNotified: true,
              notificationSentAt: new Date(),
            },
          });
        }
      }

      // Émettre une mise à jour en temps réel
      this.notifyDeliveryUpdate(deliveryId, {
        type: 'STATUS_UPDATE',
        status,
        previousStatus,
        location,
        timestamp: new Date(),
        notes,
      });

      return {
        updatedDelivery,
        statusHistory,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la mise à jour du statut',
        cause: error,
      });
    }
  },

  /**
   * Vérifie si une transition de statut est valide
   */
  isValidStatusTransition(currentStatus: DeliveryStatus, newStatus: DeliveryStatus): boolean {
    // Définition des transitions valides
    const allowedTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      CREATED: ['ASSIGNED', 'CANCELLED'],
      ASSIGNED: ['PENDING_PICKUP', 'CANCELLED'],
      PENDING_PICKUP: ['PICKED_UP', 'CANCELLED'],
      PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
      IN_TRANSIT: ['NEARBY', 'CANCELLED'],
      NEARBY: ['ARRIVED', 'IN_TRANSIT', 'CANCELLED'],
      ARRIVED: ['ATTEMPT_DELIVERY', 'CANCELLED'],
      ATTEMPT_DELIVERY: ['DELIVERED', 'NOT_DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      NOT_DELIVERED: ['RESCHEDULED', 'RETURNED', 'CANCELLED'],
      RESCHEDULED: ['PENDING_PICKUP', 'CANCELLED'],
      RETURNED: ['CANCELLED'],
      CANCELLED: [],
    } as Record<DeliveryStatus, DeliveryStatus[]>;

    return allowedTransitions[currentStatus]?.includes(newStatus) || false;
  },

  /**
   * Récupère l'historique complet de suivi d'une livraison
   */
  async getDeliveryTrackingHistory({
    userId,
    deliveryId,
    includePositions = true,
    includeStatuses = true,
    includeCheckpoints = true,
    startDate,
    endDate,
    limit = 100,
  }: {
    userId: string;
    deliveryId: string;
    includePositions?: boolean;
    includeStatuses?: boolean;
    includeCheckpoints?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    // Vérifier si l'utilisateur a les droits pour voir cette livraison
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Livraison non trouvée',
      });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { admin: true },
    });

    const isInvolved = userId === delivery.clientId || userId === delivery.delivererId;
    const isAdmin = user?.admin !== null;

    if (!isInvolved && !isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à consulter cet historique",
      });
    }

    // Préparer les filtres de date
    const dateFilter = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };

    // Récupérer les données
    const [positions, statuses, checkpoints, eta] = await Promise.all([
      // Positions GPS
      includePositions
        ? db.deliveryTrackingPosition.findMany({
            where: {
              deliveryId,
              ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
            },
            orderBy: { timestamp: 'asc' },
            take: limit,
          })
        : Promise.resolve([]),

      // Historique des statuts
      includeStatuses
        ? db.deliveryStatusHistory.findMany({
            where: {
              deliveryId,
              ...(Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {}),
            },
            orderBy: { timestamp: 'asc' },
            include: {
              updatedBy: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          })
        : Promise.resolve([]),

      // Points de passage
      includeCheckpoints
        ? db.deliveryCheckpoint.findMany({
            where: {
              deliveryId,
              ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
            },
            orderBy: { createdAt: 'asc' },
            include: {
              completedByUser: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          })
        : Promise.resolve([]),

      // Estimation du temps d'arrivée
      db.deliveryETA.findUnique({
        where: { deliveryId },
      }),
    ]);

    return {
      delivery,
      positions,
      statuses,
      checkpoints,
      eta,
    };
  },

  /**
   * Recalcule le temps d'arrivée estimé d'une livraison
   */
  async recalculateETA(deliveryId: string) {
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery || !delivery.currentLat || !delivery.currentLng) {
      return null;
    }

    // Récupérer les dernières positions pour calculer la vitesse moyenne
    const recentPositions = await db.deliveryTrackingPosition.findMany({
      where: {
        deliveryId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 60 * 1000), // Dernières 30 minutes
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Calculer la vitesse moyenne si assez de points
    let averageSpeed = 30; // Valeur par défaut en km/h

    if (recentPositions.length >= 2) {
      const speeds = recentPositions
        .filter((pos: any) => pos.speed !== null && pos.speed !== undefined && pos.speed > 0)
        .map((pos: any) => pos.speed as number);

      if (speeds.length > 0) {
        averageSpeed =
          speeds.reduce((sum: number, speed: number) => sum + speed, 0) / speeds.length;
      }
    }

    // Extraire la destination des coordonnées (simulation)
    const destinationCoords: Coordinates = {
      latitude: delivery.deliveryAddress ? parseFloat(delivery.deliveryAddress.split(',')[0]) : 0,
      longitude: delivery.deliveryAddress ? parseFloat(delivery.deliveryAddress.split(',')[1]) : 0,
    };

    // Si on ne peut pas extraire, utiliser l'estimation par défaut
    if (destinationCoords.latitude === 0 && destinationCoords.longitude === 0) {
      // Utiliser la date de livraison prévue comme fallback
      const estimatedTime = delivery.deliveryDate || new Date(Date.now() + 30 * 60 * 1000);

      return this.updateETA({
        deliveryId,
        estimatedTime,
        calculationType: 'HISTORICAL',
        confidence: 0.5,
      });
    }

    // Calculer la distance restante
    const currentCoords: Coordinates = {
      latitude: delivery.currentLat,
      longitude: delivery.currentLng,
    };

    const distanceInMeters = calculateDistance(currentCoords, destinationCoords);
    const etaMinutes = calculateETA(distanceInMeters, averageSpeed);

    // Déterminer la condition de trafic
    let trafficCondition = 'MODERATE';
    if (averageSpeed > 40) trafficCondition = 'LIGHT';
    if (averageSpeed < 20) trafficCondition = 'HEAVY';

    // Calculer l'heure d'arrivée estimée
    const now = new Date();
    const estimatedTime = new Date(now.getTime() + etaMinutes * 60 * 1000);

    // Mettre à jour l'ETA
    return this.updateETA({
      deliveryId,
      estimatedTime,
      previousEstimate: delivery.estimatedArrival || undefined,
      distanceRemaining: distanceInMeters / 1000, // Convertir en km
      trafficCondition: trafficCondition,
      confidence: 0.8,
      calculationType: 'REAL_TIME',
    });
  },

  /**
   * Met à jour l'estimation du temps d'arrivée
   */
  async updateETA({
    deliveryId,
    estimatedTime,
    previousEstimate,
    distanceRemaining,
    trafficCondition,
    confidence,
    calculationType = 'REAL_TIME',
    metadata,
  }: {
    deliveryId: string;
    estimatedTime: Date;
    previousEstimate?: Date;
    distanceRemaining?: number;
    trafficCondition?: string;
    confidence?: number;
    calculationType?: string;
    metadata?: Record<string, any>;
  }) {
    // Valider les données
    updateETASchema.parse({
      deliveryId,
      estimatedTime,
      previousEstimate,
      distanceRemaining,
      trafficCondition,
      confidence,
      calculationType,
      metadata,
    });

    // Vérifier si la livraison existe
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Livraison non trouvée',
      });
    }

    // Mettre à jour ou créer l'ETA
    const eta = await db.deliveryETA.upsert({
      where: { deliveryId },
      create: {
        deliveryId,
        estimatedTime,
        previousEstimate,
        calculatedAt: new Date(),
        calculationType,
        distanceRemaining,
        trafficCondition,
        confidence,
        metadata,
      },
      update: {
        previousEstimate: delivery.estimatedArrival || previousEstimate,
        estimatedTime,
        calculatedAt: new Date(),
        calculationType,
        distanceRemaining,
        trafficCondition,
        confidence,
        metadata,
      },
    });

    // Mettre à jour la livraison
    await db.delivery.update({
      where: { id: deliveryId },
      data: {
        estimatedArrival: estimatedTime,
      },
    });

    // Notifier de la mise à jour de l'ETA
    this.notifyDeliveryUpdate(deliveryId, {
      type: 'ETA_UPDATE',
      estimatedTime,
      distanceRemaining,
      delay: previousEstimate
        ? Math.round((estimatedTime.getTime() - previousEstimate.getTime()) / 60000) // en minutes
        : undefined,
    });

    return eta;
  },

  /**
   * Crée un point de passage pour une livraison
   */
  async createDeliveryCheckpoint({
    deliveryId,
    userId,
    type,
    location,
    address,
    name,
    plannedTime,
    actualTime,
    notes,
    photoProofUrl,
    signatureProofUrl,
    confirmationCode,
    metadata,
  }: {
    deliveryId: string;
    userId: string;
    type: string;
    location: GeoPoint;
    address: string;
    name?: string;
    plannedTime?: Date;
    actualTime?: Date;
    notes?: string;
    photoProofUrl?: string;
    signatureProofUrl?: string;
    confirmationCode?: string;
    metadata?: Record<string, any>;
  }) {
    // Valider les données
    createCheckpointSchema.parse({
      deliveryId,
      type,
      location,
      address,
      name,
      plannedTime,
      actualTime,
      completedBy: userId,
      notes,
      photoProofUrl,
      signatureProofUrl,
      confirmationCode,
      metadata,
    });

    // Vérifier si la livraison existe
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Livraison non trouvée',
      });
    }

    // Vérifier que l'utilisateur est lié à cette livraison
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { admin: true },
    });

    const isDeliverer = delivery.delivererId === userId;
    const isClient = delivery.clientId === userId;
    const isAdmin = user?.admin !== null;

    if (!isDeliverer && !isClient && !isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à créer un point de passage pour cette livraison",
      });
    }

    // Créer le point de passage
    const checkpoint = await db.deliveryCheckpoint.create({
      data: {
        deliveryId,
        type,
        location,
        address,
        name,
        plannedTime,
        actualTime: actualTime || new Date(),
        completedBy: userId,
        notes,
        photoProofUrl,
        signatureProofUrl,
        confirmationCode,
        metadata,
      },
    });

    // Si c'est un point de passage de livraison, mettre à jour le statut si nécessaire
    if (type === 'DELIVERY' && delivery.currentStatus !== 'DELIVERED') {
      await this.updateDeliveryStatus({
        userId,
        deliveryId,
        status: 'DELIVERED' as DeliveryStatus,
        location,
        notes: notes || 'Livraison confirmée',
      });
    }

    // Notifier du nouveau point de passage
    this.notifyDeliveryUpdate(deliveryId, {
      type: 'CHECKPOINT_REACHED',
      checkpointId: checkpoint.id,
      checkpointType: type,
      timestamp: new Date(),
      notes,
    });

    return checkpoint;
  },

  /**
   * Récupère les livraisons avec suivi actif
   */
  async getActiveDeliveryTracking(userId: string, role?: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { admin: true },
    });

    const isAdmin = user?.admin !== null;

    // Filtres en fonction du rôle
    const filter: Prisma.DeliveryTrackingWhereInput = {
      isActive: true,
      // Si admin, voir toutes les livraisons actives
      // Sinon, filtrer par livreur ou client
      ...(isAdmin
        ? {}
        : role === 'DELIVERER'
          ? { delivererId: userId }
          : { delivery: { clientId: userId } }),
    };

    const activeTrackings = await db.deliveryTracking.findMany({
      where: filter,
      include: {
        delivery: {
          select: {
            id: true,
            clientId: true,
            delivererId: true,
            pickupAddress: true,
            deliveryAddress: true,
            currentStatus: true,
            currentLat: true,
            currentLng: true,
            lastLocationUpdate: true,
            estimatedArrival: true,
            client: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    phoneNumber: true,
                  },
                },
              },
            },
            deliverer: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
        deliverer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phoneNumber: true,
          },
        },
      },
    });

    return activeTrackings;
  },

  /**
   * Mets à jour les coordonnées pour une livraison
   */
  async updateDeliveryCoordinates(
    data: {
      deliveryId: string;
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
      altitude?: number;
    },
    userId: string
  ) {
    try {
      // Vérifier que le suivi de livraison existe
      const tracking = await db.deliveryTracking.findUnique({
        where: { deliveryId: data.deliveryId },
      });

      if (!tracking) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Suivi de livraison introuvable',
        });
      }

      // Vérifier que l'utilisateur est le livreur assigné
      if (tracking.delivererId !== userId) {
        const user = await db.user.findUnique({
          where: { id: userId },
        });

        if (!user || user.role !== UserRole.ADMIN) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à mettre à jour cette position",
          });
        }
      }

      // Stocker la position
      const position = await db.deliveryPosition.create({
        data: {
          deliveryId: data.deliveryId,
          location: {
            type: 'Point',
            coordinates: [data.longitude, data.latitude],
          },
          accuracy: data.accuracy,
          heading: data.heading,
          speed: data.speed,
          altitude: data.altitude,
          createdAt: new Date(),
        },
      });

      // Mettre à jour la position actuelle dans la livraison
      await db.delivery.update({
        where: { id: data.deliveryId },
        data: {
          currentLat: data.latitude,
          currentLng: data.longitude,
          lastLocationUpdate: new Date(),
        },
      });

      // Mettre à jour le timestamp dans le suivi
      await db.deliveryTracking.update({
        where: { deliveryId: data.deliveryId },
        data: {
          lastUpdatedAt: new Date(),
        },
      });

      return position;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la mise à jour des coordonnées',
        cause: error,
      });
    }
  },

  /**
   * Notifie les clients et livreurs des mises à jour de livraison
   */
  notifyDeliveryUpdate(deliveryId: string, update: any) {
    // Émettre via WebSocket
    emitDeliveryUpdate(deliveryId, update);
    return true;
  },

  /**
   * Notifie le client d'un changement de statut
   */
  async notifyClient(deliveryId: string, status: DeliveryStatus, notes?: string) {
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        client: {
          select: {
            id: true,
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

    if (!delivery || !delivery.client) return false;

    // Préparer le titre et message en fonction du statut
    let title = 'Mise à jour de votre livraison';
    let message = notes || 'Votre livraison a été mise à jour';

    switch (status) {
      case 'ASSIGNED':
        title = 'Livreur assigné';
        message = 'Un livreur a été assigné à votre commande';
        break;
      case 'PICKED_UP':
        title = 'Colis récupéré';
        message = 'Votre colis a été récupéré et est en préparation pour livraison';
        break;
      case 'IN_TRANSIT':
        title = 'Livraison en cours';
        message = 'Votre colis est en route vers votre adresse';
        break;
      case 'NEARBY':
        title = 'Livreur à proximité';
        message = 'Votre livreur est à proximité de votre adresse';
        break;
      case 'ARRIVED':
        title = 'Livreur arrivé';
        message = "Votre livreur est arrivé à l'adresse de livraison";
        break;
      case 'DELIVERED':
        title = 'Livraison effectuée';
        message = 'Votre colis a été livré avec succès';
        break;
      case 'NOT_DELIVERED':
        title = 'Livraison impossible';
        message = notes || "La livraison n'a pas pu être effectuée";
        break;
      case 'CANCELLED':
        title = 'Livraison annulée';
        message = notes || 'La livraison a été annulée';
        break;
    }

    // Envoyer la notification
    return sendNotification({
      userId: delivery.client.user.id,
      title,
      message,
      type: 'DELIVERY_UPDATE',
      link: `/client/deliveries/${deliveryId}`,
      data: {
        deliveryId,
        status,
      },
    });
  },

  /**
   * Crée une nouvelle livraison
   */
  async createDelivery(
    data: {
      deliveryId: string;
      delivererId: string;
      isActive?: boolean;
    },
    userId: string
  ) {
    try {
      // Vérifier que la livraison existe
      const delivery = await db.delivery.findUnique({
        where: { id: data.deliveryId },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison introuvable',
        });
      }

      // Vérifier les autorisations
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.DELIVERER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à suivre cette livraison",
        });
      }

      // Créer ou mettre à jour le suivi
      const tracking = await db.deliveryTracking.upsert({
        where: { deliveryId: data.deliveryId },
        update: {
          delivererId: data.delivererId,
          isActive: data.isActive ?? true,
          lastUpdatedAt: new Date(),
        },
        create: {
          deliveryId: data.deliveryId,
          delivererId: data.delivererId,
          isActive: data.isActive ?? true,
          startedAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      });

      // Mettre à jour le statut de la livraison si nécessaire
      await db.delivery.update({
        where: { id: data.deliveryId },
        data: {
          status: DeliveryStatus.ACCEPTED,
        },
      });

      return tracking;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la création du suivi de livraison',
        cause: error,
      });
    }
  },

  /**
   * Confirme la livraison d'un colis
   */
  async confirmDelivery(data: DeliveryConfirmationData, userId: string) {
    try {
      // Vérifier que la livraison existe
      const delivery = await db.delivery.findUnique({
        where: { id: data.deliveryId },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison introuvable',
        });
      }

      // Vérifier les autorisations
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Utilisateur non authentifié',
        });
      }

      const isClient = delivery.clientId === userId;
      const isDeliverer = delivery.delivererId === userId;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!isClient && !isDeliverer && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à confirmer cette livraison",
        });
      }

      // Si un code de confirmation est fourni, vérifier sa validité
      if (data.confirmationCode) {
        const validCode = await db.deliveryConfirmationCode.findFirst({
          where: {
            deliveryId: data.deliveryId,
            code: data.confirmationCode,
            expiresAt: {
              gt: new Date(),
            },
            used: false,
          },
        });

        if (!validCode) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Code de confirmation invalide ou expiré',
          });
        }

        // Marquer le code comme utilisé
        await db.deliveryConfirmationCode.update({
          where: { id: validCode.id },
          data: { used: true, usedAt: new Date() },
        });
      }

      // Mettre à jour le statut de la livraison
      const result = await this.updateDeliveryStatus({
        userId,
        deliveryId: data.deliveryId,
        status: DeliveryStatus.DELIVERED,
        notes: data.notes,
        location: data.location,
      });

      // Enregistrer les preuves de livraison
      await db.deliveryConfirmation.create({
        data: {
          deliveryId: data.deliveryId,
          confirmedById: userId,
          signatureUrl: data.signatureUrl,
          photoUrl: data.photoUrl,
          notes: data.notes,
          confirmedAt: new Date(),
          location: data.location as any,
        },
      });

      // Terminer le suivi de livraison
      await db.deliveryTracking.update({
        where: { deliveryId: data.deliveryId },
        data: {
          isActive: false,
          endedAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la confirmation de livraison',
        cause: error,
      });
    }
  },

  /**
   * Évalue une livraison
   */
  async rateDelivery(
    data: {
      deliveryId: string;
      rating: number;
      comment?: string;
    },
    userId: string
  ) {
    const delivery = await db.delivery.findUnique({
      where: { id: data.deliveryId },
    });

    if (!delivery) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Livraison non trouvée',
      });
    }

    // Vérifier que l'utilisateur est le client de cette livraison
    if (delivery.clientId !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à évaluer cette livraison",
      });
    }

    // Vérifier que la livraison est terminée
    if (delivery.currentStatus !== DeliveryStatus.COMPLETED) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Seules les livraisons terminées peuvent être évaluées',
      });
    }

    // Vérifier si une évaluation existe déjà
    const existingRating = await db.deliveryRating.findUnique({
      where: {
        deliveryId_userId: {
          deliveryId: data.deliveryId,
          userId,
        },
      },
    });

    if (existingRating) {
      // Mettre à jour l'évaluation existante
      return db.deliveryRating.update({
        where: {
          deliveryId_userId: {
            deliveryId: data.deliveryId,
            userId,
          },
        },
        data: {
          rating: data.rating,
          comment: data.comment,
          updatedAt: new Date(),
        },
      });
    }

    // Créer une nouvelle évaluation
    return db.deliveryRating.create({
      data: {
        deliveryId: data.deliveryId,
        userId,
        rating: data.rating,
        comment: data.comment,
      },
    });
  },

  /**
   * Récupère les détails d'une livraison
   */
  async getDeliveryById(deliveryId: string, userId: string) {
    try {
      // Vérifier que la livraison existe
      const delivery = await db.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          client: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  image: true,
                },
              },
            },
          },
          deliverer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  image: true,
                },
              },
            },
          },
          tracking: true,
          package: true,
          statusHistory: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 5,
          },
        },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison introuvable',
        });
      }

      // Vérifier les autorisations
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Utilisateur non authentifié',
        });
      }

      const isClient = delivery.clientId === userId;
      const isDeliverer = delivery.delivererId === userId;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!isClient && !isDeliverer && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à consulter cette livraison",
        });
      }

      // Récupérer la dernière position
      const lastPosition = await db.deliveryPosition.findFirst({
        where: { deliveryId },
        orderBy: { createdAt: 'desc' },
      });

      // Récupérer l'ETA
      const eta = await db.deliveryETA.findFirst({
        where: { deliveryId },
        orderBy: { calculatedAt: 'desc' },
      });

      // Récupérer les problèmes actifs
      const issues = await db.deliveryIssue.findMany({
        where: {
          deliveryId,
          status: {
            in: ['OPEN', 'IN_PROGRESS'],
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Préparer les informations simplifiées du livreur
      const deliverer = delivery.deliverer
        ? {
            id: delivery.deliverer.userId,
            name: delivery.deliverer.user.name,
            phone: delivery.deliverer.user.phone,
            image: delivery.deliverer.user.image,
          }
        : null;

      return {
        ...delivery,
        deliverer,
        currentPosition: lastPosition,
        eta,
        issues,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des détails de livraison',
        cause: error,
      });
    }
  },

  /**
   * Récupère l'historique des coordonnées d'une livraison
   */
  async getDeliveryCoordinatesHistory(deliveryId: string, userId: string) {
    try {
      // Vérifier les autorisations
      const delivery = await db.delivery.findUnique({
        where: { id: deliveryId },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison introuvable',
        });
      }

      const user = await db.user.findUnique({
        where: { id: userId },
      });

      const isClient = delivery.clientId === userId;
      const isDeliverer = delivery.delivererId === userId;
      const isAdmin = user?.role === UserRole.ADMIN;

      if (!isClient && !isDeliverer && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à consulter cette livraison",
        });
      }

      // Récupérer les positions
      const positions = await db.deliveryPosition.findMany({
        where: { deliveryId },
        orderBy: { createdAt: 'asc' },
      });

      return {
        positions,
        count: positions.length,
        bounds: this.calculateBounds(positions),
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de la récupération de l'historique des coordonnées",
        cause: error,
      });
    }
  },

  /**
   * Calcule les limites géographiques à partir des positions
   */
  calculateBounds(positions: any[]) {
    if (positions.length === 0) return null;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    positions.forEach(pos => {
      const lng = pos.location.coordinates[0];
      const lat = pos.location.coordinates[1];

      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    return {
      southWest: { latitude: minLat, longitude: minLng },
      northEast: { latitude: maxLat, longitude: maxLng },
    };
  },

  /**
   * Mise à jour des coordonnées d'une livraison (alias pour updateDeliveryCoordinates)
   */
  async updateCoordinates(
    data: {
      deliveryId: string;
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
      altitude?: number;
    },
    userId: string
  ) {
    return this.updateDeliveryCoordinates(data, userId);
  },

  /**
   * Récupérer la liste des livraisons avec filtrage
   */
  async getDeliveries(filters: TrackingQueryFilters, userId: string) {
    try {
      // Vérifier que l'utilisateur existe
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Utilisateur non trouvé',
        });
      }

      // Construire les conditions de filtrage
      const where: any = {};

      // Filtrage par statut
      if (filters.status) {
        where.currentStatus = Array.isArray(filters.status)
          ? { in: filters.status }
          : filters.status;
      }

      // Filtrage par client
      if (filters.clientId) {
        where.clientId = filters.clientId;
      }

      // Filtrage par livreur
      if (filters.delivererId) {
        where.delivererId = filters.delivererId;
      }

      // Filtrage par date
      if (filters.startDate) {
        where.createdAt = {
          ...(where.createdAt || {}),
          gte: new Date(filters.startDate),
        };
      }

      if (filters.endDate) {
        where.createdAt = {
          ...(where.createdAt || {}),
          lte: new Date(filters.endDate),
        };
      }

      // Appliquer des filtres spécifiques selon le rôle
      if (user.role === UserRole.CLIENT) {
        where.clientId = userId;
      } else if (user.role === UserRole.DELIVERER) {
        where.delivererId = userId;
      } else if (user.role === UserRole.MERCHANT) {
        // Filtrage spécifique pour les marchands si nécessaire
        where.merchantId = userId;
      }

      // Recherche textuelle si présente
      if (filters.search && filters.search.trim() !== '') {
        where.OR = [
          { id: { contains: filters.search, mode: 'insensitive' } },
          { pickupAddress: { contains: filters.search, mode: 'insensitive' } },
          { deliveryAddress: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Obtenir le nombre total de résultats pour la pagination
      const total = await db.delivery.count({ where });

      // Options de tri
      const orderBy: any = {};
      if (filters.sortBy && filters.sortOrder) {
        orderBy[filters.sortBy] = filters.sortOrder;
      } else {
        // Tri par défaut
        orderBy.createdAt = 'desc';
      }

      // Exécuter la requête principale avec pagination
      const deliveries = await db.delivery.findMany({
        where,
        orderBy,
        take: filters.limit || 10,
        skip: filters.page ? (filters.page - 1) * (filters.limit || 10) : 0,
        include: {
          client: {
            select: {
              id: true,
              user: { select: { name: true, image: true } },
            },
          },
          deliverer: filters.includeDeliverer
            ? {
                select: {
                  id: true,
                  user: { select: { name: true, image: true, phoneNumber: true } },
                  isActive: true,
                  currentLocation: true,
                },
              }
            : false,
          merchant: filters.includeMerchant
            ? {
                select: {
                  id: true,
                  companyName: true,
                  businessName: true,
                },
              }
            : false,
        },
      });

      return {
        deliveries,
        pagination: {
          total,
          page: filters.page || 1,
          limit: filters.limit || 10,
          totalPages: Math.ceil(total / (filters.limit || 10)),
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des livraisons',
        cause: error,
      });
    }
  },

  /**
   * Récupérer les livraisons actives de l'utilisateur
   */
  async getActiveDeliveries(userId: string) {
    try {
      // Vérifier que l'utilisateur existe
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Utilisateur non trouvé',
        });
      }

      // Définir les statuts considérés comme "actifs"
      const activeStatuses = [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.PENDING_PICKUP,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.IN_TRANSIT,
        DeliveryStatus.NEARBY,
        DeliveryStatus.ARRIVED,
        DeliveryStatus.ATTEMPT_DELIVERY,
      ];

      // Construire la requête en fonction du rôle de l'utilisateur
      const where: any = {
        currentStatus: { in: activeStatuses },
      };

      if (user.role === UserRole.CLIENT) {
        where.clientId = userId;
      } else if (user.role === UserRole.DELIVERER) {
        where.delivererId = userId;
      } else if (user.role === UserRole.MERCHANT) {
        where.merchantId = userId;
      }

      // Récupérer les livraisons actives
      const deliveries = await db.delivery.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              user: { select: { name: true, image: true, phoneNumber: true } },
            },
          },
          deliverer: {
            select: {
              id: true,
              user: { select: { name: true, image: true, phoneNumber: true } },
              currentLocation: true,
            },
          },
        },
      });

      return deliveries;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des livraisons actives',
        cause: error,
      });
    }
  },

  /**
   * Générer un code de confirmation pour la livraison
   */
  async generateConfirmationCode(deliveryId: string, userId: string) {
    try {
      const delivery = await db.delivery.findUnique({
        where: { id: deliveryId },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison introuvable',
        });
      }

      // Vérifier que l'utilisateur est le livreur assigné ou un admin
      if (delivery.delivererId !== userId) {
        const user = await db.user.findUnique({
          where: { id: userId },
        });

        if (!user || user.role !== UserRole.ADMIN) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à générer un code de confirmation",
          });
        }
      }

      // Générer un code de confirmation aléatoire à 6 chiffres
      const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Mettre à jour la livraison avec le nouveau code
      const updatedDelivery = await db.delivery.update({
        where: { id: deliveryId },
        data: { deliveryCode: confirmationCode },
      });

      return {
        success: true,
        code: confirmationCode,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la génération du code de confirmation',
        cause: error,
      });
    }
  },

  async getActiveDeliveryLocation({ userId, deliveryId }: { userId: string; deliveryId: string }) {
    try {
      // Vérifier que la livraison existe
      const delivery = await db.delivery.findUnique({
        where: { id: deliveryId },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison introuvable',
        });
      }

      // Vérifier les autorisations
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Utilisateur non authentifié',
        });
      }

      const isClient = delivery.clientId === userId;
      const isDeliverer = delivery.delivererId === userId;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!isClient && !isDeliverer && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à consulter cette position",
        });
      }

      // Récupérer la dernière position
      const lastPosition = await db.deliveryTrackingPosition.findFirst({
        where: { deliveryId },
        orderBy: { timestamp: 'desc' },
      });

      if (!lastPosition) {
        return null;
      }

      return {
        deliveryId,
        location: lastPosition.location,
        accuracy: lastPosition.accuracy,
        heading: lastPosition.heading,
        speed: lastPosition.speed,
        updatedAt: lastPosition.timestamp,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération de la position',
        cause: error,
      });
    }
  },

  async getDeliveryStatusHistory({ userId, deliveryId }: { userId: string; deliveryId: string }) {
    try {
      // Vérifier que la livraison existe
      const delivery = await db.delivery.findUnique({
        where: { id: deliveryId },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Livraison introuvable',
        });
      }

      // Vérifier les autorisations
      const user = await db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Utilisateur non authentifié',
        });
      }

      const isClient = delivery.clientId === userId;
      const isDeliverer = delivery.delivererId === userId;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!isClient && !isDeliverer && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à consulter cet historique",
        });
      }

      // Récupérer l'historique des statuts
      const history = await db.deliveryStatusHistory.findMany({
        where: { deliveryId },
        include: {
          updatedBy: {
            select: {
              name: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      return {
        history,
        currentStatus: delivery.currentStatus,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de la récupération de l'historique des statuts",
        cause: error,
      });
    }
  },

  async updateLocation({
    userId,
    deliveryId,
    location,
    accuracy,
  }: {
    userId: string;
    deliveryId: string;
    location: GeoPoint;
    accuracy?: number;
  }) {
    return this.updateDeliveryLocation({
      userId,
      deliveryId,
      location,
      accuracy,
    });
  },

  /**
   * Autres méthodes existantes...
   */
};

export default deliveryTrackingService;
