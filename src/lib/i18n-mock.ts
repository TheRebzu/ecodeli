/**
 * Utilitaire temporaire pour remplacer next-intl
 * À utiliser en attendant de configurer correctement next-intl
 */

type TranslationParams = Record<string, string | number | boolean>;
type TranslationFunction = (key: string, params?: TranslationParams) => string;

/**
 * Fonction mock qui remplace useTranslations de next-intl
 * Renvoie une fonction qui retourne simplement la clé passée en paramètre
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useTranslations(_namespace: string): TranslationFunction {
  // Le paramètre namespace n'est pas utilisé dans cette implémentation mock
  // mais il est conservé pour la compatibilité d'interface avec next-intl
  return (key: string) => {
    // Extraire le dernier segment de la clé pour avoir un texte plus lisible
    const segments = key.split('.');
    const lastSegment = segments[segments.length - 1];

    // Convertir camelCase vers des espaces
    return lastSegment.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };
}

/**
 * Fonction mock qui remplace useLocale de next-intl
 */
export function useLocale(): string {
  return 'fr';
}
