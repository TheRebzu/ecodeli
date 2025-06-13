import chalk from "chalk";

/**
 * Utilitaires pour la gestion des clés de traduction
 */

/**
 * Normalise les clés d'un objet de traduction
 * - Assure que les clés sont consistantes
 * - Trie les clés par ordre alphabétique
 */
export function normalizeKeys(obj: Record<string, any>): Record<string, any> {
  // Si ce n'est pas un objet, le retourner tel quel
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  // Créer un nouvel objet avec les clés triées
  const result: Record<string, any> = {};

  // Trier les clés
  const sortedKeys = Object.keys(obj).sort();

  // Ajouter les propriétés triées
  for (const key of sortedKeys) {
    // Normaliser récursivement les objets imbriqués
    if (typeof obj[key] === "object" && obj[key] !== null) {
      result[key] = normalizeKeys(obj[key]);
    } else {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Valide la structure JSON d'un objet de traduction simple
 * - Vérifie que les clés sont uniques
 * - Vérifie que les valeurs sont valides
 */
export function validateSimpleJsonStructure(obj: Record<string, any>): boolean {
  // Vérifier que l'objet est bien un objet
  if (typeof obj !== "object" || obj === null) {
    throw new Error("La structure de traduction doit être un objet");
  }

  // Vérifier récursivement les objets imbriqués
  for (const key in obj) {
    const value = obj[key];

    // Vérifier que la clé n'est pas vide
    if (!key.trim()) {
      throw new Error("Les clés de traduction ne peuvent pas être vides");
    }

    // Vérifier que la clé ne contient pas de caractères spéciaux
    if (/[^a-zA-Z0-9_]/.test(key)) {
      throw new Error(`La clé "${key}" contient des caractères non autorisés`);
    }

    // Vérifier récursivement les objets imbriqués
    if (typeof value === "object" && value !== null) {
      validateSimpleJsonStructure(value);
    } else if (typeof value !== "string") {
      // Les valeurs doivent être des chaînes
      throw new Error(
        `La valeur de la clé "${key}" doit être une chaîne de caractères`,
      );
    }
  }

  return true;
}

/**
 * Supprime les doublons simples dans un objet de traduction
 */
export function removeSimpleDuplicates(
  obj: Record<string, any>,
): Record<string, any> {
  // Si ce n'est pas un objet, le retourner tel quel
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const result: Record<string, any> = {};
  const valueToKey: Record<string, string> = {};

  // Pour chaque propriété
  for (const key in obj) {
    const value = obj[key];

    // Si c'est un objet imbriqué, appliquer récursivement
    if (typeof value === "object" && value !== null) {
      result[key] = removeSimpleDuplicates(value);
    } else if (typeof value === "string") {
      // Vérifier si cette valeur existe déjà
      if (valueToKey[value]) {
        // Doublons trouvés, conserver la clé la plus courte
        if (key.length < valueToKey[value].length) {
          // Supprimer l'ancienne paire
          const oldKey = valueToKey[value];
          delete result[oldKey];

          // Ajouter la nouvelle paire
          result[key] = value;
          valueToKey[value] = key;
        }
        // Sinon, ignorer cette paire (doublons)
      } else {
        // Nouvelle valeur, l'ajouter
        result[key] = value;
        valueToKey[value] = key;
      }
    } else {
      // Autre type de valeur, l'ajouter telle quelle
      result[key] = value;
    }
  }

  return result;
}

/**
 * Valide la structure JSON des traductions
 */
export function validateJsonStructure(
  translations: Record<string, any>,
): boolean {
  try {
    // Vérifier que toutes les valeurs sont des chaînes de caractères ou des objets
    validateObjectStructure(translations);
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur de validation JSON: ${error}`));
    return false;
  }
}

/**
 * Valide récursivement la structure d'un objet de traductions
 */
function validateObjectStructure(
  obj: Record<string, any>,
  path: string = "",
): void {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    // Vérifier que la clé est valide
    if (!isValidKey(key)) {
      throw new Error(`Clé invalide: "${key}" à ${currentPath}`);
    }

    // Vérifier le type de la valeur
    if (typeof value === "object" && value !== null) {
      validateObjectStructure(value, currentPath);
    } else if (typeof value !== "string") {
      throw new Error(
        `Type invalide: "${typeof value}" pour la clé "${currentPath}". Seuls les objets et les chaînes sont autorisés.`,
      );
    }
  }
}

/**
 * Supprime les clés en double dans les traductions
 */
export function removeDuplicates(
  translations: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {};
  const seen = new Map<string, string>();

  // Première passe: collecter toutes les valeurs et leurs chemins
  collectValues(translations, "", seen);

  // Deuxième passe: reconstruire l'objet en supprimant les doublons
  for (const [namespace, values] of Object.entries(translations)) {
    result[namespace] = {};

    if (typeof values === "object" && values !== null) {
      for (const [key, value] of Object.entries(
        values as Record<string, any>,
      )) {
        if (typeof value === "object" && value !== null) {
          // Récursion pour les sous-objets
          result[namespace][key] = removeDuplicates({ temp: value }).temp;
        } else {
          // Pour les valeurs simples, vérifier si c'est un doublon
          const valueStr = String(value);
          const currentPath = `${namespace}.${key}`;
          const existingPath = seen.get(valueStr);

          if (existingPath && existingPath !== currentPath) {
            console.warn(
              chalk.yellow(
                `⚠️ Valeur en double détectée: "${valueStr}" aux chemins "${existingPath}" et "${currentPath}". Conservé à "${existingPath}".`,
              ),
            );
          } else {
            result[namespace][key] = value;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Collecte récursivement toutes les valeurs dans une Map
 */
function collectValues(
  obj: Record<string, any>,
  path: string,
  seen: Map<string, string>,
): void {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === "object" && value !== null) {
      collectValues(value, currentPath, seen);
    } else {
      const valueStr = String(value);
      if (!seen.has(valueStr)) {
        seen.set(valueStr, currentPath);
      }
    }
  }
}

/**
 * Vérifie si une clé de traduction est valide
 */
function isValidKey(key: string): boolean {
  // Règles de validation des clés
  if (!key) return false;
  if (key.length > 50) return false;

  // La clé ne doit pas contenir de caractères spéciaux (sauf underscore)
  return /^[a-zA-Z0-9_]+$/.test(key);
}

/**
 * Convertit une chaîne en camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .trim()
    .replace(/[^\w\s]/g, "") // Supprimer les caractères spéciaux
    .replace(/\s+(.)/g, (_, char) => char.toUpperCase()) // Majuscule après espace
    .replace(/\s/g, "") // Supprimer les espaces
    .replace(/^(.)/, (_, char) => char.toLowerCase()); // Première lettre en minuscule
}

/**
 * Génère un identifiant unique pour une clé
 */
export function generateUniqueKey(
  base: string,
  existingKeys: Set<string>,
): string {
  let key = base;
  let counter = 1;

  // Si la clé existe déjà, ajouter un suffixe numérique
  while (existingKeys.has(key)) {
    key = `${base}${counter}`;
    counter++;
  }

  return key;
}
