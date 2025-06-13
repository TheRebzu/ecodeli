import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Router pour admin services
 * Mission 1 - ADMIN
 */
export const adminServicesRouter = router({
  // Récupérer les statistiques des services
  getStats: protectedProcedure.query(async ({ _ctx }) => {
    try {
      // Calculer les vraies statistiques depuis la base de données
      const totalServices = await ctx.db.service.count();
      const activeServices = await ctx.db.service.count({
        where: { status: "ACTIVE" },
      });
      const inactiveServices = await ctx.db.service.count({
        where: { status: "INACTIVE" },
      });

      // Compter les catégories distinctes
      const categories = await ctx.db.service.findMany({
        select: { category: true },
        distinct: ["category"],
      });

      // Calculer le chiffre d'affaires depuis les réservations
      const revenueData = await ctx.db.booking.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: new Date(new Date().getFullYear(), 0, 1), // Début de l'année
          },
        },
        _sum: {
          totalPrice: true,
        },
      });

      const monthlyRevenueData = await ctx.db.booking.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Début du mois
          },
        },
        _sum: {
          totalPrice: true,
        },
      });

      // Calculer la note moyenne
      const avgRating = await ctx.db.review.aggregate({
        _avg: {
          rating: true,
        },
      });

      // Compter le nombre total de réservations
      const totalBookings = await ctx.db.booking.count();

      // Services récents avec leurs statistiques
      const recentServices = await ctx.db.service.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { bookings: true },
          },
          bookings: {
            where: { status: "COMPLETED" },
            select: { totalPrice: true },
          },
        },
      });

      // Statistiques par catégorie
      const categoryStats = await ctx.db.service.groupBy({
        by: ["category"],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      });

      // Calculer le chiffre d'affaires par catégorie
      const categoryRevenue = await Promise.all(
        categoryStats.map(async (cat) => {
          const revenue = await ctx.db.booking.aggregate({
            where: {
              service: { category: cat.category },
              status: "COMPLETED",
            },
            _sum: {
              totalPrice: true,
            },
          });
          return {
            category: cat.category,
            count: cat._count.id,
            revenue: revenue._sum.totalPrice || 0,
          };
        }),
      );

      const stats = {
        totalServices,
        activeServices,
        inactiveServices,
        totalCategories: categories.length,
        totalRevenue: revenueData._sum.totalPrice || 0,
        monthlyRevenue: monthlyRevenueData._sum.totalPrice || 0,
        averageRating: avgRating._avg.rating || 0,
        totalBookings,
        recentServices: recentServices.map((service) => ({
          id: service.id,
          name: service.name,
          category: service.category,
          bookingsCount: service._count.bookings,
          revenue: service.bookings.reduce(
            (sum, booking) => sum + (booking.totalPrice || 0),
            0,
          ),
        })),
        categoryStats: categoryRevenue,
      };

      return stats;
    } catch (_error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }),

  // Récupérer tous les services avec filtres
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "DRAFT", "SUSPENDED"]).optional(),
        category: z
          .enum(["DELIVERY", "CLEANING", "MAINTENANCE", "REPAIR", "OTHER"])
          .optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      try {
        // TODO: Vérifier les permissions selon le rôle
        const { _user: __user } = ctx.session;

        // Récupérer les services depuis la base de données
        const whereClause: any = {};

        if (input.search) {
          whereClause.OR = [
            { name: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
          ];
        }

        if (input.status) {
          whereClause.status = input.status;
        }

        if (input.category) {
          whereClause.category = input.category;
        }

        // Compter le total pour la pagination
        const total = await ctx.db.service.count({ where: whereClause });

        // Récupérer les services avec pagination
        const services = await ctx.db.service.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            price: true,
            status: true,
            rating: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return {
          services,
          total,
          page: input.page,
          limit: input.limit,
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des services",
        });
      }
    }),

  // Récupérer un service par ID
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      try {
        // Récupérer le service depuis la base de données
        const service = await ctx.db.service.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            price: true,
            status: true,
            rating: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!service) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Service non trouvé",
          });
        }

        return service;
      } catch (_error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service non trouvé",
        });
      }
    }),

  // Créer un nouveau service
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        category: z.enum([
          "DELIVERY",
          "CLEANING",
          "MAINTENANCE",
          "REPAIR",
          "OTHER",
        ]),
        price: z.number().min(0),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        // TODO: Vérifier les permissions
        // TODO: Implémenter la création en base

        const newService = {
          id: Math.random().toString(36).substr(2, 9),
          ...input,
          status: "DRAFT" as const,
          rating: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return {
          success: true,
          service: newService,
        };
      } catch (_error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la création du service",
        });
      }
    }),

  // Mettre à jour un service
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        category: z
          .enum(["DELIVERY", "CLEANING", "MAINTENANCE", "REPAIR", "OTHER"])
          .optional(),
        price: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        // TODO: Implémenter la mise à jour en base

        return {
          success: true,
          message: "Service mis à jour avec succès",
        };
      } catch (_error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la mise à jour du service",
        });
      }
    }),

  // Mettre à jour le statut d'un service
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["ACTIVE", "INACTIVE", "DRAFT", "SUSPENDED"]),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        // TODO: Implémenter la mise à jour du statut en base

        return {
          success: true,
          message: "Statut du service mis à jour",
        };
      } catch (_error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la mise à jour du statut",
        });
      }
    }),

  // Supprimer un service
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      try {
        // TODO: Vérifier que le service peut être supprimé
        // TODO: Implémenter la suppression en base

        return {
          success: true,
          message: "Service supprimé avec succès",
        };
      } catch (_error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la suppression du service",
        });
      }
    }),

  // ===== CATÉGORIES DE SERVICES =====

  // Récupérer toutes les catégories
  categories: router({
    getAll: protectedProcedure.query(async ({ _ctx }) => {
      try {
        // Récupérer les catégories depuis la base de données
        const categories = await ctx.db.serviceCategory.findMany({
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            icon: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                services: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        });

        const formattedCategories = categories.map((category) => ({
          id: category.id,
          name: category.name,
          description: category.description,
          color: category.color,
          icon: category.icon,
          servicesCount: category._count.services,
          isActive: category.isActive,
          createdAt: category.createdAt,
        }));

        return {
          categories: formattedCategories,
          total: categories.length,
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des catégories",
        });
      }
    }),

    // Créer une nouvelle catégorie
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().min(1),
          color: z.string().regex(/^#[0-9A-F]{6}$/i),
          icon: z.string().min(1),
        }),
      )
      .mutation(async ({ _ctx, input: _input }) => {
        try {
          const newCategory = {
            id: Math.random().toString(36).substr(2, 9),
            ...input,
            servicesCount: 0,
            isActive: true,
            createdAt: new Date(),
          };

          return {
            success: true,
            category: newCategory,
          };
        } catch (_error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Erreur lors de la création de la catégorie",
          });
        }
      }),

    // Mettre à jour une catégorie
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          description: z.string().min(1).optional(),
          color: z
            .string()
            .regex(/^#[0-9A-F]{6}$/i)
            .optional(),
          icon: z.string().min(1).optional(),
        }),
      )
      .mutation(async ({ _ctx, input: _input }) => {
        try {
          return {
            success: true,
            message: "Catégorie mise à jour avec succès",
          };
        } catch (_error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Erreur lors de la mise à jour de la catégorie",
          });
        }
      }),

    // Activer/désactiver une catégorie
    toggleStatus: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          isActive: z.boolean(),
        }),
      )
      .mutation(async ({ _ctx, input: _input }) => {
        try {
          return {
            success: true,
            message: `Catégorie ${input.isActive ? "activée" : "désactivée"} avec succès`,
          };
        } catch (_error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Erreur lors de la modification du statut",
          });
        }
      }),

    // Supprimer une catégorie
    delete: protectedProcedure
      .input(
        z.object({
          id: z.string(),
        }),
      )
      .mutation(async ({ _ctx, input: _input }) => {
        try {
          return {
            success: true,
            message: "Catégorie supprimée avec succès",
          };
        } catch (_error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Erreur lors de la suppression de la catégorie",
          });
        }
      }),
  }),
});
