import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { SkillLevel, CertificationStatus } from "@prisma/client";

/**
 * Router pour la gestion des compétences et certifications des prestataires
 * Système complet de validation et habilitation selon le cahier des charges
 */

// Schémas de validation
const createSkillSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(50),
  level: z.nativeEnum(SkillLevel),
  description: z.string().max(500).optional(),
  yearsOfExperience: z.number().int().min(0).max(50),

  // Preuve de compétence
  certificationNumber: z.string().max(100).optional(),
  issuingOrganization: z.string().max(100).optional(),
  validUntil: z.date().optional(),

  // Documents justificatifs
  certificateUrls: z.array(z.string().url()).max(5),
  portfolioUrls: z.array(z.string().url()).max(10),

  // Tarification spécifique à cette compétence
  hourlyRate: z.number().min(0).optional(),
  minimumRate: z.number().min(0).optional(),

  // Disponibilité
  isAvailable: z.boolean().default(true),
  maxProjectsPerMonth: z.number().int().min(1).max(20).optional(),
});

const updateSkillSchema = createSkillSchema.partial().extend({
  id: z.string().cuid(),
});

const createCertificationSchema = z.object({
  name: z.string().min(2).max(100),
  issuingOrganization: z.string().min(2).max(100),
  certificateNumber: z.string().min(1).max(100),
  issueDate: z.date(),
  expiryDate: z.date().optional(),

  // Documents
  certificateUrl: z.string().url(),
  badgeUrl: z.string().url().optional(),

  // Validation
  isVerified: z.boolean().default(false),
  verificationNotes: z.string().max(1000).optional(),

  // Métadonnées
  credentialType: z.enum([
    "CERTIFICATE",
    "DIPLOMA",
    "LICENSE",
    "BADGE",
    "ACCREDITATION",
  ]),
  skillCategories: z.array(z.string()).max(10), // Compétences couvertes

  // Reconnaissance
  isRecognizedByEcodeli: z.boolean().default(false),
  recognitionLevel: z
    .enum(["BASIC", "INTERMEDIATE", "ADVANCED", "EXPERT"])
    .optional(),
});

const skillValidationSchema = z.object({
  skillId: z.string().cuid(),
  status: z.enum(["PENDING", "VALIDATED", "REJECTED", "EXPIRED"]),
  validatorNotes: z.string().max(1000),
  validatedUntil: z.date().optional(),
  requiredDocuments: z.array(z.string()).optional(),
});

