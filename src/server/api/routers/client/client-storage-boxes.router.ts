import { z } from "zod";
import { router, protectedProcedure, clientProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { BoxType, ReservationStatus } from "@prisma/client";

export const clientStorageBoxesRouter = router({
  // Rechercher des box disponibles pour le stockage
  searchAvailableBoxes: clientProcedure
    .input(
      z.object({
        warehouseId: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
        minSize: z.number().optional(),
        maxSize: z.number().optional(),
        boxType: z.string().optional(),
        priceRange: z.object({
          min: z.number().optional(),
          max: z.number().optional(),
        }).optional(),
        city: z.string().optional(),
        features: z.array(z.string()).optional(),
        sortBy: z.enum(["price", "size", "distance", "availability"]).default("price"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        isActive: true,
        warehouse: {
          isActive: true,
        },
      };

      // Filtres de base
      if (input.warehouseId) {
        where.warehouseId = input.warehouseId;
      }

      if (input.minSize) {
        where.size = { ...where.size, gte: input.minSize };
      }

      if (input.maxSize) {
        where.size = { ...where.size, lte: input.maxSize };
      }

      if (input.boxType) {
        where.boxType = input.boxType as BoxType;
      }

      if (input.priceRange?.min) {
        where.pricePerDay = { ...where.pricePerDay, gte: input.priceRange.min };
      }

      if (input.priceRange?.max) {
        where.pricePerDay = { ...where.pricePerDay, lte: input.priceRange.max };
      }

      if (input.city) {
        where.warehouse = {
          ...where.warehouse,
          city: {
            contains: input.city,
            mode: "insensitive",
          },
        };
      }

      if (input.features && input.features.length > 0) {
        where.features = {
          hasEvery: input.features,
        };
      }

      // Vérifier la disponibilité pour les dates demandées
      where.NOT = {
        reservations: {
          some: {
            OR: [
              {
                AND: [
                  { startDate: { lte: input.startDate } },
                  { endDate: { gte: input.startDate } },
                  { status: { not: "CANCELLED" } },
                ],
              },
              {
                AND: [
                  { startDate: { lte: input.endDate } },
                  { endDate: { gte: input.endDate } },
                  { status: { not: "CANCELLED" } },
                ],
              },
              {
                AND: [
                  { startDate: { gte: input.startDate } },
                  { endDate: { lte: input.endDate } },
                  { status: { not: "CANCELLED" } },
                ],
              },
            ],
          },
        },
      };

      // Tri
      const orderBy: any = {};
      switch (input.sortBy) {
        case "price":
          orderBy.pricePerDay = input.sortOrder;
          break;
        case "size":
          orderBy.size = input.sortOrder;
          break;
        case "availability":
          orderBy.createdAt = input.sortOrder;
          break;
        default:
          orderBy.pricePerDay = input.sortOrder;
      }

      const [boxes, total] = await Promise.all([
        ctx.db.storageBox.findMany({
          where,
          include: {
            warehouse: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                postalCode: true,
                lat: true,
                lng: true,
                description: true,
                contactPhone: true,
                openingHours: true,
              },
            },
            reservations: {
              where: {
                status: { not: "CANCELLED" },
              },
              select: {
                startDate: true,
                endDate: true,
                status: true,
              },
            },
          },
          orderBy,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.db.storageBox.count({ where }),
      ]);

      return {
        boxes: boxes.map((box) => ({
          id: box.id,
          name: box.name,
          size: box.size,
          pricePerDay: box.pricePerDay,
          boxType: box.boxType,
          locationDescription: box.locationDescription,
          floorLevel: box.floorLevel,
          features: box.features,
          isOccupied: box.reservations.some(
            (r) => r.status === "ACTIVE" || r.status === "CONFIRMED"
          ),
          warehouse: box.warehouse,
          nextAvailableDate: box.reservations
            .filter((r) => r.status !== "CANCELLED")
            .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())[0]?.endDate,
        })),
        total,
        hasMore: (input.page * input.limit) < total,
      };
    }),

  // Calculer le prix optimal pour une réservation
  calculateOptimalPricing: clientProcedure
    .input(
      z.object({
        boxId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Récupérer les informations de la box
      const box = await ctx.db.storageBox.findUnique({
        where: { id: input.boxId },
        include: {
          warehouse: true,
        },
      });

      if (!box) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Box non trouvée",
        });
      }

      // Calculer la durée en jours
      const days = Math.ceil(
        (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (days <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La date de fin doit être après la date de début",
        });
      }

      // Prix de base
      const basePrice = box.pricePerDay * days;

      // Récupérer le profil client pour les remises
      const client = await ctx.db.client.findUnique({
        where: { userId },
        include: {
          storageReservations: {
            where: { status: { not: "CANCELLED" } },
          },
        },
      });

      const discounts: Array<{
        type: string;
        description: string;
        amount: number;
        percentage: number;
      }> = [];

      // Remise pour réservation anticipée (14 jours à l'avance)
      const daysUntilStart = Math.ceil(
        (input.startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilStart >= 14) {
        const discountAmount = basePrice * 0.05;
        discounts.push({
          type: "EARLY_BOOKING",
          description: "Réservation anticipée (14+ jours)",
          amount: discountAmount,
          percentage: 5,
        });
      }

      // Remise pour durée longue
      if (days >= 30) {
        const discountAmount = basePrice * 0.1;
        discounts.push({
          type: "LONG_DURATION",
          description: "Réservation longue durée (30+ jours)",
          amount: discountAmount,
          percentage: 10,
        });
      } else if (days >= 14) {
        const discountAmount = basePrice * 0.05;
        discounts.push({
          type: "MEDIUM_DURATION",
          description: "Réservation moyenne durée (14+ jours)",
          amount: discountAmount,
          percentage: 5,
        });
      }

      // Remise fidélité basée sur le nombre de réservations précédentes
      const completedReservations = client?.storageReservations.filter(
        (r) => r.status === "COMPLETED"
      ).length || 0;

      let loyaltyPercentage = 0;
      if (completedReservations >= 10) {
        loyaltyPercentage = 15;
      } else if (completedReservations >= 5) {
        loyaltyPercentage = 10;
      } else if (completedReservations >= 2) {
        loyaltyPercentage = 5;
      }

      if (loyaltyPercentage > 0) {
        const discountAmount = basePrice * (loyaltyPercentage / 100);
        discounts.push({
          type: "LOYALTY",
          description: `Fidélité client (${completedReservations} réservations)`,
          amount: discountAmount,
          percentage: loyaltyPercentage,
        });
      }

      // Calculer le total des remises
      const totalDiscounts = discounts.reduce((sum, discount) => sum + discount.amount, 0);
      const priceAfterDiscounts = Math.max(0, basePrice - totalDiscounts);

      // Calculer la TVA (20%)
      const priceBeforeVat = priceAfterDiscounts;
      const vatAmount = priceBeforeVat * 0.2;
      const finalPrice = priceBeforeVat + vatAmount;

      return {
        boxId: input.boxId,
        boxName: box.name,
        warehouseName: box.warehouse.name,
        startDate: input.startDate,
        endDate: input.endDate,
        days,
        basePrice,
        discounts,
        totalDiscounts,
        priceAfterDiscounts,
        priceBeforeVat,
        vatAmount,
        finalPrice,
        pricePerDay: finalPrice / days,
        savings: totalDiscounts,
        savingsPercentage: basePrice > 0 ? (totalDiscounts / basePrice) * 100 : 0,
      };
    }),

  // Créer une réservation de stockage
  createReservation: clientProcedure
    .input(
      z.object({
        boxId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
        notes: z.string().optional(),
        paymentMethodId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que la box existe et est disponible
      const box = await ctx.db.storageBox.findUnique({
        where: { id: input.boxId },
        include: {
          reservations: {
            where: {
              AND: [
                { status: { not: "CANCELLED" } },
                {
                  OR: [
                    {
                      AND: [
                        { startDate: { lte: input.startDate } },
                        { endDate: { gte: input.startDate } },
                      ],
                    },
                    {
                      AND: [
                        { startDate: { lte: input.endDate } },
                        { endDate: { gte: input.endDate } },
                      ],
                    },
                    {
                      AND: [
                        { startDate: { gte: input.startDate } },
                        { endDate: { lte: input.endDate } },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      });

      if (!box) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Box non trouvée",
        });
      }

      if (box.reservations.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "La box n'est pas disponible pour ces dates",
        });
      }

      // Calculer le prix avec les remises
      const days = Math.ceil(
        (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const basePrice = box.pricePerDay * days;
      const finalPrice = basePrice * 1.2; // Prix TTC approximatif

      // Créer la réservation
      const reservation = await ctx.db.storageReservation.create({
        data: {
          clientId: userId,
          boxId: input.boxId,
          startDate: input.startDate,
          endDate: input.endDate,
          totalPrice: finalPrice,
          status: "PENDING",
          notes: input.notes,
        },
        include: {
          box: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      return reservation;
    }),

  // Gérer les réservations de stockage du client
  getClientReservations: clientProcedure
    .input(
      z.object({
        status: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const where: any = {
        clientId: userId,
      };

      if (input.status && input.status !== "all") {
        where.status = input.status as ReservationStatus;
      }

      const [reservations, total] = await Promise.all([
        ctx.db.storageReservation.findMany({
          where,
          include: {
            box: {
              include: {
                warehouse: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    city: true,
                    contactPhone: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.db.storageReservation.count({ where }),
      ]);

      return {
        reservations,
        total,
        hasMore: (input.page * input.limit) < total,
      };
    }),

  // Annuler une réservation
  cancelReservation: clientProcedure
    .input(
      z.object({
        reservationId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que la réservation appartient au client
      const reservation = await ctx.db.storageReservation.findFirst({
        where: {
          id: input.reservationId,
          clientId: userId,
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
          message: "Cette réservation est déjà annulée",
        });
      }

      if (reservation.status === "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Impossible d'annuler une réservation terminée",
        });
      }

      // Calculer les frais d'annulation si nécessaire
      const hoursUntilStart = (reservation.startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      let cancellationFee = 0;

      if (hoursUntilStart < 24) {
        cancellationFee = reservation.totalPrice * 0.1; // 10% de frais si annulation < 24h
      }

      // Mettre à jour la réservation
      const cancelledReservation = await ctx.db.storageReservation.update({
        where: { id: input.reservationId },
        data: {
          status: "CANCELLED",
          cancellationReason: input.reason,
          cancellationFee,
          cancelledAt: new Date(),
        },
        include: {
          box: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      return {
        reservation: cancelledReservation,
        cancellationFee,
        refundAmount: reservation.totalPrice - cancellationFee,
      };
    }),

  // Créer une notification de disponibilité
  createAvailabilityNotification: clientProcedure
    .input(
      z.object({
        boxId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier qu'au moins un moyen de contact est fourni
      if (!input.email && !input.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Un email ou un téléphone doit être fourni",
        });
      }

      // Créer la notification
      const notification = await ctx.db.storageAvailabilityNotification.create({
        data: {
          clientId: userId,
          boxId: input.boxId,
          startDate: input.startDate,
          endDate: input.endDate,
          email: input.email,
          phone: input.phone,
          isActive: true,
        },
        include: {
          box: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      return notification;
    }),

  // Extensions de réservation
  extendReservation: clientProcedure
    .input(
      z.object({
        reservationId: z.string(),
        newEndDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que la réservation existe et appartient au client
      const reservation = await ctx.db.storageReservation.findFirst({
        where: {
          id: input.reservationId,
          clientId: userId,
        },
        include: {
          box: true,
        },
      });

      if (!reservation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Réservation non trouvée",
        });
      }

      if (reservation.status !== "ACTIVE" && reservation.status !== "CONFIRMED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Seules les réservations actives peuvent être prolongées",
        });
      }

      if (input.newEndDate <= reservation.endDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La nouvelle date de fin doit être après la date de fin actuelle",
        });
      }

      // Vérifier la disponibilité pour la période d'extension
      const conflictingReservations = await ctx.db.storageReservation.findMany({
        where: {
          boxId: reservation.boxId,
          id: { not: input.reservationId },
          status: { not: "CANCELLED" },
          OR: [
            {
              AND: [
                { startDate: { lte: reservation.endDate } },
                { endDate: { gte: input.newEndDate } },
              ],
            },
            {
              AND: [
                { startDate: { gte: reservation.endDate } },
                { startDate: { lte: input.newEndDate } },
              ],
            },
          ],
        },
      });

      if (conflictingReservations.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "La box n'est pas disponible pour la période d'extension demandée",
        });
      }

      // Calculer le coût additionnel
      const additionalDays = Math.ceil(
        (input.newEndDate.getTime() - reservation.endDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const additionalCost = reservation.box.pricePerDay * additionalDays * 1.2; // TTC

      // Mettre à jour la réservation
      const updatedReservation = await ctx.db.storageReservation.update({
        where: { id: input.reservationId },
        data: {
          endDate: input.newEndDate,
          totalPrice: reservation.totalPrice + additionalCost,
        },
        include: {
          box: {
            include: {
              warehouse: true,
            },
          },
        },
      });

      return {
        reservation: updatedReservation,
        additionalCost,
        additionalDays,
      };
    }),
});