import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from '@/server/api/trpc';
import { TRPCError } from "@trpc/server";
import { MatchingAlgorithm, MatchingPriority, MatchingResultStatus, MatchingCriteriaType } from "@prisma/client";

/**
 * Router pour le système de matching automatique
 * Gère le matching entre annonces et livreurs/routes planifiées
 */

// Schémas de validation
const createMatchingCriteriaSchema = z.object({
  announcementId: z.string().cuid(),
  algorithm: z.nativeEnum(MatchingAlgorithm).default('HYBRID'),
  priority: z.nativeEnum(MatchingPriority).default('NORMAL'),
  
  // Critères géographiques
  maxDistance: z.number().min(0).max(100).optional(),
  preferredRadius: z.number().min(0).max(50).optional(),
  allowPartialRoute: z.boolean().default(true),
  
  // Critères temporels
  timeWindowStart: z.date().optional(),
  timeWindowEnd: z.date().optional(),
  maxDelay: z.number().min(0).max(240).optional(), // minutes
  
  // Critères de véhicule
  requiredVehicleTypes: z.array(z.enum(['FOOT', 'BIKE', 'SCOOTER', 'CAR', 'VAN', 'TRUCK'])).optional(),
  minVehicleCapacity: z.number().min(0).optional(),
  
  // Critères de livreur
  minDelivererRating: z.number().min(1).max(5).optional(),
  preferredLanguages: z.array(z.string()).optional(),
  genderPreference: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  
  // Critères de prix
  maxPrice: z.number().min(0).optional(),
  minPrice: z.number().min(0).optional(),
  allowNegotiation: z.boolean().default(true),
  
  // Configuration avancée
  autoAssignAfter: z.number().min(0).max(480).optional(), // minutes
  maxSuggestions: z.number().min(1).max(20).default(5),
  scoreThreshold: z.number().min(0).max(1).default(0.6)
});

const matchingResultsFilterSchema = z.object({
  announcementId: z.string().cuid().optional(),
  delivererId: z.string().cuid().optional(),
  status: z.nativeEnum(MatchingResultStatus).optional(),
  minScore: z.number().min(0).max(1).optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0)
});

const respondToMatchSchema = z.object({
  matchingResultId: z.string().cuid(),
  accept: z.boolean(),
  proposedPrice: z.number().min(0).optional(),
  message: z.string().max(500).optional(),
  rejectionReason: z.string().max(200).optional()
});

