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

export default getRequestConfig(async ({ locale }) => {
  // Vérifier si la locale est supportée
  if (!locales.includes(locale as string)) {
    console.error(`Locale non supportée: ${locale}`);
    notFound();
  }

  // Importer dynamiquement les messages pour la locale demandée
  try {
    const messages = (await import(`../../messages/${locale}.json`)).default;
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
