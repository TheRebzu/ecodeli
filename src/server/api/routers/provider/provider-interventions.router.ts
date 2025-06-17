import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole, InterventionStatus } from "@prisma/client";

/**
 * Router pour les interventions des prestataires
 * Gestion complète des interventions, planning et suivi
 */
export const providerInterventionsRouter = createTRPCRouter({
  // Récupérer les interventions du prestataire
  getMyInterventions: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.nativeEnum(InterventionStatus).optional(),
        clientId: z.string().optional(),
        serviceId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.PROVIDER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent accéder à leurs interventions",
        });
      }

      try {
        const where = {
          providerId: user.id,
          ...(input.status && { status: input.status }),
          ...(input.clientId && { clientId: input.clientId }),
          ...(input.serviceId && { serviceId: input.serviceId }),
          ...(input.startDate && input.endDate && {
            scheduledDate: {
              gte: input.startDate,
              lte: input.endDate,
            },
          }),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
              { client: { name: { contains: input.search, mode: "insensitive" } } },
            ],
          }),
        };

        const [interventions, total] = await Promise.all([
          ctx.db.providerIntervention.findMany({
            where,
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  phone: true,
                },
              },
              service: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  basePrice: true,
                },
              },
              booking: {
                select: {
                  id: true,
                  requestedDateTime: true,
                  finalPrice: true,
                },
              },
              reports: {
                orderBy: { createdAt: "desc" },
                take: 3,
              },
              materials: true,
            },
            orderBy: { scheduledDate: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.providerIntervention.count({ where }),
        ]);

        return {
          success: true,
          data: {
            interventions,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des interventions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des interventions",
        });
      }
    }),

  // Créer une intervention
  createIntervention: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        serviceId: z.string(),
        bookingId: z.string().optional(),
        title: z.string().min(3, "Titre requis"),
        description: z.string().min(10, "Description requise"),
        scheduledDate: z.date(),
        estimatedDuration: z.number().min(30).max(480), // minutes
        address: z.string().min(5, "Adresse requise"),
        estimatedPrice: z.number().positive(),
        materials: z.array(
          z.object({
            name: z.string(),
            quantity: z.number().positive(),
            unitPrice: z.number().positive(),
            description: z.string().optional(),
          })
        ).optional(),
        specialInstructions: z.string().optional(),
        requiresTools: z.boolean().default(false),
        toolsList: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.PROVIDER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent créer des interventions",
        });
      }

      try {
        // Vérifier que le client existe
        const client = await ctx.db.user.findFirst({
          where: {
            id: input.clientId,
            role: UserRole.CLIENT,
          },
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client non trouvé",
          });
        }

        // Vérifier que le service appartient au prestataire
        const service = await ctx.db.personalService.findFirst({
          where: {
            id: input.serviceId,
            providerId: user.id,
            isActive: true,
          },
        });

        if (!service) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Service non trouvé ou non actif",
          });
        }

        // Vérifier les conflits de planning
        const conflictingIntervention = await ctx.db.providerIntervention.findFirst({
          where: {
            providerId: user.id,
            status: { in: [InterventionStatus.SCHEDULED, InterventionStatus.IN_PROGRESS] },
            scheduledDate: {
              gte: new Date(input.scheduledDate.getTime() - input.estimatedDuration * 60000),
              lte: new Date(input.scheduledDate.getTime() + input.estimatedDuration * 60000),
            },
          },
        });

        if (conflictingIntervention) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ce créneau entre en conflit avec une autre intervention",
          });
        }

        // Calculer le coût total des matériaux
        const materialsTotal = input.materials?.reduce(
          (sum, material) => sum + material.quantity * material.unitPrice,
          0
        ) || 0;

        // Créer l'intervention
        const intervention = await ctx.db.providerIntervention.create({
          data: {
            providerId: user.id,
            clientId: input.clientId,
            serviceId: input.serviceId,
            bookingId: input.bookingId,
            title: input.title,
            description: input.description,
            scheduledDate: input.scheduledDate,
            estimatedDuration: input.estimatedDuration,
            address: input.address,
            estimatedPrice: input.estimatedPrice,
            materialsTotal,
            totalPrice: input.estimatedPrice + materialsTotal,
            specialInstructions: input.specialInstructions,
            requiresTools: input.requiresTools,
            toolsList: input.toolsList || [],
            status: InterventionStatus.SCHEDULED,
          },
          include: {
            client: {
              select: {
                name: true,
                email: true,
              },
            },
            service: {
              select: {
                name: true,
              },
            },
          },
        });

        // Créer les matériaux si fournis
        if (input.materials && input.materials.length > 0) {
          await ctx.db.interventionMaterial.createMany({
            data: input.materials.map((material) => ({
              interventionId: intervention.id,
              name: material.name,
              quantity: material.quantity,
              unitPrice: material.unitPrice,
              description: material.description,
            })),
          });
        }

        // Créer une notification pour le client
        await ctx.db.notification.create({
          data: {
            userId: input.clientId,
            type: "INTERVENTION_SCHEDULED",
            title: "Intervention programmée",
            message: `Une intervention "${input.title}" a été programmée pour le ${input.scheduledDate.toLocaleDateString()}`,
            data: {
              interventionId: intervention.id,
              providerId: user.id,
              scheduledDate: input.scheduledDate,
              estimatedPrice: input.estimatedPrice,
            },
          },
        });

        console.log(`📅 Intervention créée: ${intervention.title} pour ${intervention.client.name}`);

        return {
          success: true,
          data: intervention,
          message: "Intervention créée avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la création de l'intervention:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de l'intervention",
        });
      }
    }),

  // Démarrer une intervention
  startIntervention: protectedProcedure
    .input(
      z.object({
        interventionId: z.string(),
        actualStartTime: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.PROVIDER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const intervention = await ctx.db.providerIntervention.findFirst({
          where: {
            id: input.interventionId,
            providerId: user.id,
          },
          include: {
            client: {
              select: { name: true, email: true },
            },
          },
        });

        if (!intervention) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Intervention non trouvée",
          });
        }

        if (intervention.status !== InterventionStatus.SCHEDULED) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cette intervention ne peut pas être démarrée",
          });
        }

        // Mettre à jour l'intervention
        const updatedIntervention = await ctx.db.providerIntervention.update({
          where: { id: input.interventionId },
          data: {
            status: InterventionStatus.IN_PROGRESS,
            actualStartTime: input.actualStartTime || new Date(),
            notes: input.notes,
          },
        });

        // Créer un rapport d'activité
        await ctx.db.interventionReport.create({
          data: {
            interventionId: input.interventionId,
            type: "START",
            title: "Intervention démarrée",
            description: input.notes || "L'intervention a été démarrée",
            reportedAt: input.actualStartTime || new Date(),
          },
        });

        // Notifier le client
        await ctx.db.notification.create({
          data: {
            userId: intervention.clientId,
            type: "INTERVENTION_STARTED",
            title: "Intervention démarrée",
            message: `L'intervention "${intervention.title}" a été démarrée`,
            data: {
              interventionId: intervention.id,
              startTime: input.actualStartTime || new Date(),
            },
          },
        });

        return {
          success: true,
          data: updatedIntervention,
          message: "Intervention démarrée avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors du démarrage de l'intervention:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du démarrage de l'intervention",
        });
      }
    }),

  // Terminer une intervention
  completeIntervention: protectedProcedure
    .input(
      z.object({
        interventionId: z.string(),
        actualEndTime: z.date().optional(),
        finalReport: z.string().min(10, "Rapport final requis"),
        finalPrice: z.number().positive().optional(),
        materialsUsed: z.array(
          z.object({
            materialId: z.string().optional(),
            name: z.string(),
            quantity: z.number().positive(),
            actualPrice: z.number().positive(),
          })
        ).optional(),
        clientSignature: z.string().optional(),
        photos: z.array(z.string().url()).max(10).optional(),
        nextAppointmentNeeded: z.boolean().default(false),
        nextAppointmentDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.PROVIDER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const intervention = await ctx.db.providerIntervention.findFirst({
          where: {
            id: input.interventionId,
            providerId: user.id,
          },
          include: {
            materials: true,
            client: {
              select: { name: true, email: true },
            },
          },
        });

        if (!intervention) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Intervention non trouvée",
          });
        }

        if (intervention.status !== InterventionStatus.IN_PROGRESS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cette intervention ne peut pas être terminée",
          });
        }

        // Calculer le prix final
        const materialsActualTotal = input.materialsUsed?.reduce(
          (sum, material) => sum + material.quantity * material.actualPrice,
          0
        ) || intervention.materialsTotal;

        const finalPrice = input.finalPrice || (intervention.estimatedPrice + materialsActualTotal);

        // Mettre à jour l'intervention
        const updatedIntervention = await ctx.db.providerIntervention.update({
          where: { id: input.interventionId },
          data: {
            status: InterventionStatus.COMPLETED,
            actualEndTime: input.actualEndTime || new Date(),
            finalReport: input.finalReport,
            finalPrice,
            materialsActualTotal,
            clientSignature: input.clientSignature,
            photos: input.photos || [],
            nextAppointmentNeeded: input.nextAppointmentNeeded,
            nextAppointmentDate: input.nextAppointmentDate,
          },
        });

        // Mettre à jour les matériaux utilisés
        if (input.materialsUsed && input.materialsUsed.length > 0) {
          for (const material of input.materialsUsed) {
            if (material.materialId) {
              await ctx.db.interventionMaterial.update({
                where: { id: material.materialId },
                data: {
                  actualQuantity: material.quantity,
                  actualPrice: material.actualPrice,
                },
              });
            } else {
              await ctx.db.interventionMaterial.create({
                data: {
                  interventionId: input.interventionId,
                  name: material.name,
                  quantity: material.quantity,
                  unitPrice: material.actualPrice,
                  actualQuantity: material.quantity,
                  actualPrice: material.actualPrice,
                },
              });
            }
          }
        }

        // Créer le rapport final
        await ctx.db.interventionReport.create({
          data: {
            interventionId: input.interventionId,
            type: "COMPLETION",
            title: "Intervention terminée",
            description: input.finalReport,
            photos: input.photos || [],
            reportedAt: input.actualEndTime || new Date(),
          },
        });

        // Notifier le client
        await ctx.db.notification.create({
          data: {
            userId: intervention.clientId,
            type: "INTERVENTION_COMPLETED",
            title: "Intervention terminée",
            message: `L'intervention "${intervention.title}" a été terminée avec succès`,
            data: {
              interventionId: intervention.id,
              finalPrice,
              endTime: input.actualEndTime || new Date(),
            },
          },
        });

        // Programmer la prochaine intervention si nécessaire
        if (input.nextAppointmentNeeded && input.nextAppointmentDate) {
          // TODO: Créer la prochaine intervention
          console.log(`📅 Prochaine intervention à programmer pour le ${input.nextAppointmentDate}`);
        }

        return {
          success: true,
          data: updatedIntervention,
          message: "Intervention terminée avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la finalisation de l'intervention:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la finalisation de l'intervention",
        });
      }
    }),

  // Obtenir les statistiques d'interventions
  getInterventionStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (user.role !== UserRole.PROVIDER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    try {
      const [totalStats, monthlyStats, statusStats] = await Promise.all([
        ctx.db.providerIntervention.aggregate({
          where: { providerId: user.id },
          _count: { id: true },
          _sum: { finalPrice: true, estimatedPrice: true },
          _avg: { finalPrice: true },
        }),
        ctx.db.providerIntervention.aggregate({
          where: {
            providerId: user.id,
            scheduledDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _count: { id: true },
          _sum: { finalPrice: true },
        }),
        ctx.db.providerIntervention.groupBy({
          by: ["status"],
          where: { providerId: user.id },
          _count: { id: true },
        }),
      ]);

      return {
        success: true,
        data: {
          total: {
            interventions: totalStats._count.id || 0,
            revenue: totalStats._sum.finalPrice || 0,
            estimatedRevenue: totalStats._sum.estimatedPrice || 0,
            averagePrice: totalStats._avg.finalPrice || 0,
          },
          thisMonth: {
            interventions: monthlyStats._count.id || 0,
            revenue: monthlyStats._sum.finalPrice || 0,
          },
                     byStatus: statusStats.reduce((acc: Record<string, number>, stat: any) => {
             acc[stat.status] = stat._count.id;
             return acc;
           }, {} as Record<string, number>),
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
