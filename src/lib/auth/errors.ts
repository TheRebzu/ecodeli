export function getAuthErrorMessage(error: string | Error): string {
  const message = typeof error === 'string' ? error : error.message
  return message || 'Une erreur est survenue'
} 