const skillFiltersSchema = z.object({
  category: z.string().optional(),
  level: z.nativeEnum(SkillLevel).optional(),
  isVerified: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["name", "level", "experience", "rate", "createdAt"])
    .default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const providerSkillsRouter = router({
  /**
   * Obtenir toutes les compétences du prestataire
   */
  getMySkills: protectedProcedure
    .input(skillFiltersSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent consulter leurs compétences",
        });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil prestataire non trouvé",
          });
        }

        // Construire les filtres
        const where: any = {
          providerId: provider.id,
          ...(input.category && { category: input.category }),
          ...(input.level && { level: input.level }),
          ...(input.isVerified !== undefined && {
            isVerified: input.isVerified,
          }),
          ...(input.isAvailable !== undefined && {
            isAvailable: input.isAvailable,
          }),
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
              { category: { contains: input.search, mode: "insensitive" } },
            ],
          }),
        };

        const orderBy: any = {};
        orderBy[input.sortBy] = input.sortOrder;

        const [skills, totalCount] = await Promise.all([
          ctx.db.providerSkill.findMany({
            where,
            include: {
              certifications: {
                select: {
                  id: true,
                  name: true,
                  issuingOrganization: true,
                  status: true,
                  expiryDate: true,
                },
              },
              validations: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: {
                  status: true,
                  validatorNotes: true,
                  validatedAt: true,
                  validatedUntil: true,
                },
              },
              _count: {
                select: {
                  bookings: true,
                  portfolioItems: true,
                },
              },
            },
            orderBy,
            skip: input.offset,
            take: input.limit,
          }),
          ctx.db.providerSkill.count({ where }),
        ]);

        // Formatter les données
        const formattedSkills = skills.map((skill) => ({
          ...skill,
          hourlyRate: skill.hourlyRate?.toNumber(),
          minimumRate: skill.minimumRate?.toNumber(),
          currentValidation: skill.validations[0] || null,
          activeCertifications: skill.certifications.filter(
            (cert) =>
              cert.status === "ACTIVE" &&
              (!cert.expiryDate || cert.expiryDate > new Date()),
          ),
          totalBookings: skill._count.bookings,
          portfolioCount: skill._count.portfolioItems,
          isExpiringSoon: skill.certifications.some(
            (cert) =>
              cert.expiryDate &&
              cert.expiryDate <=
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
          ),
        }));

        return {
          success: true,
          data: formattedSkills,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des compétences",
        });
      }
    }),

  /**
   * Ajouter une nouvelle compétence
   */
  createSkill: protectedProcedure
    .input(createSkillSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent ajouter des compétences",
        });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil prestataire non trouvé",
          });
        }

        // Vérifier les limites (max 20 compétences par prestataire)
        const skillCount = await ctx.db.providerSkill.count({
          where: { providerId: provider.id },
        });

        if (skillCount >= 20) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Limite de 20 compétences atteinte",
          });
        }

        // Vérifier l'unicité de la compétence
        const existingSkill = await ctx.db.providerSkill.findFirst({
          where: {
            providerId: provider.id,
            name: input.name,
            category: input.category,
          },
        });

        if (existingSkill) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cette compétence existe déjà dans cette catégorie",
          });
        }

        const skill = await ctx.db.providerSkill.create({
          data: {
            ...input,
            providerId: provider.id,
            isVerified: false, // Doit être validé par l'admin
            verificationStatus: "PENDING",
          },
        });

        return {
          success: true,
          data: {
            ...skill,
            hourlyRate: skill.hourlyRate?.toNumber(),
            minimumRate: skill.minimumRate?.toNumber(),
          },
          message: "Compétence ajoutée avec succès. En attente de validation.",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'ajout de la compétence",
        });
      }
    }),

  /**
   * Mettre à jour une compétence
   */
  updateSkill: protectedProcedure
    .input(updateSkillSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent modifier leurs compétences",
        });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil prestataire non trouvé",
          });
        }

        const skill = await ctx.db.providerSkill.findFirst({
          where: {
            id: input.id,
            providerId: provider.id,
          },
        });

        if (!skill) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Compétence non trouvée",
          });
        }

        const { id, ...updateData } = input;

        // Si la compétence était validée et qu'on modifie des éléments critiques,
        // remettre en attente de validation
        const criticalFields = [
          "name",
          "level",
          "certificationNumber",
          "certificateUrls",
        ];
        const needsRevalidation = criticalFields.some(
          (field) => updateData[field as keyof typeof updateData] !== undefined,
        );

        const updatedSkill = await ctx.db.providerSkill.update({
          where: { id: input.id },
          data: {
            ...updateData,
            ...(needsRevalidation &&
              skill.isVerified && {
                isVerified: false,
                verificationStatus: "PENDING",
              }),
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          data: {
            ...updatedSkill,
            hourlyRate: updatedSkill.hourlyRate?.toNumber(),
            minimumRate: updatedSkill.minimumRate?.toNumber(),
          },
          message: needsRevalidation
            ? "Compétence mise à jour. En attente de re-validation."
            : "Compétence mise à jour avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour",
        });
      }
    }),

  /**
   * Supprimer une compétence
   */
  deleteSkill: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent supprimer leurs compétences",
        });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil prestataire non trouvé",
          });
        }

        const skill = await ctx.db.providerSkill.findFirst({
          where: {
            id: input.id,
            providerId: provider.id,
          },
          include: {
            bookings: true,
          },
        });

        if (!skill) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Compétence non trouvée",
          });
        }

        // Vérifier s'il y a des réservations actives liées
        const activeBookings = skill.bookings.filter(
          (booking) =>
            booking.status === "PENDING" || booking.status === "CONFIRMED",
        );

        if (activeBookings.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Impossible de supprimer une compétence avec des réservations actives",
          });
        }

        await ctx.db.providerSkill.delete({
          where: { id: input.id },
        });

        return {
          success: true,
          message: "Compétence supprimée avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression",
        });
      }
    }),

  /**
   * Ajouter une certification
   */
  createCertification: protectedProcedure
    .input(createCertificationSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent ajouter des certifications",
        });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil prestataire non trouvé",
          });
        }

        // Vérifier l'unicité du numéro de certificat
        const existingCert = await ctx.db.providerCertification.findFirst({
          where: {
            providerId: provider.id,
            certificateNumber: input.certificateNumber,
            issuingOrganization: input.issuingOrganization,
          },
        });

        if (existingCert) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cette certification existe déjà",
          });
        }

        // Vérifier la validité des dates
        if (input.expiryDate && input.expiryDate <= input.issueDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "La date d'expiration doit être postérieure à la date d'émission",
          });
        }

        const certification = await ctx.db.providerCertification.create({
          data: {
            ...input,
            providerId: provider.id,
            status: "PENDING", // En attente de validation
            verificationStatus: "PENDING",
          },
        });

        return {
          success: true,
          data: certification,
          message:
            "Certification ajoutée avec succès. En attente de validation.",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'ajout de la certification",
        });
      }
    }),

  /**
   * Obtenir les certifications du prestataire
   */
  getMyCertifications: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(CertificationStatus).optional(),
        expiringSoon: z.boolean().optional(), // Dans les 60 jours
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Seuls les prestataires peuvent consulter leurs certifications",
        });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil prestataire non trouvé",
          });
        }

        const where: any = {
          providerId: provider.id,
          ...(input.status && { status: input.status }),
        };

        // Filtre pour les certifications expirant bientôt
        if (input.expiringSoon) {
          const sixtyDaysFromNow = new Date();
          sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

          where.expiryDate = {
            lte: sixtyDaysFromNow,
            gte: new Date(),
          };
        }

        const [certifications, totalCount] = await Promise.all([
          ctx.db.providerCertification.findMany({
            where,
            include: {
              skills: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
            orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
            skip: input.offset,
            take: input.limit,
          }),
          ctx.db.providerCertification.count({ where }),
        ]);

        // Formatter les données avec statuts dynamiques
        const formattedCertifications = certifications.map((cert) => {
          const now = new Date();
          const isExpired = cert.expiryDate && cert.expiryDate < now;
          const isExpiringSoon =
            cert.expiryDate &&
            cert.expiryDate > now &&
            cert.expiryDate <=
              new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

          return {
            ...cert,
            isExpired,
            isExpiringSoon,
            daysUntilExpiry: cert.expiryDate
              ? Math.ceil(
                  (cert.expiryDate.getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : null,
            relatedSkillsCount: cert.skills.length,
          };
        });

        return {
          success: true,
          data: formattedCertifications,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des certifications",
        });
      }
    }),

  /**
   * Obtenir les statistiques des compétences
   */
  getSkillsStats: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    if (user.role !== "PROVIDER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Seuls les prestataires peuvent consulter leurs statistiques",
      });
    }

    try {
      const provider = await ctx.db.provider.findUnique({
        where: { userId: user.id },
      });

      if (!provider) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profil prestataire non trouvé",
        });
      }

      const [
        totalSkills,
        verifiedSkills,
        pendingSkills,
        activeCertifications,
        expiringSoonCertifications,
        skillsByLevel,
        topPerformingSkills,
      ] = await Promise.all([
        // Total des compétences
        ctx.db.providerSkill.count({
          where: { providerId: provider.id },
        }),

        // Compétences vérifiées
        ctx.db.providerSkill.count({
          where: {
            providerId: provider.id,
            isVerified: true,
          },
        }),

        // Compétences en attente
        ctx.db.providerSkill.count({
          where: {
            providerId: provider.id,
            verificationStatus: "PENDING",
          },
        }),

        // Certifications actives
        ctx.db.providerCertification.count({
          where: {
            providerId: provider.id,
            status: "ACTIVE",
            OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
          },
        }),

        // Certifications expirant bientôt (60 jours)
        ctx.db.providerCertification.count({
          where: {
            providerId: provider.id,
            status: "ACTIVE",
            expiryDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Répartition par niveau
        ctx.db.providerSkill.groupBy({
          by: ["level"],
          where: { providerId: provider.id },
          _count: true,
        }),

        // Compétences les plus demandées
        ctx.db.providerSkill.findMany({
          where: { providerId: provider.id },
          include: {
            _count: {
              select: { bookings: true },
            },
          },
          orderBy: {
            bookings: { _count: "desc" },
          },
          take: 5,
        }),
      ]);

      // Calculer la complétude du profil
      const profileCompleteness = calculateProfileCompleteness({
        totalSkills,
        verifiedSkills,
        activeCertifications,
      });

      return {
        success: true,
        data: {
          overview: {
            totalSkills,
            verifiedSkills,
            pendingSkills,
            verificationRate:
              totalSkills > 0 ? (verifiedSkills / totalSkills) * 100 : 0,
            activeCertifications,
            expiringSoonCertifications,
            profileCompleteness,
          },
          levelDistribution: skillsByLevel.map((item) => ({
            level: item.level,
            count: item._count,
          })),
          topPerformingSkills: topPerformingSkills.map((skill) => ({
            id: skill.id,
            name: skill.name,
            category: skill.category,
            bookingsCount: skill._count.bookings,
            hourlyRate: skill.hourlyRate?.toNumber(),
          })),
          recommendations: generateSkillRecommendations({
            totalSkills,
            verifiedSkills,
            activeCertifications,
            expiringSoonCertifications,
          }),
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }),

  /**
   * Rechercher des compétences publiques (pour les clients)
   */
  searchSkills: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        category: z.string().optional(),
        level: z.nativeEnum(SkillLevel).optional(),
        city: z.string().optional(),
        maxHourlyRate: z.number().optional(),
        onlyVerified: z.boolean().default(true),
        sortBy: z
          .enum(["relevance", "rate", "experience", "rating"])
          .default("relevance"),
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {
          isAvailable: true,
          isVerified: input.onlyVerified,
          provider: {
            isActive: true,
            isVerified: true,
          },
          ...(input.query && {
            OR: [
              { name: { contains: input.query, mode: "insensitive" } },
              { description: { contains: input.query, mode: "insensitive" } },
              { category: { contains: input.query, mode: "insensitive" } },
            ],
          }),
          ...(input.category && { category: input.category }),
          ...(input.level && { level: input.level }),
          ...(input.maxHourlyRate && {
            hourlyRate: { lte: input.maxHourlyRate },
          }),
          ...(input.city && {
            provider: {
              user: {
                city: { contains: input.city, mode: "insensitive" },
              },
            },
          }),
        };

        const orderBy: any = {};
        switch (input.sortBy) {
          case "rate":
            orderBy.hourlyRate = "asc";
            break;
          case "experience":
            orderBy.yearsOfExperience = "desc";
            break;
          case "rating":
            orderBy.provider = { rating: "desc" };
            break;
          default:
            orderBy.createdAt = "desc";
        }

        const [skills, totalCount] = await Promise.all([
          ctx.db.providerSkill.findMany({
            where,
            include: {
              provider: {
                include: {
                  user: {
                    select: {
                      name: true,
                      city: true,
                      profilePicture: true,
                    },
                  },
                },
              },
              certifications: {
                where: { status: "ACTIVE" },
                select: {
                  name: true,
                  issuingOrganization: true,
                },
              },
              _count: {
                select: { bookings: true },
              },
            },
            orderBy,
            skip: input.offset,
            take: input.limit,
          }),
          ctx.db.providerSkill.count({ where }),
        ]);

        const formattedSkills = skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          category: skill.category,
          level: skill.level,
          yearsOfExperience: skill.yearsOfExperience,
          hourlyRate: skill.hourlyRate?.toNumber(),
          minimumRate: skill.minimumRate?.toNumber(),
          isVerified: skill.isVerified,
          provider: {
            id: skill.provider.id,
            name: skill.provider.user.name,
            city: skill.provider.user.city,
            rating: skill.provider.rating,
            profilePicture: skill.provider.user.profilePicture,
            responseTime: skill.provider.averageResponseTime,
          },
          certificationsCount: skill.certifications.length,
          completedBookings: skill._count.bookings,
        }));

        return {
          success: true,
          data: formattedSkills,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la recherche de compétences",
        });
      }
    }),
});

