import { User } from '@prisma/client';

// Define supported languages directly
export type SupportedLanguage = 'en' | 'fr';

/**
 * Gets the user's preferred locale from their preferences or defaults to English
 */
export function getUserPreferredLocale(user: User): SupportedLanguage {
  // First check the dedicated locale field
  if (user.locale && (user.locale === 'fr' || user.locale === 'en')) {
    return user.locale as SupportedLanguage;
  }

  // Then check if locale is in preferences JSON
  if (user.preferences && typeof user.preferences === 'object') {
    try {
      const preferences = user.preferences as Record<string, unknown>;
      if (
        preferences.locale &&
        typeof preferences.locale === 'string' &&
        (preferences.locale === 'fr' || preferences.locale === 'en')
      ) {
        return preferences.locale as SupportedLanguage;
      }
    } catch (error) {
      console.error('Error parsing user preferences:', error);
    }
  }

  // Otherwise, default to English
  return 'en';
}
