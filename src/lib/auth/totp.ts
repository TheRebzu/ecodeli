import crypto from 'crypto';
import { authenticator } from 'otplib';

/**
 * Interface pour le secret TOTP
 */
interface TOTPSecret {
  secret: string;
  uri: string;
}

/**
 * Génère un secret TOTP pour l'authentification à deux facteurs
 * @param email Email de l'utilisateur
 * @param issuer Nom de l'application
 * @returns Objet contenant le secret et l'URI pour le QR code
 */
export function generateTOTPSecret(email: string, issuer = 'EcoDeli'): TOTPSecret {
  const secret = authenticator.generateSecret(32);
  const uri = authenticator.keyuri(email, issuer, secret);

  return { secret, uri };
}

/**
 * Génère des codes de secours pour l'authentification à deux facteurs
 * @param count Nombre de codes à générer
 * @returns Liste des codes de secours
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Générer un code alphanumérique de 10 caractères
    const code = crypto.randomBytes(5).toString('hex').toUpperCase();
    // Formater le code en groupes de 5 caractères pour faciliter la lecture
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
  }

  return codes;
}

/**
 * Vérifie un code TOTP
 * @param token Code fourni par l'utilisateur
 * @param secret Secret TOTP stocké
 * @returns true si le code est valide, false sinon
 */
export function verifyTOTP(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret });
}

/**
 * Vérifie un code de secours
 * @param providedCode Code fourni par l'utilisateur
 * @param backupCodes Liste des codes de secours stockés
 * @returns L'index du code de secours utilisé s'il est valide, -1 sinon
 */
export function verifyBackupCode(providedCode: string, backupCodes: string[]): number {
  const normalizedCode = providedCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

  for (let i = 0; i < backupCodes.length; i++) {
    const storedCode = backupCodes[i].toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalizedCode === storedCode) {
      return i;
    }
  }

  return -1;
}
