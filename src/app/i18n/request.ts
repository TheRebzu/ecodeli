import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Define supported locales
export const locales = ['en', 'fr'];
export const defaultLocale = 'fr';

export default getRequestConfig(async ({ locale }) => {
  // Check if locale is supported
  if (!locales.includes(locale as string)) {
    notFound();
  }
  
  // Simplification: Utilisez des messages vides si nécessaire pour éviter les erreurs
  let messages = {};
  
  try {
    // Essayer de charger les messages, mais ne pas bloquer si ça échoue
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch (_) {
    console.warn(`Could not load messages for locale: ${locale}`);
    // Continuer avec des messages vides en cas d'erreur
  }
  
  return {
    locale: locale as string,
    messages,
    // Désactiver les redirections automatiques
    timeZone: 'Europe/Paris',
  };
}); 