import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";

/**
 * Router pour la gestion des boîtes de livraison des clients
 * Système de boîtes sécurisées pour les livraisons sans contact
 */
export const clientBoxesRouter = createTRPCRouter({
  // Récupérer toutes les boîtes du client
  getMyBoxes: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE", "BROKEN"]).optional(),
        type: z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.CLIENT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent accéder à leurs boîtes",
        });
      }

      try {
        const where = {
          clientId: user.id,
          ...(input.status && { status: input.status }),
          ...(input.type && { type: input.type }),
        };

        const [boxes, total] = await Promise.all([
          ctx.db.deliveryBox.findMany({
            where,
            include: {
              location: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  coordinates: true,
                  operatingHours: true,
                },
              },
              deliveries: {
                where: {
                  status: { in: ["PENDING", "IN_TRANSIT", "DELIVERED"] },
                },
                orderBy: { createdAt: "desc" },
                take: 3,
                include: {
                  deliverer: {
                    select: { name: true, image: true },
                  },
                  announcement: {
                    select: { title: true },
                  },
                },
              },
              _count: {
                select: {
                  deliveries: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.deliveryBox.count({ where }),
        ]);

        return {
          success: true,
          data: {
            boxes,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des boîtes:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des boîtes",
        });
      }
    }),

  // Créer une nouvelle boîte
  createBox: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3, "Nom de la boîte requis"),
        type: z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]),
        locationId: z.string(),
        description: z.string().optional(),
        accessCode: z.string().min(4).max(8).optional(), // Code d'accès personnalisé
        features: z.object({
          hasRefrigeration: z.boolean().default(false),
          hasSecurityCamera: z.boolean().default(false),
          hasTemperatureControl: z.boolean().default(false),
          hasNotificationSystem: z.boolean().default(true),
          isWeatherproof: z.boolean().default(true),
        }).optional(),
        deliveryInstructions: z.string().max(500).optional(),
        maxWeight: z.number().positive().default(10), // kg
        dimensions: z.object({
          width: z.number().positive(),
          height: z.number().positive(),
          depth: z.number().positive(),
        }),
        monthlyRent: z.number().positive().optional(), // Pour les boîtes payantes
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.CLIENT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent créer des boîtes",
        });
      }

      try {
        // Vérifier que l'emplacement existe
        const location = await ctx.db.deliveryLocation.findUnique({
          where: { id: input.locationId },
        });

        if (!location) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Emplacement non trouvé",
          });
        }

        // Vérifier la limite de boîtes par client
        const existingBoxesCount = await ctx.db.deliveryBox.count({
          where: {
            clientId: user.id,
            status: { in: ["ACTIVE", "MAINTENANCE"] },
          },
        });

        if (existingBoxesCount >= 5) { // Limite à 5 boîtes actives
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous avez atteint la limite de boîtes actives (5 maximum)",
          });
        }

        // Générer un code d'accès unique si pas fourni
        let accessCode = input.accessCode;
        if (!accessCode) {
          accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        // Vérifier l'unicité du code d'accès pour cette localisation
        const existingCodeBox = await ctx.db.deliveryBox.findFirst({
          where: {
            locationId: input.locationId,
            accessCode,
            status: { not: "INACTIVE" },
          },
        });

        if (existingCodeBox) {
          // Générer un nouveau code
          accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        // Calculer le volume
        const volume = input.dimensions.width * input.dimensions.height * input.dimensions.depth;

        // Créer la boîte
        const box = await ctx.db.deliveryBox.create({
          data: {
            clientId: user.id,
            locationId: input.locationId,
            name: input.name,
            type: input.type,
            description: input.description,
            accessCode,
            features: input.features || {},
            deliveryInstructions: input.deliveryInstructions,
            maxWeight: input.maxWeight,
            dimensions: input.dimensions,
            volume,
            monthlyRent: input.monthlyRent,
            status: "ACTIVE",
          },
          include: {
            location: {
              select: {
                name: true,
                address: true,
                coordinates: true,
              },
            },
          },
        });

        // Créer une notification de confirmation
        await ctx.db.notification.create({
          data: {
            userId: user.id,
            type: "BOX_CREATED",
            title: "Boîte de livraison créée",
            message: `Votre boîte "${input.name}" a été créée avec succès à ${location.name}`,
            data: {
              boxId: box.id,
              accessCode,
              locationName: location.name,
            },
          },
        });

        console.log(`📦 Nouvelle boîte créée: ${box.name} (${accessCode}) pour ${user.name}`);

        return {
          success: true,
          data: box,
          message: "Boîte créée avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la création de la boîte:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la boîte",
        });
      }
    }),

  // Mettre à jour une boîte
  updateBox: protectedProcedure
    .input(
      z.object({
        boxId: z.string(),
        name: z.string().min(3).optional(),
        description: z.string().optional(),
        features: z.object({
          hasRefrigeration: z.boolean().optional(),
          hasSecurityCamera: z.boolean().optional(),
          hasTemperatureControl: z.boolean().optional(),
          hasNotificationSystem: z.boolean().optional(),
          isWeatherproof: z.boolean().optional(),
        }).optional(),
        deliveryInstructions: z.string().max(500).optional(),
        maxWeight: z.number().positive().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.CLIENT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const box = await ctx.db.deliveryBox.findFirst({
          where: {
            id: input.boxId,
            clientId: user.id,
          },
        });

        if (!box) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Boîte non trouvée",
          });
        }

        // Vérifier qu'il n'y a pas de livraisons en cours
        if (input.status === "INACTIVE") {
          const activeDeliveries = await ctx.db.delivery.count({
            where: {
              boxId: input.boxId,
              status: { in: ["PENDING", "IN_TRANSIT"] },
            },
          });

          if (activeDeliveries > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Impossible de désactiver une boîte avec des livraisons en cours",
            });
          }
        }

        // Filtrer les champs non définis
        const updateData = Object.fromEntries(
          Object.entries({
            name: input.name,
            description: input.description,
            features: input.features ? { ...box.features, ...input.features } : undefined,
            deliveryInstructions: input.deliveryInstructions,
            maxWeight: input.maxWeight,
            status: input.status,
            updatedAt: new Date(),
          }).filter(([, value]) => value !== undefined)
        );

        const updatedBox = await ctx.db.deliveryBox.update({
          where: { id: input.boxId },
          data: updateData,
          include: {
            location: {
              select: { name: true, address: true },
            },
          },
        });

        return {
          success: true,
          data: updatedBox,
          message: "Boîte mise à jour avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la mise à jour:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour de la boîte",
        });
      }
    }),

  // Obtenir l'historique des livraisons d'une boîte
  getBoxDeliveries: protectedProcedure
    .input(
      z.object({
        boxId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.enum(["PENDING", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.CLIENT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        // Vérifier que la boîte appartient à l'utilisateur
        const box = await ctx.db.deliveryBox.findFirst({
          where: {
            id: input.boxId,
            clientId: user.id,
          },
        });

        if (!box) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Boîte non trouvée",
          });
        }

        const where = {
          boxId: input.boxId,
          ...(input.status && { status: input.status }),
          ...(input.startDate && input.endDate && {
            createdAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          }),
        };

        const [deliveries, total] = await Promise.all([
          ctx.db.delivery.findMany({
            where,
            include: {
              deliverer: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              announcement: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                },
              },
              tracking: {
                orderBy: { timestamp: "desc" },
                take: 1,
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.delivery.count({ where }),
        ]);

        return {
          success: true,
          data: {
            deliveries,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la récupération des livraisons:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des livraisons",
        });
      }
    }),

  // Changer le code d'accès d'une boîte
  changeAccessCode: protectedProcedure
    .input(
      z.object({
        boxId: z.string(),
        newAccessCode: z.string().min(4).max(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.CLIENT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const box = await ctx.db.deliveryBox.findFirst({
          where: {
            id: input.boxId,
            clientId: user.id,
          },
          include: {
            location: true,
          },
        });

        if (!box) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Boîte non trouvée",
          });
        }

        // Vérifier l'unicité du nouveau code pour cette localisation
        const existingCodeBox = await ctx.db.deliveryBox.findFirst({
          where: {
            locationId: box.locationId,
            accessCode: input.newAccessCode,
            id: { not: input.boxId },
            status: { not: "INACTIVE" },
          },
        });

        if (existingCodeBox) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ce code d'accès est déjà utilisé dans cette localisation",
          });
        }

        const updatedBox = await ctx.db.deliveryBox.update({
          where: { id: input.boxId },
          data: {
            accessCode: input.newAccessCode,
            updatedAt: new Date(),
          },
        });

        // Créer une notification de sécurité
        await ctx.db.notification.create({
          data: {
            userId: user.id,
            type: "BOX_ACCESS_CODE_CHANGED",
            title: "Code d'accès modifié",
            message: `Le code d'accès de votre boîte "${box.name}" a été modifié`,
            data: {
              boxId: box.id,
              boxName: box.name,
              newAccessCode: input.newAccessCode,
            },
          },
        });

        return {
          success: true,
          data: updatedBox,
          message: "Code d'accès modifié avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors du changement de code:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du changement de code d'accès",
        });
      }
    }),

  // Obtenir les statistiques des boîtes
  getBoxStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (user.role !== UserRole.CLIENT) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    try {
      const [boxStats, deliveryStats] = await Promise.all([
        ctx.db.deliveryBox.groupBy({
          by: ["status"],
          where: { clientId: user.id },
          _count: { id: true },
        }),
        ctx.db.delivery.aggregate({
          where: {
            box: { clientId: user.id },
            status: "DELIVERED",
          },
          _count: { id: true },
          _avg: { price: true },
        }),
      ]);

      const totalBoxes = boxStats.reduce((sum: number, stat: any) => sum + stat._count.id, 0);

      return {
        success: true,
        data: {
          total: {
            boxes: totalBoxes,
            deliveries: deliveryStats._count.id || 0,
            averageDeliveryValue: deliveryStats._avg.price || 0,
          },
          byStatus: boxStats.reduce((acc: Record<string, number>, stat: any) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {}),
        },
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }),

  // Obtenir les emplacements disponibles pour créer une boîte
  getAvailableLocations: protectedProcedure
    .input(
      z.object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        maxDistance: z.number().positive().default(50), // km
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.CLIENT) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const locations = await ctx.db.deliveryLocation.findMany({
          where: {
            isActive: true,
            hasAvailableBoxes: true,
          },
          include: {
            _count: {
              select: {
                boxes: {
                  where: { status: "ACTIVE" },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        });

        // Si des coordonnées sont fournies, calculer les distances
        let locationsWithDistance = locations;
        if (input.latitude && input.longitude) {
          locationsWithDistance = locations
            .map((location) => {
              if (location.coordinates) {
                const coords = location.coordinates as { lat: number; lng: number };
                const distance = calculateDistance(
                  input.latitude!,
                  input.longitude!,
                  coords.lat,
                  coords.lng
                );
                return { ...location, distance };
              }
              return { ...location, distance: null };
            })
            .filter((loc) => !loc.distance || loc.distance <= input.maxDistance)
            .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        }

        return {
          success: true,
          data: locationsWithDistance,
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des emplacements:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des emplacements",
        });
      }
    }),
});

// Fonction utilitaire pour calculer la distance entre deux points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}
