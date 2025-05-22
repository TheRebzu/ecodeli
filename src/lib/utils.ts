import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance, Locale, addDays, formatRelative } from 'date-fns';
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
 * Formate une date relative (aujourd'hui, hier, il y a X jours...)
 * @param date Date à formater
 * @param locale Locale à utiliser (par défaut: fr)
 * @returns Date relative formatée
 */
export function formatRelativeDate(
  date: Date | string | null | undefined,
  locale: string = 'fr'
): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    return formatRelative(dateObj, new Date(), {
      locale: getDateLocale(locale)
    });
  } catch (error) {
    // Fallback au format standard
    return format(dateObj, 'dd/MM/yyyy', { locale: getDateLocale(locale) });
  }
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

/**
 * Retourne la plage de dates pour une période donnée
 */
export function getCurrentDateRange(days: number = 30) {
  const endDate = new Date();
  const startDate = addDays(endDate, -days);

  return {
    startDate,
    endDate,
  };
}

/**
 * Calcule le pourcentage de variation entre deux valeurs
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Génère une couleur aléatoire
 */
export function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * Génère une palette de couleurs pour les graphiques
 */
export function generateChartColors(count: number): string[] {
  const baseColors = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316', // orange-500
    '#84cc16', // lime-500
    '#6366f1', // indigo-500
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // Si on a besoin de plus de couleurs que disponibles, on ajoute des couleurs aléatoires
  const colors = [...baseColors];

  for (let i = baseColors.length; i < count; i++) {
    colors.push(getRandomColor());
  }

  return colors;
}

/**
 * Formate une distance en kilomètres avec deux décimales
 * @param distance Distance à formater (en km)
 * @returns Distance formatée (ex: "3.50")
 */
export function formatDistanceValue(distance: number): string {
  if (distance === null || distance === undefined) return 'N/A';
  return distance.toFixed(2);
}

/**
 * Formate l'heure d'une date
 * @param date Date à formater
 * @param locale Locale à utiliser (par défaut: fr)
 * @returns Heure formatée (ex: "14:30")
 */
export function formatTime(
  date: Date | string | null | undefined,
  locale: string = 'fr'
): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'HH:mm', { locale: getDateLocale(locale) });
}
