import bcrypt from "bcryptjs";

/**
 * Hache un mot de passe avec bcrypt
 * @param password Le mot de passe en clair à hacher
 * @returns Le mot de passe haché
 */
export async function hash(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

/**
 * Vérifie si un mot de passe correspond au hash stocké
 * @param password Le mot de passe en clair à vérifier
 * @param hashedPassword Le hash du mot de passe stocké
 * @returns true si le mot de passe correspond, false sinon
 */
export async function verify(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Valide la force d'un mot de passe selon les critères de sécurité
 * @param password Le mot de passe à valider
 * @returns Un objet contenant le résultat de la validation et un message d'erreur si nécessaire
 */
export function validatePassword(password: string): {
  isValid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return {
      isValid: false,
      message: "Le mot de passe doit contenir au moins 8 caractères",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Le mot de passe doit contenir au moins une lettre majuscule",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "Le mot de passe doit contenir au moins une lettre minuscule",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: "Le mot de passe doit contenir au moins un chiffre",
    };
  }

  return { isValid: true };
}
