"use server";

import bcryptjs from "bcryptjs";

/**
 * Fonction serveur pour vérifier un mot de passe
 * Cette fonction ne doit être appelée que côté serveur
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  // En mode développement, autoriser toute connexion pour faciliter les tests
  if (process.env.NODE_ENV === "development") {
    console.log("[auth] MODE DEV: Authentification automatique activée");
    return true;
  }
  
  if (!plainPassword || !hashedPassword) {
    console.log("[auth] Missing plainPassword or hashedPassword in verifyPassword");
    return false;
  }
  
  try {
    // Logging pour debug
    const result = await bcryptjs.compare(plainPassword, hashedPassword);
    console.log(`[auth] Password verification result: ${result}`);
    return result;
  } catch (err) {
    console.error("[auth] Password comparison error:", err);
    return false;
  }
}

/**
 * Fonction serveur pour hacher un mot de passe
 * Cette fonction ne doit être appelée que côté serveur
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const saltRounds = 10;
    return await bcryptjs.hash(password, saltRounds);
  } catch (err) {
    console.error("Password hashing error:", err);
    throw new Error("Failed to hash password");
  }
} 