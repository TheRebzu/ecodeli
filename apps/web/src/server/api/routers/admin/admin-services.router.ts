import { z } from 'zod';
import { router, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';

/**
 * Router pour admin services
 * Mission 1 - ADMIN
 */
export const adminServicesRouter = router({
  // Récupérer les statistiques des services
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Mock data pour les statistiques
      const mockStats = {
        totalServices: 42,
        activeServices: 35,
        inactiveServices: 7,
        totalCategories: 4,
        totalRevenue: 125340.5,
        monthlyRevenue: 12450.75,
        averageRating: 4.3,
        totalBookings: 1247,
        recentServices: [
          {
            id: '1',
            name: 'Livraison Express',
            category: 'DELIVERY',
            bookingsCount: 156,
            revenue: 2340.44,
          },
          {
            id: '2',
            name: 'Nettoyage Bureau',
            category: 'CLEANING',
            bookingsCount: 89,
            revenue: 4005.0,
          },
        ],
        categoryStats: [
          { category: 'DELIVERY', count: 15, revenue: 45230.5 },
          { category: 'CLEANING', count: 12, revenue: 32140.25 },
          { category: 'MAINTENANCE', count: 8, revenue: 28960.75 },
          { category: 'REPAIR', count: 7, revenue: 19009.0 },
        ],
      };

      return mockStats;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des statistiques',
      });
    }
  }),

  // Récupérer tous les services avec filtres
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT', 'SUSPENDED']).optional(),
        category: z.enum(['DELIVERY', 'CLEANING', 'MAINTENANCE', 'REPAIR', 'OTHER']).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // TODO: Vérifier les permissions selon le rôle
        const { user } = ctx.session;

        // Mock data pour le moment
        const mockServices = [
          {
            id: '1',
            name: 'Livraison Express',
            description: 'Service de livraison rapide en moins de 2h',
            category: 'DELIVERY' as const,
            price: 15.99,
            status: 'ACTIVE' as const,
            rating: 4.5,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
          {
            id: '2',
            name: 'Nettoyage Bureau',
            description: 'Service de nettoyage professionnel pour bureaux',
            category: 'CLEANING' as const,
            price: 45.0,
            status: 'ACTIVE' as const,
            rating: 4.2,
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
          },
          {
            id: '3',
            name: 'Réparation Électroménager',
            description: "Réparation d'appareils électroménagers à domicile",
            category: 'REPAIR' as const,
            price: 80.0,
            status: 'INACTIVE' as const,
            rating: 3.8,
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date('2024-02-01'),
          },
        ];

        // Filtrer selon les critères
        let filteredServices = mockServices;

        if (input.search) {
          filteredServices = filteredServices.filter(
            service =>
              service.name.toLowerCase().includes(input.search!.toLowerCase()) ||
              service.description.toLowerCase().includes(input.search!.toLowerCase())
          );
        }

        if (input.status) {
          filteredServices = filteredServices.filter(service => service.status === input.status);
        }

        if (input.category) {
          filteredServices = filteredServices.filter(
            service => service.category === input.category
          );
        }

        return {
          services: filteredServices,
          total: filteredServices.length,
          page: input.page,
          limit: input.limit,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des services',
        });
      }
    }),

  // Récupérer un service par ID
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Mock data
        const mockService = {
          id: input.id,
          name: 'Livraison Express',
          description: 'Service de livraison rapide en moins de 2h',
          category: 'DELIVERY' as const,
          price: 15.99,
          status: 'ACTIVE' as const,
          rating: 4.5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        };

        return mockService;
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Service non trouvé',
        });
      }
    }),

  // Créer un nouveau service
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        category: z.enum(['DELIVERY', 'CLEANING', 'MAINTENANCE', 'REPAIR', 'OTHER']),
        price: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // TODO: Vérifier les permissions
        // TODO: Implémenter la création en base

        const newService = {
          id: Math.random().toString(36).substr(2, 9),
          ...input,
          status: 'DRAFT' as const,
          rating: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return {
          success: true,
          service: newService,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Erreur lors de la création du service',
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
        category: z.enum(['DELIVERY', 'CLEANING', 'MAINTENANCE', 'REPAIR', 'OTHER']).optional(),
        price: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // TODO: Implémenter la mise à jour en base

        return {
          success: true,
          message: 'Service mis à jour avec succès',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Erreur lors de la mise à jour du service',
        });
      }
    }),

  // Mettre à jour le statut d'un service
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT', 'SUSPENDED']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // TODO: Implémenter la mise à jour du statut en base

        return {
          success: true,
          message: 'Statut du service mis à jour',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Erreur lors de la mise à jour du statut',
        });
      }
    }),

  // Supprimer un service
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // TODO: Vérifier que le service peut être supprimé
        // TODO: Implémenter la suppression en base

        return {
          success: true,
          message: 'Service supprimé avec succès',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Erreur lors de la suppression du service',
        });
      }
    }),

  // ===== CATÉGORIES DE SERVICES =====

  // Récupérer toutes les catégories
  categories: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      try {
        // Mock data pour les catégories
        const mockCategories = [
          {
            id: '1',
            name: 'Livraison',
            description: 'Services de livraison et transport',
            color: '#3B82F6',
            icon: 'Truck',
            servicesCount: 15,
            isActive: true,
            createdAt: new Date('2024-01-01'),
          },
          {
            id: '2',
            name: 'Nettoyage',
            description: 'Services de nettoyage professionnel',
            color: '#10B981',
            icon: 'Sparkles',
            servicesCount: 8,
            isActive: true,
            createdAt: new Date('2024-01-05'),
          },
          {
            id: '3',
            name: 'Maintenance',
            description: 'Services de maintenance et entretien',
            color: '#F59E0B',
            icon: 'Wrench',
            servicesCount: 12,
            isActive: true,
            createdAt: new Date('2024-01-10'),
          },
          {
            id: '4',
            name: 'Réparation',
            description: 'Services de réparation technique',
            color: '#EF4444',
            icon: 'Settings',
            servicesCount: 6,
            isActive: false,
            createdAt: new Date('2024-01-15'),
          },
        ];

        return {
          categories: mockCategories,
          total: mockCategories.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des catégories',
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
        })
      )
      .mutation(async ({ ctx, input }) => {
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
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Erreur lors de la création de la catégorie',
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return {
            success: true,
            message: 'Catégorie mise à jour avec succès',
          };
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Erreur lors de la mise à jour de la catégorie',
          });
        }
      }),

    // Activer/désactiver une catégorie
    toggleStatus: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          isActive: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return {
            success: true,
            message: `Catégorie ${input.isActive ? 'activée' : 'désactivée'} avec succès`,
          };
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Erreur lors de la modification du statut',
          });
        }
      }),

    // Supprimer une catégorie
    delete: protectedProcedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return {
            success: true,
            message: 'Catégorie supprimée avec succès',
          };
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Erreur lors de la suppression de la catégorie',
          });
        }
      }),
  }),
});
