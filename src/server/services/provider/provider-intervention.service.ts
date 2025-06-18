import { prisma } from "@/server/db";
import { TRPCError } from "@trpc/server";
import type { InterventionStatus, InterventionType } from "@prisma/client";

export interface InterventionFilters {
  status?: InterventionStatus;
  type?: InterventionType;
  clientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface InterventionCreateData {
  clientId: string;
  serviceId: string;
  scheduledDate: Date;
  estimatedDuration: number;
  description: string;
  address: string;
  notes?: string;
  materials?: string[];
  estimatedCost: number;
}

export interface InterventionUpdateData {
  scheduledDate?: Date;
  estimatedDuration?: number;
  description?: string;
  status?: InterventionStatus;
  notes?: string;
  actualStartTime?: Date;
  actualEndTime?: Date;
  actualCost?: number;
  completionNotes?: string;
  materials?: string[];
}

export class ProviderInterventionService {
  /**
   * Récupère les interventions du prestataire avec filtres
   */
  static async getInterventions(
    providerId: string,
    filters: InterventionFilters = {}
  ) {
    try {
      const {
        status,
        type,
        clientId,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = filters;

      const where: any = {
        service: {
          providerId,
        },
      };

      if (status) where.status = status;
      if (type) where.type = type;
      if (clientId) where.clientId = clientId;
      if (dateFrom) {
        where.scheduledDate = { gte: dateFrom };
      }
      if (dateTo) {
        where.scheduledDate = {
          ...where.scheduledDate,
          lte: dateTo,
        };
      }

      const [interventions, total] = await Promise.all([
        prisma.serviceBooking.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
            service: {
              select: {
                id: true,
                name: true,
                description: true,
                basePrice: true,
              },
            },
          },
          orderBy: { scheduledDate: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.serviceBooking.count({ where }),
      ]);

      return {
        interventions: interventions.map((intervention) => ({
          id: intervention.id,
          clientName: `${intervention.client.profile?.firstName} ${intervention.client.profile?.lastName}`,
          clientPhone: intervention.client.profile?.phone,
          serviceName: intervention.service.name,
          serviceDescription: intervention.service.description,
          scheduledDate: intervention.scheduledDate,
          estimatedDuration: intervention.estimatedDuration,
          actualStartTime: intervention.actualStartTime,
          actualEndTime: intervention.actualEndTime,
          status: intervention.status,
          description: intervention.description,
          address: intervention.address,
          estimatedCost: intervention.estimatedCost,
          actualCost: intervention.actualCost,
          notes: intervention.notes,
          completionNotes: intervention.completionNotes,
          materials: intervention.materials,
          createdAt: intervention.createdAt,
          updatedAt: intervention.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching interventions:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des interventions",
      });
    }
  }

  /**
   * Récupère une intervention spécifique
   */
  static async getInterventionById(providerId: string, interventionId: string) {
    try {
      const intervention = await prisma.serviceBooking.findFirst({
        where: {
          id: interventionId,
          service: {
            providerId,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              description: true,
              basePrice: true,
              category: true,
            },
          },
        },
      });

      if (!intervention) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Intervention non trouvée",
        });
      }

      return {
        id: intervention.id,
        clientName: `${intervention.client.profile?.firstName} ${intervention.client.profile?.lastName}`,
        clientPhone: intervention.client.profile?.phone,
        clientEmail: intervention.client.profile?.email,
        serviceName: intervention.service.name,
        serviceDescription: intervention.service.description,
        serviceCategory: intervention.service.category,
        scheduledDate: intervention.scheduledDate,
        estimatedDuration: intervention.estimatedDuration,
        actualStartTime: intervention.actualStartTime,
        actualEndTime: intervention.actualEndTime,
        status: intervention.status,
        description: intervention.description,
        address: intervention.address,
        estimatedCost: intervention.estimatedCost,
        actualCost: intervention.actualCost,
        notes: intervention.notes,
        completionNotes: intervention.completionNotes,
        materials: intervention.materials,
        createdAt: intervention.createdAt,
        updatedAt: intervention.updatedAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error fetching intervention:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération de l'intervention",
      });
    }
  }

  /**
   * Met à jour une intervention
   */
  static async updateIntervention(
    providerId: string,
    interventionId: string,
    data: InterventionUpdateData
  ) {
    try {
      // Vérifier que l'intervention appartient au prestataire
      const existingIntervention = await prisma.serviceBooking.findFirst({
        where: {
          id: interventionId,
          service: {
            providerId,
          },
        },
      });

      if (!existingIntervention) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Intervention non trouvée",
        });
      }

      const updatedIntervention = await prisma.serviceBooking.update({
        where: { id: interventionId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          client: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          service: {
            select: {
              name: true,
            },
          },
        },
      });

      // Si le statut change vers "COMPLETED", créer une notification pour le client
      if (data.status === "COMPLETED" && existingIntervention.status !== "COMPLETED") {
        await prisma.notification.create({
          data: {
            userId: existingIntervention.clientId,
            type: "INTERVENTION_COMPLETED",
            title: "Intervention terminée",
            content: `Votre intervention "${updatedIntervention.service.name}" a été terminée avec succès.`,
            data: {
              interventionId: interventionId,
              serviceName: updatedIntervention.service.name,
            },
          },
        });
      }

      return {
        id: updatedIntervention.id,
        status: updatedIntervention.status,
        updatedAt: updatedIntervention.updatedAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error updating intervention:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la mise à jour de l'intervention",
      });
    }
  }

  /**
   * Marque une intervention comme démarrée
   */
  static async startIntervention(providerId: string, interventionId: string) {
    try {
      return await this.updateIntervention(providerId, interventionId, {
        status: "IN_PROGRESS",
        actualStartTime: new Date(),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Marque une intervention comme terminée
   */
  static async completeIntervention(
    providerId: string,
    interventionId: string,
    completionData: {
      actualCost?: number;
      completionNotes?: string;
      materials?: string[];
    }
  ) {
    try {
      return await this.updateIntervention(providerId, interventionId, {
        status: "COMPLETED",
        actualEndTime: new Date(),
        ...completionData,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère les statistiques des interventions
   */
  static async getInterventionStats(providerId: string) {
    try {
      const [
        totalInterventions,
        completedInterventions,
        pendingInterventions,
        inProgressInterventions,
        thisMonthInterventions,
        avgRating,
      ] = await Promise.all([
        prisma.serviceBooking.count({
          where: {
            service: { providerId },
          },
        }),
        prisma.serviceBooking.count({
          where: {
            service: { providerId },
            status: "COMPLETED",
          },
        }),
        prisma.serviceBooking.count({
          where: {
            service: { providerId },
            status: "SCHEDULED",
          },
        }),
        prisma.serviceBooking.count({
          where: {
            service: { providerId },
            status: "IN_PROGRESS",
          },
        }),
        prisma.serviceBooking.count({
          where: {
            service: { providerId },
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        prisma.serviceBooking.aggregate({
          where: {
            service: { providerId },
            status: "COMPLETED",
            rating: { not: null },
          },
          _avg: {
            rating: true,
          },
        }),
      ]);

      const completionRate = totalInterventions > 0 
        ? Math.round((completedInterventions / totalInterventions) * 100) 
        : 0;

      return {
        totalInterventions,
        completedInterventions,
        pendingInterventions,
        inProgressInterventions,
        thisMonthInterventions,
        completionRate,
        averageRating: avgRating._avg.rating || 0,
      };
    } catch (error) {
      console.error("Error fetching intervention stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }

  /**
   * Récupère les prochaines interventions
   */
  static async getUpcomingInterventions(providerId: string, limit = 5) {
    try {
      const interventions = await prisma.serviceBooking.findMany({
        where: {
          service: { providerId },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          scheduledDate: { gte: new Date() },
        },
        include: {
          client: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          service: {
            select: {
              name: true,
              basePrice: true,
            },
          },
        },
        orderBy: { scheduledDate: "asc" },
        take: limit,
      });

      return interventions.map((intervention) => ({
        id: intervention.id,
        clientName: `${intervention.client.profile?.firstName} ${intervention.client.profile?.lastName}`,
        clientPhone: intervention.client.profile?.phone,
        serviceName: intervention.service.name,
        scheduledDate: intervention.scheduledDate,
        duration: intervention.estimatedDuration,
        price: intervention.estimatedCost || intervention.service.basePrice,
        address: intervention.address,
        status: intervention.status,
        isUrgent: intervention.isUrgent || false,
        notes: intervention.notes,
      }));
    } catch (error) {
      console.error("Error fetching upcoming interventions:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des prochaines interventions",
      });
    }
  }
}