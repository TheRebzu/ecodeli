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
  
  // Dynamically import messages for the requested locale
  return {
    locale: locale as string,
    messages: (await import(`../../../messages/${locale}.json`)).default
  };
}); 