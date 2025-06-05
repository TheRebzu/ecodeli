import { db } from '@/server/db';
import {
  UserPreferences,
  UpdateUserPreferences,
  UpdateOnboardingStatus,
} from '@/schemas/user-preferences.schema';
import { defaultLocale } from '@/lib/i18n';

export const userPreferencesService = {
  /**
   * Récupère les préférences utilisateur avec support des notifications
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

  /**
   * NOUVELLES MÉTHODES - Support étendu des préférences de notification
   */

  /**
   * Récupère les préférences de notification d'un utilisateur
   */
  async getNotificationPreferences(userId: string): Promise<{
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
    securityAlerts: boolean;
    loginAlerts: boolean;
    paymentAlerts: boolean;
    weeklyDigest: boolean;
    deliveryUpdates: boolean;
    announcementNotifications: boolean;
    serviceReminders: boolean;
    storageAlerts: boolean;
    notificationCategories: string[];
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
      timezone: string;
    };
    frequency: {
      immediate: boolean;
      hourly: boolean;
      daily: boolean;
      weekly: boolean;
    };
  }> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        notificationPreferences: true,
        preferences: true,
        locale: true,
      },
    });

    if (!user) {
      // Retourner les préférences par défaut
      return {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        marketingEmails: false,
        securityAlerts: true,
        loginAlerts: true,
        paymentAlerts: true,
        weeklyDigest: true,
        deliveryUpdates: true,
        announcementNotifications: true,
        serviceReminders: true,
        storageAlerts: true,
        notificationCategories: ['security', 'payments', 'deliveries'],
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'Europe/Paris',
        },
        frequency: {
          immediate: true,
          hourly: false,
          daily: false,
          weekly: false,
        },
      };
    }

    const notifPrefs = (user.notificationPreferences as any) || {};
    const generalPrefs = (user.preferences as any) || {};

    return {
      emailNotifications: notifPrefs.emailNotifications ?? true,
      pushNotifications: notifPrefs.pushNotifications ?? true,
      smsNotifications: notifPrefs.smsNotifications ?? false,
      marketingEmails: notifPrefs.marketingEmails ?? false,
      securityAlerts: notifPrefs.securityAlerts ?? true,
      loginAlerts: notifPrefs.loginAlerts ?? true,
      paymentAlerts: notifPrefs.paymentAlerts ?? true,
      weeklyDigest: notifPrefs.weeklyDigest ?? true,
      deliveryUpdates: notifPrefs.deliveryUpdates ?? true,
      announcementNotifications: notifPrefs.announcementNotifications ?? true,
      serviceReminders: notifPrefs.serviceReminders ?? true,
      storageAlerts: notifPrefs.storageAlerts ?? true,
      notificationCategories: notifPrefs.notificationCategories || [
        'security',
        'payments',
        'deliveries',
      ],
      quietHours: notifPrefs.quietHours || {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: generalPrefs.timeZone || 'Europe/Paris',
      },
      frequency: notifPrefs.frequency || {
        immediate: true,
        hourly: false,
        daily: false,
        weekly: false,
      },
    };
  },

  /**
   * Met à jour les préférences de notification d'un utilisateur
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<{
      emailNotifications: boolean;
      pushNotifications: boolean;
      smsNotifications: boolean;
      marketingEmails: boolean;
      securityAlerts: boolean;
      loginAlerts: boolean;
      paymentAlerts: boolean;
      weeklyDigest: boolean;
      deliveryUpdates: boolean;
      announcementNotifications: boolean;
      serviceReminders: boolean;
      storageAlerts: boolean;
      notificationCategories: string[];
      quietHours: {
        enabled: boolean;
        startTime: string;
        endTime: string;
        timezone: string;
      };
      frequency: {
        immediate: boolean;
        hourly: boolean;
        daily: boolean;
        weekly: boolean;
      };
    }>
  ): Promise<boolean> {
    try {
      // Récupérer les préférences actuelles
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: { notificationPreferences: true },
      });

      if (!currentUser) {
        throw new Error('Utilisateur non trouvé');
      }

      const currentPrefs = (currentUser.notificationPreferences as any) || {};

      // Fusionner avec les nouvelles préférences
      const updatedPrefs = {
        ...currentPrefs,
        ...preferences,
        // S'assurer que les heures de silence sont correctement formatées
        quietHours: preferences.quietHours
          ? {
              ...currentPrefs.quietHours,
              ...preferences.quietHours,
            }
          : currentPrefs.quietHours,
        // S'assurer que la fréquence est correctement formatée
        frequency: preferences.frequency
          ? {
              ...currentPrefs.frequency,
              ...preferences.frequency,
            }
          : currentPrefs.frequency,
      };

      // Mettre à jour dans la base de données
      await db.user.update({
        where: { id: userId },
        data: {
          notificationPreferences: updatedPrefs,
        },
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences de notification:', error);
      return false;
    }
  },

  /**
   * Vérifie si un utilisateur peut recevoir une notification à un moment donné
   */
  async canReceiveNotificationNow(
    userId: string,
    notificationType: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM'
  ): Promise<boolean> {
    try {
      const prefs = await this.getNotificationPreferences(userId);

      // Les notifications urgentes et de sécurité passent toujours
      if (priority === 'URGENT' || prefs.securityAlerts) {
        return true;
      }

      // Vérifier les heures de silence
      if (prefs.quietHours.enabled) {
        const now = new Date();
        const userTimeZone = prefs.quietHours.timezone;

        // Créer les heures de début et fin en tenant compte du fuseau horaire
        const startTime = prefs.quietHours.startTime;
        const endTime = prefs.quietHours.endTime;

        // Logique simplifiée - dans un vrai système, utilisez une bibliothèque comme date-fns-tz
        const currentHour = now.getHours();
        const startHour = parseInt(startTime.split(':')[0]);
        const endHour = parseInt(endTime.split(':')[0]);

        if (startHour > endHour) {
          // Les heures de silence traversent minuit
          if (currentHour >= startHour || currentHour < endHour) {
            return false;
          }
        } else {
          // Les heures de silence dans la même journée
          if (currentHour >= startHour && currentHour < endHour) {
            return false;
          }
        }
      }

      // Vérifier les préférences spécifiques au type
      switch (notificationType) {
        case 'DELIVERY':
          return prefs.deliveryUpdates;
        case 'ANNOUNCEMENT':
          return prefs.announcementNotifications;
        case 'SERVICE':
          return prefs.serviceReminders;
        case 'STORAGE':
          return prefs.storageAlerts;
        case 'PAYMENT':
          return prefs.paymentAlerts;
        case 'MARKETING':
          return prefs.marketingEmails;
        default:
          return true;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions de notification:', error);
      return true; // En cas d'erreur, autoriser par défaut
    }
  },

  /**
   * Désactive temporairement toutes les notifications pour un utilisateur
   */
  async snoozeNotifications(
    userId: string,
    duration: number, // en minutes
    reason?: string
  ): Promise<{ success: boolean; unsnoozeAt: Date }> {
    try {
      const unsnoozeAt = new Date(Date.now() + duration * 60 * 1000);

      const currentPrefs = await this.getNotificationPreferences(userId);

      await db.user.update({
        where: { id: userId },
        data: {
          notificationPreferences: {
            ...currentPrefs,
            snoozed: {
              enabled: true,
              until: unsnoozeAt.toISOString(),
              reason: reason || 'Notifications en pause',
              originalPrefs: {
                emailNotifications: currentPrefs.emailNotifications,
                pushNotifications: currentPrefs.pushNotifications,
                smsNotifications: currentPrefs.smsNotifications,
              },
            },
          },
        },
      });

      return {
        success: true,
        unsnoozeAt,
      };
    } catch (error) {
      console.error('Erreur lors de la mise en pause des notifications:', error);
      return {
        success: false,
        unsnoozeAt: new Date(),
      };
    }
  },

  /**
   * Réactive les notifications pour un utilisateur
   */
  async unsnoozeNotifications(userId: string): Promise<boolean> {
    try {
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: { notificationPreferences: true },
      });

      if (!currentUser) {
        return false;
      }

      const prefs = (currentUser.notificationPreferences as any) || {};

      if (prefs.snoozed?.enabled) {
        const originalPrefs = prefs.snoozed.originalPrefs || {};

        await db.user.update({
          where: { id: userId },
          data: {
            notificationPreferences: {
              ...prefs,
              emailNotifications: originalPrefs.emailNotifications,
              pushNotifications: originalPrefs.pushNotifications,
              smsNotifications: originalPrefs.smsNotifications,
              snoozed: {
                enabled: false,
              },
            },
          },
        });
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la réactivation des notifications:', error);
      return false;
    }
  },
};
