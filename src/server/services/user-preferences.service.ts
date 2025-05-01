import { db } from '@/server/db';
import {
  UserPreferences,
  UpdateUserPreferences,
  UpdateOnboardingStatus,
} from '@/schemas/user-preferences.schema';
import { defaultLocale } from '@/lib/i18n';

export const userPreferencesService = {
  /**
   * Récupère les préférences utilisateur
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        locale: true,
        preferences: true,
        hasCompletedOnboarding: true,
        lastOnboardingStep: true,
        onboardingCompletionDate: true,
      },
    });

    if (!user) {
      return {
        locale: defaultLocale,
        dateFormat: 'medium',
        currencyFormat: 'EUR',
        hasCompletedOnboarding: false,
        lastOnboardingStep: 0,
        tutorialSkipped: false,
      };
    }

    const preferences = (user.preferences as Record<string, any>) || {};

    return {
      locale: user.locale || defaultLocale,
      timeZone: preferences.timeZone,
      dateFormat: preferences.dateFormat || 'medium',
      currencyFormat: preferences.currencyFormat || 'EUR',
      hasCompletedOnboarding: user.hasCompletedOnboarding || false,
      lastOnboardingStep: user.lastOnboardingStep || 0,
      onboardingCompletionDate: user.onboardingCompletionDate?.toISOString(),
      tutorialSkipped: preferences.tutorialSkipped || false,
    };
  },

  /**
   * Met à jour les préférences utilisateur
   */
  async updateUserPreferences(
    userId: string,
    data: UpdateUserPreferences
  ): Promise<UserPreferences> {
    const {
      locale,
      hasCompletedOnboarding,
      lastOnboardingStep,
      onboardingCompletionDate,
      ...otherPreferences
    } = data;

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(locale && { locale }),
        ...(hasCompletedOnboarding !== undefined && { hasCompletedOnboarding }),
        ...(lastOnboardingStep !== undefined && { lastOnboardingStep }),
        ...(onboardingCompletionDate !== undefined && {
          onboardingCompletionDate: new Date(onboardingCompletionDate),
        }),
        preferences: {
          ...(otherPreferences && otherPreferences),
        },
      },
      select: {
        locale: true,
        preferences: true,
        hasCompletedOnboarding: true,
        lastOnboardingStep: true,
        onboardingCompletionDate: true,
      },
    });

    const preferences = (updatedUser.preferences as Record<string, any>) || {};

    return {
      locale: updatedUser.locale || defaultLocale,
      timeZone: preferences.timeZone,
      dateFormat: preferences.dateFormat || 'medium',
      currencyFormat: preferences.currencyFormat || 'EUR',
      hasCompletedOnboarding: updatedUser.hasCompletedOnboarding || false,
      lastOnboardingStep: updatedUser.lastOnboardingStep || 0,
      onboardingCompletionDate: updatedUser.onboardingCompletionDate?.toISOString(),
      tutorialSkipped: preferences.tutorialSkipped || false,
    };
  },

  /**
   * Récupère le statut d'onboarding de l'utilisateur
   */
  async getOnboardingStatus(userId: string): Promise<{
    hasCompletedOnboarding: boolean;
    lastOnboardingStep: number;
    onboardingCompletionDate?: string;
    tutorialSkipped: boolean;
  }> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        hasCompletedOnboarding: true,
        lastOnboardingStep: true,
        onboardingCompletionDate: true,
        preferences: true,
      },
    });

    if (!user) {
      return {
        hasCompletedOnboarding: false,
        lastOnboardingStep: 0,
        tutorialSkipped: false,
      };
    }

    const preferences = (user.preferences as Record<string, any>) || {};

    return {
      hasCompletedOnboarding: user.hasCompletedOnboarding || false,
      lastOnboardingStep: user.lastOnboardingStep || 0,
      onboardingCompletionDate: user.onboardingCompletionDate?.toISOString(),
      tutorialSkipped: preferences.tutorialSkipped || false,
    };
  },

  /**
   * Met à jour le statut d'onboarding de l'utilisateur
   */
  async updateOnboardingStatus(
    userId: string,
    data: UpdateOnboardingStatus
  ): Promise<{
    hasCompletedOnboarding: boolean;
    lastOnboardingStep: number;
    onboardingCompletionDate?: string;
    tutorialSkipped: boolean;
  }> {
    const {
      hasCompletedOnboarding,
      lastOnboardingStep,
      onboardingCompletionDate,
      tutorialSkipped,
    } = data;

    // Préparer les données de mise à jour
    const updateData: any = {};
    if (hasCompletedOnboarding !== undefined)
      updateData.hasCompletedOnboarding = hasCompletedOnboarding;
    if (lastOnboardingStep !== undefined) updateData.lastOnboardingStep = lastOnboardingStep;
    if (onboardingCompletionDate !== undefined)
      updateData.onboardingCompletionDate = new Date(onboardingCompletionDate);

    // Récupérer les préférences actuelles pour les mettre à jour
    let currentPreferences = {};
    if (tutorialSkipped !== undefined) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });
      currentPreferences = (user?.preferences as Record<string, any>) || {};

      // Mettre à jour les préférences
      updateData.preferences = {
        ...currentPreferences,
        tutorialSkipped,
      };
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        hasCompletedOnboarding: true,
        lastOnboardingStep: true,
        onboardingCompletionDate: true,
        preferences: true,
      },
    });

    const preferences = (updatedUser.preferences as Record<string, any>) || {};

    return {
      hasCompletedOnboarding: updatedUser.hasCompletedOnboarding || false,
      lastOnboardingStep: updatedUser.lastOnboardingStep || 0,
      onboardingCompletionDate: updatedUser.onboardingCompletionDate?.toISOString(),
      tutorialSkipped: preferences.tutorialSkipped || false,
    };
  },

  /**
   * Réinitialise le statut d'onboarding de l'utilisateur
   */
  async resetOnboardingStatus(userId: string): Promise<{
    hasCompletedOnboarding: boolean;
    lastOnboardingStep: number;
    tutorialSkipped: boolean;
  }> {
    // Récupérer les préférences actuelles pour mettre à jour uniquement tutorialSkipped
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    const currentPreferences = (user?.preferences as Record<string, any>) || {};

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        hasCompletedOnboarding: false,
        lastOnboardingStep: 0,
        onboardingCompletionDate: null,
        preferences: {
          ...currentPreferences,
          tutorialSkipped: false,
        },
      },
      select: {
        hasCompletedOnboarding: true,
        lastOnboardingStep: true,
        preferences: true,
      },
    });

    const preferences = (updatedUser.preferences as Record<string, any>) || {};

    return {
      hasCompletedOnboarding: updatedUser.hasCompletedOnboarding || false,
      lastOnboardingStep: updatedUser.lastOnboardingStep || 0,
      tutorialSkipped: preferences.tutorialSkipped || false,
    };
  },
};
