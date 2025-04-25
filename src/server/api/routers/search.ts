import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { AnnouncementStatus, PackageSize } from "@prisma/client";
import { calculateDistance } from "@/lib/geo-utils";

export const searchRouter = createTRPCRouter({
  // Recherche avancée d'annonces avec filtres multiples
  searchAnnouncements: publicProcedure
    .input(
      z.object({
        searchTerm: z.string().optional(),
        status: z.nativeEnum(AnnouncementStatus).optional(),
        packageSize: z.nativeEnum(PackageSize).optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        minWeight: z.number().optional(),
        maxWeight: z.number().optional(),
        requiresInsurance: z.boolean().optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional(),
        radius: z.number().optional(), // rayon en kilomètres
        sortBy: z
          .enum(["price", "createdAt", "deadline", "distance"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Construire les filtres de base
      const where = {
        ...(input.searchTerm
          ? {
              OR: [
                { title: { contains: input.searchTerm, mode: "insensitive" } },
                {
                  description: {
                    contains: input.searchTerm,
                    mode: "insensitive",
                  },
                },
                {
                  pickupAddress: {
                    contains: input.searchTerm,
                    mode: "insensitive",
                  },
                },
                {
                  deliveryAddress: {
                    contains: input.searchTerm,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.packageSize ? { packageSize: input.packageSize } : {}),
        ...(input.minPrice !== undefined
          ? { price: { gte: input.minPrice } }
          : {}),
        ...(input.maxPrice !== undefined
          ? { price: { lte: input.maxPrice } }
          : {}),
        ...(input.minWeight !== undefined
          ? { packageWeight: { gte: input.minWeight } }
          : {}),
        ...(input.maxWeight !== undefined
          ? { packageWeight: { lte: input.maxWeight } }
          : {}),
        ...(input.requiresInsurance !== undefined
          ? { requiresInsurance: input.requiresInsurance }
          : {}),
        ...(input.fromDate ? { deadline: { gte: input.fromDate } } : {}),
        ...(input.toDate ? { deadline: { lte: input.toDate } } : {}),
      };

      // Déterminer l'ordre de tri
      const orderBy = {
        [input.sortBy]: input.sortOrder,
      };

      // Récupérer les annonces avec pagination
      const announcements = await ctx.db.announcement.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          deliverer: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Gérer la pagination
      let nextCursor: string | undefined = undefined;
      if (announcements.length > input.limit) {
        const nextItem = announcements.pop();
        nextCursor = nextItem?.id;
      }

      // Si une localisation est fournie, calculer la distance pour chaque annonce
      let announcementsWithDistance = announcements;
      if (input.location) {
        announcementsWithDistance = announcements.map((announcement) => {
          // Extraire les coordonnées de l'adresse (dans un cas réel, il faudrait utiliser un service de géocodage)
          // Pour cet exemple, nous utilisons des coordonnées fictives
          const pickupCoords = {
            latitude: parseFloat(announcement.pickupLatitude || "0"),
            longitude: parseFloat(announcement.pickupLongitude || "0"),
          };

          const distance = calculateDistance(
            input.location.latitude,
            input.location.longitude,
            pickupCoords.latitude,
            pickupCoords.longitude,
          );

          return {
            ...announcement,
            distance,
          };
        });

        // Filtrer par rayon si spécifié
        if (input.radius) {
          announcementsWithDistance = announcementsWithDistance.filter(
            (ann) => (ann as any).distance <= input.radius,
          );
        }

        // Trier par distance si demandé
        if (input.sortBy === "distance") {
          announcementsWithDistance.sort((a, b) => {
            const distA = (a as any).distance || 0;
            const distB = (b as any).distance || 0;
            return input.sortOrder === "asc" ? distA - distB : distB - distA;
          });
        }
      }

      return {
        announcements: announcementsWithDistance,
        nextCursor,
      };
    }),

  // Suggestions de recherche basées sur les termes précédents
  getSearchSuggestions: publicProcedure
    .input(
      z.object({
        prefix: z.string().min(2),
        limit: z.number().min(1).max(10).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Rechercher dans les titres d'annonces
      const titleSuggestions = await ctx.db.announcement.findMany({
        where: {
          title: {
            contains: input.prefix,
            mode: "insensitive",
          },
        },
        select: {
          title: true,
        },
        distinct: ["title"],
        take: input.limit,
      });

      // Rechercher dans les adresses
      const addressSuggestions = await ctx.db.announcement.findMany({
        where: {
          OR: [
            {
              pickupAddress: {
                contains: input.prefix,
                mode: "insensitive",
              },
            },
            {
              deliveryAddress: {
                contains: input.prefix,
                mode: "insensitive",
              },
            },
          ],
        },
        select: {
          pickupAddress: true,
          deliveryAddress: true,
        },
        distinct: ["pickupAddress", "deliveryAddress"],
        take: input.limit,
      });

      // Combiner et dédupliquer les suggestions
      const suggestions = [
        ...titleSuggestions.map((s) => s.title),
        ...addressSuggestions.map((s) => s.pickupAddress),
        ...addressSuggestions.map((s) => s.deliveryAddress),
      ]
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index)
        .slice(0, input.limit);

      return { suggestions };
    }),

  // Récupérer les statistiques de recherche pour l'utilisateur
  getUserSearchStats: protectedProcedure.query(async ({ ctx }) => {
    // Récupérer l'historique de recherche de l'utilisateur
    const searchHistory = await ctx.db.searchHistory.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Récupérer les termes de recherche les plus fréquents
    const frequentSearches = await ctx.db.searchHistory.groupBy({
      by: ["searchTerm"],
      where: {
        userId: ctx.session.user.id,
      },
      _count: {
        searchTerm: true,
      },
      orderBy: {
        _count: {
          searchTerm: "desc",
        },
      },
      take: 5,
    });

    return {
      recentSearches: searchHistory.map((h) => h.searchTerm),
      frequentSearches: frequentSearches.map((f) => ({
        term: f.searchTerm,
        count: f._count.searchTerm,
      })),
    };
  }),

  // Enregistrer un terme de recherche dans l'historique
  saveSearchTerm: protectedProcedure
    .input(
      z.object({
        searchTerm: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.searchHistory.create({
        data: {
          searchTerm: input.searchTerm,
          user: {
            connect: {
              id: ctx.session.user.id,
            },
          },
        },
      });

      return { success: true };
    }),
});