export const matchingRouter = router({
  /**
   * Créer des critères de matching pour une annonce
   */
  createCriteria: protectedProcedure
    .input(createMatchingCriteriaSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      
      try {
        // Vérifier que l'annonce existe et appartient à l'utilisateur
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            clientId: user.id,
            status: { in: ['DRAFT', 'PUBLISHED'] }
          }
        });

        if (!announcement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Annonce non trouvée ou non autorisée"
          });
        }

        // Créer ou mettre à jour les critères
        const criteria = await ctx.db.matchingCriteria.upsert({
          where: { announcementId: input.announcementId },
          update: {
            ...input,
            updatedAt: new Date()
          },
          create: {
            ...input,
            packageTypes: ['STANDARD'], // Valeur par défaut
            scoreThreshold: input.scoreThreshold
          }
        });

        // Si l'annonce est publiée et autoAssign est activé, lancer le matching
        if (announcement.status === 'PUBLISHED' && announcement.autoAssign) {
          await triggerMatchingProcess(criteria.id);
        }

        return {
          success: true,
          data: criteria,
          message: "Critères de matching créés avec succès"
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création des critères"
        });
      }
    }),

  /**
   * Déclencher le processus de matching pour une annonce
   */
  triggerMatching: protectedProcedure
    .input(z.object({
      announcementId: z.string().cuid(),
      forceRefresh: z.boolean().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      
      try {
        // Vérifier les permissions
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            OR: [
              { clientId: user.id },
              { ...(user.role === 'ADMIN' ? {} : { id: 'impossible' }) }
            ]
          },
          include: {
            matchingCriteria: true
          }
        });

        if (!announcement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Annonce non trouvée ou non autorisée"
          });
        }

        if (!announcement.matchingCriteria) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Aucun critère de matching défini pour cette annonce"
          });
        }

        // Lancer le processus de matching
        const results = await performMatching(
          announcement,
          announcement.matchingCriteria,
          ctx.db
        );

        return {
          success: true,
          data: {
            announcementId: input.announcementId,
            resultsCount: results.length,
            topMatches: results.slice(0, 3)
          },
          message: `Matching terminé: ${results.length} livreurs trouvés`
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du matching"
        });
      }
    }),

  /**
   * Obtenir les résultats de matching
   */
  getMatchingResults: protectedProcedure
    .input(matchingResultsFilterSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      
      try {
        const where: any = {};
        
        // Filtrer selon le rôle
        if (user.role === 'CLIENT') {
          // Les clients ne voient que les matchings de leurs annonces
          const userAnnouncements = await ctx.db.announcement.findMany({
            where: { clientId: user.id },
            select: { id: true }
          });
          where.announcementId = { in: userAnnouncements.map(a => a.id) };
        } else if (user.role === 'DELIVERER') {
          // Les livreurs ne voient que leurs propres matchings
          where.delivererId = user.id;
        }
        
        // Appliquer les filtres
        if (input.announcementId) where.announcementId = input.announcementId;
        if (input.delivererId && user.role === 'ADMIN') where.delivererId = input.delivererId;
        if (input.status) where.status = input.status;
        if (input.minScore) where.overallScore = { gte: input.minScore };

        const results = await ctx.db.matchingResult.findMany({
          where,
          include: {
            deliverer: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                deliverer: {
                  select: {
                    averageRating: true,
                    totalDeliveries: true,
                    completedDeliveries: true
                  }
                }
              }
            },
            announcement: {
              select: {
                id: true,
                title: true,
                pickupCity: true,
                deliveryCity: true,
                suggestedPrice: true,
                status: true
              }
            },
            criteria: {
              select: {
                algorithm: true,
                priority: true,
                scoreThreshold: true
              }
            }
          },
          orderBy: [
            { overallScore: 'desc' },
            { suggestedAt: 'desc' }
          ],
          skip: input.offset,
          take: input.limit
        });

        const totalCount = await ctx.db.matchingResult.count({ where });

        return {
          success: true,
          data: results,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des résultats"
        });
      }
    }),

  /**
   * Répondre à une suggestion de matching (livreur)
   */
  respondToMatch: protectedProcedure
    .input(respondToMatchSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      
      if (user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent répondre aux matchings"
        });
      }

      try {
        // Vérifier que le matching existe et appartient au livreur
        const matchingResult = await ctx.db.matchingResult.findFirst({
          where: {
            id: input.matchingResultId,
            delivererId: user.id,
            status: { in: ['PENDING', 'SUGGESTED'] }
          },
          include: {
            announcement: true,
            criteria: true
          }
        });

        if (!matchingResult) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Matching non trouvé ou déjà traité"
          });
        }

        // Vérifier que l'annonce est toujours disponible
        if (matchingResult.announcement.status !== 'PUBLISHED') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cette annonce n'est plus disponible"
          });
        }

        // Mettre à jour le résultat
        const updatedResult = await ctx.db.matchingResult.update({
          where: { id: input.matchingResultId },
          data: {
            status: input.accept ? 'ACCEPTED' : 'REJECTED',
            respondedAt: new Date(),
            rejectionReason: input.rejectionReason,
            ...(input.proposedPrice && {
              suggestedPrice: input.proposedPrice
            })
          }
        });

        if (input.accept) {
          // Créer une candidature pour l'annonce
          await ctx.db.deliveryApplication.create({
            data: {
              announcementId: matchingResult.announcementId,
              delivererId: user.id,
              proposedPrice: input.proposedPrice || matchingResult.suggestedPrice.toNumber(),
              message: input.message || "Candidature via matching automatique",
              status: 'PENDING',
              isFromMatching: true
            }
          });

          // Si auto-assign est activé et score suffisant, assigner automatiquement
          if (matchingResult.criteria.autoAssignAfter && 
              matchingResult.overallScore >= matchingResult.criteria.scoreThreshold) {
            await ctx.db.announcement.update({
              where: { id: matchingResult.announcementId },
              data: {
                delivererId: user.id,
                status: 'ASSIGNED'
              }
            });
          }
        }

        return {
          success: true,
          data: updatedResult,
          message: input.accept ? "Candidature envoyée" : "Matching refusé"
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la réponse"
        });
      }
    }),

  /**
   * Obtenir les préférences de matching du livreur
   */
  getMyPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx.session;
      
      if (user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent gérer leurs préférences"
        });
      }

      try {
        let preferences = await ctx.db.delivererMatchingPreferences.findUnique({
          where: { delivererId: user.id }
        });

        // Créer les préférences par défaut si elles n'existent pas
        if (!preferences) {
          preferences = await ctx.db.delivererMatchingPreferences.create({
            data: {
              delivererId: user.id,
              preferredRadius: 10.0,
              maxRadius: 25.0,
              maxWorkingHours: 8,
              acceptedPackageTypes: ['STANDARD', 'FRAGILE'],
              maxPackageWeight: 20.0,
              acceptFragile: true,
              acceptRefrigerated: false,
              minPrice: 5.00,
              acceptNegotiation: true,
              instantNotification: true,
              maxSuggestions: 10,
              autoDeclineAfter: 60
            }
          });
        }

        return {
          success: true,
          data: preferences
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des préférences"
        });
      }
    }),

  /**
   * Mettre à jour les préférences de matching
   */
  updateMyPreferences: protectedProcedure
    .input(z.object({
      preferredRadius: z.number().min(1).max(50).optional(),
      maxRadius: z.number().min(1).max(100).optional(),
      homeLatitude: z.number().optional(),
      homeLongitude: z.number().optional(),
      availableFrom: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      availableTo: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      availableDays: z.array(z.number().min(0).max(6)).optional(),
      maxWorkingHours: z.number().min(1).max(12).optional(),
      acceptedPackageTypes: z.array(z.enum(['STANDARD', 'FRAGILE', 'REFRIGERATED', 'DANGEROUS', 'OVERSIZED'])).optional(),
      maxPackageWeight: z.number().min(1).max(100).optional(),
      acceptFragile: z.boolean().optional(),
      acceptRefrigerated: z.boolean().optional(),
      minPrice: z.number().min(0).optional(),
      maxPrice: z.number().min(0).optional(),
      acceptNegotiation: z.boolean().optional(),
      instantNotification: z.boolean().optional(),
      maxSuggestions: z.number().min(1).max(50).optional(),
      autoDeclineAfter: z.number().min(0).max(480).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      
      if (user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent modifier leurs préférences"
        });
      }

      try {
        const preferences = await ctx.db.delivererMatchingPreferences.upsert({
          where: { delivererId: user.id },
          update: {
            ...input,
            updatedAt: new Date()
          },
          create: {
            delivererId: user.id,
            ...input,
            preferredRadius: input.preferredRadius || 10.0,
            maxRadius: input.maxRadius || 25.0,
            maxWorkingHours: input.maxWorkingHours || 8,
            acceptedPackageTypes: input.acceptedPackageTypes || ['STANDARD'],
            maxPackageWeight: input.maxPackageWeight || 20.0,
            acceptFragile: input.acceptFragile ?? true,
            acceptRefrigerated: input.acceptRefrigerated ?? false,
            minPrice: input.minPrice || 5.00,
            acceptNegotiation: input.acceptNegotiation ?? true,
            instantNotification: input.instantNotification ?? true,
            maxSuggestions: input.maxSuggestions || 10,
            autoDeclineAfter: input.autoDeclineAfter || 60
          }
        });

        return {
          success: true,
          data: preferences,
          message: "Préférences mises à jour avec succès"
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour des préférences"
        });
      }
    }),

  /**
   * Obtenir les statistiques de matching (Admin)
   */
  getMatchingStats: protectedProcedure
    .input(z.object({
      period: z.enum(['day', 'week', 'month']).default('week'),
      algorithm: z.nativeEnum(MatchingAlgorithm).optional()
    }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      
      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès réservé aux administrateurs"
        });
      }

      try {
        const startDate = new Date();
        switch (input.period) {
          case 'day':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        }

        const where: any = {
          suggestedAt: { gte: startDate }
        };
        
        if (input.algorithm) {
          where.algorithm = input.algorithm;
        }

        // Statistiques globales
        const [
          totalMatches,
          acceptedMatches,
          rejectedMatches,
          expiredMatches,
          avgResponseTime,
          avgScore
        ] = await Promise.all([
          ctx.db.matchingResult.count({ where }),
          ctx.db.matchingResult.count({ where: { ...where, status: 'ACCEPTED' } }),
          ctx.db.matchingResult.count({ where: { ...where, status: 'REJECTED' } }),
          ctx.db.matchingResult.count({ where: { ...where, status: 'EXPIRED' } }),
          ctx.db.matchingResult.aggregate({
            where: { ...where, respondedAt: { not: null } },
            _avg: {
              processingTime: true
            }
          }),
          ctx.db.matchingResult.aggregate({
            where,
            _avg: {
              overallScore: true,
              distanceScore: true,
              timeScore: true,
              priceScore: true,
              ratingScore: true
            }
          })
        ]);

        const acceptanceRate = totalMatches > 0 
          ? (acceptedMatches / totalMatches) * 100 
          : 0;

        return {
          success: true,
          data: {
            summary: {
              totalMatches,
              acceptedMatches,
              rejectedMatches,
              expiredMatches,
              acceptanceRate: Math.round(acceptanceRate * 100) / 100,
              avgResponseTimeMinutes: Math.round(avgResponseTime._avg.processingTime || 0)
            },
            scores: {
              overall: Math.round((avgScore._avg.overallScore || 0) * 100) / 100,
              distance: Math.round((avgScore._avg.distanceScore || 0) * 100) / 100,
              time: Math.round((avgScore._avg.timeScore || 0) * 100) / 100,
              price: Math.round((avgScore._avg.priceScore || 0) * 100) / 100,
              rating: Math.round((avgScore._avg.ratingScore || 0) * 100) / 100
            },
            period: input.period
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques"
        });
      }
    })
});

