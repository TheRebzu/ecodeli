import { db } from "@/server/db";
import {
  BoxSearchInput,
  BoxReservationCreateInput,
  BoxReservationUpdateInput,
  BoxAvailabilitySubscriptionInput,
  BoxUsageHistoryInput,
  ExtendReservationInput,
  BoxAccessInput,
  BoxDetailsInput,
} from "@/schemas/storage/storage.schema";
import { TRPCError } from "@trpc/server";
import { Prisma, PaymentStatus } from "@prisma/client";
import { generateRandomCode } from "@/lib/utils/common";
import { NotificationService } from "@/lib/services/notification.service";

// Types personnalisés pour les enums manquants
export enum BoxType {
  STANDARD = "STANDARD",
  CLIMATE_CONTROLLED = "CLIMATE_CONTROLLED",
  SECURE = "SECURE",
  EXTRA_LARGE = "EXTRA_LARGE",
  REFRIGERATED = "REFRIGERATED",
  FRAGILE = "FRAGILE",
}

export enum BoxStatus {
  AVAILABLE = "AVAILABLE",
  RESERVED = "RESERVED",
  OCCUPIED = "OCCUPIED",
  MAINTENANCE = "MAINTENANCE",
  DAMAGED = "DAMAGED",
  INACTIVE = "INACTIVE",
}

export enum ReservationStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXTENDED = "EXTENDED",
  EXPIRED = "EXPIRED",
}

export enum BoxActionType {
  RESERVATION_CREATED = "RESERVATION_CREATED",
  RESERVATION_UPDATED = "RESERVATION_UPDATED",
  RESERVATION_CANCELLED = "RESERVATION_CANCELLED",
  BOX_ACCESSED = "BOX_ACCESSED",
  BOX_CLOSED = "BOX_CLOSED",
  PAYMENT_PROCESSED = "PAYMENT_PROCESSED",
  EXTENDED_RENTAL = "EXTENDED_RENTAL",
  INSPECTION_COMPLETED = "INSPECTION_COMPLETED",
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
    const {
      warehouseId,
      startDate,
      endDate,
      minSize,
      maxSize,
      maxPrice,
      boxType,
      features,
    } = input;

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
                  in: ["PENDING", "ACTIVE", "EXTENDED"],
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
      whereClause.AND = features.map((feature) => ({
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
      orderBy: [{ pricePerDay: "asc" }, { size: "asc" }],
    });

    return availableBoxes;
  }

