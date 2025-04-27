/**
 * Utilitaire pour traduire les codes d'erreur d'authentification en messages lisibles
 */

export type AuthErrorCode =
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
  | 'UserNotFound'
  | 'EmailNotVerified'
  | 'InvalidCredentials'
  | 'AccountSuspended'
  | 'AccountInactive'
  | 'PasswordMismatch'
  | 'WeakPassword'
  | 'EmailAlreadyInUse'
  | 'default';

/**
 * Type de la fonction de traduction
 */
type TranslationFunction = (key: string) => string;

/**
 * Renvoie un message d'erreur localisé en fonction du code d'erreur d'authentification
 * @param error Code d'erreur
 * @param t Fonction de traduction
 * @returns Message d'erreur localisé
 */
export function getAuthErrorMessage(
  error: string | null | undefined,
  t: TranslationFunction
): string {
  if (!error) return t('auth.errors.default');

  const errorCode = error as AuthErrorCode;

  try {
    return t(`auth.errors.${errorCode}`);
  } catch {
    return t('auth.errors.default');
  }
}