// Helper functions
function calculateProfileCompleteness(stats: {
  totalSkills: number;
  verifiedSkills: number;
  activeCertifications: number;
}): number {
  let score = 0;

  // Points pour les compétences (40%)
  if (stats.totalSkills >= 3) score += 40;
  else score += (stats.totalSkills / 3) * 40;

  // Points pour la vérification (40%)
  if (stats.totalSkills > 0) {
    score += (stats.verifiedSkills / stats.totalSkills) * 40;
  }

  // Points pour les certifications (20%)
  if (stats.activeCertifications >= 2) score += 20;
  else score += (stats.activeCertifications / 2) * 20;

  return Math.round(score);
}

function generateSkillRecommendations(stats: {
  totalSkills: number;
  verifiedSkills: number;
  activeCertifications: number;
  expiringSoonCertifications: number;
}): string[] {
  const recommendations: string[] = [];

  if (stats.totalSkills < 3) {
    recommendations.push(
      "Ajoutez au moins 3 compétences pour améliorer votre visibilité",
    );
  }

  if (stats.verifiedSkills / stats.totalSkills < 0.5) {
    recommendations.push(
      "Soumettez des documents pour faire vérifier vos compétences",
    );
  }

  if (stats.activeCertifications === 0) {
    recommendations.push(
      "Ajoutez des certifications pour renforcer votre crédibilité",
    );
  }

  if (stats.expiringSoonCertifications > 0) {
    recommendations.push(
      `${stats.expiringSoonCertifications} certification(s) expirent bientôt, pensez à les renouveler`,
    );
  }

  return recommendations;
}
