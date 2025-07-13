import { db } from "@/lib/db";

export interface TutorialStep {
  id: number;
  title: string;
  description: string;
  type: string;
  mandatory: boolean;
  estimatedTime: number;
  completed: boolean;
  timeSpent: number;
  skipped: boolean;
  order: number;
}

export interface TutorialProgress {
  userId: string;
  totalSteps: number;
  completedSteps: number;
  mandatorySteps: number;
  completedMandatory: number;
  progressPercentage: number;
  currentStep: number;
  isCompleted: boolean;
  startedAt: Date;
  completedAt?: Date;
  totalTimeSpent: number;
}

export interface TutorialCompletion {
  totalTimeSpent: number;
  stepsCompleted: number[];
  feedback?: string;
  rating?: number;
}

export class TutorialService {
  /**
   * Vérifier si le tutoriel est requis pour un client
   */
  static async isTutorialRequired(userId: string): Promise<boolean> {
    try {
      // Vérifier que l'utilisateur existe
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        return false; // Ne pas requérir le tutoriel si l'utilisateur n'existe pas
      }

      if (user.role !== "CLIENT") {
        return false; // Seuls les clients ont besoin du tutoriel
      }

      // D'abord vérifier dans la table Client
      const client = await db.client.findUnique({
        where: { userId },
        select: { tutorialCompleted: true },
      });

      // Si le client a déjà complété le tutoriel, ne pas le requérir
      if (client?.tutorialCompleted) {
        return false;
      }

      // Sinon vérifier dans la table ClientTutorialProgress
      const tutorialProgress = await db.clientTutorialProgress.findUnique({
        where: { userId },
      });

      // Tutoriel requis si non commencé ou non terminé
      return !tutorialProgress || !tutorialProgress.isCompleted;
    } catch (error) {
      console.error("Erreur vérification tutoriel requis:", error);
      return false; // En cas d'erreur, ne pas requérir le tutoriel
    }
  }

  /**
   * Obtenir les étapes du tutoriel client
   */
  static async getClientTutorialSteps(userId: string): Promise<TutorialStep[]> {
    try {
      // Vérifier que l'utilisateur existe
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        console.warn(
          `Utilisateur non trouvé pour getClientTutorialSteps: ${userId}`,
        );
        return []; // Retourner un tableau vide au lieu d'une erreur
      }

      // Étapes par défaut du tutoriel client
      const defaultSteps: Omit<
        TutorialStep,
        "completed" | "timeSpent" | "skipped"
      >[] = [
        {
          id: 1,
          title: "Bienvenue sur EcoDeli",
          description:
            "Découvrez notre plateforme de crowdshipping éco-responsable",
          type: "welcome",
          mandatory: true,
          estimatedTime: 30,
          order: 1,
        },
        {
          id: 2,
          title: "Complétez votre profil",
          description: "Ajoutez vos informations pour une meilleure expérience",
          type: "profile",
          mandatory: true,
          estimatedTime: 60,
          order: 2,
        },
        {
          id: 3,
          title: "Choisissez votre abonnement",
          description: "Sélectionnez l'offre qui correspond à vos besoins",
          type: "subscription",
          mandatory: false,
          estimatedTime: 45,
          order: 3,
        },
        {
          id: 4,
          title: "Créez votre première annonce",
          description: "Apprenez à déposer une demande de livraison",
          type: "announcement",
          mandatory: true,
          estimatedTime: 90,
          order: 4,
        },
        {
          id: 5,
          title: "Félicitations !",
          description: "Vous maîtrisez maintenant les bases d'EcoDeli",
          type: "completion",
          mandatory: true,
          estimatedTime: 15,
          order: 5,
        },
      ];

      // Récupérer la progression existante
      const progressSteps = await db.tutorialStep.findMany({
        where: { userId },
        orderBy: { stepId: "asc" },
      });

      // Combiner avec les étapes par défaut
      const steps: TutorialStep[] = defaultSteps.map((defaultStep) => {
        const progress = progressSteps.find((p) => p.stepId === defaultStep.id);

        return {
          ...defaultStep,
          completed: progress?.isCompleted || false,
          timeSpent: progress?.timeSpent || 0,
          skipped: progress?.isSkipped || false,
        };
      });

      return steps;
    } catch (error) {
      console.error("Erreur récupération étapes tutoriel:", error);
      return []; // Retourner un tableau vide en cas d'erreur
    }
  }

  /**
   * Obtenir la progression du tutoriel
   */
  static async getTutorialProgress(userId: string): Promise<TutorialProgress> {
    try {
      // Vérifier que l'utilisateur existe
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        console.warn(
          `Utilisateur non trouvé pour getTutorialProgress: ${userId}`,
        );
        // Retourner une progression par défaut
        return {
          userId,
          totalSteps: 0,
          completedSteps: 0,
          mandatorySteps: 0,
          completedMandatory: 0,
          progressPercentage: 100,
          currentStep: 1,
          isCompleted: true,
          startedAt: new Date(),
          totalTimeSpent: 0,
        };
      }

      const [tutorialProgress, steps] = await Promise.all([
        db.clientTutorialProgress.findUnique({
          where: { userId },
        }),
        this.getClientTutorialSteps(userId),
      ]);

      const totalSteps = steps.length;
      const completedSteps = steps.filter((s) => s.completed).length;
      const mandatorySteps = steps.filter((s) => s.mandatory).length;
      const completedMandatory = steps.filter(
        (s) => s.mandatory && s.completed,
      ).length;

      const progressPercentage =
        totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      // Trouver l'étape actuelle (première non complétée ou dernière)
      const currentStepObj =
        steps.find((s) => !s.completed) || steps[steps.length - 1];
      const currentStep = currentStepObj ? currentStepObj.id : 1;

      // Vérifier aussi dans la table Client
      const client = await db.client.findUnique({
        where: { userId },
        select: { tutorialCompleted: true },
      });

      // Vérifier si tous les étapes obligatoires sont complétées
      const allMandatoryCompleted =
        mandatorySteps > 0 && completedMandatory === mandatorySteps;

      // Auto-complete si tous les étapes obligatoires sont faits mais pas encore marqué comme complet
      if (
        allMandatoryCompleted &&
        !client?.tutorialCompleted &&
        !tutorialProgress?.isCompleted
      ) {
        console.log(
          `Auto-completing tutorial for user ${userId} - all mandatory steps completed`,
        );
        await this.autoCompleteTutorial(userId);
      }

      const isCompleted =
        tutorialProgress?.isCompleted ||
        client?.tutorialCompleted ||
        allMandatoryCompleted;

      return {
        userId,
        totalSteps,
        completedSteps,
        mandatorySteps,
        completedMandatory,
        progressPercentage,
        currentStep,
        isCompleted,
        startedAt: tutorialProgress?.startedAt || new Date(),
        completedAt: tutorialProgress?.completedAt,
        totalTimeSpent: tutorialProgress?.totalTimeSpent || 0,
      };
    } catch (error) {
      console.error("Erreur récupération progression tutoriel:", error);
      throw error;
    }
  }

  /**
   * Auto-compléter le tutoriel quand tous les étapes obligatoires sont faits
   */
  private static async autoCompleteTutorial(userId: string): Promise<void> {
    try {
      const steps = await this.getClientTutorialSteps(userId);
      const completedStepIds = steps
        .filter((s) => s.completed)
        .map((s) => s.id);
      const totalTimeSpent = steps.reduce(
        (total, step) => total + step.timeSpent,
        0,
      );

      await this.completeTutorial(userId, {
        totalTimeSpent,
        stepsCompleted: completedStepIds,
      });
    } catch (error) {
      console.error("Erreur auto-completion tutoriel:", error);
    }
  }

  /**
   * Démarrer le tutoriel pour un utilisateur
   */
  static async startTutorial(userId: string): Promise<void> {
    try {
      // Vérifier que l'utilisateur existe
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        console.warn(`Utilisateur non trouvé pour tutoriel: ${userId}`);
        return; // Ne pas lancer d'erreur, juste ignorer
      }

      if (user.role !== "CLIENT") {
        console.warn(`Tutoriel demandé pour un non-client: ${user.role}`);
        return; // Ne pas lancer d'erreur, juste ignorer
      }

      await db.clientTutorialProgress.upsert({
        where: { userId },
        update: {
          startedAt: new Date(),
          isCompleted: false,
        },
        create: {
          userId,
          startedAt: new Date(),
          isCompleted: false,
          totalTimeSpent: 0,
        },
      });
    } catch (error) {
      console.error("Erreur démarrage tutoriel:", error);
      // Ne pas relancer l'erreur pour éviter de casser l'application
    }
  }

  /**
   * Marquer une étape comme complétée
   */
  static async completeStep(
    userId: string,
    stepId: number,
    timeSpent: number,
  ): Promise<void> {
    try {
      // Vérifier que l'utilisateur existe d'abord
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        console.warn(`Utilisateur non trouvé pour completeStep: ${userId}`);
        return; // Ne pas lancer d'erreur, juste ignorer
      }

      if (user.role !== "CLIENT") {
        console.warn(`CompleteStep demandé pour un non-client: ${user.role}`);
        return; // Ne pas lancer d'erreur, juste ignorer
      }

      await db.$transaction(async (tx) => {
        // S'assurer que ClientTutorialProgress existe
        await tx.clientTutorialProgress.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            startedAt: new Date(),
          },
        });

        // Mettre à jour ou créer l'étape
        await tx.tutorialStep.upsert({
          where: {
            userId_stepId: {
              userId,
              stepId,
            },
          },
          update: {
            isCompleted: true,
            timeSpent,
            completedAt: new Date(),
          },
          create: {
            userId,
            stepId,
            isCompleted: true,
            timeSpent,
            completedAt: new Date(),
          },
        });

        // Mettre à jour la progression globale
        const currentProgress = await tx.clientTutorialProgress.findUnique({
          where: { userId },
        });

        if (currentProgress) {
          await tx.clientTutorialProgress.update({
            where: { userId },
            data: {
              totalTimeSpent: currentProgress.totalTimeSpent + timeSpent,
            },
          });
        }
      });
    } catch (error) {
      console.error("Erreur complétion étape:", error);
      throw error;
    }
  }

  /**
   * Terminer le tutoriel complet
   */
  static async completeTutorial(
    userId: string,
    completionData: TutorialCompletion,
  ): Promise<void> {
    try {
      // Vérifier si le tutoriel est déjà complété
      const client = await db.client.findUnique({
        where: { userId },
        select: { tutorialCompleted: true },
      });

      if (client?.tutorialCompleted) {
        return;
      }

      // Vérifier que tous les étapes obligatoires sont complétées
      const steps = await this.getClientTutorialSteps(userId);
      const mandatorySteps = steps.filter((s) => s.mandatory);
      const completedMandatory = mandatorySteps.filter(
        (s) => s.completed,
      ).length;

      if (completedMandatory < mandatorySteps.length) {
        console.warn(
          `Tutoriel completion demandé mais seulement ${completedMandatory}/${mandatorySteps.length} étapes obligatoires complétées`,
        );
        // Ne pas faire échouer, mais log l'avertissement
      }

      await db.$transaction(async (tx) => {
        // Marquer le tutoriel comme terminé
        await tx.clientTutorialProgress.upsert({
          where: { userId },
          update: {
            isCompleted: true,
            completedAt: new Date(),
            totalTimeSpent: completionData.totalTimeSpent,
          },
          create: {
            userId,
            isCompleted: true,
            completedAt: new Date(),
            startedAt: new Date(),
            totalTimeSpent: completionData.totalTimeSpent,
          },
        });

        // Sauvegarder le feedback si fourni
        if (completionData.feedback || completionData.rating) {
          await tx.tutorialFeedback.upsert({
            where: { userId },
            update: {
              feedback: completionData.feedback,
              rating: completionData.rating,
              stepsCompleted: completionData.stepsCompleted.length,
              completionTime: completionData.totalTimeSpent,
            },
            create: {
              userId,
              feedback: completionData.feedback,
              rating: completionData.rating,
              stepsCompleted: completionData.stepsCompleted.length,
              completionTime: completionData.totalTimeSpent,
            },
          });
        }

        // Activer les fonctionnalités pour le client
        await tx.client.updateMany({
          where: { userId },
          data: {
            tutorialCompleted: true,
            tutorialCompletedAt: new Date(),
          },
        });
      });

      // Déclencher des actions post-tutoriel
      await this.postTutorialActions(userId, completionData);
    } catch (error) {
      console.error("Erreur finalisation tutoriel:", error);
      throw error;
    }
  }

  /**
   * Actions à effectuer après la complétion du tutoriel
   */
  private static async postTutorialActions(
    userId: string,
    completionData: TutorialCompletion,
  ): Promise<void> {
    try {
      // Notifier le client de la completion
      const { NotificationService } = await import(
        "@/features/notifications/services/notification.service"
      );

      await NotificationService.createNotification({
        userId,
        type: "TUTORIAL_COMPLETED",
        title: "Tutoriel terminé !",
        message:
          "Félicitations ! Vous pouvez maintenant accéder à toutes les fonctionnalités d'EcoDeli.",
        data: {
          completionTime: completionData.totalTimeSpent,
          rating: completionData.rating,
        },
        sendPush: true,
        priority: "medium",
      });

      // Créer un crédit de bienvenue (si applicable)
      const client = await db.client.findUnique({
        where: { userId },
        include: {
          user: {
            include: {
              wallet: true,
            },
          },
        },
      });

      if (client && client.subscriptionPlan === "FREE") {
        // Créer ou récupérer le wallet
        let wallet = client.user.wallet;
        if (!wallet) {
          wallet = await db.wallet.create({
            data: {
              userId,
              balance: 0,
              currency: "EUR",
            },
          });
        }

        // Offrir un crédit de bienvenue
        await db.walletOperation.create({
          data: {
            walletId: wallet.id,
            userId,
            type: "CREDIT",
            amount: 5.0, // 5€ de crédit de bienvenue
            description: "Crédit de bienvenue - Tutoriel terminé",
            reference: `WELCOME-${userId}`,
            status: "COMPLETED",
            executedAt: new Date(),
          },
        });

        // Mettre à jour le solde du wallet
        await db.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: wallet.balance + 5.0,
          },
        });

        await NotificationService.createNotification({
          userId,
          type: "WELCOME_CREDIT",
          title: "Crédit de bienvenue !",
          message:
            "Vous avez reçu 5€ de crédit pour avoir terminé le tutoriel.",
          data: {
            amount: 5.0,
            type: "welcome_bonus",
          },
          sendPush: true,
          priority: "high",
        });
      }
    } catch (error) {
      console.error("Erreur actions post-tutoriel:", error);
      // Ne pas faire échouer la transaction principale
    }
  }

  /**
   * Passer une étape (si autorisé)
   */
  static async skipStep(userId: string, stepId: number): Promise<void> {
    try {
      // Vérifier que l'utilisateur existe d'abord
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new Error(`Utilisateur non trouvé: ${userId}`);
      }

      if (user.role !== "CLIENT") {
        throw new Error("Le tutoriel est réservé aux clients");
      }

      // Vérifier que l'étape n'est pas obligatoire
      const steps = await this.getClientTutorialSteps(userId);
      const step = steps.find((s) => s.id === stepId);

      if (step?.mandatory) {
        throw new Error(
          "Cette étape est obligatoire et ne peut pas être passée",
        );
      }

      await db.$transaction(async (tx) => {
        // S'assurer que ClientTutorialProgress existe
        await tx.clientTutorialProgress.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            startedAt: new Date(),
          },
        });

        await tx.tutorialStep.upsert({
          where: {
            userId_stepId: {
              userId,
              stepId,
            },
          },
          update: {
            isSkipped: true,
            completedAt: new Date(),
          },
          create: {
            userId,
            stepId,
            isSkipped: true,
            isCompleted: false,
            timeSpent: 0,
            completedAt: new Date(),
          },
        });
      });
    } catch (error) {
      console.error("Erreur skip étape:", error);
      throw error;
    }
  }

  /**
   * Réinitialiser le tutoriel
   */
  static async resetTutorial(userId: string): Promise<void> {
    try {
      await db.$transaction(async (tx) => {
        // Supprimer toutes les étapes
        await tx.tutorialStep.deleteMany({
          where: { userId },
        });

        // Réinitialiser la progression
        await tx.clientTutorialProgress.deleteMany({
          where: { userId },
        });

        // Marquer le client comme non-tutoriel
        await tx.client.updateMany({
          where: { userId },
          data: {
            tutorialCompleted: false,
            tutorialCompletedAt: null,
          },
        });
      });
    } catch (error) {
      console.error("Erreur réinitialisation tutoriel:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques du tutoriel
   */
  static async getTutorialStats(): Promise<any> {
    try {
      const [totalUsers, completedTutorials, averageTime, feedbacks] =
        await Promise.all([
          db.client.count(),
          db.clientTutorialProgress.count({
            where: { isCompleted: true },
          }),
          db.clientTutorialProgress.aggregate({
            where: { isCompleted: true },
            _avg: { totalTimeSpent: true },
          }),
          db.tutorialFeedback.aggregate({
            _avg: { rating: true },
            _count: { rating: true },
          }),
        ]);

      const completionRate =
        totalUsers > 0 ? (completedTutorials / totalUsers) * 100 : 0;

      return {
        totalUsers,
        completedTutorials,
        completionRate: Math.round(completionRate * 100) / 100,
        averageCompletionTime: Math.round(
          (averageTime._avg.totalTimeSpent || 0) / 60,
        ), // en minutes
        averageRating: Math.round((feedbacks._avg.rating || 0) * 100) / 100,
        totalFeedbacks: feedbacks._count.rating,
      };
    } catch (error) {
      console.error("Erreur récupération stats tutoriel:", error);
      throw error;
    }
  }
}
