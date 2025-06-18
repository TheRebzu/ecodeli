import { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Logger de fallback simple
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta),
};

// Types pour le service de stockage
export interface BoxReservation {
  id: string;
  userId: string;
  warehouseId: string;
  boxNumber: string;
  boxType: string;
  size: string;
  startDate: Date;
  endDate: Date;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";
  totalCost: number;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  specialRequirements?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StorageWarehouse {
  id: string;
  name: string;
  address: string;
  city: string;
  availableBoxes: number;
  totalBoxes: number;
  pricePerMonth: number;
  features: string[];
  operatingHours: string;
  contactInfo: string;
  isActive: boolean;
}

export interface BoxAvailability {
  boxId: string;
  boxNumber: string;
  boxType: string;
  size: string;
  isAvailable: boolean;
  pricePerMonth: number;
  features: string[];
  nextAvailableDate?: Date;
}

// Schémas de validation
const CreateReservationSchema = z.object({
  warehouseId: z.string().min(1, "ID d'entrepôt requis"),
  boxType: z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"], {
    errorMap: () => ({ message: "Type de box invalide" }),
  }),
  startDate: z.date({
    errorMap: () => ({ message: "Date de début requise" }),
  }),
  endDate: z.date({
    errorMap: () => ({ message: "Date de fin requise" }),
  }),
  specialRequirements: z.string().optional(),
});

const UpdateReservationSchema = z.object({
  reservationId: z.string().min(1, "ID de réservation requis"),
  endDate: z.date().optional(),
  specialRequirements: z.string().optional(),
  status: z.enum(["ACTIVE", "CANCELLED"]).optional(),
});

class StorageService {
  constructor(private db: PrismaClient) {}

  /**
   * Crée une nouvelle réservation de box
   */
  async createBoxReservation(
    input: z.infer<typeof CreateReservationSchema>,
    userId: string,
  ): Promise<BoxReservation> {
    try {
      // Validation des données d'entrée
      const validatedInput = CreateReservationSchema.parse(input);

      // Vérifier que la date de fin est après la date de début
      if (validatedInput.endDate <= validatedInput.startDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La date de fin doit être postérieure à la date de début",
        });
      }

