import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";

/**
 * Router pour la gestion des prestataires par l'admin
 * Gestion des comptes prestataires, vérifications et surveillance
 */
export const adminProvidersRouter = createTRPCRouter({
  // Récupérer tous les prestataires
  getAllProviders: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]).optional(),
        verificationStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED"]).optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["name", "createdAt", "rating", "revenue"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent accéder aux données des prestataires",
        });
      }

      try {
        const where = {
          role: UserRole.PROVIDER,
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { email: { contains: input.search, mode: "insensitive" } },
              { providerProfile: { businessName: { contains: input.search, mode: "insensitive" } } },
            ],
          }),
          ...(input.startDate && input.endDate && {
            createdAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          }),
          providerProfile: {
            ...(input.status && { status: input.status }),
            ...(input.verificationStatus && { verificationStatus: input.verificationStatus }),
            ...(input.category && { categories: { has: input.category } }),
          },
        };

        const [providers, total] = await Promise.all([
          ctx.db.user.findMany({
            where,
            include: {
              providerProfile: {
                include: {
                  verificationDocuments: {
                    orderBy: { createdAt: "desc" },
                    take: 3,
                  },
                  services: {
                    where: { isActive: true },
                    take: 5,
                  },
                  reviews: {
                    orderBy: { createdAt: "desc" },
                    take: 3,
                    include: {
                      client: { select: { name: true, image: true } },
                    },
                  },
                  _count: {
                    select: {
                      services: true,
                      reviews: true,
                      interventions: true,
                    },
                  },
                },
              },
              transactions: {
                where: { status: "COMPLETED" },
                select: { amount: true },
              },
            },
            orderBy: input.sortBy === "rating" 
              ? { providerProfile: { rating: input.sortOrder } }
              : input.sortBy === "revenue"
              ? undefined // Gestion spéciale pour le chiffre d'affaires
              : { [input.sortBy]: input.sortOrder },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.user.count({ where }),
        ]);

        // Calculer le chiffre d'affaires pour chaque prestataire
        const providersWithStats = providers.map((provider) => {
          const totalRevenue = provider.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
          return {
            ...provider,
            totalRevenue,
            averageRating: provider.providerProfile?.rating || 0,
            totalServices: provider.providerProfile?._count.services || 0,
            totalReviews: provider.providerProfile?._count.reviews || 0,
            totalInterventions: provider.providerProfile?._count.interventions || 0,
          };
        });

        // Trier par chiffre d'affaires si demandé
        if (input.sortBy === "revenue") {
          providersWithStats.sort((a, b) => 
            input.sortOrder === "asc" 
              ? a.totalRevenue - b.totalRevenue
              : b.totalRevenue - a.totalRevenue
          );
        }

        return {
          success: true,
          data: {
            providers: providersWithStats,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des prestataires:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des prestataires",
        });
      }
    }),

  // Obtenir les détails d'un prestataire
  getProviderDetails: protectedProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const provider = await ctx.db.user.findFirst({
          where: {
            id: input.providerId,
            role: UserRole.PROVIDER,
          },
          include: {
            providerProfile: {
              include: {
                verificationDocuments: {
                  orderBy: { createdAt: "desc" },
                },
                services: {
                  orderBy: { createdAt: "desc" },
                },
                reviews: {
                  orderBy: { createdAt: "desc" },
                  include: {
                    client: { select: { name: true, image: true } },
                  },
                },
                interventions: {
                  orderBy: { createdAt: "desc" },
                  take: 10,
                  include: {
                    client: { select: { name: true, image: true } },
                    service: { select: { name: true } },
                  },
                },
                _count: {
                  select: {
                    services: true,
                    reviews: true,
                    interventions: true,
                  },
                },
              },
            },
            transactions: {
              where: { status: "COMPLETED" },
              orderBy: { createdAt: "desc" },
              take: 20,
            },
            notifications: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Prestataire non trouvé",
          });
        }

        // Calculer les statistiques
        const totalRevenue = provider.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
        const monthlyRevenue = provider.transactions
          .filter(t => t.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .reduce((sum, transaction) => sum + transaction.amount, 0);

        return {
          success: true,
          data: {
            ...provider,
            stats: {
              totalRevenue,
              monthlyRevenue,
              averageRating: provider.providerProfile?.rating || 0,
              totalServices: provider.providerProfile?._count.services || 0,
              totalReviews: provider.providerProfile?._count.reviews || 0,
              totalInterventions: provider.providerProfile?._count.interventions || 0,
            },
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la récupération du prestataire:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération du prestataire",
        });
      }
    }),

  // Créer un nouveau prestataire
  createProvider: protectedProcedure
    .input(
      z.object({
        email: z.string().email("Email invalide"),
        name: z.string().min(2, "Nom requis"),
        password: z.string().min(8, "Mot de passe trop court"),
        businessName: z.string().min(2, "Nom de l'entreprise requis"),
        businessType: z.enum(["INDIVIDUAL", "COMPANY", "ASSOCIATION"]),
        categories: z.array(z.string()).min(1, "Au moins une catégorie requise"),
        description: z.string().min(20, "Description requise"),
        address: z.object({
          street: z.string(),
          city: z.string(),
          zipCode: z.string(),
          country: z.string().default("France"),
        }),
        contact: z.object({
          phone: z.string(),
          website: z.string().url().optional(),
          socialMedia: z.record(z.string()).optional(),
        }),
        serviceAreas: z.array(z.string()).min(1, "Au moins une zone de service requise"),
        priceRange: z.object({
          min: z.number().positive(),
          max: z.number().positive(),
        }),
        autoVerify: z.boolean().default(false), // Vérification automatique par l'admin
        sendWelcomeEmail: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent créer des prestataires",
        });
      }

      try {
        // Vérifier que l'email n'est pas déjà utilisé
        const existingUser = await ctx.db.user.findUnique({
          where: { email: input.email },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Un utilisateur avec cet email existe déjà",
          });
        }

        // Créer l'utilisateur prestataire
        const provider = await ctx.db.user.create({
          data: {
            email: input.email,
            name: input.name,
            password: input.password, // En réalité, devrait être hashé
            role: UserRole.PROVIDER,
            providerProfile: {
              create: {
                businessName: input.businessName,
                businessType: input.businessType,
                categories: input.categories,
                description: input.description,
                address: input.address,
                contact: input.contact,
                serviceAreas: input.serviceAreas,
                priceRange: input.priceRange,
                status: "ACTIVE",
                verificationStatus: input.autoVerify ? "APPROVED" : "PENDING",
                isVerified: input.autoVerify,
              },
            },
          },
          include: {
            providerProfile: true,
          },
        });

        // Créer une notification de bienvenue
        if (input.sendWelcomeEmail) {
          await ctx.db.notification.create({
            data: {
              userId: provider.id,
              type: "ACCOUNT_CREATED",
              title: "Bienvenue sur EcoDeli",
              message: `Votre compte prestataire a été créé par l'équipe administrative. ${input.autoVerify ? "Votre compte est déjà vérifié." : "Votre compte est en attente de vérification."}`,
              data: {
                adminCreated: true,
                autoVerified: input.autoVerify,
                businessName: input.businessName,
              },
            },
          });
        }

        console.log(`👔 Prestataire créé par admin: ${input.businessName} (${input.email})`);

        return {
          success: true,
          data: provider,
          message: "Prestataire créé avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la création du prestataire:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création du prestataire",
        });
      }
    }),

  // Suspendre/Réactiver un prestataire
  toggleProviderStatus: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        status: z.enum(["ACTIVE", "SUSPENDED", "INACTIVE"]),
        reason: z.string().min(10, "Raison requise"),
        duration: z.number().positive().optional(), // Durée en jours pour suspension temporaire
        notifyProvider: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent modifier le statut des prestataires",
        });
      }

      try {
        const provider = await ctx.db.user.findFirst({
          where: {
            id: input.providerId,
            role: UserRole.PROVIDER,
          },
          include: {
            providerProfile: true,
          },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Prestataire non trouvé",
          });
        }

        // Calculer la date de fin de suspension si applicable
        let suspensionEndDate = null;
        if (input.status === "SUSPENDED" && input.duration) {
          suspensionEndDate = new Date();
          suspensionEndDate.setDate(suspensionEndDate.getDate() + input.duration);
        }

        // Mettre à jour le statut
        const updatedProvider = await ctx.db.providerProfile.update({
          where: { userId: input.providerId },
          data: {
            status: input.status,
            suspensionReason: input.status === "SUSPENDED" ? input.reason : null,
            suspensionEndDate,
            updatedAt: new Date(),
          },
        });

        // Enregistrer l'action admin
        await ctx.db.adminAction.create({
          data: {
            adminId: user.id,
            type: "PROVIDER_STATUS_CHANGE",
            targetId: input.providerId,
            details: {
              previousStatus: provider.providerProfile?.status,
              newStatus: input.status,
              reason: input.reason,
              duration: input.duration,
            },
            description: `Changement de statut: ${provider.providerProfile?.status} → ${input.status}`,
          },
        });

        // Notifier le prestataire
        if (input.notifyProvider) {
          const statusMessages = {
            ACTIVE: "Votre compte a été réactivé",
            SUSPENDED: `Votre compte a été suspendu${input.duration ? ` pour ${input.duration} jours` : ""}`,
            INACTIVE: "Votre compte a été désactivé",
          };

          await ctx.db.notification.create({
            data: {
              userId: input.providerId,
              type: "ACCOUNT_STATUS_CHANGED",
              title: "Changement de statut du compte",
              message: `${statusMessages[input.status]}. Raison: ${input.reason}`,
              data: {
                newStatus: input.status,
                reason: input.reason,
                duration: input.duration,
                suspensionEndDate,
                adminId: user.id,
              },
            },
          });
        }

        console.log(`🔄 Statut prestataire modifié: ${provider.name} → ${input.status} par ${user.name}`);

        return {
          success: true,
          data: updatedProvider,
          message: `Statut du prestataire mis à jour: ${input.status}`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la modification du statut:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la modification du statut",
        });
      }
    }),

  // Approuver/Rejeter la vérification d'un prestataire
  updateVerificationStatus: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        status: z.enum(["APPROVED", "REJECTED"]),
        feedback: z.string().optional(),
        requiredDocuments: z.array(z.string()).optional(),
        notifyProvider: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent gérer les vérifications",
        });
      }

      try {
        const provider = await ctx.db.user.findFirst({
          where: {
            id: input.providerId,
            role: UserRole.PROVIDER,
          },
          include: {
            providerProfile: true,
          },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Prestataire non trouvé",
          });
        }

        // Mettre à jour le statut de vérification
        const updatedProfile = await ctx.db.providerProfile.update({
          where: { userId: input.providerId },
          data: {
            verificationStatus: input.status,
            isVerified: input.status === "APPROVED",
            verificationFeedback: input.feedback,
            requiredDocuments: input.requiredDocuments || [],
            verifiedAt: input.status === "APPROVED" ? new Date() : null,
            verifiedBy: input.status === "APPROVED" ? user.id : null,
          },
        });

        // Enregistrer l'action admin
        await ctx.db.adminAction.create({
          data: {
            adminId: user.id,
            type: "PROVIDER_VERIFICATION",
            targetId: input.providerId,
            details: {
              status: input.status,
              feedback: input.feedback,
              requiredDocuments: input.requiredDocuments,
            },
            description: `Vérification ${input.status === "APPROVED" ? "approuvée" : "rejetée"}: ${provider.providerProfile?.businessName}`,
          },
        });

        // Notifier le prestataire
        if (input.notifyProvider) {
          await ctx.db.notification.create({
            data: {
              userId: input.providerId,
              type: input.status === "APPROVED" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
              title: input.status === "APPROVED" ? "Vérification approuvée" : "Vérification rejetée",
              message: input.status === "APPROVED" 
                ? "Félicitations ! Votre compte a été vérifié avec succès."
                : `Votre demande de vérification a été rejetée. ${input.feedback || ""}`,
              data: {
                status: input.status,
                feedback: input.feedback,
                requiredDocuments: input.requiredDocuments,
                verifiedBy: user.id,
              },
            },
          });
        }

        console.log(`✅ Vérification ${input.status}: ${provider.providerProfile?.businessName} par ${user.name}`);

        return {
          success: true,
          data: updatedProfile,
          message: `Vérification ${input.status === "APPROVED" ? "approuvée" : "rejetée"} avec succès`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la mise à jour de la vérification:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour de la vérification",
        });
      }
    }),

  // Obtenir les statistiques des prestataires
  getProviderStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (user.role !== UserRole.ADMIN) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    try {
      const [totalStats, statusStats, verificationStats, categoryStats] = await Promise.all([
        ctx.db.user.count({
          where: { role: UserRole.PROVIDER },
        }),
        ctx.db.providerProfile.groupBy({
          by: ["status"],
          _count: { id: true },
        }),
        ctx.db.providerProfile.groupBy({
          by: ["verificationStatus"],
          _count: { id: true },
        }),
        ctx.db.providerProfile.findMany({
          select: { categories: true },
        }),
      ]);

      // Analyser les catégories
      const categoryCount: Record<string, number> = {};
      categoryStats.forEach((profile) => {
        (profile.categories as string[]).forEach((category) => {
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
      });

      return {
        success: true,
        data: {
          total: totalStats,
          byStatus: statusStats.reduce((acc: Record<string, number>, stat: any) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {}),
          byVerificationStatus: verificationStats.reduce((acc: Record<string, number>, stat: any) => {
            acc[stat.verificationStatus] = stat._count.id;
            return acc;
          }, {}),
          byCategory: categoryCount,
          topCategories: Object.entries(categoryCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([category, count]) => ({ category, count })),
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
});
