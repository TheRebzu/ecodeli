/**
 * Types pour le système d'internationalisation
 */

/**
 * Représente la position dans un fichier
 */
export interface FilePosition {
  line: number;
  column: number;
}

/**
 * Représente une chaîne extraite d'un fichier source
 */
export interface ExtractedString {
  // Valeur de la chaîne
  value: string;
  
  // Position dans le fichier source
  location: {
    filePath: string;
    line: number;
    column: number;
  };
  
  // Indique si la chaîne est déjà internationalisée
  isInternationalized?: boolean;
  
  // Fonction d'internationalisation utilisée (si internationalisée)
  i18nFunction?: string;
  
  // Namespace suggéré pour la traduction
  suggestedNamespace?: string;
  
  // Clé suggérée pour la traduction
  suggestedKey?: string;
}

/**
 * Représente un fichier analysé
 */
export interface AnalyzedFile {
  // Chemin du fichier
  path: string;
  
  // Liste des chaînes extraites
  extractedStrings: ExtractedString[];
  
  // Statistiques d'extraction
  stats: {
    // Nombre total de chaînes extraites
    totalStrings: number;
    
    // Nombre de chaînes internationalisées
    internationalizedStrings: number;
    
    // Nombre de chaînes non internationalisées
    nonInternationalizedStrings: number;
  };
}

/**
 * Représente un rapport de traduction
 */
export interface TranslationReport {
  analyzedFiles: AnalyzedFile[];
  statistics: TranslationStatistics;
  generatedAt: string;
}

/**
 * Représente les statistiques des traductions
 */
export interface TranslationStatistics {
  totalFiles: number;
  totalStrings: number;
  internationalizedStrings: number;
  nonInternationalizedStrings: number;
  duplicateStrings: number;
}

/**
 * Représente un dictionnaire de traduction
 */
export interface TranslationDictionary {
  [namespace: string]: {
    [key: string]: string | TranslationDictionary;
  };
}

/**
 * Options pour la génération de traductions
 */
export interface GenerationOptions {
  // Langues cibles
  targetLocales: string[];
  
  // Forcer la régénération (écraser les fichiers existants)
  force?: boolean;
  
  // Activer la traduction automatique
  autoTranslate?: boolean;
  
  // Mode verbeux
  verbose?: boolean;
}

/**
 * Résultat de la génération de traductions
 */
export interface GenerationResult {
  // Statut de la génération
  success: boolean;
  
  // Nombre de fichiers générés
  filesGenerated: number;
  
  // Nombre de traductions ajoutées
  translationsAdded: number;
  
  // Erreurs rencontrées
  errors: string[];
} 