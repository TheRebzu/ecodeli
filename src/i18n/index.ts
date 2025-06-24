/**
 * Export central pour toutes les utilités i18n d'EcoDeli
 * Simplifie les imports avec @/i18n
 */

// Configuration du routage
export { routing } from "./routing";

// Navigation i18n
export { Link, useRouter, usePathname, redirect, getPathname } from "./navigation";

// Utilities client
export { loadClientMessages, createClientTranslator } from "./client";

// Re-export des hooks et utilitaires next-intl
export { useTranslations, useLocale, useMessages } from "next-intl";

// Types
export type Locale = "fr" | "en";

// Configuration par défaut
export const defaultLocale: Locale = "fr";
export const locales: readonly Locale[] = ["fr", "en"] as const;

/**
 * Vérifie si une locale est valide
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Obtient la locale par défaut si celle fournie n'est pas valide
 */
export function getValidLocale(locale: string): Locale {
  return isValidLocale(locale) ? locale : defaultLocale;
} 