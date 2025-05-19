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
