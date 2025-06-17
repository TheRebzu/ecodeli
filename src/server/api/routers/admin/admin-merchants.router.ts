import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole, UserStatus } from "@prisma/client";

/**
 * Router pour admin merchants
 * Mission 1 - ADMIN
 */
export const adminMerchantsRouter = createTRPCRouter({
  // Récupérer la liste des commerçants
  getMerchants: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']).optional(),
        sortBy: z.enum(['createdAt', 'name', 'totalSales']).default('createdAt'),
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
          role: UserRole.MERCHANT,
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' as const } },
              { email: { contains: input.search, mode: 'insensitive' as const } },
              { merchant: { businessName: { contains: input.search, mode: 'insensitive' as const } } }
            ]
          }),
          ...(input.status && { status: input.status as UserStatus })
        };

        const [merchants, totalCount] = await Promise.all([
          ctx.db.user.findMany({
            where: whereCondition,
            include: {
              merchant: {
                include: {
                  _count: {
                    select: {
                      announcements: true,
                      cartDrops: true
                    }
                  }
                }
              },
              _count: {
                select: {
                  announcements: true
                }
              }
            },
            skip,
            take: input.limit,
            orderBy: {
              [input.sortBy]: input.sortOrder
            }
          }),
          ctx.db.user.count({ where: whereCondition })
        ]);

        return {
          merchants: merchants.map(merchant => ({
            id: merchant.id,
            name: merchant.name,
            email: merchant.email,
            status: merchant.status,
            isVerified: merchant.isVerified,
            createdAt: merchant.createdAt,
            businessName: merchant.merchant?.businessName || 'Non renseigné',
            businessType: merchant.merchant?.businessType || 'Non spécifié',
            totalAnnouncements: merchant._count.announcements,
            totalCartDrops: merchant.merchant?._count.cartDrops || 0,
            phone: merchant.phone,
            address: merchant.address,
            lastLoginAt: merchant.lastLoginAt
          })),
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
          message: "Erreur lors de la récupération des commerçants"
        });
      }
    }),

  // Créer un nouveau commerçant
  createMerchant: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        phone: z.string().optional(),
        address: z.string().optional(),
        businessName: z.string().min(2),
        businessType: z.string().min(2),
        siret: z.string().optional(),
        vatNumber: z.string().optional(),
        sendWelcomeEmail: z.boolean().default(true)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent créer des commerçants"
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

        // Créer l'utilisateur et le profil commerçant
        const newMerchant = await ctx.db.user.create({
          data: {
            name: input.name,
            email: input.email,
            password: hashedPassword,
            phone: input.phone,
            address: input.address,
            role: UserRole.MERCHANT,
            status: UserStatus.ACTIVE,
            isVerified: true, // Vérifié automatiquement par l'admin
            merchant: {
              create: {
                businessName: input.businessName,
                businessType: input.businessType,
                siret: input.siret,
                vatNumber: input.vatNumber,
                isVerified: true
              }
            }
          },
          include: {
            merchant: true
          }
        });

        // Créer le portefeuille
        await ctx.db.wallet.create({
          data: {
            userId: newMerchant.id,
            balance: 0,
            currency: 'EUR'
          }
        });

        // Envoyer l'email de bienvenue si demandé
        if (input.sendWelcomeEmail) {
          try {
            const emailService = await import('@/lib/services/email.service');
            await emailService.sendMerchantWelcomeEmail({
              to: newMerchant.email,
              name: newMerchant.name,
              businessName: input.businessName,
              temporaryPassword: input.password
            });
          } catch (emailError) {
            console.warn("Erreur lors de l'envoi de l'email de bienvenue:", emailError);
          }
        }

        // Logger l'action
        await ctx.db.adminTask.create({
          data: {
            type: 'MERCHANT_CREATION',
            title: 'Création d\'un nouveau commerçant',
            description: `Commerçant ${input.businessName} créé par ${user.name}`,
            status: 'COMPLETED',
            priority: 'MEDIUM',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              merchantId: newMerchant.id,
              businessName: input.businessName
            }
          }
        });

        return {
          success: true,
          merchant: {
            id: newMerchant.id,
            name: newMerchant.name,
            email: newMerchant.email,
            businessName: input.businessName
          },
          message: "Commerçant créé avec succès"
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création du commerçant"
        });
      }
    }),

  // Mettre à jour le statut d'un commerçant
  updateMerchantStatus: protectedProcedure
    .input(
      z.object({
        merchantId: z.string(),
        status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']),
        reason: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent modifier le statut des commerçants"
        });
      }

      try {
        const merchant = await ctx.db.user.findFirst({
          where: {
            id: input.merchantId,
            role: UserRole.MERCHANT
          },
          include: { merchant: true }
        });

        if (!merchant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Commerçant non trouvé"
          });
        }

        await ctx.db.user.update({
          where: { id: input.merchantId },
          data: {
            status: input.status as UserStatus,
            updatedAt: new Date()
          }
        });

        // Logger l'action
        await ctx.db.adminTask.create({
          data: {
            type: 'MERCHANT_STATUS_UPDATE',
            title: 'Modification du statut commerçant',
            description: `Statut de ${merchant.merchant?.businessName || merchant.name} changé vers ${input.status}${input.reason ? ` - Raison: ${input.reason}` : ''}`,
            status: 'COMPLETED',
            priority: 'MEDIUM',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              merchantId: input.merchantId,
              oldStatus: merchant.status,
              newStatus: input.status,
              reason: input.reason
            }
          }
        });

        return {
          success: true,
          message: `Statut du commerçant mis à jour vers ${input.status}`
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour du statut"
        });
      }
    }),

  // Obtenir les détails d'un commerçant
  getMerchantDetails: protectedProcedure
    .input(z.object({ merchantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé"
        });
      }

      try {
        const merchant = await ctx.db.user.findFirst({
          where: {
            id: input.merchantId,
            role: UserRole.MERCHANT
          },
          include: {
            merchant: true,
            announcements: {
              take: 10,
              orderBy: { createdAt: 'desc' }
            },
            wallet: true,
            documents: {
              orderBy: { uploadedAt: 'desc' }
            },
            _count: {
              select: {
                announcements: true,
                clientDeliveries: true
              }
            }
          }
        });

        if (!merchant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Commerçant non trouvé"
          });
        }

        return {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email,
          phone: merchant.phone,
          address: merchant.address,
          status: merchant.status,
          isVerified: merchant.isVerified,
          createdAt: merchant.createdAt,
          lastLoginAt: merchant.lastLoginAt,
          businessInfo: merchant.merchant,
          statistics: {
            totalAnnouncements: merchant._count.announcements,
            totalDeliveries: merchant._count.clientDeliveries,
            walletBalance: merchant.wallet?.balance || 0
          },
          recentAnnouncements: merchant.announcements,
          documents: merchant.documents
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des détails"
        });
      }
    })
});
