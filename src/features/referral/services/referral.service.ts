import { prisma } from "@/lib/db";
import { NotificationService } from "@/features/notifications/services/notification.service";

export interface CreateReferralProgramData {
  name: string;
  description: string;
  programType: string;
  eligibilityRules: any;
  referrerReward: any;
  refereeReward: any;
  maxReferralsPerUser?: number;
  maxRewardPerUser?: number;
  rewardValidityDays?: number;
  endDate?: Date;
}

export interface ReferralData {
  programId: string;
  referrerId: string;
  refereeId: string;
  referralMethod: string;
  metadata?: any;
}

export interface InfluencerApplicationData {
  influencerId: string;
  programName: string;
  description: string;
  minimumFollowers?: number;
  requiredPlatforms: string[];
  contentRequirements: any;
  commissionRate: number;
  fixedReward?: number;
}

export class ReferralService {
  /**
   * Créer un programme de parrainage
   */
  static async createReferralProgram(data: CreateReferralProgramData) {
    try {
      const program = await prisma.referralProgram.create({
        data: {
          name: data.name,
          description: data.description,
          programType: data.programType as any,
          eligibilityRules: data.eligibilityRules,
          referrerReward: data.referrerReward,
          refereeReward: data.refereeReward,
          maxReferralsPerUser: data.maxReferralsPerUser || 10,
          maxRewardPerUser: data.maxRewardPerUser,
          rewardValidityDays: data.rewardValidityDays || 30,
          endDate: data.endDate,
        },
      });

      return program;
    } catch (error) {
      console.error(
        "Erreur lors de la création du programme de parrainage:",
        error,
      );
      throw error;
    }
  }

  /**
   * Générer un code de parrainage pour un utilisateur
   */
  static async generateReferralCode(
    programId: string,
    referrerId: string,
    customCode?: string,
  ) {
    try {
      // Vérifier l'éligibilité du programme
      const program = await prisma.referralProgram.findUnique({
        where: { id: programId },
      });

      if (!program || !program.isActive) {
        throw new Error("Programme de parrainage non actif");
      }

      // Vérifier que l'utilisateur n'a pas dépassé la limite
      const existingCodes = await prisma.referralCode.count({
        where: {
          programId,
          referrerId,
          isActive: true,
        },
      });

      if (existingCodes >= program.maxReferralsPerUser) {
        throw new Error("Limite de codes de parrainage atteinte");
      }

      // Générer un code unique
      let code = customCode || this.generateUniqueCode(referrerId);

      // Vérifier l'unicité
      let attempts = 0;
      while (attempts < 5) {
        const existing = await prisma.referralCode.findUnique({
          where: { code },
        });

        if (!existing) break;

        code = this.generateUniqueCode(referrerId);
        attempts++;
      }

      if (attempts >= 5) {
        throw new Error("Impossible de générer un code unique");
      }

      // Créer le code
      const referralCode = await prisma.referralCode.create({
        data: {
          programId,
          referrerId,
          code,
          usageLimit: 1,
          expiresAt: program.endDate,
        },
      });

      return referralCode;
    } catch (error) {
      console.error(
        "Erreur lors de la génération du code de parrainage:",
        error,
      );
      throw error;
    }
  }

