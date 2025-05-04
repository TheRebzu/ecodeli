import { db } from '../db';
import {
  BoxSearchInput,
  BoxReservationCreateInput,
  BoxReservationUpdateInput,
  BoxAvailabilitySubscriptionInput,
  BoxUsageHistoryInput,
  ExtendReservationInput,
  BoxAccessInput,
  BoxDetailsInput,
} from '@/schemas/storage.schema';
import { TRPCError } from '@trpc/server';
import { Prisma, PaymentStatus } from '@prisma/client';
import { generateRandomCode } from '@/lib/utils';
import { NotificationService } from './notification.service';

// Types personnalisés pour les enums manquants
export enum BoxType {
  STANDARD = 'STANDARD',
  CLIMATE_CONTROLLED = 'CLIMATE_CONTROLLED',
  SECURE = 'SECURE',
  EXTRA_LARGE = 'EXTRA_LARGE',
  REFRIGERATED = 'REFRIGERATED',
  FRAGILE = 'FRAGILE',
}

export enum BoxStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
  DAMAGED = 'DAMAGED',
  INACTIVE = 'INACTIVE',
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXTENDED = 'EXTENDED',
  EXPIRED = 'EXPIRED',
}

export enum BoxActionType {
  RESERVATION_CREATED = 'RESERVATION_CREATED',
  RESERVATION_UPDATED = 'RESERVATION_UPDATED',
  RESERVATION_CANCELLED = 'RESERVATION_CANCELLED',
  BOX_ACCESSED = 'BOX_ACCESSED',
  BOX_CLOSED = 'BOX_CLOSED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  EXTENDED_RENTAL = 'EXTENDED_RENTAL',
  INSPECTION_COMPLETED = 'INSPECTION_COMPLETED',
}

// Interface pour les champs additionnels du schema Prisma
interface PrismaBoxExtension {
  boxType?: BoxType;
  features?: string[];
}

// Interface pour les extensions de réservation dans Prisma
interface PrismaReservationExtension {
  notes?: string | null;
  originalEndDate?: Date | null;
}

// Type pour l'historique d'utilisation des box
export type BoxUsageHistory = {
  id: string;
  boxId: string;
  reservationId?: string | null;
  clientId: string;
  actionType: BoxActionType;
  actionTime: Date;
  details?: string | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
};

// Types pour les résultats des requêtes SQL brutes
interface SubscriptionResult {
  id: string;
  clientId: string;
  lastNotified?: Date;
  warehouseId?: string;
  boxType?: string;
  minSize?: number;
  maxPrice?: number;
  startDate?: Date;
  endDate?: Date;
}

interface AccessCodeResult {
  accessCode: string;
}

// Type pour les données de notification
interface NotificationData {
  boxIds: string[];
  subscriptionId: string;
}

