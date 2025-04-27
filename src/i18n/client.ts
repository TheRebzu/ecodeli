'use client';

import { createTranslator } from 'next-intl';
import { routing } from './routing';

/**
 * Asynchronously loads translations for the specified locale
 */
export async function loadClientMessages(locale: string) {
  // Make sure the locale is a valid one
  const resolvedLocale = routing.locales.includes(locale as (typeof routing.locales)[number])
    ? locale
    : routing.defaultLocale;

  // Dynamically import the messages for the locale
  return (await import(`../messages/${resolvedLocale}.json`)).default;
}

/**
 * Creates a translation function for use in client components
 * when you need to use translations outside of React components
 */
export function createClientTranslator(messages: Record<string, unknown>, locale: string) {
  return createTranslator({ locale, messages });
}
