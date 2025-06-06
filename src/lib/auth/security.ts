import bcrypt from 'bcryptjs';

/**
 * Hashe un mot de passe en utilisant bcrypt
 * @param password Le mot de passe en clair
 * @returns Le mot de passe hashé
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Vérifie si un mot de passe correspond à un hash
 * @param password Le mot de passe en clair
 * @param hashedPassword Le mot de passe hashé à comparer
 * @returns true si le mot de passe correspond, false sinon
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
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
// Utilitaires de chiffrement/déchiffrement pour données sensibles
import crypto from 'crypto';

/**
 * Chiffre une chaîne de caractères avec une clé donnée
 */
export function encryptData(text: string, encryptionKey: string): string {
  // Utiliser un iv (vecteur d'initialisation) aléatoire
  const iv = crypto.randomBytes(16);
  // Créer une clé de 32 octets à partir de la clé fournie
  const key = crypto.createHash('sha256').update(encryptionKey).digest('base64').substring(0, 32);
  // Créer le chiffreur
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  // Chiffrer les données
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Retourner le iv et les données chiffrées ensemble
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Déchiffre une chaîne de caractères avec une clé donnée
 */
export function decryptData(encryptedText: string, encryptionKey: string): string {
  // Séparer le iv et les données chiffrées
  const [ivHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !encrypted) {
    throw new Error('Format de données chiffrées invalide');
  }
  // Récupérer le iv
  const iv = Buffer.from(ivHex, 'hex');
  // Créer une clé de 32 octets à partir de la clé fournie
  const key = crypto.createHash('sha256').update(encryptionKey).digest('base64').substring(0, 32);
  // Créer le déchiffreur
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  // Déchiffrer les données
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
