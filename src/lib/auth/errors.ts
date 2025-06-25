export function getAuthErrorMessage(errorMessage: string): string {
  // Map common auth error messages to user-friendly messages
  const errorMap: Record<string, string> = {
    'Invalid credentials': 'Email ou mot de passe incorrect',
    'User not found': 'Aucun compte trouvé avec cet email',
    'Email not verified': 'Votre email n\'est pas encore vérifié',
    'Account not verified': 'Votre compte n\'est pas encore vérifié',
    'Authentication error': 'Erreur d\'authentification',
    'Session expired': 'Votre session a expiré',
    'Unauthorized': 'Accès non autorisé',
    'Forbidden': 'Accès interdit',
    'Network error': 'Erreur de connexion réseau'
  }

  // Check if the error message matches any known error
  for (const [key, value] of Object.entries(errorMap)) {
    if (errorMessage.includes(key)) {
      return value
    }
  }

  // Return the original message if no match found
  return errorMessage || 'Une erreur inattendue s\'est produite'
}

export default getAuthErrorMessage 