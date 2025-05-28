#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import config from './extraction.config';
import { program } from 'commander';

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Langues supportées 
const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'it'];
const PRIMARY_LANGUAGE = 'fr';

// Options de la ligne de commande
program
  .option('-l, --locale <locale>', 'Langue à valider (par défaut: toutes)', '')
  .option('-v, --verbose', 'Afficher des informations détaillées')
  .option('-f, --fix', 'Tenter de corriger automatiquement les problèmes')
  .parse(process.argv);

const options = program.opts();

interface ValidationResult {
  missingKeys: string[];
  untranslatedKeys: string[];
  emptyKeys: string[];
  totalKeys: number;
}

interface ValidationReport {
  [language: string]: ValidationResult;
}

/**
 * Récupère tous les fichiers de traduction
 */
async function getTranslationFiles(): Promise<string[]> {
  const messagesDir = path.resolve(projectRoot, 'src/messages');
  const pattern = path.join(messagesDir, '*.json');
  
  try {
    return await glob(pattern);
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la recherche des fichiers de traduction: ${error}`));
    return [];
  }
}

/**
 * Charge un fichier de traduction
 */
async function loadTranslation(filePath: string): Promise<any> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors du chargement du fichier ${filePath}: ${error}`));
    return {};
  }
}

/**
 * Extrait toutes les clés d'un objet de traduction de manière récursive
 */
function extractKeys(obj: any, prefix: string = ''): string[] {
  if (!obj || typeof obj !== 'object') {
    return [];
  }
  
  const keys: string[] = [];
  
  for (const key in obj) {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null) {
      // Récursion pour les objets imbriqués
      keys.push(...extractKeys(value, currentKey));
    } else {
      // Ajouter la clé terminale
      keys.push(currentKey);
    }
  }
  
  return keys;
}

/**
 * Obtient la valeur d'une clé imbriquée
 */
