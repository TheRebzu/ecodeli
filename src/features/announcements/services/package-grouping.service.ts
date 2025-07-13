import { db } from "@/lib/db";
import { z } from "zod";

interface GroupingOpportunity {
  id: string;
  announcements: Array<{
    id: string;
    title: string;
    pickupAddress: string;
    deliveryAddress: string;
    basePrice: number;
    weight?: number;
    dimensions?: string;
    authorId: string;
    authorName: string;
  }>;
  commonRoute: {
    pickupZone: string;
    deliveryZone: string;
    totalDistance: number;
    estimatedDuration: number;
  };
  groupedPrice: number;
  individualPrice: number;
  savings: {
    amount: number;
    percentage: number;
  };
  delivererBonus: number;
  status: "AVAILABLE" | "PROPOSED" | "ACCEPTED" | "DECLINED";
  validUntil: Date;
}

interface GroupingCriteria {
  maxDistance: number; // km entre points de collecte
  maxDeliveryRadius: number; // km zone de livraison
  maxTimeWindow: number; // heures entre créations
  minSavings: number; // % économies minimum
  maxPackages: number; // nombre max de colis groupés
  compatibleTypes: string[]; // types d'annonces compatibles
}

const groupingRequestSchema = z.object({
  announcementIds: z.array(z.string()).min(2).max(10),
  proposedPrice: z.number().min(5),
  deliveryTimeframe: z.object({
    startTime: z.date(),
    endTime: z.date(),
  }),
  specialInstructions: z.string().max(500).optional(),
});

const groupingCriteriaSchema = z.object({
  maxDistance: z.number().min(1).max(50).default(5),
  maxDeliveryRadius: z.number().min(1).max(30).default(10),
  maxTimeWindow: z.number().min(1).max(24).default(6),
  minSavings: z.number().min(5).max(50).default(15),
  maxPackages: z.number().min(2).max(10).default(5),
  compatibleTypes: z
    .array(z.string())
    .default(["PACKAGE_DELIVERY", "SHOPPING"]),
});