      // Vérifier que l'utilisateur existe
      const user = await this.db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilisateur non trouvé",
        });
      }

      // Vérifier que l'entrepôt existe et est actif
      const warehouse = await this.db.storageWarehouse.findUnique({
        where: { id: validatedInput.warehouseId },
      });

      if (!warehouse || !warehouse.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entrepôt non trouvé ou inactif",
        });
      }

      // Trouver un box disponible du type demandé
      const availableBox = await this.findAvailableBox(
        validatedInput.warehouseId,
        validatedInput.boxType,
        validatedInput.startDate,
        validatedInput.endDate,
      );

      if (!availableBox) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Aucun box disponible pour cette période",
        });
      }

      // Calculer le coût total
      const totalCost = this.calculateCost(
        availableBox.pricePerMonth,
        validatedInput.startDate,
        validatedInput.endDate,
      );

      // Créer la réservation
      const reservation = await this.db.boxReservation.create({
        data: {
          userId,
          warehouseId: validatedInput.warehouseId,
          boxId: availableBox.id,
          boxNumber: availableBox.boxNumber,
          boxType: validatedInput.boxType,
          size: availableBox.size,
          startDate: validatedInput.startDate,
          endDate: validatedInput.endDate,
          status: "PENDING",
          totalCost,
          paymentStatus: "PENDING",
          specialRequirements: validatedInput.specialRequirements,
        },
        include: {
          user: {
            select: { name: true, email: true },
          },
          warehouse: {
            select: { name: true, address: true },
          },
        },
      });

      logger.info("Réservation de box créée", {
        reservationId: reservation.id,
        userId,
        warehouseId: validatedInput.warehouseId,
        boxType: validatedInput.boxType,
      });

      return reservation as BoxReservation;
    } catch (error) {
      logger.error("Erreur lors de la création de réservation", {
        error: error instanceof Error ? error.message : "Erreur inconnue",
        userId,
        input,
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la création de la réservation",
      });
    }
  }

  /**
   * Met à jour une réservation existante
   */
  async updateReservation(
    input: z.infer<typeof UpdateReservationSchema>,
    userId: string,
  ): Promise<BoxReservation> {
    try {
      const validatedInput = UpdateReservationSchema.parse(input);

      // Vérifier que la réservation existe et appartient à l'utilisateur
      const existingReservation = await this.db.boxReservation.findFirst({
        where: {
          id: validatedInput.reservationId,
          userId,
        },
      });

      if (!existingReservation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Réservation non trouvée",
        });
      }

      // Préparer les données de mise à jour
      const updateData: any = {};

      if (validatedInput.endDate) {
        if (validatedInput.endDate <= existingReservation.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La nouvelle date de fin doit être postérieure à la date de début",
          });
        }

        // Recalculer le coût si la date de fin change
        const box = await this.db.storageBox.findUnique({
          where: { id: existingReservation.boxId },
        });

        if (box) {
          updateData.totalCost = this.calculateCost(
            box.pricePerMonth,
            existingReservation.startDate,
            validatedInput.endDate,
          );
        }

        updateData.endDate = validatedInput.endDate;
      }

      if (validatedInput.specialRequirements !== undefined) {
        updateData.specialRequirements = validatedInput.specialRequirements;
      }

      if (validatedInput.status) {
        updateData.status = validatedInput.status;
      }

      // Mettre à jour la réservation
      const updatedReservation = await this.db.boxReservation.update({
        where: { id: validatedInput.reservationId },
        data: updateData,
        include: {
          user: {
            select: { name: true, email: true },
          },
          warehouse: {
            select: { name: true, address: true },
          },
        },
      });

      logger.info("Réservation mise à jour", {
        reservationId: validatedInput.reservationId,
        userId,
        changes: updateData,
      });

      return updatedReservation as BoxReservation;
    } catch (error) {
      logger.error("Erreur lors de la mise à jour de réservation", {
        error: error instanceof Error ? error.message : "Erreur inconnue",
        userId,
        input,
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la mise à jour de la réservation",
      });
    }
  }

  /**
   * Récupère toutes les réservations d'un utilisateur
   */
  async getUserReservations(userId: string): Promise<BoxReservation[]> {
    try {
      const reservations = await this.db.boxReservation.findMany({
        where: { userId },
        include: {
          user: {
            select: { name: true, email: true },
          },
          warehouse: {
            select: { name: true, address: true, city: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return reservations as BoxReservation[];
    } catch (error) {
      logger.error("Erreur lors de la récupération des réservations", {
        error: error instanceof Error ? error.message : "Erreur inconnue",
        userId,
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des réservations",
      });
    }
  }

  /**
   * Récupère les entrepôts disponibles
   */
  async getAvailableWarehouses(): Promise<StorageWarehouse[]> {
    try {
      const warehouses = await this.db.storageWarehouse.findMany({
        where: { isActive: true },
        include: {
          boxes: {
            where: { isActive: true },
          },
        },
      });

      return warehouses.map((warehouse: any) => ({
        id: warehouse.id,
        name: warehouse.name,
        address: warehouse.address,
        city: warehouse.city,
        availableBoxes: warehouse.boxes.filter((box: any) => !box.isOccupied).length,
        totalBoxes: warehouse.boxes.length,
        pricePerMonth: warehouse.basePricePerMonth,
        features: warehouse.features as string[],
        operatingHours: warehouse.operatingHours,
        contactInfo: warehouse.contactInfo,
        isActive: warehouse.isActive,
      }));
    } catch (error) {
      logger.error("Erreur lors de la récupération des entrepôts", {
        error: error instanceof Error ? error.message : "Erreur inconnue",
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des entrepôts",
      });
    }
  }

  /**
   * Vérifie la disponibilité des box dans un entrepôt
   */
  async checkBoxAvailability(
    warehouseId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BoxAvailability[]> {
    try {
      const boxes = await this.db.storageBox.findMany({
        where: {
          warehouseId,
          isActive: true,
        },
        include: {
          reservations: {
            where: {
              OR: [
                {
                  AND: [
                    { startDate: { lte: endDate } },
                    { endDate: { gte: startDate } },
                  ],
                },
              ],
              status: { in: ["ACTIVE", "PENDING"] },
            },
          },
        },
      });

      return boxes.map((box: any) => ({
        boxId: box.id,
        boxNumber: box.boxNumber,
        boxType: box.boxType,
        size: box.size,
        isAvailable: box.reservations.length === 0,
        pricePerMonth: box.pricePerMonth,
        features: box.features as string[],
        nextAvailableDate: this.getNextAvailableDate(box.reservations),
      }));
    } catch (error) {
      logger.error("Erreur lors de la vérification de disponibilité", {
        error: error instanceof Error ? error.message : "Erreur inconnue",
        warehouseId,
        startDate,
        endDate,
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la vérification de disponibilité",
      });
    }
  }

  /**
   * Annule une réservation
   */
  async cancelReservation(reservationId: string, userId: string): Promise<void> {
    try {
      // Vérifier que la réservation existe et appartient à l'utilisateur
      const reservation = await this.db.boxReservation.findFirst({
        where: {
          id: reservationId,
          userId,
        },
      });

      if (!reservation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Réservation non trouvée",
        });
      }

      if (reservation.status === "CANCELLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La réservation est déjà annulée",
        });
      }

      // Mettre à jour le statut
      await this.db.boxReservation.update({
        where: { id: reservationId },
        data: {
          status: "CANCELLED",
          updatedAt: new Date(),
        },
      });

      logger.info("Réservation annulée", {
        reservationId,
        userId,
      });
    } catch (error) {
      logger.error("Erreur lors de l'annulation de réservation", {
        error: error instanceof Error ? error.message : "Erreur inconnue",
        reservationId,
        userId,
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'annulation de la réservation",
      });
    }
  }

  /**
   * Méthodes privées d'aide
   */
  private async findAvailableBox(
    warehouseId: string,
    boxType: string,
    startDate: Date,
    endDate: Date,
  ) {
    const availableBoxes = await this.db.storageBox.findMany({
      where: {
        warehouseId,
        boxType,
        isActive: true,
        reservations: {
          none: {
            OR: [
              {
                AND: [
                  { startDate: { lte: endDate } },
                  { endDate: { gte: startDate } },
                ],
              },
            ],
            status: { in: ["ACTIVE", "PENDING"] },
          },
        },
      },
      orderBy: { pricePerMonth: "asc" },
      take: 1,
    });

    return availableBoxes[0] || null;
  }

  private calculateCost(pricePerMonth: number, startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = diffDays / 30.44; // Moyenne de jours par mois
    
    return Math.round(pricePerMonth * diffMonths * 100) / 100; // Arrondir à 2 décimales
  }

  private getNextAvailableDate(reservations: any[]): Date | undefined {
    if (reservations.length === 0) return undefined;
    
    const sortedReservations = reservations
      .filter(r => r.status === "ACTIVE" || r.status === "PENDING")
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    
    const lastReservation = sortedReservations[sortedReservations.length - 1];
    return lastReservation ? new Date(lastReservation.endDate) : undefined;
  }
}

// Instance singleton du service
let storageServiceInstance: StorageService | null = null;

export const getStorageService = (db: PrismaClient): StorageService => {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService(db);
  }
  return storageServiceInstance;
};

// Export de l'ancien service pour compatibilité (deprecated)
export const storageService = {
  async createBoxReservation(input: any, userId: string) {
    // Cette méthode est dépréciée, utiliser getStorageService() à la place
    console.warn("storageService.createBoxReservation est déprécié. Utilisez getStorageService() à la place.");
    return { id: "generated-id", ...input, userId };
  },
};
