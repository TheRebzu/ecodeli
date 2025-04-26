import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Définir les locales supportées
export const locales = ['en', 'fr'];
export const defaultLocale = 'fr';

export default getRequestConfig(async ({ locale }) => {
  // Vérifier si la locale est supportée
  if (!locales.includes(locale as string)) {
    notFound();
  }
  
  // Importer dynamiquement les messages pour la locale demandée
  return {
    locale: locale as string,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
}); 