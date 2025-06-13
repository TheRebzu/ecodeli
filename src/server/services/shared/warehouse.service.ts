import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

type WarehouseSearchInput = {
  includeBoxes?: boolean;
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number;
};

type BoxSearchInput = {
  warehouseId: string;
  startDate?: Date;
  endDate?: Date;
  availableOnly?: boolean;
};

type NearbySearchInput = {
  lat: number;
  lng: number;
  radius: number;
  maxResults: number;
};

type ReportIssueInput = {
  warehouseId: string;
  boxId?: string;
  issueType: string;
  description: string;
  priority: string;
};

type CapacityCheckInput = {
  warehouseId: string;
  startDate: Date;
  endDate: Date;
};

class WarehouseService {
  // Récupération des entrepôts actifs avec options de filtrage
  async getActiveWarehouses(input: WarehouseSearchInput = {}) {
    try {
      const whereClause: Prisma.WarehouseWhereInput = {
        isActive: true,
        ...(input.city && {
          OR: [
            { city: { contains: input.city, mode: "insensitive" } },
            { address: { contains: input.city, mode: "insensitive" } },
          ],
        }),
      };

      // Si des coordonnées sont fournies, filtrer par proximité
      let warehouses;
      if (input.lat && input.lng && input.radius) {
        // Utiliser une requête SQL brute pour calculer la distance
        warehouses = await db.$queryRaw`
          SELECT w.*, 
                 (6371 * acos(cos(radians(${input.lat})) * cos(radians(w.lat)) * 
                 cos(radians(w.lng) - radians(${input.lng})) + 
                 sin(radians(${input.lat})) * sin(radians(w.lat)))) AS distance
          FROM warehouses w
          WHERE w.is_active = true
            AND w.lat IS NOT NULL 
            AND w.lng IS NOT NULL
            AND (6371 * acos(cos(radians(${input.lat})) * cos(radians(w.lat)) * 
                 cos(radians(w.lng) - radians(${input.lng})) + 
                 sin(radians(${input.lat})) * sin(radians(w.lat)))) <= ${input.radius}
          ORDER BY distance ASC
        `;
      } else {
        warehouses = await db.warehouse.findMany({
          where: whereClause,
          include: input.includeBoxes
            ? {
                boxes: {
                  where: { isOccupied: false },
                  orderBy: { name: "asc" },
                },
              }
            : undefined,
          orderBy: { name: "asc" },
        });
      }

      return warehouses;
    } catch (_error) {
      console.error("Erreur lors de la récupération des entrepôts:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des entrepôts",
      });
    }
  }

  // Récupération des détails complets d'un entrepôt
  async getWarehouseDetails(warehouseId: string) {
    try {
      const warehouse = await db.warehouse.findUnique({
        where: { id: warehouseId },
        include: {
          boxes: {
            orderBy: [{ floorLevel: "asc" }, { name: "asc" }],
          },
        },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entrepôt introuvable",
        });
      }

      return warehouse;
    } catch (_error) {
      if (error instanceof TRPCError) throw error;
      console.error(
        "Erreur lors de la récupération des détails de l'entrepôt:",
        error,
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des détails",
      });
    }
  }

  // Récupération des boxes d'un entrepôt avec filtrage par disponibilité
  async getWarehouseBoxes(input: BoxSearchInput) {
    try {
      const {
        warehouseId: _warehouseId,
        startDate: _startDate,
        endDate: _endDate,
        availableOnly = true,
      } = input;

      let whereClause: Prisma.BoxWhereInput = {
        warehouseId,
      };

      // Si on veut seulement les boxes disponibles
      if (availableOnly) {
        whereClause.isOccupied = false;

        // Si des dates sont spécifiées, vérifier qu'il n'y a pas de réservation active
        if (startDate && endDate) {
          whereClause.NOT = {
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
          };
        }
      }

      const boxes = await db.box.findMany({
        where: whereClause,
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
        orderBy: [
          { floorLevel: "asc" },
          { pricePerDay: "asc" },
          { name: "asc" },
        ],
      });

      return boxes;
    } catch (_error) {
      console.error("Erreur lors de la récupération des boxes:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des boxes",
      });
    }
  }

  // Recherche d'entrepôts par proximité géographique
  async searchNearbyWarehouses(input: NearbySearchInput) {
    try {
      const {
        lat: _lat,
        lng: _lng,
        radius: _radius,
        maxResults: _maxResults,
      } = input;

      const nearbyWarehouses = await db.$queryRaw`
        SELECT w.*, 
               (6371 * acos(cos(radians(${lat})) * cos(radians(w.lat)) * 
               cos(radians(w.lng) - radians(${lng})) + 
               sin(radians(${lat})) * sin(radians(w.lat)))) AS distance,
               COUNT(b.id) as available_boxes
        FROM warehouses w
        LEFT JOIN boxes b ON w.id = b.warehouse_id AND b.is_occupied = false
        WHERE w.is_active = true
          AND w.lat IS NOT NULL 
          AND w.lng IS NOT NULL
          AND (6371 * acos(cos(radians(${lat})) * cos(radians(w.lat)) * 
               cos(radians(w.lng) - radians(${lng})) + 
               sin(radians(${lat})) * sin(radians(w.lat)))) <= ${radius}
        GROUP BY w.id
        ORDER BY distance ASC
        LIMIT ${maxResults}
      `;

      return nearbyWarehouses;
    } catch (_error) {
      console.error(
        "Erreur lors de la recherche d'entrepôts proximité:",
        error,
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la recherche par proximité",
      });
    }
  }

  // Obtenir les statistiques d'un entrepôt
  async getWarehouseStats(warehouseId: string, isAdmin: boolean = false) {
    try {
      const warehouse = await db.warehouse.findUnique({
        where: { id: warehouseId },
        include: {
          boxes: true,
        },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entrepôt introuvable",
        });
      }

      const totalBoxes = warehouse.boxes.length;
      const availableBoxes = warehouse.boxes.filter(
        (box) => !box.isOccupied,
      ).length;
      const occupiedBoxes = totalBoxes - availableBoxes;
      const occupancyRate =
        totalBoxes > 0 ? (occupiedBoxes / totalBoxes) * 100 : 0;

      const basicStats = {
        totalBoxes,
        availableBoxes,
        occupiedBoxes,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        averagePrice:
          warehouse.boxes.length > 0
            ? warehouse.boxes.reduce((sum, box) => sum + box.pricePerDay, 0) /
              warehouse.boxes.length
            : 0,
      };

      // Statistiques avancées pour les admins seulement
      if (isAdmin) {
        const monthlyRevenue = await db.$queryRaw`
          SELECT COALESCE(SUM(r.total_price), 0) as revenue
          FROM reservations r
          JOIN boxes b ON r.box_id = b.id
          WHERE b.warehouse_id = ${warehouseId}
            AND r.created_at >= NOW() - INTERVAL '30 days'
            AND r.status IN ('ACTIVE', 'COMPLETED')
        `;

        const popularBoxTypes = await db.$queryRaw`
          SELECT b.box_type, COUNT(r.id) as reservation_count
          FROM boxes b
          LEFT JOIN reservations r ON b.id = r.box_id AND r.status IN ('ACTIVE', 'COMPLETED')
          WHERE b.warehouse_id = ${warehouseId}
          GROUP BY b.box_type
          ORDER BY reservation_count DESC
        `;

        return {
          ...basicStats,
          monthlyRevenue:
            Array.isArray(monthlyRevenue) && monthlyRevenue.length > 0
              ? Number(monthlyRevenue[0].revenue)
              : 0,
          popularBoxTypes,
        };
      }

      return basicStats;
    } catch (_error) {
      if (error instanceof TRPCError) throw error;
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }

  // Récupération des créneaux de disponibilité
  async getAvailabilitySlots(input: any) {
    try {
      const {
        warehouseId: _warehouseId,
        startDate: _startDate,
        endDate: _endDate,
        boxType: _boxType,
        minSize: _minSize,
      } = input;

      let whereClause: Prisma.BoxWhereInput = {
        warehouseId,
        isOccupied: false,
        ...(boxType && { boxType }),
        ...(minSize && { size: { gte: minSize } }),
      };

      // Vérifier la disponibilité pour la période
      whereClause.NOT = {
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
      };

      const availableBoxes = await db.box.findMany({
        where: whereClause,
        orderBy: [{ pricePerDay: "asc" }, { size: "asc" }],
      });

      return {
        availableBoxes,
        totalAvailable: availableBoxes.length,
        period: { startDate, endDate },
      };
    } catch (_error) {
      console.error("Erreur lors de la récupération des créneaux:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des créneaux",
      });
    }
  }

  // Libération d'une box par un admin
  async releaseBox(boxId: string, reason?: string, adminId?: string) {
    try {
      // Annuler les réservations actives
      await db.reservation.updateMany({
        where: {
          boxId,
          status: { in: ["PENDING", "ACTIVE", "EXTENDED"] },
        },
        data: {
          status: "CANCELLED",
          notes: reason ? `Annulée par admin: ${reason}` : "Annulée par admin",
        },
      });

      // Libérer la box
      await db.box.update({
        where: { id: boxId },
        data: { isOccupied: false },
      });

      // Log de l'action admin
      if (adminId) {
        await db.$executeRaw`
          INSERT INTO box_usage_history (
            id, box_id, client_id, action_type, action_time, details
          ) VALUES (
            gen_random_uuid(), ${boxId}, ${adminId}, 'ADMIN_RELEASE', now(), ${reason || "Box libérée par admin"}
          )
        `;
      }

      return { success: true, message: "Box libérée avec succès" };
    } catch (_error) {
      console.error("Erreur lors de la libération de la box:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la libération de la box",
      });
    }
  }

  // Signalement d'un problème
  async reportIssue(input: ReportIssueInput, userId: string) {
    try {
      const {
        warehouseId: _warehouseId,
        boxId: _boxId,
        issueType: _issueType,
        description: _description,
        priority: _priority,
      } = input;

      // Vérifier que l'entrepôt existe
      const warehouse = await db.warehouse.findUnique({
        where: { id: warehouseId },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entrepôt introuvable",
        });
      }

      // Créer le signalement (table hypothétique warehouse_issues)
      const issue = await db.$executeRaw`
        INSERT INTO warehouse_issues (
          id, warehouse_id, box_id, reporter_id, issue_type, description, 
          priority, status, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${warehouseId}, ${boxId || null}, ${userId}, 
          ${issueType}, ${description}, ${priority}, 'OPEN', now(), now()
        )
      `;

      return { success: true, message: "Signalement enregistré avec succès" };
    } catch (_error) {
      console.error("Erreur lors du signalement:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors du signalement",
      });
    }
  }

  // Obtenir les horaires d'accès
  async getAccessHours(warehouseId: string) {
    try {
      const warehouse = await db.warehouse.findUnique({
        where: { id: warehouseId },
        select: {
          id: true,
          name: true,
          openingHours: true,
          contactPhone: true,
          accessInstructions: true,
        },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entrepôt introuvable",
        });
      }

      return warehouse;
    } catch (_error) {
      if (error instanceof TRPCError) throw error;
      console.error("Erreur lors de la récupération des horaires:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des horaires",
      });
    }
  }

  // Vérifier la capacité d'un entrepôt
  async checkCapacity(input: CapacityCheckInput) {
    try {
      const {
        warehouseId: _warehouseId,
        startDate: _startDate,
        endDate: _endDate,
      } = input;

      const totalBoxes = await db.box.count({
        where: { warehouseId },
      });

      const reservedBoxes = await db.reservation.count({
        where: {
          box: { warehouseId },
          status: { in: ["PENDING", "ACTIVE", "EXTENDED"] },
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
          ],
        },
      });

      const availableBoxes = totalBoxes - reservedBoxes;
      const capacityRate =
        totalBoxes > 0 ? (reservedBoxes / totalBoxes) * 100 : 0;

      return {
        totalBoxes,
        reservedBoxes,
        availableBoxes,
        capacityRate: Math.round(capacityRate * 100) / 100,
        hasCapacity: availableBoxes > 0,
      };
    } catch (_error) {
      console.error("Erreur lors de la vérification de capacité:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la vérification de capacité",
      });
    }
  }
}

export const warehouseService = new WarehouseService();