class PackageGroupingService {
  /**
   * Rechercher des opportunités de groupage
   */
  async findGroupingOpportunities(
    criteria: Partial<GroupingCriteria> = {},
  ): Promise<GroupingOpportunity[]> {
    try {
      const validatedCriteria = groupingCriteriaSchema.parse(criteria);

      // Récupérer les annonces éligibles au groupage
      const eligibleAnnouncements = await db.announcement.findMany({
        where: {
          status: "ACTIVE",
          type: { in: validatedCriteria.compatibleTypes },
          delivererId: null,
          isGrouped: false,
          createdAt: {
            gte: new Date(
              Date.now() - validatedCriteria.maxTimeWindow * 60 * 60 * 1000,
            ),
          },
        },
        include: {
          author: {
            include: { profile: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (eligibleAnnouncements.length < 2) {
        return [];
      }

      // Analyser les groupes potentiels
      const opportunities: GroupingOpportunity[] = [];

      for (let i = 0; i < eligibleAnnouncements.length; i++) {
        const baseAnnouncement = eligibleAnnouncements[i];
        const potentialGroup = [baseAnnouncement];

        // Chercher des annonces compatibles
        for (let j = i + 1; j < eligibleAnnouncements.length; j++) {
          const candidateAnnouncement = eligibleAnnouncements[j];

          if (potentialGroup.length >= validatedCriteria.maxPackages) break;

          // Vérifier la compatibilité géographique
          const isCompatible = await this.areAnnouncementsCompatible(
            baseAnnouncement,
            candidateAnnouncement,
            validatedCriteria,
          );

          if (isCompatible) {
            potentialGroup.push(candidateAnnouncement);
          }
        }

        // Si le groupe a au moins 2 annonces, créer une opportunité
        if (potentialGroup.length >= 2) {
          const opportunity = await this.createGroupingOpportunity(
            potentialGroup,
            validatedCriteria,
          );
          if (opportunity) {
            opportunities.push(opportunity);
          }
        }
      }

      // Trier par économies décroissantes
      return opportunities.sort(
        (a, b) => b.savings.percentage - a.savings.percentage,
      );
    } catch (error) {
      console.error("Error finding grouping opportunities:", error);
      throw new Error("Erreur lors de la recherche d'opportunités de groupage");
    }
  }

  /**
   * Proposer un groupage aux clients
   */
  async proposeGrouping(
    announcementIds: string[],
    delivererId: string,
  ): Promise<{ groupId: string; proposalId: string }> {
    try {
      if (announcementIds.length < 2) {
        throw new Error(
          "Au moins 2 annonces sont nécessaires pour un groupage",
        );
      }

      // Vérifier que toutes les annonces existent et sont éligibles
      const announcements = await db.announcement.findMany({
        where: {
          id: { in: announcementIds },
          status: "ACTIVE",
          delivererId: null,
          isGrouped: false,
        },
        include: {
          author: { include: { profile: true } },
        },
      });

      if (announcements.length !== announcementIds.length) {
        throw new Error("Certaines annonces ne sont plus disponibles");
      }

      // Calculer les économies et le prix groupé
      const groupPricing = await this.calculateGroupPricing(announcements);

      // Créer le groupe de livraison
      const deliveryGroup = await db.deliveryGroup.create({
        data: {
          delivererId,
          status: "PROPOSED",
          totalAnnouncements: announcements.length,
          originalTotalPrice: groupPricing.originalTotal,
          groupedPrice: groupPricing.groupedTotal,
          savingsAmount: groupPricing.totalSavings,
          delivererBonus: groupPricing.delivererBonus,
          estimatedDuration: groupPricing.estimatedDuration,
          createdAt: new Date(),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h pour répondre
        },
      });

      // Lier les annonces au groupe
      await db.announcementGroup.createMany({
        data: announcements.map((announcement) => ({
          announcementId: announcement.id,
          deliveryGroupId: deliveryGroup.id,
          originalPrice: announcement.basePrice,
          groupedPrice: Math.round(announcement.basePrice * 0.85), // 15% de réduction
          savings: Math.round(announcement.basePrice * 0.15),
        })),
      });

      // Créer une proposition pour chaque client
      const proposals = await Promise.all(
        announcements.map((announcement) =>
          db.groupingProposal.create({
            data: {
              deliveryGroupId: deliveryGroup.id,
              clientId: announcement.authorId,
              announcementId: announcement.id,
              originalPrice: announcement.basePrice,
              proposedPrice: Math.round(announcement.basePrice * 0.85),
              savings: Math.round(announcement.basePrice * 0.15),
              status: "PENDING",
              validUntil: deliveryGroup.validUntil,
              createdAt: new Date(),
            },
          }),
        ),
      );

      // Notifier tous les clients
      await this.notifyGroupingProposal(
        deliveryGroup.id,
        proposals.map((p) => p.id),
      );

      return {
        groupId: deliveryGroup.id,
        proposalId: proposals[0].id,
      };
    } catch (error) {
      console.error("Error proposing grouping:", error);
      throw new Error("Erreur lors de la proposition de groupage");
    }
  }

  /**
   * Répondre à une proposition de groupage (client)
   */
  async respondToGroupingProposal(
    proposalId: string,
    clientId: string,
    response: "ACCEPT" | "DECLINE",
    reason?: string,
  ): Promise<{ groupStatus: string; allAccepted: boolean }> {
    try {
      const proposal = await db.groupingProposal.findUnique({
        where: { id: proposalId },
        include: {
          deliveryGroup: {
            include: {
              proposals: true,
              announcements: {
                include: { announcement: true },
              },
            },
          },
        },
      });

      if (!proposal) {
        throw new Error("Proposition introuvable");
      }

      if (proposal.clientId !== clientId) {
        throw new Error("Cette proposition ne vous concerne pas");
      }

      if (proposal.status !== "PENDING") {
        throw new Error("Cette proposition n'est plus en attente");
      }

      if (proposal.validUntil < new Date()) {
        throw new Error("Cette proposition a expiré");
      }

      // Mettre à jour la réponse
      await db.groupingProposal.update({
        where: { id: proposalId },
        data: {
          status: response,
          responseAt: new Date(),
          declineReason: reason,
        },
      });

      // Vérifier si tous les clients ont répondu
      const allProposals = proposal.deliveryGroup.proposals;
      const pendingCount =
        allProposals.filter((p) => p.status === "PENDING").length - 1; // -1 car on vient de mettre à jour

      let groupStatus = "WAITING_RESPONSES";
      let allAccepted = false;

      if (pendingCount === 0) {
        // Tous ont répondu, vérifier si tous ont accepté
        const acceptedCount = allProposals.filter((p) =>
          p.id === proposalId ? response === "ACCEPT" : p.status === "ACCEPT",
        ).length;

        if (acceptedCount === allProposals.length) {
          // Tous ont accepté, activer le groupage
          await this.activateGrouping(proposal.deliveryGroup.id);
          groupStatus = "ACCEPTED";
          allAccepted = true;
        } else {
          // Au moins un refus, annuler le groupage
          await this.cancelGrouping(
            proposal.deliveryGroup.id,
            "Refus de l'un des clients",
          );
          groupStatus = "DECLINED";
        }
      } else if (response === "DECLINE") {
        // Un refus immédiat annule tout le groupage
        await this.cancelGrouping(proposal.deliveryGroup.id, "Refus du client");
        groupStatus = "DECLINED";
      }

      return { groupStatus, allAccepted };
    } catch (error) {
      console.error("Error responding to grouping proposal:", error);
      throw new Error("Erreur lors de la réponse à la proposition");
    }
  }

  /**
   * Obtenir les statistiques de groupage
   */
  async getGroupingStatistics(
    period: "WEEK" | "MONTH" | "YEAR" = "MONTH",
  ): Promise<{
    totalGroupsCreated: number;
    successfulGroups: number;
    successRate: number;
    totalSavings: number;
    averageSavingsPerGroup: number;
    averagePackagesPerGroup: number;
    topDeliverers: Array<{
      delivererId: string;
      delivererName: string;
      groupsCompleted: number;
      totalBonus: number;
    }>;
  }> {
    try {
      const startDate = new Date();
      switch (period) {
        case "WEEK":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "MONTH":
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "YEAR":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const [totalGroups, successfulGroups, savingsData, topDeliverers] =
        await Promise.all([
          // Total des groupes créés
          db.deliveryGroup.count({
            where: {
              createdAt: { gte: startDate },
            },
          }),

          // Groupes réussis
          db.deliveryGroup.count({
            where: {
              status: "COMPLETED",
              createdAt: { gte: startDate },
            },
          }),

          // Données d'économies
          db.deliveryGroup.aggregate({
            where: {
              status: "COMPLETED",
              createdAt: { gte: startDate },
            },
            _sum: {
              savingsAmount: true,
              totalAnnouncements: true,
            },
            _avg: {
              savingsAmount: true,
              totalAnnouncements: true,
            },
          }),

          // Top livreurs
          db.deliveryGroup.groupBy({
            by: ["delivererId"],
            where: {
              status: "COMPLETED",
              createdAt: { gte: startDate },
            },
            _count: true,
            _sum: {
              delivererBonus: true,
            },
            orderBy: {
              _count: {
                delivererId: "desc",
              },
            },
            take: 10,
          }),
        ]);

      const successRate =
        totalGroups > 0 ? (successfulGroups / totalGroups) * 100 : 0;

      // Obtenir les noms des livreurs
      const delivererIds = topDeliverers.map((d) => d.delivererId);
      const deliverers = await db.user.findMany({
        where: { id: { in: delivererIds } },
        include: { profile: true },
      });

      const topDeliverersWithNames = topDeliverers.map((stat) => {
        const deliverer = deliverers.find((d) => d.id === stat.delivererId);
        return {
          delivererId: stat.delivererId,
          delivererName: deliverer
            ? `${deliverer.profile?.firstName} ${deliverer.profile?.lastName}`
            : "Inconnu",
          groupsCompleted: stat._count,
          totalBonus: stat._sum.delivererBonus || 0,
        };
      });

      return {
        totalGroupsCreated: totalGroups,
        successfulGroups,
        successRate: Math.round(successRate * 100) / 100,
        totalSavings: savingsData._sum.savingsAmount || 0,
        averageSavingsPerGroup:
          Math.round((savingsData._avg.savingsAmount || 0) * 100) / 100,
        averagePackagesPerGroup:
          Math.round((savingsData._avg.totalAnnouncements || 0) * 10) / 10,
        topDeliverers: topDeliverersWithNames,
      };
    } catch (error) {
      console.error("Error getting grouping statistics:", error);
      throw new Error("Erreur lors de la récupération des statistiques");
    }
  }

  // Méthodes privées

  private async areAnnouncementsCompatible(
    announcement1: any,
    announcement2: any,
    criteria: GroupingCriteria,
  ): Promise<boolean> {
    // Vérifier la distance entre les points de collecte
    const pickupDistance = await this.calculateDistance(
      announcement1.pickupAddress,
      announcement2.pickupAddress,
    );

    if (pickupDistance > criteria.maxDistance) {
      return false;
    }

    // Vérifier la zone de livraison
    const deliveryDistance = await this.calculateDistance(
      announcement1.deliveryAddress,
      announcement2.deliveryAddress,
    );

    if (deliveryDistance > criteria.maxDeliveryRadius) {
      return false;
    }

    // Vérifier la compatibilité des types de colis
    if (announcement1.packageFragile && announcement2.packageFragile) {
      return false; // Éviter de grouper plusieurs colis fragiles
    }

    return true;
  }

  private async createGroupingOpportunity(
    announcements: any[],
    criteria: GroupingCriteria,
  ): Promise<GroupingOpportunity | null> {
    try {
      const pricing = await this.calculateGroupPricing(announcements);

      if (pricing.savingsPercentage < criteria.minSavings) {
        return null;
      }

      return {
        id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        announcements: announcements.map((ann) => ({
          id: ann.id,
          title: ann.title,
          pickupAddress: ann.pickupAddress,
          deliveryAddress: ann.deliveryAddress,
          basePrice: ann.basePrice,
          weight: ann.packageWeight,
          dimensions: ann.packageDimensions,
          authorId: ann.authorId,
          authorName: `${ann.author.profile?.firstName} ${ann.author.profile?.lastName}`,
        })),
        commonRoute: {
          pickupZone: await this.getPickupZone(announcements),
          deliveryZone: await this.getDeliveryZone(announcements),
          totalDistance: pricing.totalDistance,
          estimatedDuration: pricing.estimatedDuration,
        },
        groupedPrice: pricing.groupedTotal,
        individualPrice: pricing.originalTotal,
        savings: {
          amount: pricing.totalSavings,
          percentage: pricing.savingsPercentage,
        },
        delivererBonus: pricing.delivererBonus,
        status: "AVAILABLE",
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    } catch (error) {
      console.error("Error creating grouping opportunity:", error);
      return null;
    }
  }

  private async calculateGroupPricing(announcements: any[]): Promise<{
    originalTotal: number;
    groupedTotal: number;
    totalSavings: number;
    savingsPercentage: number;
    delivererBonus: number;
    totalDistance: number;
    estimatedDuration: number;
  }> {
    const originalTotal = announcements.reduce(
      (sum, ann) => sum + ann.basePrice,
      0,
    );
    const groupedTotal = Math.round(originalTotal * 0.85); // 15% de réduction
    const totalSavings = originalTotal - groupedTotal;
    const savingsPercentage = (totalSavings / originalTotal) * 100;
    const delivererBonus = Math.round(totalSavings * 0.5); // 50% des économies au livreur

    // Calculer distance et durée (simulation)
    const totalDistance = announcements.length * 5 + Math.random() * 10;
    const estimatedDuration = totalDistance * 2 + announcements.length * 15; // minutes

    return {
      originalTotal,
      groupedTotal,
      totalSavings,
      savingsPercentage,
      delivererBonus,
      totalDistance,
      estimatedDuration,
    };
  }

  private async calculateDistance(
    address1: string,
    address2: string,
  ): Promise<number> {
    // Simulation - dans une vraie implémentation, utiliser l'API de géocodage
    return Math.random() * 10 + 1;
  }

  private async getPickupZone(announcements: any[]): Promise<string> {
    // Simulation - déterminer la zone commune de collecte
    return "Zone Centre-ville";
  }

  private async getDeliveryZone(announcements: any[]): Promise<string> {
    // Simulation - déterminer la zone commune de livraison
    return "Secteur Nord";
  }

  private async activateGrouping(groupId: string): Promise<void> {
    await db.$transaction(async (tx) => {
      // Activer le groupe
      await tx.deliveryGroup.update({
        where: { id: groupId },
        data: {
          status: "ACTIVE",
          activatedAt: new Date(),
        },
      });

      // Marquer les annonces comme groupées
      const group = await tx.deliveryGroup.findUnique({
        where: { id: groupId },
        include: { announcements: true },
      });

      if (group) {
        await tx.announcement.updateMany({
          where: {
            id: { in: group.announcements.map((ag) => ag.announcementId) },
          },
          data: {
            isGrouped: true,
            delivererId: group.delivererId,
            status: "ASSIGNED",
          },
        });
      }
    });
  }

  private async cancelGrouping(groupId: string, reason: string): Promise<void> {
    await db.deliveryGroup.update({
      where: { id: groupId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    // Annuler toutes les propositions
    await db.groupingProposal.updateMany({
      where: { deliveryGroupId: groupId },
      data: { status: "CANCELLED" },
    });
  }

  private async notifyGroupingProposal(
    groupId: string,
    proposalIds: string[],
  ): Promise<void> {
    console.log(
      `Notifying grouping proposal for group ${groupId}, proposals: ${proposalIds.join(", ")}`,
    );
  }
}

export const packageGroupingService = new PackageGroupingService();
