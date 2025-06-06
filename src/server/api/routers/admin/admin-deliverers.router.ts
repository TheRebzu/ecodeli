import { z } from "zod";
import { router as router, protectedProcedure, publicProcedure  } from '@/server/api/trpc';
import { TRPCError } from "@trpc/server";

/**
 * Router pour admin deliverers
 * Mission 1 - ADMIN
 */
export const adminDeliverersRouter = router({
  // Récupérer toutes les données
  getAll: publicProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(10),
      search: z.string().optional(),
    }).optional().default({
      page: 1,
      limit: 10
    }))
    .query(async ({ ctx, input }) => {
      try {
        // TODO: Vérifier les permissions selon le rôle
        // const { user } = ctx.session;
        
        // Construction de la requête de base
        const where = {
          role: 'DELIVERER',
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { email: { contains: input.search, mode: 'insensitive' } },
            ]
          })
        };

        // Compter le nombre total d'utilisateurs livreurs
        const totalItems = await ctx.db.user.count({ where });

        // Récupérer les livreurs avec pagination
        const deliverers = await ctx.db.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            image: true,
            status: true,
            isVerified: true,
            createdAt: true,
            lastLoginAt: true,
            // Récupérer les données spécifiques aux livreurs
            deliverer: {
              select: {
                isActive: true,
                vehicleType: true,
                rating: true,
                address: true,
                phone: true,
                verificationDate: true,
                maxCapacity: true,
                currentLocation: true,
                serviceZones: true,
                bio: true,
                yearsOfExperience: true,
                preferredVehicle: true,
                maxWeightCapacity: true,
                availableDays: true,
                deliveryPreferences: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        });

        // Transformer les données pour correspondre à l'interface attendue
        const transformedDeliverers = deliverers.map((user: any) => ({
          id: user.id,
          firstName: user.name?.split(' ')[0] || '',
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          phone: user.phoneNumber || user.deliverer?.phone,
          image: user.image,
          status: user.status,
          isVerified: user.isVerified,
          verificationStatus: user.deliverer?.verificationDate ? 'APPROVED' : 'PENDING',
          createdAt: user.createdAt,
          lastActiveAt: user.lastLoginAt,
          totalDeliveries: 0, // À calculer depuis les livraisons
          completedDeliveries: 0, // À calculer depuis les livraisons
          rating: user.deliverer?.rating || 0,
          earnings: 0, // À calculer depuis les paiements
          hasVehicle: user.deliverer?.vehicleType ? true : false,
          vehicleType: user.deliverer?.vehicleType,
          preferredZones: user.deliverer?.serviceZones || [],
        }));

        // Calcul de la pagination
        const totalPages = Math.ceil(totalItems / input.limit);

        return {
          success: true,
          deliverers: transformedDeliverers,
          totalPages,
          currentPage: input.page,
          totalItems,
          hasNext: input.page < totalPages,
          hasPrev: input.page > 1
        };
      } catch (error) {
        console.error('Erreur lors de la récupération des livreurs:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des données",
        });
      }
    }),

  // Récupérer les statistiques
  getStats: publicProcedure
    .query(async ({ ctx }) => {
      try {
        // TODO: Vérifier les permissions selon le rôle
        // const { user } = ctx.session;
        
        // Statistiques depuis la base de données
        const totalDeliverers = await ctx.db.user.count({
          where: { role: 'DELIVERER' }
        });

        const activeDeliverers = await ctx.db.user.count({
          where: { role: 'DELIVERER', status: 'ACTIVE' }
        });

        const pendingApplications = await ctx.db.user.count({
          where: { 
            role: 'DELIVERER', 
            status: 'PENDING_VERIFICATION'
          }
        });

        const suspendedDeliverers = await ctx.db.user.count({
          where: { role: 'DELIVERER', status: 'SUSPENDED' }
        });

        const verifiedDeliverers = await ctx.db.user.count({
          where: { role: 'DELIVERER', isVerified: true }
        });

        // Agrégations pour les données des profils livreurs
        const delivererStats = await ctx.db.deliverer.aggregate({
          _avg: {
            rating: true,
            maxCapacity: true,
            yearsOfExperience: true,
          },
          _count: {
            rating: true,
          }
        });

        // Statistiques depuis les livraisons réelles
        const deliveryStats = await ctx.db.delivery.aggregate({
          where: {
            status: 'DELIVERED'
          },
          _count: {
            id: true,
          }
        });

        // Statistiques depuis les paiements
        const earningsStats = await ctx.db.payment.aggregate({
          where: {
            status: 'COMPLETED',
            user: {
              role: 'DELIVERER'
            }
          },
          _sum: {
            amount: true,
          }
        });

        const averageRating = delivererStats._avg.rating || 0;
        const totalDeliveries = deliveryStats._count.id || 0;
        const totalEarnings = earningsStats._sum.amount?.toNumber() || 0;
        const totalCompleted = totalDeliveries; // Déjà filtrées sur DELIVERED
        const averageDeliveriesPerDeliverer = totalDeliverers > 0 ? Math.round(totalDeliveries / totalDeliverers) : 0;
        const satisfactionRate = 95; // Taux de satisfaction fixe pour le moment

        // Calculer la croissance mensuelle (simple exemple - pourrait être plus sophistiqué)
        const currentMonth = new Date();
        const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        
        const currentMonthDeliverers = await ctx.db.user.count({
          where: { 
            role: 'DELIVERER',
            createdAt: {
              gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
            }
          }
        });

        const lastMonthDeliverers = await ctx.db.user.count({
          where: { 
            role: 'DELIVERER',
            createdAt: {
              gte: lastMonth,
              lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
            }
          }
        });

        const monthlyGrowth = lastMonthDeliverers > 0 
          ? Math.round(((currentMonthDeliverers - lastMonthDeliverers) / lastMonthDeliverers) * 100)
          : 0;

        return {
          success: true,
          totalDeliverers,
          activeDeliverers,
          pendingApplications,
          suspendedDeliverers,
          verifiedDeliverers,
          averageRating: Number(averageRating.toFixed(1)),
          totalDeliveries,
          totalEarnings: Number(totalEarnings.toFixed(2)),
          averageDeliveriesPerDeliverer,
          monthlyGrowth,
          satisfactionRate: Number(satisfactionRate.toFixed(1))
        };
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques",
        });
      }
    }),

  // Récupérer un livreur par son ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const deliverer = await ctx.db.user.findUnique({
          where: { 
            id: input.id,
            role: 'DELIVERER'
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            image: true,
            status: true,
            isVerified: true,
            createdAt: true,
            lastLoginAt: true,
            delivererProfile: {
              select: {
                isActive: true,
                hasVehicle: true,
                vehicleType: true,
                preferredZones: true,
                rating: true,
                totalDeliveries: true,
                completedDeliveries: true,
                earnings: true,
                verificationStatus: true,
              }
            }
          }
        });

        if (!deliverer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livreur non trouvé",
          });
        }

        // Transformer les données pour correspondre à l'interface attendue
        return {
          id: deliverer.id,
          firstName: deliverer.firstName || '',
          lastName: deliverer.lastName || '',
          email: deliverer.email,
          phone: deliverer.phoneNumber,
          image: deliverer.image,
          status: deliverer.status,
          isVerified: deliverer.isVerified,
          verificationStatus: deliverer.delivererProfile?.verificationStatus || 'PENDING',
          createdAt: deliverer.createdAt,
          lastActiveAt: deliverer.lastLoginAt,
          totalDeliveries: deliverer.delivererProfile?.totalDeliveries || 0,
          completedDeliveries: deliverer.delivererProfile?.completedDeliveries || 0,
          rating: deliverer.delivererProfile?.rating || 0,
          earnings: deliverer.delivererProfile?.earnings || 0,
          hasVehicle: deliverer.delivererProfile?.hasVehicle || false,
          vehicleType: deliverer.delivererProfile?.vehicleType,
          preferredZones: deliverer.delivererProfile?.preferredZones || [],
        };
      } catch (error) {
        console.error('Erreur lors de la récupération du livreur:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des données du livreur",
        });
      }
    }),

  // Créer une nouvelle entrée
  create: protectedProcedure
    .input(z.object({
      // TODO: Définir le schéma de validation
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // TODO: Vérifier les permissions
        // TODO: Implémenter la création
        return {
          success: true,
          data: null
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la création",
        });
      }
    }),

  // Mettre à jour le statut d'un livreur
  updateStatus: protectedProcedure
    .input(z.object({
      userId: z.string(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'])
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // TODO: Vérifier les permissions admin
        // TODO: Implémenter la mise à jour du statut dans la DB
        console.log(`Mise à jour du statut pour l'utilisateur ${input.userId} vers ${input.status}`);
        
        return {
          success: true,
          message: `Statut mis à jour vers ${input.status}`,
          data: {
            userId: input.userId,
            newStatus: input.status
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la mise à jour du statut",
        });
      }
    }),

  // Vérifier un livreur
  verifyDeliverer: protectedProcedure
    .input(z.object({
      userId: z.string(),
      approved: z.boolean().default(true)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // TODO: Vérifier les permissions admin
        // TODO: Implémenter la vérification dans la DB
        console.log(`Vérification du livreur ${input.userId} : ${input.approved ? 'approuvé' : 'rejeté'}`);
        
        return {
          success: true,
          message: input.approved ? 'Livreur vérifié avec succès' : 'Livreur rejeté',
          data: {
            userId: input.userId,
            verified: input.approved,
            verificationStatus: input.approved ? 'APPROVED' : 'REJECTED'
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la vérification",
        });
      }
    }),

  // TODO: Ajouter d'autres procédures selon les besoins Mission 1
});
