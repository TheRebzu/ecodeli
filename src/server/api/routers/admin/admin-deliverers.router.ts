import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole, UserStatus } from "@prisma/client";

/**
 * Router pour admin deliverers
 * Mission 1 - ADMIN
 */
export const adminDeliverersRouter = createTRPCRouter({
  // Récupérer la liste des livreurs
  getDeliverers: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).optional(),
        vehicleType: z.string().optional(),
        zone: z.string().optional(),
        sortBy: z.enum(['createdAt', 'name', 'rating', 'totalDeliveries']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc')
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent accéder à cette fonctionnalité"
        });
      }

      try {
        const skip = (input.page - 1) * input.limit;

        const whereCondition = {
          role: UserRole.DELIVERER,
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' as const } },
              { email: { contains: input.search, mode: 'insensitive' as const } },
              { phone: { contains: input.search, mode: 'insensitive' as const } }
            ]
          }),
          ...(input.status && { status: input.status as UserStatus }),
          ...(input.vehicleType && {
            deliverer: { vehicleType: input.vehicleType }
          })
        };

        const [deliverers, totalCount] = await Promise.all([
          ctx.db.user.findMany({
            where: whereCondition,
            include: {
              deliverer: true,
              _count: {
                select: {
                  delivererDeliveries: true,
                  receivedRatings: true
                }
              },
              receivedRatings: {
                select: { rating: true }
              },
              wallet: {
                select: { balance: true }
              }
            },
            skip,
            take: input.limit,
            orderBy: input.sortBy === 'rating' 
              ? { receivedRatings: { _count: 'desc' } }
              : input.sortBy === 'totalDeliveries'
              ? { delivererDeliveries: { _count: 'desc' } }
              : { [input.sortBy]: input.sortOrder }
          }),
          ctx.db.user.count({ where: whereCondition })
        ]);

        return {
          deliverers: deliverers.map(deliverer => {
            const avgRating = deliverer.receivedRatings.length > 0
              ? deliverer.receivedRatings.reduce((sum, r) => sum + r.rating, 0) / deliverer.receivedRatings.length
              : 0;

            return {
              id: deliverer.id,
              name: deliverer.name,
              email: deliverer.email,
              phone: deliverer.phone,
              status: deliverer.status,
              isVerified: deliverer.isVerified,
              createdAt: deliverer.createdAt,
              lastLoginAt: deliverer.lastLoginAt,
              vehicleType: deliverer.deliverer?.vehicleType || 'Non spécifié',
              licenseNumber: deliverer.deliverer?.licenseNumber,
              zone: deliverer.deliverer?.preferredZone || 'Non définie',
              totalDeliveries: deliverer._count.delivererDeliveries,
              averageRating: Math.round(avgRating * 10) / 10,
              totalRatings: deliverer._count.receivedRatings,
              walletBalance: deliverer.wallet?.balance || 0,
              isAvailable: deliverer.deliverer?.isAvailable || false
            };
          }),
          pagination: {
            page: input.page,
            limit: input.limit,
            total: totalCount,
            pages: Math.ceil(totalCount / input.limit)
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des livreurs"
        });
      }
    }),

  // Obtenir les statistiques des livreurs
  getDelivererStats: protectedProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx.session;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé"
        });
      }

      try {
        const [
          totalDeliverers,
          activeDeliverers,
          verifiedDeliverers,
          pendingVerification,
          suspendedDeliverers,
          totalDeliveries,
          averageRating
        ] = await Promise.all([
          ctx.db.user.count({ where: { role: UserRole.DELIVERER } }),
          ctx.db.user.count({ 
            where: { 
              role: UserRole.DELIVERER, 
              status: UserStatus.ACTIVE 
            } 
          }),
          ctx.db.user.count({ 
            where: { 
              role: UserRole.DELIVERER, 
              isVerified: true 
            } 
          }),
          ctx.db.user.count({ 
            where: { 
              role: UserRole.DELIVERER, 
              isVerified: false 
            } 
          }),
          ctx.db.user.count({ 
            where: { 
              role: UserRole.DELIVERER, 
              status: UserStatus.SUSPENDED 
            } 
          }),
          ctx.db.delivery.count({
            where: {
              deliverer: { role: UserRole.DELIVERER }
            }
          }),
          ctx.db.rating.aggregate({
            _avg: { rating: true },
            where: {
              targetType: "DELIVERER"
            }
          })
        ]);

        return {
          totalDeliverers,
          activeDeliverers,
          verifiedDeliverers,
          pendingVerification,
          suspendedDeliverers,
          totalDeliveries,
          averageRating: averageRating._avg.rating || 0,
          verificationRate: totalDeliverers > 0 ? (verifiedDeliverers / totalDeliverers) * 100 : 0,
          activeRate: totalDeliverers > 0 ? (activeDeliverers / totalDeliverers) * 100 : 0
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques"
        });
      }
    }),

  // Créer un nouveau livreur
  createDeliverer: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        phone: z.string().min(10),
        address: z.string().min(5),
        vehicleType: z.enum(['BIKE', 'SCOOTER', 'CAR', 'VAN', 'WALKING']),
        licenseNumber: z.string().optional(),
        preferredZone: z.string().optional(),
        sendWelcomeEmail: z.boolean().default(true)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent créer des livreurs"
        });
      }

      try {
        // Vérifier si l'email existe déjà
        const existingUser = await ctx.db.user.findUnique({
          where: { email: input.email }
        });

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Un utilisateur avec cet email existe déjà"
          });
        }

        // Hasher le mot de passe
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(input.password, 12);

        // Créer l'utilisateur et le profil livreur
        const newDeliverer = await ctx.db.user.create({
          data: {
            name: input.name,
            email: input.email,
            password: hashedPassword,
            phone: input.phone,
            address: input.address,
            role: UserRole.DELIVERER,
            status: UserStatus.ACTIVE,
            isVerified: true, // Vérifié automatiquement par l'admin
            deliverer: {
              create: {
                vehicleType: input.vehicleType,
                licenseNumber: input.licenseNumber,
                preferredZone: input.preferredZone,
                isAvailable: true,
                isVerified: true
              }
            }
          },
          include: {
            deliverer: true
          }
        });

        // Créer le portefeuille
        await ctx.db.wallet.create({
          data: {
            userId: newDeliverer.id,
            balance: 0,
            currency: 'EUR'
          }
        });

        // Envoyer l'email de bienvenue si demandé
        if (input.sendWelcomeEmail) {
          try {
            const emailService = await import('@/lib/services/email.service');
            await emailService.sendDelivererWelcomeEmail({
              to: newDeliverer.email,
              name: newDeliverer.name,
              temporaryPassword: input.password
            });
          } catch (emailError) {
            console.warn("Erreur lors de l'envoi de l'email de bienvenue:", emailError);
          }
        }

        // Logger l'action
        await ctx.db.adminTask.create({
          data: {
            type: 'DELIVERER_CREATION',
            title: 'Création d\'un nouveau livreur',
            description: `Livreur ${input.name} créé par ${user.name}`,
            status: 'COMPLETED',
            priority: 'MEDIUM',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              delivererId: newDeliverer.id,
              vehicleType: input.vehicleType
            }
          }
        });

        return {
          success: true,
          deliverer: {
            id: newDeliverer.id,
            name: newDeliverer.name,
            email: newDeliverer.email,
            vehicleType: input.vehicleType
          },
          message: "Livreur créé avec succès"
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création du livreur"
        });
      }
    }),

  // Mettre à jour le statut d'un livreur
  updateDelivererStatus: protectedProcedure
    .input(
      z.object({
        delivererId: z.string(),
        status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']),
        reason: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent modifier le statut des livreurs"
        });
      }

      try {
        const deliverer = await ctx.db.user.findFirst({
          where: {
            id: input.delivererId,
            role: UserRole.DELIVERER
          }
        });

        if (!deliverer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livreur non trouvé"
          });
        }

        await ctx.db.user.update({
          where: { id: input.delivererId },
          data: {
            status: input.status as UserStatus,
            updatedAt: new Date()
          }
        });

        // Mettre à jour la disponibilité si suspendu
        if (input.status === 'SUSPENDED') {
          await ctx.db.delivererProfile.update({
            where: { userId: input.delivererId },
            data: { isAvailable: false }
          });
        }

        // Logger l'action
        await ctx.db.adminTask.create({
          data: {
            type: 'DELIVERER_STATUS_UPDATE',
            title: 'Modification du statut livreur',
            description: `Statut de ${deliverer.name} changé vers ${input.status}${input.reason ? ` - Raison: ${input.reason}` : ''}`,
            status: 'COMPLETED',
            priority: 'HIGH',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              delivererId: input.delivererId,
              oldStatus: deliverer.status,
              newStatus: input.status,
              reason: input.reason
            }
          }
        });

        return {
          success: true,
          message: `Statut du livreur mis à jour vers ${input.status}`
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour du statut"
        });
      }
    }),

  // Vérifier un livreur
  verifyDeliverer: protectedProcedure
    .input(
      z.object({
        delivererId: z.string(),
        verificationNotes: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent vérifier les livreurs"
        });
      }

      try {
        const deliverer = await ctx.db.user.findFirst({
          where: {
            id: input.delivererId,
            role: UserRole.DELIVERER
          }
        });

        if (!deliverer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livreur non trouvé"
          });
        }

        // Mettre à jour le statut de vérification
        await Promise.all([
          ctx.db.user.update({
            where: { id: input.delivererId },
            data: {
              isVerified: true,
              updatedAt: new Date()
            }
          }),
          ctx.db.delivererProfile.update({
            where: { userId: input.delivererId },
            data: {
              isVerified: true,
              verificationDate: new Date(),
              verificationNotes: input.verificationNotes
            }
          })
        ]);

        // Créer une notification pour le livreur
        await ctx.db.notification.create({
          data: {
            userId: input.delivererId,
            type: "VERIFICATION_APPROVED",
            title: "Profil vérifié",
            message: "Félicitations ! Votre profil de livreur a été vérifié. Vous pouvez maintenant accepter des livraisons.",
            isRead: false
          }
        });

        // Logger l'action
        await ctx.db.adminTask.create({
          data: {
            type: 'DELIVERER_VERIFICATION',
            title: 'Vérification de livreur',
            description: `Livreur ${deliverer.name} vérifié par ${user.name}`,
            status: 'COMPLETED',
            priority: 'MEDIUM',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              delivererId: input.delivererId,
              verificationNotes: input.verificationNotes
            }
          }
        });

        return {
          success: true,
          message: "Livreur vérifié avec succès"
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la vérification du livreur"
        });
      }
    })
});
