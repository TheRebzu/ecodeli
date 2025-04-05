/**
 * Formats a date to a localized string format
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Formats a date to display time
 */
export function formatTime(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formats a date to display both date and time
 */
export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  return `${formatDate(d)} à ${formatTime(d)}`;
}

/**
 * Returns a relative time string (e.g. "il y a 5 minutes", "dans 3 jours")
 */
export function getRelativeTimeString(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  
  const diffInMilliseconds = d.getTime() - now.getTime();
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return diffInDays === 1 ? 'demain' : `dans ${diffInDays} jours`;
  } else if (diffInDays < 0) {
    if (diffInDays === -1) return 'hier';
    if (diffInDays > -7) return `il y a ${Math.abs(diffInDays)} jours`;
    return formatDate(d);
  } else if (diffInHours > 0) {
    return `dans ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  } else if (diffInHours < 0) {
    return `il y a ${Math.abs(diffInHours)} heure${Math.abs(diffInHours) > 1 ? 's' : ''}`;
  } else if (diffInMinutes > 0) {
    return `dans ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  } else if (diffInMinutes < 0) {
    return `il y a ${Math.abs(diffInMinutes)} minute${Math.abs(diffInMinutes) > 1 ? 's' : ''}`;
  } else {
    return 'à l\'instant';
  }
} 