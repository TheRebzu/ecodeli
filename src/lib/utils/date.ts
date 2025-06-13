import { 
  addDays as dateFnsAddDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  format,
  parseISO,
  isValid,
  isPast,
  isFuture,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWeekend,
  isToday,
  isYesterday,
  isTomorrow
} from 'date-fns';
import { fr, enUS, es, de, it } from 'date-fns/locale';

// Types
export type DateLocale = 'fr' | 'en' | 'es' | 'de' | 'it';

// Locales mapping pour date-fns
const localeMap = {
  fr,
  en: enUS,
  es,
  de,
  it,
};

/**
 * Utilitaires de manipulation de dates
 */

// Re-export des fonctions date-fns les plus utilisées
export const addDays = dateFnsAddDays;
export { 
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isValid,
  isPast,
  isFuture,
  isWeekend,
  isToday,
  isYesterday,
  isTomorrow,
  parseISO
};

/**
 * Formate une date selon la locale spécifiée
 */
export function formatDate(
  date: Date | string,
  formatStr: string = 'PP',
  locale: DateLocale = 'fr'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return 'Date invalide';
  }
  
  return format(dateObj, formatStr, { locale: localeMap[locale] });
}

/**
 * Formate une date en format français court
 */
export function formatDateFr(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy', 'fr');
}

/**
 * Formate une date avec l'heure en français
 */
export function formatDateTimeFr(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy à HH:mm', 'fr');
}

/**
 * Formate une date relative (il y a X jours, dans X jours)
 */
export function formatRelativeDate(date: Date | string, locale: DateLocale = 'fr'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  const daysDiff = differenceInDays(dateObj, today);
  
  if (daysDiff === 0) return locale === 'fr' ? "Aujourd'hui" : 'Today';
  if (daysDiff === 1) return locale === 'fr' ? 'Demain' : 'Tomorrow';
  if (daysDiff === -1) return locale === 'fr' ? 'Hier' : 'Yesterday';
  
  if (daysDiff > 0) {
    return locale === 'fr' ? `Dans ${daysDiff} jours` : `In ${daysDiff} days`;
  } else {
    return locale === 'fr' ? `Il y a ${Math.abs(daysDiff)} jours` : `${Math.abs(daysDiff)} days ago`;
  }
}

/**
 * Obtient le début et la fin d'une période
 */
export function getDateRange(
  period: 'day' | 'week' | 'month',
  date: Date = new Date()
): { start: Date; end: Date } {
  switch (period) {
    case 'day':
      return { start: startOfDay(date), end: endOfDay(date) };
    case 'week':
      return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(date), end: endOfMonth(date) };
    default:
      return { start: startOfDay(date), end: endOfDay(date) };
  }
}

/**
 * Vérifie si une date est dans une plage donnée
 */
export function isDateInRange(
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const startObj = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const endObj = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  return dateObj >= startObj && dateObj <= endObj;
}

/**
 * Calcule l'âge en années
 */
export function calculateAge(birthDate: Date | string): number {
  const birthDateObj = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDiff = today.getMonth() - birthDateObj.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Obtient la prochaine occurrence d'un jour de la semaine
 */
export function getNextWeekday(weekday: number, fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  const days = (weekday + 7 - date.getDay()) % 7;
  return addDays(date, days || 7);
}

/**
 * Formate une durée en heures/minutes
 */
export function formatDuration(minutes: number, locale: DateLocale = 'fr'): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (locale === 'fr') {
    if (hours > 0) {
      return mins > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${hours}h`;
    }
    return `${mins}min`;
  } else {
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  }
}

/**
 * Valide une date de naissance (doit être dans le passé et raisonnable)
 */
export function isValidBirthDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj) || !isPast(dateObj)) {
    return false;
  }
  
  const age = calculateAge(dateObj);
  return age >= 0 && age <= 120;
}

/**
 * Génère un timestamp sécurisé pour les noms de fichiers
 */
export function generateTimestamp(): string {
  return format(new Date(), 'yyyyMMdd-HHmmss');
} 