import { db } from "@/lib/db";
import { z } from "zod";

interface DisputeCreation {
  announcementId: string;
  reporterId: string;
  reportedUserId: string;
  category: DisputeCategory;
  reason: string;
  description: string;
  evidenceFiles?: string[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

interface DisputeResolution {
  disputeId: string;
  resolution:
    | "FAVOR_REPORTER"
    | "FAVOR_REPORTED"
    | "PARTIAL_REFUND"
    | "NO_ACTION"
    | "MEDIATION";
  adminNotes: string;
  compensationAmount?: number;
  penaltyAmount?: number;
  actionTaken?: string[];
}

type DisputeCategory =
  | "DELIVERY_NOT_RECEIVED"
  | "DAMAGED_PACKAGE"
  | "WRONG_ADDRESS"
  | "LATE_DELIVERY"
  | "PAYMENT_ISSUE"
  | "INAPPROPRIATE_BEHAVIOR"
  | "FRAUD_ATTEMPT"
  | "SERVICE_NOT_RENDERED"
  | "QUALITY_ISSUE"
  | "OTHER";

type DisputeStatus =
  | "OPEN"
  | "INVESTIGATING"
  | "WAITING_EVIDENCE"
  | "MEDIATION"
  | "RESOLVED"
  | "CLOSED"
  | "ESCALATED";

const disputeCreationSchema = z.object({
  announcementId: z.string().min(1),
  reportedUserId: z.string().min(1),
  category: z.enum([
    "DELIVERY_NOT_RECEIVED",
    "DAMAGED_PACKAGE",
    "WRONG_ADDRESS",
    "LATE_DELIVERY",
    "PAYMENT_ISSUE",
    "INAPPROPRIATE_BEHAVIOR",
    "FRAUD_ATTEMPT",
    "SERVICE_NOT_RENDERED",
    "QUALITY_ISSUE",
    "OTHER",
  ]),
  reason: z.string().min(10).max(100),
  description: z.string().min(20).max(1000),
  evidenceFiles: z.array(z.string().url()).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

const disputeResolutionSchema = z.object({
  resolution: z.enum([
    "FAVOR_REPORTER",
    "FAVOR_REPORTED",
    "PARTIAL_REFUND",
    "NO_ACTION",
    "MEDIATION",
  ]),
  adminNotes: z.string().min(10).max(500),
  compensationAmount: z.number().min(0).optional(),
  penaltyAmount: z.number().min(0).optional(),
  actionTaken: z.array(z.string()).optional(),
});

class DisputeManagementService {
  /**
   * Créer un nouveau litige
   */
  async createDispute(data: DisputeCreation): Promise<{
    disputeId: string;
    ticketNumber: string;
    estimatedResolutionDate: Date;
  }> {
    try {
      const validated = disputeCreationSchema.parse(data);

      // Vérifier que l'annonce existe
      const announcement = await db.announcement.findUnique({
        where: { id: validated.announcementId },
        include: {
          author: true,
          deliverer: true,
          delivery: true,
        },
      });

      if (!announcement) {
        throw new Error("Annonce introuvable");
      }

      // Vérifier qu'il n'y a pas déjà un litige ouvert
      const existingDispute = await db.dispute.findFirst({
        where: {
          announcementId: validated.announcementId,
          status: {
            in: ["OPEN", "INVESTIGATING", "WAITING_EVIDENCE", "MEDIATION"],
          },
        },
      });

      if (existingDispute) {
        throw new Error("Un litige est déjà en cours pour cette annonce");
      }

      // Générer numéro de ticket unique
      const ticketNumber = this.generateTicketNumber();

      // Déterminer la date de résolution estimée selon la priorité
      const estimatedResolutionDate = this.calculateResolutionDate(
        validated.priority,
      );

      // Créer le litige
      const dispute = await db.dispute.create({
        data: {
          announcementId: validated.announcementId,
          reporterId: validated.reporterId,
          reportedUserId: validated.reportedUserId,
          category: validated.category,
          reason: validated.reason,
          description: validated.description,
          evidenceFiles: validated.evidenceFiles || [],
          priority: validated.priority,
          status: "OPEN",
          ticketNumber,
          estimatedResolutionDate,
          createdAt: new Date(),
        },
      });

      // Créer un ticket de support associé
      await db.supportTicket.create({
        data: {
          userId: validated.reporterId,
          category: "DISPUTE",
          subject: `Litige ${ticketNumber} - ${validated.reason}`,
          description: validated.description,
          priority: validated.priority,
          status: "OPEN",
          disputeId: dispute.id,
          createdAt: new Date(),
        },
      });

      // Notifier les parties concernées
      await this.notifyDisputeCreated(dispute.id);

      // Bloquer les fonds si nécessaire
      if (this.shouldBlockFunds(validated.category)) {
        await this.blockRelatedPayments(validated.announcementId);
      }

      return {
        disputeId: dispute.id,
        ticketNumber,
        estimatedResolutionDate,
      };
    } catch (error) {
      console.error("Error creating dispute:", error);
      throw new Error("Erreur lors de la création du litige");
    }
  }

  /**
   * Mettre à jour le statut d'un litige
   */
  async updateDisputeStatus(
    disputeId: string,
    newStatus: DisputeStatus,
    adminId: string,
    notes?: string,
  ): Promise<void> {
    try {
      const dispute = await db.dispute.findUnique({
        where: { id: disputeId },
        include: {
          announcement: true,
          reporter: true,
          reportedUser: true,
        },
      });

      if (!dispute) {
        throw new Error("Litige introuvable");
      }

      await db.dispute.update({
        where: { id: disputeId },
        data: {
          status: newStatus,
          lastUpdatedBy: adminId,
          adminNotes: notes,
          updatedAt: new Date(),
        },
      });

      // Mettre à jour le ticket de support associé
      await db.supportTicket.updateMany({
        where: { disputeId },
        data: {
          status: this.mapDisputeStatusToTicketStatus(newStatus),
          updatedAt: new Date(),
        },
      });

      // Actions spécifiques selon le statut
      await this.handleStatusChange(disputeId, newStatus, adminId);

      // Notifier les parties
      await this.notifyStatusUpdate(disputeId, newStatus);
    } catch (error) {
      console.error("Error updating dispute status:", error);
      throw new Error("Erreur lors de la mise à jour du statut");
    }
  }

  /**
   * Résoudre un litige
   */
  async resolveDispute(
    disputeId: string,
    resolution: DisputeResolution,
    adminId: string,
  ): Promise<void> {
    try {
      const validated = disputeResolutionSchema.parse(resolution);

      const dispute = await db.dispute.findUnique({
        where: { id: disputeId },
        include: {
          announcement: true,
          reporter: true,
          reportedUser: true,
        },
      });

      if (!dispute) {
        throw new Error("Litige introuvable");
      }

      if (dispute.status === "RESOLVED" || dispute.status === "CLOSED") {
        throw new Error("Ce litige est déjà résolu");
      }

      await db.$transaction(async (tx) => {
        // Mettre à jour le litige
        await tx.dispute.update({
          where: { id: disputeId },
          data: {
            status: "RESOLVED",
            resolution: validated.resolution,
            adminNotes: validated.adminNotes,
            compensationAmount: validated.compensationAmount,
            penaltyAmount: validated.penaltyAmount,
            actionTaken: validated.actionTaken || [],
            resolvedBy: adminId,
            resolvedAt: new Date(),
          },
        });

        // Traiter les compensations financières
        if (validated.compensationAmount && validated.compensationAmount > 0) {
          await this.processCompensation(
            dispute.reporterId,
            validated.compensationAmount,
            `Compensation litige ${dispute.ticketNumber}`,
            tx,
          );
        }

        // Traiter les pénalités
        if (validated.penaltyAmount && validated.penaltyAmount > 0) {
          await this.processPenalty(
            dispute.reportedUserId,
            validated.penaltyAmount,
            `Pénalité litige ${dispute.ticketNumber}`,
            tx,
          );
        }

        // Débloquer ou rembourser les paiements selon la résolution
        await this.handlePaymentResolution(dispute, validated.resolution, tx);

        // Fermer le ticket de support
        await tx.supportTicket.updateMany({
          where: { disputeId },
          data: {
            status: "RESOLVED",
            resolvedAt: new Date(),
            resolvedBy: adminId,
          },
        });
      });

      // Mettre à jour les notes de confiance des utilisateurs
      await this.updateTrustScores(dispute, validated.resolution);

      // Notifier la résolution
      await this.notifyDisputeResolution(disputeId, validated.resolution);
    } catch (error) {
      console.error("Error resolving dispute:", error);
      throw new Error("Erreur lors de la résolution du litige");
    }
  }

  /**
   * Obtenir les statistiques des litiges
   */
  async getDisputeStatistics(
    period: "DAY" | "WEEK" | "MONTH" = "MONTH",
  ): Promise<{
    totalDisputes: number;
    openDisputes: number;
    resolvedDisputes: number;
    averageResolutionTime: number;
    byCategory: Record<DisputeCategory, number>;
    byResolution: Record<string, number>;
    topReportedUsers: Array<{
      userId: string;
      userName: string;
      disputeCount: number;
    }>;
  }> {
    try {
      const startDate = new Date();
      switch (period) {
        case "DAY":
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "WEEK":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "MONTH":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      const [
        totalDisputes,
        openDisputes,
        resolvedDisputes,
        disputesByCategory,
        disputesByResolution,
        topReported,
      ] = await Promise.all([
        // Total des litiges
        db.dispute.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),

        // Litiges ouverts
        db.dispute.count({
          where: {
            status: {
              in: ["OPEN", "INVESTIGATING", "WAITING_EVIDENCE", "MEDIATION"],
            },
          },
        }),

        // Litiges résolus dans la période
        db.dispute.count({
          where: {
            status: "RESOLVED",
            resolvedAt: { gte: startDate },
          },
        }),

        // Répartition par catégorie
        db.dispute.groupBy({
          by: ["category"],
          where: {
            createdAt: { gte: startDate },
          },
          _count: true,
        }),

        // Répartition par résolution
        db.dispute.groupBy({
          by: ["resolution"],
          where: {
            status: "RESOLVED",
            resolvedAt: { gte: startDate },
          },
          _count: true,
        }),

        // Utilisateurs les plus signalés
        db.dispute.groupBy({
          by: ["reportedUserId"],
          where: {
            createdAt: { gte: startDate },
          },
          _count: true,
          orderBy: {
            _count: {
              reportedUserId: "desc",
            },
          },
          take: 10,
        }),
      ]);

      // Calculer le temps de résolution moyen
      const resolvedDisputesWithTime = await db.dispute.findMany({
        where: {
          status: "RESOLVED",
          resolvedAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
      });

      const averageResolutionTime =
        resolvedDisputesWithTime.length > 0
          ? resolvedDisputesWithTime.reduce((sum, dispute) => {
              const resolutionTime =
                dispute.resolvedAt!.getTime() - dispute.createdAt.getTime();
              return sum + resolutionTime / (1000 * 60 * 60); // en heures
            }, 0) / resolvedDisputesWithTime.length
          : 0;

      // Formater les résultats
      const byCategory = disputesByCategory.reduce(
        (acc, item) => {
          acc[item.category as DisputeCategory] = item._count;
          return acc;
        },
        {} as Record<DisputeCategory, number>,
      );

      const byResolution = disputesByResolution.reduce(
        (acc, item) => {
          if (item.resolution) {
            acc[item.resolution] = item._count;
          }
          return acc;
        },
        {} as Record<string, number>,
      );

      // Obtenir les noms des utilisateurs les plus signalés
      const userIds = topReported.map((item) => item.reportedUserId);
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true },
      });

      const topReportedUsers = topReported.map((item) => {
        const user = users.find((u) => u.id === item.reportedUserId);
        return {
          userId: item.reportedUserId,
          userName: user
            ? `${user.profile?.firstName} ${user.profile?.lastName}`
            : "Inconnu",
          disputeCount: item._count,
        };
      });

      return {
        totalDisputes,
        openDisputes,
        resolvedDisputes,
        averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
        byCategory,
        byResolution,
        topReportedUsers,
      };
    } catch (error) {
      console.error("Error getting dispute statistics:", error);
      throw new Error("Erreur lors de la récupération des statistiques");
    }
  }

  /**
   * Escalader un litige vers le support supérieur
   */
  async escalateDispute(
    disputeId: string,
    escalationReason: string,
    adminId: string,
  ): Promise<void> {
    try {
      await db.dispute.update({
        where: { id: disputeId },
        data: {
          status: "ESCALATED",
          escalationReason,
          escalatedBy: adminId,
          escalatedAt: new Date(),
        },
      });

      // Créer une notification pour les admins senior
      await this.notifyEscalation(disputeId, escalationReason);
    } catch (error) {
      console.error("Error escalating dispute:", error);
      throw new Error("Erreur lors de l'escalade du litige");
    }
  }

  // Méthodes privées

  private generateTicketNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `DSP-${timestamp}-${random}`;
  }

  private calculateResolutionDate(priority: string): Date {
    const baseDate = new Date();
    switch (priority) {
      case "URGENT":
        baseDate.setHours(baseDate.getHours() + 4);
        break;
      case "HIGH":
        baseDate.setDate(baseDate.getDate() + 1);
        break;
      case "MEDIUM":
        baseDate.setDate(baseDate.getDate() + 3);
        break;
      case "LOW":
        baseDate.setDate(baseDate.getDate() + 7);
        break;
    }
    return baseDate;
  }

  private shouldBlockFunds(category: DisputeCategory): boolean {
    const blockingCategories: DisputeCategory[] = [
      "DELIVERY_NOT_RECEIVED",
      "DAMAGED_PACKAGE",
      "FRAUD_ATTEMPT",
      "SERVICE_NOT_RENDERED",
    ];
    return blockingCategories.includes(category);
  }

  private async blockRelatedPayments(announcementId: string): Promise<void> {
    await db.payment.updateMany({
      where: { announcementId },
      data: {
        status: "BLOCKED",
        blockedReason: "Litige en cours",
        blockedAt: new Date(),
      },
    });
  }

  private mapDisputeStatusToTicketStatus(disputeStatus: DisputeStatus): string {
    const mapping: Record<DisputeStatus, string> = {
      OPEN: "OPEN",
      INVESTIGATING: "IN_PROGRESS",
      WAITING_EVIDENCE: "WAITING_CUSTOMER",
      MEDIATION: "IN_PROGRESS",
      RESOLVED: "RESOLVED",
      CLOSED: "CLOSED",
      ESCALATED: "ESCALATED",
    };
    return mapping[disputeStatus] || "OPEN";
  }

  private async handleStatusChange(
    disputeId: string,
    newStatus: DisputeStatus,
    adminId: string,
  ): Promise<void> {
    switch (newStatus) {
      case "INVESTIGATING":
        // Demander des preuves supplémentaires si nécessaire
        break;
      case "MEDIATION":
        // Proposer une médiation aux parties
        break;
      case "ESCALATED":
        // Notifier la hiérarchie
        break;
    }
  }

  private async processCompensation(
    userId: string,
    amount: number,
    reason: string,
    tx: any,
  ): Promise<void> {
    await tx.walletOperation.create({
      data: {
        userId,
        type: "CREDIT",
        amount,
        description: reason,
        status: "COMPLETED",
        createdAt: new Date(),
      },
    });
  }

  private async processPenalty(
    userId: string,
    amount: number,
    reason: string,
    tx: any,
  ): Promise<void> {
    await tx.walletOperation.create({
      data: {
        userId,
        type: "DEBIT",
        amount,
        description: reason,
        status: "COMPLETED",
        createdAt: new Date(),
      },
    });
  }

  private async handlePaymentResolution(
    dispute: any,
    resolution: string,
    tx: any,
  ): Promise<void> {
    const payment = dispute.announcement.payment;

    if (!payment) return;

    switch (resolution) {
      case "FAVOR_REPORTER":
        // Rembourser complètement le client
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "REFUNDED",
            refundedAt: new Date(),
            refundReason: "Résolution de litige en faveur du client",
          },
        });
        break;

