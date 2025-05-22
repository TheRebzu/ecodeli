import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

/**
 * Formate une date en format yyyy-MM-dd
 */
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, 'yyyy-MM-dd');
}

/**
 * Formate une date pour affichage en fonction de la locale
 */
export function formatDateLocalized(date: Date | string, locale: string = 'fr'): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, 'PP', {
    locale: locale === 'fr' ? fr : enUS,
  });
}

/**
 * Formate une heure au format HH:mm
 */
export function formatTime(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, 'HH:mm');
}

/**
 * Formate une date et une heure pour affichage en fonction de la locale
 */
export function formatDateTime(date: Date | string, locale: string = 'fr'): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, 'PPp', {
    locale: locale === 'fr' ? fr : enUS,
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
