/**
 * Utilitaire pour traduire les codes d'erreur d'authentification en messages lisibles
 */

type AuthErrorCode = 
  | 'OAuthSignin' 
  | 'OAuthCallback' 
  | 'OAuthCreateAccount' 
  | 'EmailCreateAccount' 
  | 'Callback' 
  | 'OAuthAccountNotLinked' 
  | 'EmailSignin' 
  | 'CredentialsSignin' 
  | 'SessionRequired' 
  | 'InvalidToken'
  | 'ExpiredToken'
  | 'TwoFactorRequired'
  | 'default';

/**
 * Renvoie un message d'erreur lisible en fonction du code d'erreur d'authentification
 */
export function getAuthErrorMessage(error?: string | null): string {
  if (!error) return "Une erreur d'authentification s'est produite";

  const errorCode = error as AuthErrorCode;

  const errors: Record<AuthErrorCode, string> = {
    OAuthSignin: "Erreur lors de la connexion avec le fournisseur d'authentification.",
    OAuthCallback: "Erreur lors du retour du fournisseur d'authentification.",
    OAuthCreateAccount: "Erreur lors de la création du compte avec le fournisseur d'authentification.",
    EmailCreateAccount: "Erreur lors de la création du compte. Cet email est peut-être déjà utilisé.",
    Callback: "Erreur lors du processus d'authentification.",
    OAuthAccountNotLinked: "Cet email est déjà associé à un compte utilisant un autre fournisseur d'authentification.",
    EmailSignin: "Erreur lors de l'envoi de l'email de connexion.",
    CredentialsSignin: "Les identifiants fournis sont incorrects.",
    SessionRequired: "Vous devez être connecté pour accéder à cette page.",
    InvalidToken: "Le jeton de vérification est invalide ou a expiré.",
    ExpiredToken: "Le jeton de vérification a expiré. Veuillez demander un nouveau lien.",
    TwoFactorRequired: "Une authentification à deux facteurs est requise pour vous connecter.",
    default: "Une erreur d'authentification s'est produite."
  };

  return errors[errorCode] || errors.default;
} 