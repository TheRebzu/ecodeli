/**
 * Configuration des locales pour EcoDeli
 */

// Liste des locales supportées
export const locales = ["fr", "en"] as const;

// Type pour les locales
export type Locale = (typeof locales)[number];

// Noms des langues dans leur langue native
export const localeNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

// Drapeaux des pays/langues
export const localeFlags: Record<Locale, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
};

// Locale par défaut
export const defaultLocale: Locale = "fr";

// Configuration complète des locales
export const localeConfig = {
  locales,
  defaultLocale,
  localeNames,
  localeFlags,
} as const;

/**
 * Vérifier si une locale est valide
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Obtenir la locale par défaut si celle fournie n'est pas valide
 */
export function getValidLocale(locale?: string): Locale {
  if (locale && isValidLocale(locale)) {
    return locale;
  }
  return defaultLocale;
}
