import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

/**
 * Formate une date pour l'affichage
 * @param date Date à formater
 * @param formatStyle Format de date ('short', 'medium', 'long' ou 'full')
 * @param locale Locale pour le formatage (fr-FR par défaut)
 */
export function formatDate(
  date: Date | string,
  formatStyle: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'fr-FR'
): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: formatStyle,
  }).format(date);
}

/**
 * Formate une date et heure pour l'affichage
 * @param date Date à formater
 * @param formatStyle Format ('short', 'medium', 'long' ou 'full')
 * @param locale Locale pour le formatage (fr-FR par défaut)
 */
export function formatDateTime(
  date: Date | string,
  formatStyle: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'fr-FR'
): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: formatStyle,
    timeStyle: formatStyle,
  }).format(date);
}

/**
 * Formate une date selon un format personnalisé avec date-fns
 * @param date Date à formater
 * @param formatString Format de date (ex: 'yyyy-MM-dd')
 * @param localeStr Locale ('fr' ou 'en')
 */
export function formatDateCustom(
  date: Date | string,
  formatString: string,
  localeStr: string = 'fr'
): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  return format(date, formatString, {
    locale: localeStr === 'fr' ? fr : enUS,
  });
}

/**
 * Formate un prix avec 2 décimales et le symbole €
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

/**
 * Convertit des minutes en format heures/minutes
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h${remainingMinutes > 0 ? remainingMinutes : ''}`;
  }

  return `${minutes}min`;
}

/**
 * Formate un montant en devise selon la locale
 * @param amount Montant à formater
 * @param currency Code de la devise (EUR, USD, etc.)
 * @param locale Locale pour le formatage (fr-FR par défaut)
 * @returns Le montant formaté
 */
export function formatCurrency(
  amount: number,
  currency: string = 'EUR',
  locale: string = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formate un pourcentage selon la locale
 * @param value Valeur du pourcentage (0.15 pour 15%)
 * @param locale Locale pour le formatage (fr-FR par défaut)
 * @returns Le pourcentage formaté
 */
export function formatPercent(value: number, locale: string = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formate une heure pour l'affichage
 * @param date Date à formater
 * @param locale Locale pour le formatage (fr-FR par défaut)
 */
export function formatTime(date: Date | string, locale: string = 'fr-FR'): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

/**
 * Formate une date en fonction de la locale
 * @param date Date à formater
 * @param locale Locale ('fr' ou 'en')
 * @param formatString Format optionnel (si non fourni, utilise le format par défaut de la locale)
 */
export function formatDateLocalized(
  date: Date | string,
  locale: string = 'fr',
  formatString?: string
): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  if (formatString) {
    return formatDateCustom(date, formatString, locale);
  }

  // Format par défaut selon la locale
  const defaultFormat = locale === 'fr' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
  return formatDateCustom(date, defaultFormat, locale);
}
import { format } from 'date-fns';\nimport { fr, enUS } from 'date-fns/locale';\n\nexport const formatCurrency = (amount: number, currency = 'EUR', locale = 'fr-FR') => {\n  return new Intl.NumberFormat(locale, {\n    style: 'currency',\n    currency,\n  }).format(amount);\n};\n\nexport const formatDate = (date: Date | string, pattern = 'PP', locale = 'fr') => {\n  const dateObj = date instanceof Date ? date : new Date(date);\n  const localeObj = locale === 'fr' ? fr : enUS;\n  \n  return format(dateObj, pattern, { locale: localeObj });\n};