// Service pour la gestion des box de stockage
class StorageService {
  // Recherche de box disponibles selon les critères
  async findAvailableBoxes(input: BoxSearchInput) {
    const { warehouseId, startDate, endDate, minSize, maxSize, maxPrice, boxType, features } =
      input;

    // Construction des critères de recherche
    const whereClause: Prisma.BoxWhereInput & PrismaBoxExtension = {
      // Critères d'entrepôt
      ...(warehouseId && { warehouseId }),

      // Critères de taille
      ...(minSize && { size: { gte: minSize } }),
      ...(maxSize && { size: { lte: maxSize } }),

      // Critère de prix
      ...(maxPrice && { pricePerDay: { lte: maxPrice } }),

      // Statut disponible uniquement
      isOccupied: false,

      // Vérification que la box n'a pas de réservation pour la période demandée
      NOT: {
        reservations: {
          some: {
            AND: [
              {
                OR: [
                  {
                    startDate: { lte: endDate },
                    endDate: { gte: startDate },
                  },
                ],
              },
              {
                status: {
                  in: ['PENDING', 'ACTIVE', 'EXTENDED'],
                },
              },
            ],
          },
        },
      },
      // Cast sécurisé du boxType
      ...(boxType && { boxType: boxType as unknown as BoxType }),
    };

    // Ajout des critères de fonctionnalités si spécifiés
    if (features && features.length > 0) {
      whereClause.AND = features.map(feature => ({
        features: { has: feature },
      })) as unknown as Prisma.BoxWhereInput[];
    }

    // Recherche des box disponibles avec leurs informations d'entrepôt
    const availableBoxes = await db.box.findMany({
      where: whereClause as Prisma.BoxWhereInput,
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            location: true,
            address: true,
            description: true,
            // Nous assumons que ces champs existent dans le modèle Warehouse
            // S'ils sont manquants, ils seront undefined
          },
        },
      },
      orderBy: [{ pricePerDay: 'asc' }, { size: 'asc' }],
    });

    return availableBoxes;
  }

  // Création d'une réservation de box
  async createBoxReservation(input: BoxReservationCreateInput, clientId: string) {
    const { boxId, startDate, endDate, notes } = input;

    // Récupération des informations de la box
    const box = await db.box.findUnique({
      where: { id: boxId },
    });

    if (!box) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Box introuvable',
      });
    }

    // Vérification que la box est disponible
    const isBoxAvailable = await this.checkBoxAvailability(boxId, startDate, endDate);

    if (!isBoxAvailable) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "Cette box n'est pas disponible pour les dates sélectionnées",
      });
    }

    // Calcul du nombre de jours
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

    // Calcul du prix total
    const totalPrice = box.pricePerDay * days;

    // Génération d'un code d'accès temporaire
    const accessCode = generateRandomCode(6);

    // Création de la réservation
    const reservationData = {
      boxId,
      clientId,
      startDate,
      endDate,
      status: ReservationStatus.PENDING as unknown as string,
      totalPrice,
      notes: notes || null,
      accessCode,
      paymentStatus: PaymentStatus.PENDING,
    };

    const reservation = await db.reservation.create({
      data: reservationData,
    });

    // Mise à jour du statut de la box
    await db.box.update({
      where: { id: boxId },
      data: {
        isOccupied: true,
      },
    });

    // Enregistrement de l'action dans l'historique
    await this.logBoxUsage(
      {
        boxId,
        reservationId: reservation.id,
        actionType: BoxActionType.RESERVATION_CREATED,
        details: `Réservation créée du ${startDate.toLocaleDateString()} au ${endDate.toLocaleDateString()}`,
      },
      clientId
    );

    return reservation;
  }

  // Vérification de la disponibilité d'une box pour une période donnée
  private async checkBoxAvailability(boxId: string, startDate: Date, endDate: Date) {
    const existingReservations = await db.reservation.findMany({
      where: {
        boxId,
        status: {
          in: ['PENDING', 'ACTIVE', 'EXTENDED'],
        },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    return existingReservations.length === 0;
  }

  // Mise à jour d'une réservation
  async updateBoxReservation(input: BoxReservationUpdateInput, clientId: string) {
    const { id, endDate, notes, status } = input;

    // Récupération de la réservation
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: { box: true },
    });

    if (!reservation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Réservation introuvable',
      });
    }

    // Vérification des droits d'accès
    if (reservation.clientId !== clientId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à modifier cette réservation",
      });
    }

    // Calcul du nouveau prix si la date de fin change
    let totalPrice = reservation.totalPrice;

    if (endDate) {
      // Vérification que la nouvelle période est disponible
      if (endDate > reservation.endDate) {
        const isAvailable = await this.checkBoxAvailability(
          reservation.boxId,
          reservation.endDate,
          endDate
        );

        if (!isAvailable) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "La box n'est pas disponible pour la nouvelle période",
          });
        }
      }

      const days = Math.ceil(
        (endDate.getTime() - reservation.startDate.getTime()) / (1000 * 3600 * 24)
      );
      totalPrice = reservation.box.pricePerDay * days;
    }

    // Extension du type Reservation pour les propriétés additionnelles
    const reservationWithExtension = reservation as typeof reservation & PrismaReservationExtension;

    // Préparation des données de mise à jour
    const updateData = {
      endDate: endDate,
      status: status as unknown as string,
      notes: notes,
      totalPrice: endDate ? totalPrice : undefined,
      originalEndDate:
        !reservationWithExtension.originalEndDate && endDate && endDate > reservation.endDate
          ? reservation.endDate
          : undefined,
      extendedCount: endDate && endDate > reservation.endDate ? { increment: 1 } : undefined,
    };

    // Mise à jour de la réservation
    const updatedReservation = await db.reservation.update({
      where: { id },
      data: updateData,
    });

    // Enregistrement de l'action dans l'historique
    await this.logBoxUsage(
      {
        boxId: reservation.boxId,
        reservationId: reservation.id,
        actionType: BoxActionType.RESERVATION_UPDATED,
        details: `Réservation mise à jour${endDate ? ` avec nouvelle fin le ${endDate.toLocaleDateString()}` : ''}`,
      },
      clientId
    );

    return updatedReservation;
  }

  // Récupération des réservations d'un client
  async getClientBoxReservations(clientId: string, status?: ReservationStatus) {
    return db.reservation.findMany({
      where: {
        clientId,
        ...(status && { status: status as unknown as string }),
      },
      include: {
        box: {
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  // Récupération de l'historique d'utilisation d'une box
  async getBoxUsageHistory(boxId: string, clientId: string) {
    // Vérification des droits d'accès (soit le client a une réservation pour cette box, soit c'est un admin)
    const hasAccess = await db.reservation.findFirst({
      where: {
        boxId,
        clientId,
      },
    });

    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à consulter l'historique de cette box",
      });
    }

    // Requête à la table BoxUsageHistory via Prisma
    const historyEntries = await db.$queryRaw`
      SELECT id, box_id as "boxId", reservation_id as "reservationId", 
      client_id as "clientId", action_type as "actionType", action_time as "actionTime", 
      details, ip_address as "ipAddress", device_info as "deviceInfo"
      FROM box_usage_history 
      WHERE box_id = ${boxId}
      ORDER BY action_time DESC
    `;

    return historyEntries as BoxUsageHistory[];
  }

  // Création d'un abonnement aux notifications de disponibilité
  async createAvailabilitySubscription(input: BoxAvailabilitySubscriptionInput, clientId: string) {
    const {
      boxId,
      warehouseId,
      startDate,
      endDate,
      minSize,
      maxPrice,
      boxType,
      notificationPreferences,
    } = input;

    // Vérification qu'au moins un critère est spécifié
    if (!boxId && !warehouseId && !boxType && !minSize) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Au moins un critère de recherche doit être spécifié',
      });
    }

    // Vérification que les dates sont cohérentes
    if (startDate && endDate && startDate >= endDate) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'La date de fin doit être postérieure à la date de début',
      });
    }

    // Création de l'abonnement - utilisation d'un type spécifique pour le résultat
    const result = await db.$executeRaw`
      INSERT INTO box_availability_subscriptions (
        id, box_id, client_id, warehouse_id, start_date, end_date, 
        min_size, max_price, box_type, is_active, notification_preferences,
        created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), ${boxId || null}, ${clientId}, ${warehouseId || null}, 
        ${startDate || null}, ${endDate || null}, ${minSize || null}, 
        ${maxPrice || null}, ${boxType || null}, true, 
        ${notificationPreferences ? JSON.stringify(notificationPreferences) : null},
        now(), now()
      )
      RETURNING id
    `;

    // Conversion du résultat en objet avec id
    const subscriptionId =
      typeof result === 'number'
        ? `${result}` // Cas où un nombre de lignes est retourné
        : 'success'; // Fallback par défaut

    return { success: true, subscriptionId };
  }

  // Recherche d'abonnements actifs pour un client
  async getClientSubscriptions(clientId: string) {
    // Requête à la table BoxAvailabilitySubscription via SQL brut
    return db.$queryRaw`
      SELECT bas.*, b.name as "boxName", w.name as "warehouseName"
      FROM box_availability_subscriptions bas
      LEFT JOIN boxes b ON bas."boxId" = b.id
      LEFT JOIN warehouses w ON bas."warehouseId" = w.id
      WHERE bas."clientId" = ${clientId} AND bas."isActive" = true
      ORDER BY bas."createdAt" DESC
    `;
  }

  // Désactivation d'un abonnement
  async deactivateSubscription(subscriptionId: string, clientId: string) {
    // Vérification que l'abonnement appartient au client
    const subscriptionResult = await db.$queryRaw`
      SELECT id, client_id as "clientId"
      FROM box_availability_subscriptions
      WHERE id = ${subscriptionId}
    `;

    // Conversion en tableau typé
    const subscriptions = Array.isArray(subscriptionResult)
      ? (subscriptionResult as SubscriptionResult[])
      : [];

    if (subscriptions.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Abonnement introuvable',
      });
    }

    if (subscriptions[0].clientId !== clientId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à désactiver cet abonnement",
      });
    }

    // Désactivation de l'abonnement
    await db.$executeRaw`
      UPDATE box_availability_subscriptions
      SET is_active = false, updated_at = now()
      WHERE id = ${subscriptionId}
    `;

    return { success: true };
  }

  // Vérification de la disponibilité et envoi de notifications
  async checkAvailabilityAndNotify() {
    // Récupération des abonnements actifs
    const activeSubscriptionsResult = await db.$queryRaw`
      SELECT bas.*, u.email, u.name
      FROM box_availability_subscriptions bas
      JOIN users u ON bas.client_id = u.id
      WHERE bas.is_active = true
    `;

    // Conversion en tableau typé
    const activeSubscriptions = Array.isArray(activeSubscriptionsResult)
      ? (activeSubscriptionsResult as SubscriptionResult[])
      : [];

    const now = new Date();

    // Pour chaque abonnement, vérifier s'il y a des box disponibles correspondant aux critères
    for (const subscription of activeSubscriptions) {
      const sub = subscription as SubscriptionResult;

      // Construction des critères de recherche
      const whereClause: Prisma.BoxWhereInput & PrismaBoxExtension = {
        id: sub.id || undefined,
        warehouseId: sub.warehouseId || undefined,
        isOccupied: false,
        ...(sub.boxType && { boxType: sub.boxType as unknown as BoxType }),
        ...(sub.minSize && { size: { gte: sub.minSize } }),
        ...(sub.maxPrice && { pricePerDay: { lte: sub.maxPrice } }),
      };

      // Si des dates sont spécifiées, vérifier la disponibilité pour cette période
      if (sub.startDate && sub.endDate) {
        whereClause.NOT = {
          reservations: {
            some: {
              AND: [
                {
                  OR: [
                    {
                      startDate: { lte: sub.endDate },
                      endDate: { gte: sub.startDate },
                    },
                  ],
                },
                {
                  status: {
                    in: ['PENDING', 'ACTIVE', 'EXTENDED'],
                  },
                },
              ],
            },
          },
        };
      }

      // Recherche des box disponibles
      const availableBoxes = await db.box.findMany({
        where: whereClause as Prisma.BoxWhereInput,
        include: { warehouse: true },
        take: 10,
      });

      // Si des box sont disponibles, envoyer une notification
      if (availableBoxes.length > 0) {
        // Vérifier si on a déjà notifié récemment
        const lastNotified = subscription.lastNotified ? new Date(subscription.lastNotified) : null;

        // Ne pas notifier plus d'une fois par jour
        if (!lastNotified || now.getTime() - lastNotified.getTime() > 24 * 60 * 60 * 1000) {
          // Création d'une notification avec données structurées
          const notificationData: NotificationData = {
            boxIds: availableBoxes.map(box => box.id),
            subscriptionId: subscription.id,
          };

          // Sérialiser les données en JSON
          const serializedData = JSON.stringify(notificationData);

          await NotificationService.sendNotification({
            userId: subscription.clientId,
            title: 'Box disponibles',
            message: `${availableBoxes.length} box ${availableBoxes.length > 1 ? 'sont' : 'est'} maintenant disponible${availableBoxes.length > 1 ? 's' : ''} selon vos critères`,
            type: 'SYSTEM',
            data: serializedData,
          });

          // Mise à jour de la date de dernière notification
          await db.$executeRaw`
            UPDATE box_availability_subscriptions
            SET last_notified = now(), updated_at = now()
            WHERE id = ${subscription.id}
          `;
        }
      }
    }

    return { success: true, notificationsChecked: activeSubscriptions.length };
  }

  // Extension d'une réservation
  async extendReservation(input: ExtendReservationInput, clientId: string) {
    const { reservationId, newEndDate } = input;

    // Récupération de la réservation
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { box: true },
    });

    if (!reservation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Réservation introuvable',
      });
    }

    // Vérification des droits d'accès
    if (reservation.clientId !== clientId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à modifier cette réservation",
      });
    }

    // Vérification que la nouvelle date est postérieure à l'ancienne
    if (newEndDate <= reservation.endDate) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'La nouvelle date de fin doit être postérieure à la date actuelle',
      });
    }

    // Vérification que la box est disponible pour la période d'extension
    const isAvailable = await this.checkBoxAvailability(
      reservation.boxId,
      reservation.endDate,
      newEndDate
    );

    if (!isAvailable) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "La box n'est pas disponible pour la période d'extension",
      });
    }

    // Calcul du prix supplémentaire
    const originalDays = Math.ceil(
      (reservation.endDate.getTime() - reservation.startDate.getTime()) / (1000 * 3600 * 24)
    );

    const newTotalDays = Math.ceil(
      (newEndDate.getTime() - reservation.startDate.getTime()) / (1000 * 3600 * 24)
    );

    const additionalDays = newTotalDays - originalDays;
    const additionalPrice = reservation.box.pricePerDay * additionalDays;
    const newTotalPrice = reservation.totalPrice + additionalPrice;

    // Extension du type Reservation pour les propriétés additionnelles
    const reservationWithExtension = reservation as typeof reservation & PrismaReservationExtension;

    // Préparation des données de mise à jour
    const updateData = {
      endDate: newEndDate,
      status: ReservationStatus.EXTENDED as unknown as string,
      totalPrice: newTotalPrice,
      originalEndDate: !reservationWithExtension.originalEndDate ? reservation.endDate : undefined,
      extendedCount: { increment: 1 },
    };

    // Mise à jour de la réservation
    await db.reservation.update({
      where: { id: reservationId },
      data: updateData,
    });

    // Enregistrement de l'action dans l'historique
    await this.logBoxUsage(
      {
        boxId: reservation.boxId,
        reservationId: reservation.id,
        actionType: BoxActionType.EXTENDED_RENTAL,
        details: `Réservation prolongée jusqu'au ${newEndDate.toLocaleDateString()}`,
      },
      clientId
    );

    return {
      success: true,
      additionalDays,
      additionalPrice,
      newTotalPrice,
      newEndDate,
    };
  }

  // Accès à une box (vérification du code d'accès)
  async accessBox(input: BoxAccessInput, clientId: string) {
    const { reservationId, accessCode } = input;

    // Récupération de la réservation
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { box: true },
    });

    if (!reservation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Réservation introuvable',
      });
    }

    // Vérification des droits d'accès
    if (reservation.clientId !== clientId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à accéder à cette box",
      });
    }

    // Récupération du code d'accès depuis la base de données
    const accessCodeResult = await db.$queryRaw`
      SELECT access_code as "accessCode"
      FROM reservations
      WHERE id = ${reservationId}
    `;

    // Conversion en tableau typé
    const accessCodes = Array.isArray(accessCodeResult)
      ? (accessCodeResult as AccessCodeResult[])
      : [];

    // Vérification du code d'accès
    if (accessCodes.length === 0 || accessCodes[0].accessCode !== accessCode) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "Code d'accès incorrect",
      });
    }

    // Mise à jour de la date de dernier accès
    await db.$executeRaw`
      UPDATE reservations
      SET last_accessed = now(), updated_at = now()
      WHERE id = ${reservationId}
    `;

    // Enregistrement de l'action dans l'historique
    await this.logBoxUsage(
      {
        boxId: reservation.boxId,
        reservationId: reservation.id,
        actionType: BoxActionType.BOX_ACCESSED,
        details: `Accès à la box le ${new Date().toLocaleString()}`,
      },
      clientId
    );

    return { success: true };
  }

  // Enregistrement d'une action dans l'historique
  async logBoxUsage(input: BoxUsageHistoryInput, clientId: string) {
    // Insertion dans la table d'historique via SQL brut
    await db.$executeRaw`
      INSERT INTO box_usage_history (
        id, box_id, reservation_id, client_id, action_type,
        action_time, details, ip_address, device_info
      )
      VALUES (
        gen_random_uuid(), ${input.boxId}, ${input.reservationId || null},
        ${clientId}, ${input.actionType}, now(), ${input.details || null},
        null, null
      )
    `;

    return { success: true };
  }

  // Création ou mise à jour d'une box (admin only)
  async upsertBox(input: BoxDetailsInput, adminId: string) {
    const isAdmin = await db.user.findFirst({
      where: {
        id: adminId,
        role: 'ADMIN',
      },
    });

    if (!isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Action réservée aux administrateurs',
      });
    }

    // Vérification que l'entrepôt existe
    const warehouse = await db.warehouse.findUnique({
      where: { id: input.warehouseId },
    });

    if (!warehouse) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Entrepôt introuvable',
      });
    }

    // Informations de base pour la box
    const boxData = {
      warehouseId: input.warehouseId,
      name: input.name,
      size: input.size,
      // Le champ suivant est ajouté manuellement dans le schéma Prisma
      boxType: input.boxType as unknown as string,
      pricePerDay: input.pricePerDay,
      description: input.description,
      locationDescription: input.locationDescription,
      floorLevel: input.floorLevel,
      maxWeight: input.maxWeight,
      dimensions: input.dimensions,
      features: input.features || [],
      status: input.status as unknown as string,
    };

    // Mise à jour ou création de la box
    if (input.id) {
      // Mise à jour
      const box = await db.box.update({
        where: { id: input.id },
        data: boxData,
      });
      return box;
    } else {
      // Création
      const box = await db.box.create({
        data: boxData,
      });
      return box;
    }
  }

  // Récupération des box d'un entrepôt
  async getWarehouseBoxes(warehouseId: string) {
    return db.box.findMany({
      where: { warehouseId },
      orderBy: [{ name: 'asc' }],
    });
  }

  // Récupération des entrepôts actifs
  async getActiveWarehouses() {
    return db.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}

export const storageService = new StorageService();
