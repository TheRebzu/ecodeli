export const authErrorMessages = {
  Signin: "Une erreur s'est produite lors de la connexion.",
  OAuthSignin: "Une erreur s'est produite lors de la connexion avec le fournisseur OAuth.",
  OAuthCallback: "Une erreur s'est produite lors de la connexion avec le fournisseur OAuth.",
  OAuthCreateAccount: "Impossible de créer un compte utilisateur avec le fournisseur OAuth.",
  EmailCreateAccount: "Impossible de créer un compte utilisateur avec cet email.",
  Callback: "Une erreur s'est produite lors de la connexion.",
  OAuthAccountNotLinked: "Cet email est déjà associé à un compte. Connectez-vous avec votre méthode habituelle.",
  EmailSignin: "Une erreur s'est produite lors de l'envoi de l'email de connexion.",
  CredentialsSignin: "Identifiants incorrects. Vérifiez votre email et mot de passe.",
  SigninDisabled: "La connexion via cette méthode est temporairement désactivée.",
  default: "Impossible de vous connecter. Veuillez réessayer plus tard.",
  SessionRequired: "Vous devez être connecté pour accéder à cette page.",
  InvalidStatus: "Votre compte n'est pas encore activé. Veuillez contacter l'administrateur.",
  UnknownRole: "Votre compte n'a pas le rôle requis pour accéder à cette page.",
};

export type AuthError = keyof typeof authErrorMessages;

/**
 * Obtient le message d'erreur d'authentification adapté à l'utilisateur
 */
export function getAuthErrorMessage(error: string | null | undefined): string {
  if (!error) return "";
  
  return (
    authErrorMessages[error as AuthError] ||
    authErrorMessages.default
  );
} 