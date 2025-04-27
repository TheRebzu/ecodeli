import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Combine plusieurs classes CSS avec tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate une date selon le format spécifié
 * @param date Date à formater
 * @param formatString Format de date (par défaut: dd/MM/yyyy)
 * @returns Date formatée
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatString: string = 'dd/MM/yyyy'
): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatString, { locale: fr });
}

/**
 * Retourne la distance relative entre une date et maintenant
 * @param date Date à comparer
 * @returns Texte représentant la distance (ex: "il y a 3 jours")
 */
export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: fr });
}

/**
 * Formate un montant en devise
 * @param amount Montant à formater
 * @param currency Devise (par défaut: EUR)
 * @returns Montant formaté avec devise
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'EUR'
): string {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('fr-FR', {
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