// Helper functions
async function triggerMatchingProcess(criteriaId: string) {
  // TODO: Implémenter le processus de matching asynchrone
  console.log("Matching process triggered for criteria:", criteriaId);
}

async function performMatching(announcement: any, criteria: any, db: any) {
  // TODO: Implémenter l'algorithme de matching
  // - Rechercher les livreurs disponibles
  // - Calculer les scores selon l'algorithme choisi
  // - Créer les résultats de matching
  // - Notifier les livreurs
  
  // Placeholder implementation
  const deliverers = await db.user.findMany({
    where: {
      role: 'DELIVERER',
      status: 'ACTIVE',
      deliverer: {
        isAvailable: true
      }
    },
    include: {
      deliverer: true,
      matchingPreferences: true
    },
    take: criteria.maxSuggestions
  });

  const results = [];
  for (const deliverer of deliverers) {
    // Calculer les scores (simplifié)
    const distanceScore = Math.random();
    const timeScore = Math.random();
    const priceScore = Math.random();
    const ratingScore = deliverer.deliverer?.averageRating ? deliverer.deliverer.averageRating / 5 : 0.5;
    
    const overallScore = (
      distanceScore * 0.3 +
      timeScore * 0.3 +
      priceScore * 0.2 +
      ratingScore * 0.2
    );

    if (overallScore >= criteria.scoreThreshold) {
      const result = await db.matchingResult.create({
        data: {
          criteriaId: criteria.id,
          delivererId: deliverer.id,
          announcementId: announcement.id,
          overallScore,
          distanceScore,
          timeScore,
          priceScore,
          ratingScore,
          calculatedDistance: Math.random() * 20,
          estimatedDuration: Math.round(Math.random() * 60 + 15),
          suggestedPrice: announcement.suggestedPrice || 10,
          algorithm: criteria.algorithm,
          processingTime: Math.round(Math.random() * 1000),
          confidenceLevel: overallScore,
          status: 'SUGGESTED',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
      
      results.push(result);
    }
  }

  return results;
}