function getNestedValue(obj: any, key: string): any {
  const parts = key.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

/**
 * Vérifie si une valeur est considérée comme non traduite
 */
function isUntranslated(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  return value.startsWith('[TO_TRANSLATE]') || 
         value.startsWith('[TRANSLATION_ERROR]') || 
         value.startsWith('[FAILED_TRANSLATION]');
}

/**
 * Vérifie si une valeur est considérée comme vide
 */
function isEmpty(value: any): boolean {
  return value === '' || value === null || value === undefined;
}

/**
 * Valide un fichier de traduction par rapport au fichier de référence
 */
function validateTranslationFile(
  translations: any,
  referenceTranslations: any
): ValidationResult {
  // Extraire toutes les clés du fichier de référence
  const referenceKeys = extractKeys(referenceTranslations);
  // Extraire toutes les clés du fichier à valider
  const translationKeys = extractKeys(translations);
  
  const missingKeys: string[] = [];
  const untranslatedKeys: string[] = [];
  const emptyKeys: string[] = [];
  
  // Vérifier les clés manquantes
  for (const key of referenceKeys) {
    if (!translationKeys.includes(key)) {
      missingKeys.push(key);
      continue;
    }
    
    // Vérifier les clés non traduites ou vides
    const value = getNestedValue(translations, key);
    
    if (isUntranslated(value)) {
      untranslatedKeys.push(key);
    } else if (isEmpty(value)) {
      emptyKeys.push(key);
    }
  }
  
  return {
    missingKeys,
    untranslatedKeys,
    emptyKeys,
    totalKeys: referenceKeys.length
  };
}

/**
 * Valide tous les fichiers de traduction
 */
async function validateAllTranslations(): Promise<ValidationReport> {
  console.log(chalk.blue('🔍 Validation des fichiers de traduction...'));
  
  const report: ValidationReport = {};
  
  try {
    // Récupérer tous les fichiers de traduction
    const files = await getTranslationFiles();
    
    if (files.length === 0) {
      console.warn(chalk.yellow('⚠️ Aucun fichier de traduction trouvé.'));
      return report;
    }
    
    // Identifier le fichier de référence
    const referenceFile = files.find(file => path.basename(file) === `${PRIMARY_LANGUAGE}.json`);
    
    if (!referenceFile) {
      console.error(chalk.red(`❌ Fichier de référence ${PRIMARY_LANGUAGE}.json non trouvé.`));
      return report;
    }
    
    console.log(chalk.blue(`📚 Chargement du fichier de référence: ${referenceFile}`));
    const referenceTranslations = await loadTranslation(referenceFile);
    
    // Valider chaque fichier
    for (const file of files) {
      const language = path.basename(file, '.json');
      
      // Ignorer le fichier de référence dans la validation
      if (language === PRIMARY_LANGUAGE) {
        continue;
      }
      
      console.log(chalk.blue(`🔍 Validation de ${language}...`));
      const translations = await loadTranslation(file);
      
      const result = validateTranslationFile(translations, referenceTranslations);
      report[language] = result;
      
      // Afficher les résultats pour cette langue
      const { missingKeys, untranslatedKeys, emptyKeys, totalKeys } = result;
      const completionRate = Math.round(((totalKeys - missingKeys.length - untranslatedKeys.length - emptyKeys.length) / totalKeys) * 100);
      
      console.log(chalk.blue(`📊 Statistiques pour ${language}:`));
      console.log(`   Total des clés: ${totalKeys}`);
      console.log(`   Taux de complétion: ${completionRate}%`);
      console.log(`   Clés manquantes: ${missingKeys.length}`);
      console.log(`   Clés non traduites: ${untranslatedKeys.length}`);
      console.log(`   Clés vides: ${emptyKeys.length}`);
      
      // Afficher quelques exemples de clés problématiques
      if (missingKeys.length > 0) {
        console.log(chalk.yellow(`⚠️ Exemple de clés manquantes: ${missingKeys.slice(0, 5).join(', ')}${missingKeys.length > 5 ? '...' : ''}`));
      }
      
      if (untranslatedKeys.length > 0) {
        console.log(chalk.yellow(`⚠️ Exemple de clés non traduites: ${untranslatedKeys.slice(0, 5).join(', ')}${untranslatedKeys.length > 5 ? '...' : ''}`));
      }
    }
    
    return report;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la validation: ${error}`));
    return report;
  }
}

/**
 * Génère un rapport JSON
 */
async function generateValidationReport(report: ValidationReport): Promise<void> {
  try {
    const reportDir = path.resolve(projectRoot);
    const reportPath = path.join(reportDir, 'translation-report.json');
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    
    console.log(chalk.green(`✅ Rapport de validation généré: ${reportPath}`));
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la génération du rapport: ${error}`));
  }
}

/**
 * Interface pour les erreurs de traduction
 */
interface TranslationError {
  type: 'missing' | 'unused' | 'invalid' | 'placeholder';
  key: string;
  file?: string;
  line?: number;
  locale?: string;
  message: string;
}

/**
 * Extraire toutes les clés utilisées dans le code
 */
