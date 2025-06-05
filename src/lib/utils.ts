import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Génère un code aléatoire de la longueur spécifiée
 * @param length - Longueur du code à générer
 * @returns Code aléatoire alphanumérique
 */
export function generateRandomCode(length: number = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
}

/**
 * Formate une date en format français lisible
 * @param date - Date à formater (string ou Date)
 * @returns Date formatée en français
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Date invalide';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Formate un montant en devise avec la localisation française
 * @param amount - Montant à formater
 * @param currency - Code de la devise (ex: EUR, USD)
 * @returns Montant formaté avec la devise
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(0);
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Génère un tableau de couleurs pour les graphiques
 * @param count - Nombre de couleurs à générer
 * @returns Tableau de couleurs en format hex
 */
export function generateChartColors(count: number): string[] {
  const colors = [
    '#3B82F6', // blue-500
    '#EF4444', // red-500
    '#10B981', // green-500
    '#F59E0B', // yellow-500
    '#8B5CF6', // purple-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#84CC16', // lime-500
    '#F97316', // orange-500
    '#6366F1', // indigo-500
    '#14B8A6', // teal-500
    '#F43F5E', // rose-500
  ];

  // Si on a besoin de plus de couleurs que dans notre palette, on génère des couleurs aléatoirement
  const result = [];
  for (let i = 0; i < count; i++) {
    if (i < colors.length) {
      result.push(colors[i]);
    } else {
      // Génération de couleur aléatoire avec une luminosité et saturation contrôlées
      const hue = (i * 137.508) % 360; // Golden angle approximation
      const saturation = 60 + (i % 30); // Entre 60% et 90%
      const lightness = 50 + (i % 20); // Entre 50% et 70%
      result.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
  }

  return result;
}