  // Création d'une réservation de box
  async createBoxReservation(
    input: BoxReservationCreateInput,
    clientId: string,
  ) {
    const {
      boxId: _boxId,
      startDate: _startDate,
      endDate: _endDate,
      notes: _notes,
    } = input;

    // Récupération des informations de la box
    const box = await db.box.findUnique({
      where: { id: boxId },
    });

    if (!box) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Box introuvable",
      });
    }

    // Vérification que la box est disponible
    const isBoxAvailable = await this.checkBoxAvailability(
      boxId,
      startDate,
      endDate,
    );

    if (!isBoxAvailable) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cette box n'est pas disponible pour les dates sélectionnées",
      });
    }

    // Calcul du nombre de jours
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24),
    );

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
      clientId,
    );

    return reservation;
  }

  // Vérification de la disponibilité d'une box pour une période donnée
  private async checkBoxAvailability(
    boxId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const existingReservations = await db.reservation.findMany({
      where: {
        boxId,
        status: {
          in: ["PENDING", "ACTIVE", "EXTENDED"],
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
  async updateBoxReservation(
    input: BoxReservationUpdateInput,
    clientId: string,
  ) {
    const {
      id: _id,
      endDate: _endDate,
      notes: _notes,
      status: _status,
    } = input;

    // Récupération de la réservation
    const reservation = await db.reservation.findUnique({
      where: { id },
      include: { box: true },
    });

    if (!reservation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Réservation introuvable",
      });
    }

    // Vérification des droits d'accès
    if (reservation.clientId !== clientId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à modifier cette réservation",
      });
    }

    // Calcul du nouveau prix si la date de fin change
    const totalPrice = reservation.totalPrice;

    if (endDate) {
      // Vérification que la nouvelle période est disponible
      if (endDate > reservation.endDate) {
        const isAvailable = await this.checkBoxAvailability(
          reservation.boxId,
          reservation.endDate,
          endDate,
        );

        if (!isAvailable) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La box n'est pas disponible pour la nouvelle période",
          });
        }
      }

      const days = Math.ceil(
        (endDate.getTime() - reservation.startDate.getTime()) /
          (1000 * 3600 * 24),
      );
      totalPrice = reservation.box.pricePerDay * days;
    }

    // Extension du type Reservation pour les propriétés additionnelles
    const reservationWithExtension = reservation as typeof reservation &
      PrismaReservationExtension;

    // Préparation des données de mise à jour
    const updateData = {
      endDate: endDate,
      status: status as unknown as string,
      notes: notes,
      totalPrice: endDate ? totalPrice : undefined,
      originalEndDate:
        !reservationWithExtension.originalEndDate &&
        endDate &&
        endDate > reservation.endDate
          ? reservation.endDate
          : undefined,
      extendedCount:
        endDate && endDate > reservation.endDate ? { increment: 1 } : undefined,
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
        details: `Réservation mise à jour${endDate ? ` avec nouvelle fin le ${endDate.toLocaleDateString()}` : ""}`,
      },
      clientId,
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
      orderBy: { startDate: "desc" },
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
        code: "FORBIDDEN",
        message:
          "Vous n'êtes pas autorisé à consulter l'historique de cette box",
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
  async createAvailabilitySubscription(
    input: BoxAvailabilitySubscriptionInput,
    clientId: string,
  ) {
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
        code: "BAD_REQUEST",
        message: "Au moins un critère de recherche doit être spécifié",
      });
    }

    // Vérification que les dates sont cohérentes
    if (startDate && endDate && startDate >= endDate) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "La date de fin doit être postérieure à la date de début",
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
      typeof result === "number"
        ? `${result}` // Cas où un nombre de lignes est retourné
        : "success"; // Fallback par défaut

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
        code: "NOT_FOUND",
        message: "Abonnement introuvable",
      });
    }

    if (subscriptions[0].clientId !== clientId) {
      throw new TRPCError({
        code: "FORBIDDEN",
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
                    in: ["PENDING", "ACTIVE", "EXTENDED"],
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
        const lastNotified = subscription.lastNotified
          ? new Date(subscription.lastNotified)
          : null;

        // Ne pas notifier plus d'une fois par jour
        if (
          !lastNotified ||
          now.getTime() - lastNotified.getTime() > 24 * 60 * 60 * 1000
        ) {
          // Création d'une notification avec données structurées
          const notificationData: NotificationData = {
            boxIds: availableBoxes.map((box) => box.id),
            subscriptionId: subscription.id,
          };

          // Sérialiser les données en JSON
          const serializedData = JSON.stringify(notificationData);

          await NotificationService.sendNotification({
            userId: subscription.clientId,
            title: "Box disponibles",
            message: `${availableBoxes.length} box ${availableBoxes.length > 1 ? "sont" : "est"} maintenant disponible${availableBoxes.length > 1 ? "s" : ""} selon vos critères`,
            type: "SYSTEM",
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
    const { reservationId: _reservationId, newEndDate: _newEndDate } = input;

    // Récupération de la réservation
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { box: true },
    });

    if (!reservation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Réservation introuvable",
      });
    }

    // Vérification des droits d'accès
    if (reservation.clientId !== clientId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à modifier cette réservation",
      });
    }

    // Vérification que la nouvelle date est postérieure à l'ancienne
    if (newEndDate <= reservation.endDate) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "La nouvelle date de fin doit être postérieure à la date actuelle",
      });
    }

    // Vérification que la box est disponible pour la période d'extension
    const isAvailable = await this.checkBoxAvailability(
      reservation.boxId,
      reservation.endDate,
      newEndDate,
    );

    if (!isAvailable) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "La box n'est pas disponible pour la période d'extension",
      });
    }

    // Calcul du prix supplémentaire
    const originalDays = Math.ceil(
      (reservation.endDate.getTime() - reservation.startDate.getTime()) /
        (1000 * 3600 * 24),
    );

    const newTotalDays = Math.ceil(
      (newEndDate.getTime() - reservation.startDate.getTime()) /
        (1000 * 3600 * 24),
    );

    const additionalDays = newTotalDays - originalDays;
    const additionalPrice = reservation.box.pricePerDay * additionalDays;
    const newTotalPrice = reservation.totalPrice + additionalPrice;

    // Extension du type Reservation pour les propriétés additionnelles
    const reservationWithExtension = reservation as typeof reservation &
      PrismaReservationExtension;

    // Préparation des données de mise à jour
    const updateData = {
      endDate: newEndDate,
      status: ReservationStatus.EXTENDED as unknown as string,
      totalPrice: newTotalPrice,
      originalEndDate: !reservationWithExtension.originalEndDate
        ? reservation.endDate
        : undefined,
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
      clientId,
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
    const { reservationId: _reservationId, accessCode: _accessCode } = input;

    // Récupération de la réservation
    const reservation = await db.reservation.findUnique({
      where: { id: reservationId },
      include: { box: true },
    });

    if (!reservation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Réservation introuvable",
      });
    }

    // Vérification des droits d'accès
    if (reservation.clientId !== clientId) {
      throw new TRPCError({
        code: "FORBIDDEN",
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
        code: "BAD_REQUEST",
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
      clientId,
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
        role: "ADMIN",
      },
    });

    if (!isAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Action réservée aux administrateurs",
      });
    }

    // Vérification que l'entrepôt existe
    const warehouse = await db.warehouse.findUnique({
      where: { id: input.warehouseId },
    });

    if (!warehouse) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Entrepôt introuvable",
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
      orderBy: [{ name: "asc" }],
    });
  }

  // Récupération des entrepôts actifs
  async getActiveWarehouses() {
    return db.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  // Récupération des recommandations de box pour un client basées sur son historique
  async getBoxRecommendationsForClient(
    clientId: string,
    filters?: {
      warehouseId?: string;
      maxPrice?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    try {
      // Récupérer l'historique du client pour comprendre ses préférences
      const clientHistory = await db.reservation.findMany({
        where: {
          clientId,
          status: { in: ["COMPLETED", "ACTIVE"] },
        },
        include: {
          box: {
            include: {
              warehouse: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      // Analyser les préférences du client
      const preferences = this.analyzeClientPreferences(clientHistory);

      // Construire les critères de recherche basés sur les préférences et les filtres
      const searchCriteria: Prisma.BoxWhereInput & PrismaBoxExtension = {
        isOccupied: false,
        ...(filters?.warehouseId && { warehouseId: filters.warehouseId }),
        ...(filters?.maxPrice && { pricePerDay: { lte: filters.maxPrice } }),

        // Recommandations basées sur l'historique
        ...(preferences.preferredBoxTypes.length > 0 && {
          boxType: {
            in: preferences.preferredBoxTypes as unknown as BoxType[],
          },
        }),
        ...(preferences.preferredSizeRange && {
          size: {
            gte: preferences.preferredSizeRange.min,
            lte: preferences.preferredSizeRange.max,
          },
        }),
      };

      // Si des dates sont spécifiées, vérifier la disponibilité
      if (filters?.startDate && filters?.endDate) {
        searchCriteria.NOT = {
          reservations: {
            some: {
              AND: [
                {
                  OR: [
                    {
                      startDate: { lte: filters.endDate },
                      endDate: { gte: filters.startDate },
                    },
                  ],
                },
                {
                  status: { in: ["PENDING", "ACTIVE", "EXTENDED"] },
                },
              ],
            },
          },
        };
      }

      // Récupérer les box recommandées
      const recommendedBoxes = await db.box.findMany({
        where: searchCriteria as Prisma.BoxWhereInput,
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              location: true,
              address: true,
              description: true,
            },
          },
        },
        orderBy: [{ pricePerDay: "asc" }, { size: "asc" }],
        take: 20,
      });

      return {
        recommendations: recommendedBoxes,
        preferences,
        total: recommendedBoxes.length,
      };
    } catch (_error) {
      console.error(
        "Erreur lors de la récupération des recommandations:",
        error,
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des recommandations",
      });
    }
  }

  // Analyser les préférences d'un client basées sur son historique
  private analyzeClientPreferences(reservationHistory: any[]) {
    if (reservationHistory.length === 0) {
      return {
        preferredBoxTypes: [],
        preferredSizeRange: null,
        preferredPriceRange: null,
        favoriteWarehouses: [],
        averageReservationDuration: 7,
      };
    }

    // Analyser les types de box préférés
    const boxTypeCounts: Record<string, number> = {};
    const sizesUsed: number[] = [];
    const pricesUsed: number[] = [];
    const warehouseCounts: Record<string, number> = {};
    const durations: number[] = [];

    reservationHistory.forEach((reservation) => {
      // Types de box
      const boxType = reservation.box.boxType;
      boxTypeCounts[boxType] = (boxTypeCounts[boxType] || 0) + 1;

      // Tailles
      if (reservation.box.size) {
        sizesUsed.push(reservation.box.size);
      }

      // Prix
      if (reservation.box.pricePerDay) {
        pricesUsed.push(reservation.box.pricePerDay);
      }

      // Entrepôts
      const warehouseId = reservation.box.warehouse.id;
      warehouseCounts[warehouseId] = (warehouseCounts[warehouseId] || 0) + 1;

      // Durées
      const duration = Math.ceil(
        (new Date(reservation.endDate).getTime() -
          new Date(reservation.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      durations.push(duration);
    });

    // Déterminer les préférences
    const preferredBoxTypes = Object.entries(boxTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    const preferredSizeRange =
      sizesUsed.length > 0
        ? {
            min: Math.min(...sizesUsed) * 0.8,
            max: Math.max(...sizesUsed) * 1.2,
          }
        : null;

    const preferredPriceRange =
      pricesUsed.length > 0
        ? {
            min: Math.min(...pricesUsed),
            max: Math.max(...pricesUsed) * 1.1,
          }
        : null;

    const favoriteWarehouses = Object.entries(warehouseCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([warehouseId]) => warehouseId);

    const averageReservationDuration =
      durations.length > 0
        ? Math.round(
            durations.reduce((sum, d) => sum + d, 0) / durations.length,
          )
        : 7;

    return {
      preferredBoxTypes,
      preferredSizeRange,
      preferredPriceRange,
      favoriteWarehouses,
      averageReservationDuration,
    };
  }

  // Récupérer les statistiques d'un client
  async getClientStorageStats(clientId: string) {
    try {
      // Statistiques de base
      const [totalReservations, activeReservations, completedReservations] =
        await Promise.all([
          db.reservation.count({ where: { clientId } }),
          db.reservation.count({
            where: {
              clientId,
              status: { in: ["PENDING", "ACTIVE", "EXTENDED"] },
            },
          }),
          db.reservation.count({
            where: {
              clientId,
              status: "COMPLETED",
            },
          }),
        ]);

      // Calcul des dépenses totales
      const reservations = await db.reservation.findMany({
        where: { clientId },
        select: { totalPrice: true, startDate: true, endDate: true },
      });

      const totalSpent = reservations.reduce((sum, r) => sum + r.totalPrice, 0);
      const totalDaysUsed = reservations.reduce((sum, r) => {
        const days = Math.ceil(
          (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return sum + days;
      }, 0);

      // Récupérer les box favorites (les plus utilisées)
      const boxUsage = await db.reservation.groupBy({
        by: ["boxId"],
        where: { clientId },
        _count: { boxId: true },
        orderBy: { _count: { boxId: "desc" } },
        take: 5,
      });

      const favoriteBoxes = await Promise.all(
        boxUsage.map(async (usage) => {
          const box = await db.box.findUnique({
            where: { id: usage.boxId },
            include: { warehouse: true },
          });
          return {
            box,
            usageCount: usage._count.boxId,
          };
        }),
      );

      // Calculer l'empreinte écologique (estimation)
      const estimatedCO2Saved = totalDaysUsed * 0.5; // 0.5kg CO2 économisé par jour d'utilisation
      const estimatedWastReduced = totalDaysUsed * 2; // 2kg de déchets d'emballage évités par jour

      return {
        totalReservations,
        activeReservations,
        completedReservations,
        totalSpent,
        totalDaysUsed,
        averageReservationValue:
          totalReservations > 0 ? totalSpent / totalReservations : 0,
        favoriteBoxes: favoriteBoxes.filter((fb) => fb.box),
        sustainability: {
          co2Saved: estimatedCO2Saved,
          wasteReduced: estimatedWastReduced,
          sustainabilityScore: Math.min(
            100,
            Math.round((totalDaysUsed / 365) * 100),
          ),
        },
      };
    } catch (_error) {
      console.error(
        "Erreur lors de la récupération des statistiques client:",
        error,
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }

  // Trouver des alternatives si une box n'est pas disponible
  async findBoxAlternatives(boxId: string, startDate: Date, endDate: Date) {
    try {
      // Récupérer la box originale pour connaître ses caractéristiques
      const originalBox = await db.box.findUnique({
        where: { id: boxId },
        include: { warehouse: true },
      });

      if (!originalBox) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Box non trouvée",
        });
      }

      // Chercher des alternatives similaires
      const alternatives = await db.box.findMany({
        where: {
          id: { not: boxId },
          warehouseId: originalBox.warehouseId, // Même entrepôt en priorité
          isOccupied: false,
          size: {
            gte: originalBox.size * 0.8, // Taille similaire (±20%)
            lte: originalBox.size * 1.2,
          },
          pricePerDay: {
            lte: originalBox.pricePerDay * 1.3, // Prix similaire ou inférieur (+30% max)
          },
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
                    status: { in: ["PENDING", "ACTIVE", "EXTENDED"] },
                  },
                ],
              },
            },
          },
        },
        include: {
          warehouse: true,
        },
        orderBy: [{ pricePerDay: "asc" }, { size: "asc" }],
        take: 10,
      });

      // Si pas d'alternatives dans le même entrepôt, chercher dans d'autres entrepôts
      let alternativesOtherWarehouses: any[] = [];
      if (alternatives.length < 3) {
        alternativesOtherWarehouses = await db.box.findMany({
          where: {
            id: { not: boxId },
            warehouseId: { not: originalBox.warehouseId },
            isOccupied: false,
            boxType: originalBox.boxType,
            size: {
              gte: originalBox.size * 0.7,
              lte: originalBox.size * 1.5,
            },
            pricePerDay: {
              lte: originalBox.pricePerDay * 1.5,
            },
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
                      status: { in: ["PENDING", "ACTIVE", "EXTENDED"] },
                    },
                  ],
                },
              },
            },
          },
          include: {
            warehouse: true,
          },
          orderBy: [{ pricePerDay: "asc" }],
          take: 5,
        });
      }

      const allAlternatives = [...alternatives, ...alternativesOtherWarehouses];

      // Calculer les scores de compatibilité
      const scoredAlternatives = allAlternatives.map((box) => {
        const compatibilityScore = 100;

        // Pénalité pour différence de taille
        const sizeDiff =
          Math.abs(box.size - originalBox.size) / originalBox.size;
        compatibilityScore -= sizeDiff * 30;

        // Pénalité pour différence de prix
        const priceDiff =
          Math.abs(box.pricePerDay - originalBox.pricePerDay) /
          originalBox.pricePerDay;
        compatibilityScore -= priceDiff * 20;

        // Pénalité si différent entrepôt
        if (box.warehouseId !== originalBox.warehouseId) {
          compatibilityScore -= 25;
        }

        // Pénalité si différent type
        if (box.boxType !== originalBox.boxType) {
          compatibilityScore -= 15;
        }

        return {
          ...box,
          compatibilityScore: Math.max(0, Math.round(compatibilityScore)),
        };
      });

      return {
        originalBox,
        alternatives: scoredAlternatives
          .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
          .slice(0, 8),
      };
    } catch (_error) {
      console.error("Erreur lors de la recherche d'alternatives:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la recherche d'alternatives",
      });
    }
  }

  // Calcul du prix prévisionnel avec remises potentielles
  async calculateOptimalPricing(input: {
    boxId: string;
    startDate: Date;
    endDate: Date;
    clientId: string;
  }) {
    try {
      const {
        boxId: _boxId,
        startDate: _startDate,
        endDate: _endDate,
        clientId: _clientId,
      } = input;

      // Récupérer la box et l'historique client
      const [box, clientHistory] = await Promise.all([
        db.box.findUnique({ where: { id: boxId } }),
        db.reservation.findMany({
          where: { clientId, status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      if (!box) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Box non trouvée",
        });
      }

      // Calcul de base
      const days = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const basePrice = box.pricePerDay * days;
      const finalPrice = basePrice;
      const discounts: Array<{
        type: string;
        amount: number;
        description: string;
      }> = [];

      // Remise fidélité
      if (clientHistory.length >= 5) {
        const loyaltyDiscount = Math.min(0.15, clientHistory.length * 0.02); // Max 15%
        const discountAmount = basePrice * loyaltyDiscount;
        discounts.push({
          type: "LOYALTY",
          amount: discountAmount,
          description: `Remise fidélité ${Math.round(loyaltyDiscount * 100)}% (${clientHistory.length} réservations)`,
        });
        finalPrice -= discountAmount;
      }

      // Remise longue durée
      if (days >= 30) {
        const longTermDiscount = 0.1; // 10% pour 30 jours ou plus
        const discountAmount = basePrice * longTermDiscount;
        discounts.push({
          type: "LONG_TERM",
          amount: discountAmount,
          description: `Remise longue durée 10% (${days} jours)`,
        });
        finalPrice -= discountAmount;
      } else if (days >= 14) {
        const mediumTermDiscount = 0.05; // 5% pour 14 jours ou plus
        const discountAmount = basePrice * mediumTermDiscount;
        discounts.push({
          type: "MEDIUM_TERM",
          amount: discountAmount,
          description: `Remise moyenne durée 5% (${days} jours)`,
        });
        finalPrice -= discountAmount;
      }

      // Remise early bird (réservation à l'avance)
      const daysInAdvance = Math.ceil(
        (startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysInAdvance >= 14) {
        const earlyBirdDiscount = 0.05; // 5% pour réservation 14 jours à l'avance
        const discountAmount = basePrice * earlyBirdDiscount;
        discounts.push({
          type: "EARLY_BIRD",
          amount: discountAmount,
          description: `Remise réservation anticipée 5% (${daysInAdvance} jours à l'avance)`,
        });
        finalPrice -= discountAmount;
      }

      // TVA
      const vatRate = 0.2; // 20%
      const vatAmount = finalPrice * vatRate;
      const totalWithVat = finalPrice + vatAmount;

      return {
        basePrice,
        discounts,
        totalDiscounts: discounts.reduce((sum, d) => sum + d.amount, 0),
        priceBeforeVat: finalPrice,
        vatAmount,
        finalPrice: totalWithVat,
        days,
        pricePerDay: box.pricePerDay,
        breakdown: {
          basePrice,
          discountedPrice: finalPrice,
          vat: vatAmount,
          total: totalWithVat,
        },
      };
    } catch (_error) {
      console.error("Erreur lors du calcul du prix optimal:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors du calcul du prix",
      });
    }
  }
}

export const storageService = new StorageService();