async function extractUsedKeys(): Promise<Set<string>> {
  const usedKeys = new Set<string>();
  
  // Patterns de détection pour Next.js Intl
  const patterns = [
    // useTranslations('namespace') + t('key')
    /useTranslations\(['"]([\w\.]+)['"]\)/g,
    // t('key') direct
    /\bt\(['"]([\w\.]+)['"]/g,
    // getTranslations('namespace') + t('key')
    /getTranslations\(['"]([\w\.]+)['"]\)/g,
    // formatMessage({ id: 'key' })
    /formatMessage\(\s*\{\s*id:\s*['"]([\w\.]+)['"]/g,
    // FormattedMessage id="key"
    /<FormattedMessage[^>]*id=["']([\w\.]+)["']/g,
  ];

  // Récupérer tous les fichiers source
  const files = await glob('src/**/*.{ts,tsx,js,jsx}', { 
    ignore: ['**/node_modules/**', '**/.next/**'],
    cwd: projectRoot 
  });

  for (const file of files) {
    const filePath = path.resolve(projectRoot, file);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Détecter les namespaces utilisés
      const namespaces = new Set<string>();
      const namespaceMatches = content.matchAll(/useTranslations\(['"]([\w\.]+)['"]\)/g);
      for (const match of namespaceMatches) {
        namespaces.add(match[1]);
      }
      
      // Si pas de namespace explicite, utiliser 'common'
      if (namespaces.size === 0) {
        namespaces.add('common');
      }

      // Extraire les clés
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Chercher les appels t('key')
        const tMatches = line.matchAll(/\bt\(['"]([\w\.]+)['"]/g);
        for (const match of tMatches) {
          const key = match[1];
          
          // Si la clé contient déjà un namespace, l'utiliser directement
          if (key.includes('.')) {
            usedKeys.add(key);
          } else {
            // Sinon, combiner avec tous les namespaces détectés
            for (const ns of namespaces) {
              usedKeys.add(`${ns}.${key}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Impossible de lire le fichier ${file}: ${error}`));
    }
  }

  return usedKeys;
}

/**
 * Charger un fichier de traduction
 */
async function loadTranslationFile(locale: string): Promise<Record<string, any>> {
  const filePath = path.resolve(projectRoot, 'src/messages', `${locale}.json`);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Impossible de charger le fichier de traduction pour ${locale}: ${error}`);
  }
}

/**
 * Extraire toutes les clés d'un objet de traduction de manière récursive
 */
function extractTranslationKeys(obj: Record<string, any>, prefix = ''): Set<string> {
  const keys = new Set<string>();
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      // Récursion pour les objets imbriqués
      const nestedKeys = extractTranslationKeys(value, fullKey);
      for (const nestedKey of nestedKeys) {
        keys.add(nestedKey);
      }
    } else {
      // Clé finale
      keys.add(fullKey);
    }
  }
  
  return keys;
}

/**
 * Valider les traductions pour une langue
 */
async function validateLocale(locale: string, usedKeys: Set<string>): Promise<TranslationError[]> {
  const errors: TranslationError[] = [];
  
  try {
    const translations = await loadTranslationFile(locale);
    const availableKeys = extractTranslationKeys(translations);
    
    // Chercher les clés manquantes
    for (const usedKey of usedKeys) {
      if (!availableKeys.has(usedKey)) {
        errors.push({
          type: 'missing',
          key: usedKey,
          locale,
          message: `Clé de traduction manquante: ${usedKey}`,
        });
      }
    }
    
    // Chercher les clés inutilisées (optionnel)
    if (options.verbose) {
      for (const availableKey of availableKeys) {
        if (!usedKeys.has(availableKey)) {
          errors.push({
            type: 'unused',
            key: availableKey,
            locale,
            message: `Clé de traduction non utilisée: ${availableKey}`,
          });
        }
      }
    }
    
    // Vérifier les valeurs vides ou invalides
    for (const [key, value] of Object.entries(translations)) {
      if (typeof value === 'string' && value.trim() === '') {
        errors.push({
          type: 'invalid',
          key,
          locale,
          message: `Valeur de traduction vide: ${key}`,
        });
      }
    }
    
  } catch (error) {
    errors.push({
      type: 'invalid',
      key: 'file',
      locale,
      message: `Erreur lors du chargement du fichier de traduction: ${error}`,
    });
  }
  
  return errors;
}

/**
 * Corriger automatiquement les erreurs de traduction
 */
async function fixTranslationErrors(errors: TranslationError[]): Promise<void> {
  const errorsByLocale = new Map<string, TranslationError[]>();
  
  // Grouper les erreurs par langue
  for (const error of errors) {
    if (error.type === 'missing' && error.locale) {
      if (!errorsByLocale.has(error.locale)) {
        errorsByLocale.set(error.locale, []);
      }
      errorsByLocale.get(error.locale)!.push(error);
    }
  }
  
  // Corriger chaque fichier de langue
  for (const [locale, localeErrors] of errorsByLocale) {
    try {
      const translations = await loadTranslationFile(locale);
      let modified = false;
      
      for (const error of localeErrors) {
        if (error.type === 'missing') {
          // Ajouter la clé manquante avec une valeur par défaut
          const keyParts = error.key.split('.');
          let current = translations;
          
          // Naviguer/créer la structure imbriquée
          for (let i = 0; i < keyParts.length - 1; i++) {
            const part = keyParts[i];
            if (!current[part] || typeof current[part] !== 'object') {
              current[part] = {};
            }
            current = current[part];
          }
          
          // Ajouter la clé finale
          const finalKey = keyParts[keyParts.length - 1];
          if (!current[finalKey]) {
            current[finalKey] = `[À TRADUIRE] ${error.key}`;
            modified = true;
            console.log(chalk.green(`➕ Ajout de la clé manquante: ${error.key}`));
          }
        }
      }
      
      // Sauvegarder le fichier modifié
      if (modified) {
        const filePath = path.resolve(projectRoot, 'src/messages', `${locale}.json`);
        await fs.writeFile(filePath, JSON.stringify(translations, null, 2) + '\n', 'utf-8');
        console.log(chalk.green(`✅ Fichier ${locale}.json mis à jour`));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Erreur lors de la correction pour ${locale}: ${error}`));
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log(chalk.blue('🔍 Validation des traductions...'));
  
  try {
    // Extraire les clés utilisées dans le code
    console.log(chalk.blue('📝 Extraction des clés utilisées...'));
    const usedKeys = await extractUsedKeys();
    console.log(chalk.green(`✅ ${usedKeys.size} clés trouvées dans le code`));
    
    if (options.verbose) {
      console.log(chalk.blue('📋 Exemples de clés utilisées:'));
      const examples = Array.from(usedKeys).slice(0, 10);
      examples.forEach(key => console.log(`   - ${key}`));
    }
    
    // Déterminer les langues à valider
    const locales = options.locale ? [options.locale] : ['fr', 'en'];
    
    // Valider chaque langue
    const allErrors: TranslationError[] = [];
    
    for (const locale of locales) {
      console.log(chalk.blue(`🔍 Validation de la langue: ${locale}`));
      const errors = await validateLocale(locale, usedKeys);
      allErrors.push(...errors);
      
      if (errors.length === 0) {
        console.log(chalk.green(`✅ Aucune erreur trouvée pour ${locale}`));
      } else {
        console.log(chalk.yellow(`⚠️ ${errors.length} erreur(s) trouvée(s) pour ${locale}`));
        
        if (options.verbose) {
          errors.forEach(error => {
            const icon = error.type === 'missing' ? '❌' : 
                        error.type === 'unused' ? '⚠️' : '🔍';
            console.log(`   ${icon} ${error.message}`);
          });
        }
      }
    }
    
    // Résumé des erreurs
    if (allErrors.length > 0) {
      console.log(chalk.yellow('\n📊 Résumé des erreurs:'));
      
      const errorsByType = new Map<string, number>();
      for (const error of allErrors) {
        errorsByType.set(error.type, (errorsByType.get(error.type) || 0) + 1);
      }
      
      for (const [type, count] of errorsByType) {
        const typeLabel = {
          missing: 'Clés manquantes',
          unused: 'Clés inutilisées',
          invalid: 'Valeurs invalides',
          placeholder: 'Placeholders'
        }[type] || type;
        
        console.log(`   ${typeLabel}: ${count}`);
      }
      
      // Correction automatique si demandée
      if (options.fix) {
        console.log(chalk.blue('\n🔧 Correction automatique...'));
        await fixTranslationErrors(allErrors);
      } else {
        console.log(chalk.blue('\n💡 Utilisez --fix pour corriger automatiquement les clés manquantes'));
      }
      
      process.exit(1);
    } else {
      console.log(chalk.green('\n✅ Toutes les traductions sont valides !'));
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la validation: ${error}`));
    process.exit(1);
  }
}

// Exécuter le script
main().catch(error => {
  console.error(chalk.red(`❌ Erreur non gérée: ${error}`));
  process.exit(1);
});

export { validateAllTranslations, generateValidationReport }; 