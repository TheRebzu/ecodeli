import { db } from '@/server/db';
import { UserPreferences, UpdateUserPreferences } from '@/schemas/user-preferences.schema';
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
      },
    });

    if (!user) {
      return {
        locale: defaultLocale,
        dateFormat: 'medium',
        currencyFormat: 'EUR',
      };
    }

    const preferences = (user.preferences as Record<string, any>) || {};

    return {
      locale: user.locale || defaultLocale,
      timeZone: preferences.timeZone,
      dateFormat: preferences.dateFormat || 'medium',
      currencyFormat: preferences.currencyFormat || 'EUR',
    };
  },

  /**
   * Met à jour les préférences utilisateur
   */
  async updateUserPreferences(
    userId: string,
    data: UpdateUserPreferences
  ): Promise<UserPreferences> {
    const { locale, ...otherPreferences } = data;

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(locale && { locale }),
        preferences: {
          ...(otherPreferences && otherPreferences),
        },
      },
      select: {
        locale: true,
        preferences: true,
      },
    });

    const preferences = (updatedUser.preferences as Record<string, any>) || {};

    return {
      locale: updatedUser.locale || defaultLocale,
      timeZone: preferences.timeZone,
      dateFormat: preferences.dateFormat || 'medium',
      currencyFormat: preferences.currencyFormat || 'EUR',
    };
  },
};