      case "FAVOR_REPORTED":
        // Débloquer le paiement vers le livreur
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            releasedAt: new Date(),
          },
        });
        break;

      case "PARTIAL_REFUND":
        // Traité séparément avec compensationAmount
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "PARTIALLY_REFUNDED" },
        });
        break;
    }
  }

  private async updateTrustScores(
    dispute: any,
    resolution: string,
  ): Promise<void> {
    // Mettre à jour les scores de confiance selon la résolution
    if (resolution === "FAVOR_REPORTER") {
      // Diminuer le score du livreur
      await db.user.update({
        where: { id: dispute.reportedUserId },
        data: {
          trustScore: {
            decrement: 5,
          },
        },
      });
    }
  }

  private async notifyDisputeCreated(disputeId: string): Promise<void> {
    console.log(`Dispute created notification for ${disputeId}`);
  }

  private async notifyStatusUpdate(
    disputeId: string,
    status: DisputeStatus,
  ): Promise<void> {
    console.log(
      `Dispute status update notification: ${disputeId} -> ${status}`,
    );
  }

  private async notifyDisputeResolution(
    disputeId: string,
    resolution: string,
  ): Promise<void> {
    console.log(
      `Dispute resolution notification: ${disputeId} -> ${resolution}`,
    );
  }

  private async notifyEscalation(
    disputeId: string,
    reason: string,
  ): Promise<void> {
    console.log(`Dispute escalation notification: ${disputeId} - ${reason}`);
  }
}

export const disputeManagementService = new DisputeManagementService();
