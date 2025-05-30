import { nanoid } from 'nanoid';
import { addHours, isAfter } from 'date-fns';

/**
 * Types de tokens supportés par l'application
 */
export enum TokenType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

/**
 * Génère un token aléatoire
 * @returns Un token unique
 */
export function generateToken(): string {
  return nanoid(32);
}

/**
 * Génère un token de vérification d'email
 * @returns Le token et sa date d'expiration
 */
export function generateVerificationToken(): { token: string; expiresAt: Date } {
  return {
    token: generateToken(),
    expiresAt: getTokenExpiration(TokenType.EMAIL_VERIFICATION),
  };
}

/**
 * Génère un token de réinitialisation de mot de passe
 * @returns Le token et sa date d'expiration
 */
export function generatePasswordResetToken(): { token: string; expiresAt: Date } {
  return {
    token: generateToken(),
    expiresAt: getTokenExpiration(TokenType.PASSWORD_RESET),
  };
}

/**
 * Calcule la date d'expiration d'un token
 * @param type Type de token
 * @returns La date d'expiration
 */
export function getTokenExpiration(type: TokenType): Date {
  const now = new Date();

  switch (type) {
    case TokenType.EMAIL_VERIFICATION:
      return addHours(now, 24); // 24 heures
    case TokenType.PASSWORD_RESET:
      return addHours(now, 1); // 1 heure
    default:
      return addHours(now, 24);
  }
}

/**
 * Vérifie si un token est expiré
 * @param expiresAt Date d'expiration du token
 * @returns true si le token est expiré, false sinon
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return isAfter(new Date(), expiresAt);
}
