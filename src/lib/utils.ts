import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance, Locale } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

/**
 * Combine plusieurs classes CSS avec tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Retourne l'objet locale date-fns correspondant à la locale spécifiée
 */
export function getDateLocale(locale: string): Locale {
  switch (locale) {
    case 'fr':
      return fr;
    case 'en':
      return enUS;
    default:
      return fr;
  }
}

/**
 * Formate une date selon le format spécifié et la locale
 * @param date Date à formater
 * @param formatString Format de date (par défaut: dd/MM/yyyy)
 * @param locale Locale à utiliser (par défaut: fr)
 * @returns Date formatée
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatString: string = 'dd/MM/yyyy',
  locale: string = 'fr'
): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatString, { locale: getDateLocale(locale) });
}

/**
 * Retourne la distance relative entre une date et maintenant
 * @param date Date à comparer
 * @param locale Locale à utiliser (par défaut: fr)
 * @returns Texte représentant la distance (ex: "il y a 3 jours")
 */
export function formatRelativeDate(
  date: Date | string | null | undefined,
  locale: string = 'fr'
): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), {
    addSuffix: true,
    locale: getDateLocale(locale),
  });
}

/**
 * Formate un montant en devise
 * @param amount Montant à formater
 * @param currency Devise (par défaut: EUR)
 * @param locale Locale à utiliser (par défaut: fr-FR)
 * @returns Montant formaté avec devise
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'EUR',
  locale: string = 'fr'
): string {
  if (amount === null || amount === undefined) return 'N/A';

  // Mapper la locale courte à la locale complète pour Intl
  const localeMap: Record<string, string> = {
    fr: 'fr-FR',
    en: 'en-US',
  };

  return new Intl.NumberFormat(localeMap[locale] || 'fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Tronque un texte à une longueur maximale
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Génère un identifiant unique
 */
export function generateId(prefix: string = ''): string {
  return `${prefix}${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Attend pendant un certain nombre de millisecondes
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Génère une chaîne aléatoire de caractères alphanumériques
 * @param length - Longueur de la chaîne à générer
 * @returns Une chaîne aléatoire
 */
export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

/**
 * Génère un code aléatoire de la longueur spécifiée
 * @param length Longueur du code à générer
 * @returns Code aléatoire
 */
export function generateRandomCode(length: number): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclusion de caractères ambigus (0, 1, I, O)
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
}

/**
 * Formate la taille d'un fichier en unités lisibles (octets, Ko, Mo, Go)
 * @param bytes Taille en octets
 * @param decimals Nombre de décimales (par défaut: 2)
 * @returns Chaîne formatée avec unité
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 octets';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['octets', 'Ko', 'Mo', 'Go', 'To'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
