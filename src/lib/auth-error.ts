/**
 * Traduit les codes d'erreur d'authentification en messages utilisateur
 */
export function getAuthErrorMessage(errorCode?: string): string | null {
  if (!errorCode) return null;

  const errorMessages: Record<string, string> = {
    // Erreurs OAuth
    OAuthSignin:
      "Une erreur est survenue lors de la connexion avec le fournisseur.",
    OAuthCallback:
      "Une erreur est survenue lors du retour du fournisseur d'authentification.",
    OAuthCreateAccount:
      "Impossible de créer un compte utilisateur avec le fournisseur sélectionné.",
    EmailCreateAccount:
      "Impossible de créer un compte avec l'adresse email fournie.",
    Callback:
      "Une erreur est survenue lors du traitement de l'authentification.",
    OAuthAccountNotLinked:
      "Ce compte est déjà associé à une autre adresse email.",

    // Erreurs d'identifiants
    CredentialsSignin: "Les identifiants fournis sont incorrects.",
    SessionRequired: "Vous devez être connecté pour accéder à cette page.",

    // Erreurs spécifiques à l'application
    UserNotFound: "Aucun utilisateur trouvé avec cette adresse email.",
    IncorrectPassword: "Le mot de passe est incorrect.",
    EmailNotVerified:
      "Votre adresse email n'a pas été vérifiée. Veuillez vérifier votre boîte de réception.",
    AccountDisabled:
      "Votre compte a été désactivé. Veuillez contacter le support.",

    // Erreurs d'inscription
    UserAlreadyExists: "Un utilisateur avec cette adresse email existe déjà.",
    WeakPassword:
      "Le mot de passe est trop faible. Il doit contenir au moins 8 caractères avec des lettres, des chiffres et des caractères spéciaux.",
    InvalidEmail: "L'adresse email n'est pas valide.",

    // Erreurs de vérification
    InvalidVerificationToken:
      "Le token de vérification est invalide ou a expiré.",
    TokenExpired: "Le token a expiré. Veuillez demander un nouveau lien.",

    // Erreurs de réinitialisation du mot de passe
    InvalidResetToken: "Le token de réinitialisation est invalide ou a expiré.",
    PasswordResetFailed: "La réinitialisation du mot de passe a échoué.",

    // Erreurs générales
    Default: "Une erreur inattendue s'est produite.",
  };

  return errorMessages[errorCode] || errorMessages["Default"];
}
