import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  component: string;
  order: number;
  isRequired: boolean;
  duration?: number; // en secondes
  videoUrl?: string;
  actionRequired?: {
    type: "click" | "form" | "navigation" | "wait";
    target?: string;
    data?: Record<string, any>;
  };
}

export interface TutorialProgress {
  userId: string;
  stepId: string;
  completedAt: Date;
  timeSpent?: number;
  skipped?: boolean;
  metadata?: Record<string, any>;
}

export interface ClientOnboardingData {
  userId: string;
  currentStep: number;
  totalSteps: number;
  isCompleted: boolean;
  startedAt: Date;
  completedAt?: Date;
  mustComplete: boolean;
  tutorialVersion: string;
}

/**
 * Service de gestion du tutoriel client obligatoire (Mission 1)
 * Bloque l'utilisateur avec overlays jusqu'� compl�tion
 */
export const clientTutorialService = {
  /**
   * R�cup�re les �tapes du tutoriel pour un nouveau client
   */
  async getTutorialSteps(): Promise<TutorialStep[]> {
    // R�cup�rer depuis la base de donn�es ou retourner les �tapes par d�faut
    const steps = await db.tutorialStep.findMany({
      where: {
        isActive: true,
        targetRole: "CLIENT"
      },
      orderBy: { order: "asc" }
    });

    if (steps.length > 0) {
      return steps.map(step => ({
        id: step.id,
        title: step.title,
        description: step.description,
        component: step.component,
        order: step.order,
        isRequired: step.isRequired,
        duration: step.estimatedDuration,
        videoUrl: step.videoUrl,
        actionRequired: step.actionRequired as any
      }));
    }

    // �tapes par d�faut si aucune en base
    return this.getDefaultTutorialSteps();
  },

  /**
   * �tapes par d�faut du tutoriel client
   */
  getDefaultTutorialSteps(): TutorialStep[] {
    return [
      {
        id: "welcome",
        title: "Bienvenue sur EcoDeli",
        description: "D�couvrez comment utiliser notre plateforme de livraison �cologique",
        component: "WelcomeStep",
        order: 1,
        isRequired: true,
        duration: 30,
        videoUrl: "/videos/tutorial/welcome.mp4"
      },
      {
        id: "create-announcement",
        title: "Cr�er votre premi�re annonce",
        description: "Apprenez � d�poser une annonce de livraison",
        component: "CreateAnnouncementStep",
        order: 2,
        isRequired: true,
        duration: 120,
        actionRequired: {
          type: "navigation",
          target: "/client/announcements/create"
        }
      },
      {
        id: "find-services",
        title: "D�couvrir les services",
        description: "Explorez nos services de prestations � domicile",
        component: "FindServicesStep",
        order: 3,
        isRequired: true,
        duration: 90,
        actionRequired: {
          type: "navigation",
          target: "/client/services"
        }
      },
      {
        id: "storage-system",
        title: "Syst�me de stockage",
        description: "Apprenez � utiliser nos box de stockage temporaire",
        component: "StorageStep",
        order: 4,
        isRequired: true,
        duration: 60,
        actionRequired: {
          type: "navigation",
          target: "/client/storage"
        }
      },
      {
        id: "payment-setup",
        title: "Configuration des paiements",
        description: "Configurez vos m�thodes de paiement",
        component: "PaymentSetupStep",
        order: 5,
        isRequired: true,
        duration: 90,
        actionRequired: {
          type: "form",
          target: "payment-method-form"
        }
      },
      {
        id: "notifications",
        title: "Notifications",
        description: "Activez les notifications pour suivre vos livraisons",
        component: "NotificationsStep",
        order: 6,
        isRequired: false,
        duration: 45
      },
      {
        id: "completion",
        title: "F�licitations !",
        description: "Vous �tes pr�t � utiliser EcoDeli",
        component: "CompletionStep",
        order: 7,
        isRequired: true,
        duration: 30
      }
    ];
  },

  /**
   * Initialise le tutoriel pour un nouveau client
   */
  async initializeTutorial(userId: string, force: boolean = false): Promise<ClientOnboardingData> {
    // V�rifier si l'utilisateur existe et est un client
    const user = await db.user.findUnique({
      where: { id: userId, role: "CLIENT" }
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Client non trouv�"
      });
    }

    // V�rifier si le tutoriel existe d�j�
    const existingTutorial = await db.clientOnboarding.findUnique({
      where: { userId }
    });

    if (existingTutorial && !force) {
      return {
        userId: existingTutorial.userId,
        currentStep: existingTutorial.currentStep,
        totalSteps: existingTutorial.totalSteps,
        isCompleted: existingTutorial.isCompleted,
        startedAt: existingTutorial.startedAt,
        completedAt: existingTutorial.completedAt,
        mustComplete: existingTutorial.mustComplete,
        tutorialVersion: existingTutorial.tutorialVersion
      };
    }

    const steps = await this.getTutorialSteps();
    const tutorialVersion = "1.0.0";

    // Cr�er ou mettre � jour l'enregistrement du tutoriel
    const onboarding = await db.clientOnboarding.upsert({
      where: { userId },
      create: {
        userId,
        currentStep: 1,
        totalSteps: steps.length,
        isCompleted: false,
        startedAt: new Date(),
        mustComplete: true,
        tutorialVersion,
        blocksNavigation: true
      },
      update: {
        currentStep: force ? 1 : undefined,
        isCompleted: force ? false : undefined,
        startedAt: force ? new Date() : undefined,
        completedAt: force ? null : undefined,
        tutorialVersion,
        blocksNavigation: true
      }
    });

    return {
      userId: onboarding.userId,
      currentStep: onboarding.currentStep,
      totalSteps: onboarding.totalSteps,
      isCompleted: onboarding.isCompleted,
      startedAt: onboarding.startedAt,
      completedAt: onboarding.completedAt,
      mustComplete: onboarding.mustComplete,
      tutorialVersion: onboarding.tutorialVersion
    };
  },

  /**
   * Marque une �tape du tutoriel comme compl�t�e
   */
  async completeStep(
    userId: string, 
    stepId: string, 
    timeSpent?: number,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; nextStep?: TutorialStep; isCompleted?: boolean }> {
    const onboarding = await db.clientOnboarding.findUnique({
      where: { userId }
    });

    if (!onboarding) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tutoriel non initialis�"
      });
    }

    if (onboarding.isCompleted) {
      return { success: true, isCompleted: true };
    }

    const steps = await this.getTutorialSteps();
    const currentStepData = steps.find(s => s.id === stepId);

    if (!currentStepData) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "�tape de tutoriel non trouv�e"
      });
    }

    // V�rifier que c'est bien l'�tape en cours
    const expectedStep = steps[onboarding.currentStep - 1];
    if (expectedStep?.id !== stepId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cette �tape ne peut pas �tre compl�t�e maintenant"
      });
    }

    // Enregistrer la progression
    await db.tutorialProgress.create({
      data: {
        userId,
        stepId,
        completedAt: new Date(),
        timeSpent,
        metadata: metadata || {}
      }
    });

    const nextStepNumber = onboarding.currentStep + 1;
    const isLastStep = nextStepNumber > onboarding.totalSteps;

    // Mettre � jour l'onboarding
    const updatedOnboarding = await db.clientOnboarding.update({
      where: { userId },
      data: {
        currentStep: isLastStep ? onboarding.totalSteps : nextStepNumber,
        isCompleted: isLastStep,
        completedAt: isLastStep ? new Date() : null,
        blocksNavigation: !isLastStep
      }
    });

    // Si le tutoriel est termin�, d�bloquer la navigation
    if (isLastStep) {
      await this.unlockUserNavigation(userId);
      
      // Envoyer une notification de f�licitations
      try {
        const { notificationService } = await import("@/server/services/common/notification.service");
        await notificationService.sendNotification({
          userId,
          title: "Tutoriel termin� !",
          message: "F�licitations ! Vous pouvez maintenant utiliser toutes les fonctionnalit�s d'EcoDeli.",
          type: "ACHIEVEMENT_UNLOCKED",
          data: {
            achievement: "tutorial_completed",
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error("Erreur envoi notification fin tutoriel:", error);
      }

      return { success: true, isCompleted: true };
    }

    const nextStep = steps[nextStepNumber - 1];
    return { success: true, nextStep, isCompleted: false };
  },

  /**
   * Permet d'ignorer une �tape optionnelle
   */
  async skipStep(userId: string, stepId: string, reason?: string): Promise<{ success: boolean; nextStep?: TutorialStep }> {
    const steps = await this.getTutorialSteps();
    const stepToSkip = steps.find(s => s.id === stepId);

    if (!stepToSkip) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "�tape non trouv�e"
      });
    }

    if (stepToSkip.isRequired) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cette �tape est obligatoire et ne peut pas �tre ignor�e"
      });
    }

    // Enregistrer l'�tape comme ignor�e
    await db.tutorialProgress.create({
      data: {
        userId,
        stepId,
        completedAt: new Date(),
        skipped: true,
        metadata: {
          reason: reason || "�tape ignor�e par l'utilisateur"
        }
      }
    });

    // Continuer avec l'�tape suivante
    return this.completeStep(userId, stepId, 0, { skipped: true, reason });
  },

  /**
   * V�rifie si un utilisateur doit compl�ter le tutoriel
   */
  async shouldShowTutorial(userId: string): Promise<{ shouldShow: boolean; onboarding?: ClientOnboardingData }> {
    const onboarding = await db.clientOnboarding.findUnique({
      where: { userId }
    });

    if (!onboarding) {
      // Nouveau client, doit faire le tutoriel
      return { shouldShow: true };
    }

    if (!onboarding.isCompleted && onboarding.mustComplete) {
      return {
        shouldShow: true,
        onboarding: {
          userId: onboarding.userId,
          currentStep: onboarding.currentStep,
          totalSteps: onboarding.totalSteps,
          isCompleted: onboarding.isCompleted,
          startedAt: onboarding.startedAt,
          completedAt: onboarding.completedAt,
          mustComplete: onboarding.mustComplete,
          tutorialVersion: onboarding.tutorialVersion
        }
      };
    }

    return { shouldShow: false };
  },

  /**
   * D�bloque la navigation pour un utilisateur
   */
  async unlockUserNavigation(userId: string): Promise<void> {
    await db.clientOnboarding.update({
      where: { userId },
      data: {
        blocksNavigation: false
      }
    });

    // Mettre � jour le profil utilisateur pour indiquer l'onboarding termin�
    await db.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date()
      }
    });
  },

  /**
   * R�cup�re la progression du tutoriel
   */
  async getTutorialProgress(userId: string): Promise<{
    onboarding: ClientOnboardingData;
    completedSteps: TutorialProgress[];
    currentStep?: TutorialStep;
    nextStep?: TutorialStep;
  }> {
    const onboarding = await db.clientOnboarding.findUnique({
      where: { userId }
    });

    if (!onboarding) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tutoriel non initialis�"
      });
    }

    const completedSteps = await db.tutorialProgress.findMany({
      where: { userId },
      orderBy: { completedAt: "asc" }
    });

    const steps = await this.getTutorialSteps();
    const currentStep = steps[onboarding.currentStep - 1];
    const nextStep = steps[onboarding.currentStep];

    return {
      onboarding: {
        userId: onboarding.userId,
        currentStep: onboarding.currentStep,
        totalSteps: onboarding.totalSteps,
        isCompleted: onboarding.isCompleted,
        startedAt: onboarding.startedAt,
        completedAt: onboarding.completedAt,
        mustComplete: onboarding.mustComplete,
        tutorialVersion: onboarding.tutorialVersion
      },
      completedSteps: completedSteps.map(step => ({
        userId: step.userId,
        stepId: step.stepId,
        completedAt: step.completedAt,
        timeSpent: step.timeSpent,
        skipped: step.skipped,
        metadata: step.metadata as Record<string, any>
      })),
      currentStep,
      nextStep
    };
  },

  /**
   * Force la r�initialisation du tutoriel (admin uniquement)
   */
  async resetTutorial(userId: string, adminId: string): Promise<void> {
    // V�rifier que l'admin a les permissions
    const admin = await db.user.findUnique({
      where: { id: adminId, role: "ADMIN" }
    });

    if (!admin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Seuls les administrateurs peuvent r�initialiser un tutoriel"
      });
    }

    // Supprimer la progression existante
    await db.tutorialProgress.deleteMany({
      where: { userId }
    });

    // R�initialiser l'onboarding
    await db.clientOnboarding.update({
      where: { userId },
      data: {
        currentStep: 1,
        isCompleted: false,
        completedAt: null,
        startedAt: new Date(),
        blocksNavigation: true
      }
    });

    // Mettre � jour le profil utilisateur
    await db.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: false,
        onboardingCompletedAt: null
      }
    });
  },

  /**
   * Obtient les statistiques du tutoriel pour l'admin
   */
  async getTutorialStats(): Promise<{
    totalUsers: number;
    completedTutorials: number;
    averageCompletionTime: number;
    dropoffRates: Record<string, number>;
    averageStepTime: Record<string, number>;
  }> {
    const [totalUsers, completedOnboardings, allProgress] = await Promise.all([
      db.clientOnboarding.count(),
      db.clientOnboarding.count({ where: { isCompleted: true } }),
      db.tutorialProgress.findMany({
        include: {
          user: {
            include: {
              clientOnboarding: true
            }
          }
        }
      })
    ]);

    // Calculer le temps moyen de compl�tion
    const completedUsers = allProgress
      .filter(p => p.user.clientOnboarding?.isCompleted)
      .map(p => p.user.clientOnboarding!);

    const averageCompletionTime = completedUsers.length > 0
      ? completedUsers.reduce((sum, onb) => {
          const duration = onb.completedAt && onb.startedAt
            ? onb.completedAt.getTime() - onb.startedAt.getTime()
            : 0;
          return sum + duration;
        }, 0) / completedUsers.length
      : 0;

    // Calculer les taux d'abandon par �tape
    const steps = await this.getTutorialSteps();
    const dropoffRates: Record<string, number> = {};
    const averageStepTime: Record<string, number> = {};

    for (const step of steps) {
      const stepProgress = allProgress.filter(p => p.stepId === step.id);
      const completedStep = stepProgress.filter(p => !p.skipped);
      
      dropoffRates[step.id] = stepProgress.length > 0 
        ? (stepProgress.length - completedStep.length) / stepProgress.length * 100
        : 0;

      averageStepTime[step.id] = completedStep.length > 0
        ? completedStep.reduce((sum, p) => sum + (p.timeSpent || 0), 0) / completedStep.length
        : 0;
    }

    return {
      totalUsers,
      completedTutorials: completedOnboardings,
      averageCompletionTime: averageCompletionTime / (1000 * 60), // en minutes
      dropoffRates,
      averageStepTime
    };
  }
};