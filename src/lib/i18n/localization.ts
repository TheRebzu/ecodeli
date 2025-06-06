import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Définir les locales supportées
export const locales = ['en', 'fr'];
export const defaultLocale = 'fr';

// Exporter un objet de configuration i18n pour le middleware
export const i18n = {
  locales,
  defaultLocale,
  // Ajouter un paramètre pour éviter les erreurs de localisation
  localeDetection: true,
  // Spécifier que les locales doivent être préfixées dans les URL
  localePrefix: 'always',
};

/**
 * Normalise une locale pour s'assurer qu'elle est supportée
 * @param locale Locale à normaliser
 * @returns Locale normalisée (ou locale par défaut si non supportée)
 */
export function normalizeLocale(locale: string): string {
  // Si la locale est vide, utiliser la locale par défaut
  if (!locale) return defaultLocale;

  // Si la locale contient un tiret (fr-FR), prendre la première partie
  const baseLang = locale.split('-')[0].toLowerCase();

  // Vérifier si la locale est supportée
  if (locales.includes(baseLang)) {
    return baseLang;
  }

  // Retourner la locale par défaut si non supportée
  return defaultLocale;
}

export default getRequestConfig(async ({ locale }) => {
  // Vérifier si la locale est supportée
  if (!locales.includes(locale as string)) {
    console.error(`Locale non supportée: ${locale}`);
    notFound();
  }

  // Importer dynamiquement les messages pour la locale demandée
  try {
    const messages = (await import(`../messages/${locale}.json`)).default;
    return {
      locale: locale as string,
      messages,
      timeZone: 'Europe/Paris',
      // Ajout de formats par défaut pour dates et nombres
      formats: {
        dateTime: {
          short: {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          },
          medium: {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          },
          long: {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
          },
        },
        number: {
          currency: {
            style: 'currency',
            currency: 'EUR',
          },
          percent: {
            style: 'percent',
          },
        },
      },
    };
  } catch (error) {
    console.warn(`Impossible de charger les messages pour la locale: ${locale}`, error);
    // Continuer avec des messages vides
    return {
      locale: locale as string,
      messages: {},
      timeZone: 'Europe/Paris',
    };
  }
});

/**
 * Charge les messages de traduction pour une locale donnée
 * @param locale Locale à charger
 * @returns Objet contenant la locale et les messages traduits
 */
export async function getMessages(locale: string = defaultLocale) {
  // Normaliser la locale pour s'assurer qu'elle est supportée
  locale = normalizeLocale(locale);

  // Importer dynamiquement les messages pour la locale demandée
  try {
    const messages = (await import(`../messages/${locale}.json`)).default;
    return {
      locale: locale as string,
      messages,
    };
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}`, error);
    // Fallback sur la locale par défaut si la locale demandée échoue
    const defaultMessages = (await import(`../messages/${defaultLocale}.json`)).default;
    return {
      locale: defaultLocale,
      messages: defaultMessages,
    };
  }
}
/**
 * Utilitaire temporaire pour remplacer next-intl
 * À utiliser en attendant de configurer correctement next-intl
 */

type TranslationParams = Record<string, string | number | boolean>;
type TranslationFunction = (key: string, params?: TranslationParams) => string;

/**
 * Fonction mock qui remplace useTranslations de next-intl
 * Renvoie une fonction qui retourne simplement la clé passée en paramètre
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useTranslations(_namespace: string): TranslationFunction {
  // Le paramètre namespace n'est pas utilisé dans cette implémentation mock
  // mais il est conservé pour la compatibilité d'interface avec next-intl
  return (key: string) => {
    // Extraire le dernier segment de la clé pour avoir un texte plus lisible
    const segments = key.split('.');
    const lastSegment = segments[segments.length - 1];

    // Convertir camelCase vers des espaces
    return lastSegment.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };
}

/**
 * Fonction mock qui remplace useLocale de next-intl
 */
export function useLocale(): string {
  return 'fr';
}
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
