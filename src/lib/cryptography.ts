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