  /**
   * Utiliser un code de parrainage
   */
  static async useReferralCode(
    code: string,
    refereeId: string,
    metadata?: any,
  ) {
    try {
      // Récupérer le code de parrainage
      const referralCode = await prisma.referralCode.findUnique({
        where: { code },
        include: {
          program: true,
          referrer: true,
        },
      });

      if (!referralCode || !referralCode.isActive) {
        throw new Error("Code de parrainage invalide");
      }

      if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
        throw new Error("Code de parrainage expiré");
      }

      if (referralCode.usageCount >= referralCode.usageLimit) {
        throw new Error("Code de parrainage déjà utilisé");
      }

      // Vérifier que l'utilisateur ne se parraine pas lui-même
      if (referralCode.referrerId === refereeId) {
        throw new Error("Impossible de se parrainer soi-même");
      }

      // Vérifier l'éligibilité du filleul
      const referee = await prisma.user.findUnique({
        where: { id: refereeId },
      });

      if (!referee) {
        throw new Error("Utilisateur non trouvé");
      }

      // Vérifier si le parrainage existe déjà
      const existingReferral = await prisma.referral.findUnique({
        where: {
          referrerId_refereeId_programId: {
            referrerId: referralCode.referrerId,
            refereeId,
            programId: referralCode.programId,
          },
        },
      });

      if (existingReferral) {
        throw new Error("Parrainage déjà existant");
      }

      // Créer le parrainage
      const referral = await prisma.referral.create({
        data: {
          programId: referralCode.programId,
          codeId: referralCode.id,
          referrerId: referralCode.referrerId,
          refereeId,
          referralMethod: "CODE",
          metadata,
        },
      });

      // Mettre à jour l'utilisation du code
      await prisma.referralCode.update({
        where: { id: referralCode.id },
        data: {
          usageCount: referralCode.usageCount + 1,
        },
      });

      // Mettre à jour les statistiques du programme
      await prisma.referralProgram.update({
        where: { id: referralCode.programId },
        data: {
          currentParticipants: { increment: 1 },
        },
      });

      // Enregistrer l'activité
      await prisma.referralActivity.create({
        data: {
          referralId: referral.id,
          activityType: "REGISTRATION",
          description: "Inscription via code de parrainage",
        },
      });

      // Notifications
      await this.notifyReferralCreated(
        referral,
        referralCode.referrer,
        referee,
      );

      return referral;
    } catch (error) {
      console.error(
        "Erreur lors de l'utilisation du code de parrainage:",
        error,
      );
      throw error;
    }
  }

  /**
   * Valider les conditions d'un parrainage
   */
  static async validateReferralConditions(
    referralId: string,
    activityType: string,
    value?: number,
  ) {
    try {
      const referral = await prisma.referral.findUnique({
        where: { id: referralId },
        include: {
          program: true,
          referrer: true,
          referee: true,
        },
      });

      if (!referral) {
        throw new Error("Parrainage non trouvé");
      }

      if (referral.status === "COMPLETED") {
        return referral; // Déjà complété
      }

      // Enregistrer l'activité
      await prisma.referralActivity.create({
        data: {
          referralId,
          activityType: activityType as any,
          description: `Activité: ${activityType}`,
          value,
        },
      });

      // Vérifier si les conditions sont remplies
      const conditionsMet = await this.checkReferralConditions(referralId);

      if (conditionsMet) {
        // Marquer le parrainage comme complété
        const updatedReferral = await prisma.referral.update({
          where: { id: referralId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            conditionsMet: { completed: true },
          },
        });

        // Traiter les récompenses
        await this.processReferralRewards(updatedReferral);

        return updatedReferral;
      }

      return referral;
    } catch (error) {
      console.error("Erreur lors de la validation des conditions:", error);
      throw error;
    }
  }

  /**
   * Créer une candidature influenceur
   */
  static async createInfluencerApplication(data: InfluencerApplicationData) {
    try {
      const application = await prisma.influencerProgram.create({
        data: {
          influencerId: data.influencerId,
          programName: data.programName,
          description: data.description,
          minimumFollowers: data.minimumFollowers,
          requiredPlatforms: data.requiredPlatforms,
          contentRequirements: data.contentRequirements,
          commissionRate: data.commissionRate,
          fixedReward: data.fixedReward,
        },
      });

      // Notification à l'équipe marketing
      await this.notifyInfluencerApplication(application);

      return application;
    } catch (error) {
      console.error(
        "Erreur lors de la création de la candidature influenceur:",
        error,
      );
      throw error;
    }
  }

  /**
   * Approuver une candidature influenceur
   */
  static async approveInfluencerApplication(
    programId: string,
    approvedBy: string,
  ) {
    try {
      const program = await prisma.influencerProgram.update({
        where: { id: programId },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy,
          startDate: new Date(),
        },
        include: {
          influencer: { include: { profile: true } },
        },
      });

      // Créer les liens de tracking
      await this.createInfluencerLinks(programId);

      // Notification à l'influenceur
      await NotificationService.createNotification({
        recipientId: program.influencerId,
        type: "INFLUENCER_APPROVED",
        title: "Candidature influenceur approuvée",
        content: `Votre candidature pour le programme "${program.programName}" a été approuvée !`,
        metadata: { programId },
      });

      return program;
    } catch (error) {
      console.error("Erreur lors de l'approbation de la candidature:", error);
      throw error;
    }
  }

  /**
   * Créer une campagne influenceur
   */
  static async createInfluencerCampaign(
    programId: string,
    campaignData: {
      name: string;
      description: string;
      type: string;
      targetAudience: any;
      budget?: number;
      startDate: Date;
      endDate: Date;
      contentGuidelines: any;
      requiredHashtags: string[];
    },
  ) {
    try {
      const campaign = await prisma.influencerCampaign.create({
        data: {
          programId,
          name: campaignData.name,
          description: campaignData.description,
          type: campaignData.type as any,
          targetAudience: campaignData.targetAudience,
          budget: campaignData.budget,
          startDate: campaignData.startDate,
          endDate: campaignData.endDate,
          contentGuidelines: campaignData.contentGuidelines,
          requiredHashtags: campaignData.requiredHashtags,
        },
      });

      return campaign;
    } catch (error) {
      console.error("Erreur lors de la création de la campagne:", error);
      throw error;
    }
  }

  /**
   * Générer un code unique
   */
  private static generateUniqueCode(referrerId: string): string {
    const userPart = referrerId.slice(-4).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${userPart}${randomPart}`;
  }

  /**
   * Vérifier les conditions d'un parrainage
   */
  private static async checkReferralConditions(
    referralId: string,
  ): Promise<boolean> {
    try {
      const activities = await prisma.referralActivity.findMany({
        where: { referralId },
      });

      // Logique simple: au moins une activité de type REGISTRATION
      const hasRegistration = activities.some(
        (a) => a.activityType === "REGISTRATION",
      );

      // Ajouter d'autres conditions selon les besoins
      // Par exemple: première commande, montant minimum, etc.

      return hasRegistration;
    } catch (error) {
      console.error("Erreur lors de la vérification des conditions:", error);
      return false;
    }
  }

  /**
   * Traiter les récompenses d'un parrainage
   */
  private static async processReferralRewards(referral: any) {
    try {
      const program = await prisma.referralProgram.findUnique({
        where: { id: referral.programId },
      });

      if (!program) return;

      // Récompense pour le parrain
      if (program.referrerReward) {
        await prisma.referralReward.create({
          data: {
            userId: referral.referrerId,
            referralId: referral.id,
            rewardType: program.referrerReward.type,
            amount: program.referrerReward.amount,
            description: `Récompense parrainage: ${program.name}`,
            expiresAt: new Date(
              Date.now() + program.rewardValidityDays * 24 * 60 * 60 * 1000,
            ),
          },
        });
      }

      // Récompense pour le filleul
      if (program.refereeReward) {
        await prisma.referralReward.create({
          data: {
            userId: referral.refereeId,
            referralId: referral.id,
            rewardType: program.refereeReward.type,
            amount: program.refereeReward.amount,
            description: `Récompense bienvenue: ${program.name}`,
            expiresAt: new Date(
              Date.now() + program.rewardValidityDays * 24 * 60 * 60 * 1000,
            ),
          },
        });
      }

      // Mettre à jour les statistiques
      await this.updateReferralStats(referral.referrerId, referral.programId);
    } catch (error) {
      console.error("Erreur lors du traitement des récompenses:", error);
    }
  }

  /**
   * Mettre à jour les statistiques de parrainage
   */
  private static async updateReferralStats(userId: string, programId: string) {
    try {
      await prisma.referralStats.upsert({
        where: {
          userId_programId: {
            userId,
            programId,
          },
        },
        update: {
          totalReferrals: { increment: 1 },
          successfulReferrals: { increment: 1 },
          lastReferralDate: new Date(),
        },
        create: {
          userId,
          programId,
          totalReferrals: 1,
          successfulReferrals: 1,
          lastReferralDate: new Date(),
        },
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour des statistiques:", error);
    }
  }

  /**
   * Créer les liens de tracking pour un influenceur
   */
  private static async createInfluencerLinks(programId: string) {
    try {
      const baseUrls = [
        {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/register`,
          description: "Inscription",
        },
        {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/services`,
          description: "Services",
        },
        {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
          description: "Tarifs",
        },
      ];

      for (const baseUrl of baseUrls) {
        const shortCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();

        await prisma.influencerLink.create({
          data: {
            programId,
            url: `${baseUrl.url}?ref=${shortCode}`,
            shortCode,
            description: baseUrl.description,
            utmSource: "influencer",
            utmMedium: "social",
          },
        });
      }
    } catch (error) {
      console.error("Erreur lors de la création des liens influenceur:", error);
    }
  }

  /**
   * Notifier la création d'un parrainage
   */
  private static async notifyReferralCreated(
    referral: any,
    referrer: any,
    referee: any,
  ) {
    try {
      // Notification au parrain
      await NotificationService.createNotification({
        recipientId: referral.referrerId,
        type: "REFERRAL_SUCCESSFUL",
        title: "Nouveau parrainage réussi !",
        content: `${referee.profile?.firstName} ${referee.profile?.lastName} s'est inscrit grâce à votre recommandation`,
        metadata: { referralId: referral.id },
      });

      // Notification au filleul
      await NotificationService.createNotification({
        recipientId: referral.refereeId,
        type: "WELCOME_REFERRAL",
        title: "Bienvenue sur EcoDeli !",
        content: `Vous avez été parrainé par ${referrer.profile?.firstName} ${referrer.profile?.lastName}`,
        metadata: { referralId: referral.id },
      });
    } catch (error) {
      console.error("Erreur lors des notifications de parrainage:", error);
    }
  }

  /**
   * Notifier une candidature influenceur
   */
  private static async notifyInfluencerApplication(application: any) {
    try {
      const marketingTeam = await prisma.user.findMany({
        where: {
          role: "ADMIN", // Ou créer un rôle MARKETING
          isActive: true,
        },
      });

      for (const member of marketingTeam) {
        await NotificationService.createNotification({
          recipientId: member.id,
          type: "NEW_INFLUENCER_APPLICATION",
          title: "Nouvelle candidature influenceur",
          content: `${application.programName} - Commission: ${application.commissionRate}%`,
          metadata: { programId: application.id },
        });
      }
    } catch (error) {
      console.error(
        "Erreur lors de la notification candidature influenceur:",
        error,
      );
    }
  }
}
