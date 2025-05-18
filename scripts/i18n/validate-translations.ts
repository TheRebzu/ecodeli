#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import config from './extraction.config';

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Langues supportées 
const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'it'];
const PRIMARY_LANGUAGE = 'fr';

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
 * Fonction principale
 */
async function main() {
  console.log(chalk.blue('🚀 Début de la validation des traductions...'));
  
  try {
    const report = await validateAllTranslations();
    await generateValidationReport(report);
    
    // Vérifier s'il y a des problèmes critiques
    let hasErrors = false;
    
    for (const language in report) {
      const { missingKeys, untranslatedKeys } = report[language];
      
      if (missingKeys.length > 0 || untranslatedKeys.length > 0) {
        hasErrors = true;
        break;
      }
    }
    
    if (hasErrors) {
      console.warn(chalk.yellow('⚠️ Des problèmes ont été détectés dans les traductions. Consultez le rapport pour plus de détails.'));
    } else {
      console.log(chalk.green('✅ Validation terminée avec succès. Aucun problème critique détecté.'));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la validation: ${error}`));
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(chalk.red(`❌ Erreur non gérée: ${error}`));
    process.exit(1);
  });
}

export { validateAllTranslations, generateValidationReport }; 