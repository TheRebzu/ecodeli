#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { generateEnglishTranslation, translateToAllLanguages, checkTranslationAPIAvailability } from './translation-api';
import { glob } from 'glob';
import config from './extraction.config';

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Langues supportées (à étendre selon vos besoins)
const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'it'];
const PRIMARY_LANGUAGE = 'fr'; // Langue source principale

interface TranslationEntry {
  key: string;
  path: string[];
  value: string;
  isObject: boolean;
}

/**
 * Extrait les entrées de traduction d'un objet imbriqué
 */
function extractEntriesFromObject(obj: any, path: string[] = []): TranslationEntry[] {
  if (!obj || typeof obj !== 'object') {
    return [];
  }

  const entries: TranslationEntry[] = [];

  for (const key in obj) {
    const value = obj[key];
    const newPath = [...path, key];

    if (value !== null && typeof value === 'object') {
      // Ajouter l'entrée pour l'objet lui-même
      entries.push({
        key,
        path,
        value: key,
        isObject: true,
      });

      // Récursion pour les sous-objets
      entries.push(...extractEntriesFromObject(value, newPath));
    } else {
      // Entrée simple
      entries.push({
        key,
        path,
        value: value as string,
        isObject: false,
      });
    }
  }

  return entries;
}

/**
 * Récupère tous les fichiers de traduction dans le répertoire de messages
 */
async function findTranslationFiles(): Promise<string[]> {
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
 * Construit un chemin complet pour une clé de traduction
 */
function buildTranslationKey(pathArray: string[], key: string): string {
  return [...pathArray, key].join('.');
}

/**
 * Met à jour une valeur dans un objet imbriqué en suivant un chemin
 */
function setNestedValue(obj: any, path: string[], key: string, value: any): void {
  let current = obj;

  // Naviguer dans l'arborescence
  for (const segment of path) {
    if (!current[segment]) {
      current[segment] = {};
    }
    current = current[segment];
  }

  // Définir la valeur
  current[key] = value;
}

/**
 * Charge un fichier de traduction
 */
async function loadTranslationFile(filePath: string): Promise<any> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors du chargement du fichier ${filePath}: ${error}`));
    return {};
  }
}

/**
 * Sauvegarde un objet de traduction dans un fichier
 */
async function saveTranslationFile(filePath: string, translations: any): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(translations, null, 2), 'utf-8');
    console.log(chalk.green(`✅ Fichier de traduction sauvegardé: ${filePath}`));
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la sauvegarde du fichier ${filePath}: ${error}`));
  }
}

/**
 * Génère les traductions pour toutes les langues supportées
 */
async function generateAllTranslations(): Promise<void> {
  console.log(chalk.blue('🚀 Génération des traductions pour toutes les langues...'));

  try {
    // Vérifier la disponibilité des API de traduction
    const apiStatus = checkTranslationAPIAvailability();
    console.log(chalk.blue(`ℹ️ ${apiStatus.message}`));

    // Trouver tous les fichiers de traduction
    const translationFiles = await findTranslationFiles();
    if (translationFiles.length === 0) {
      console.error(chalk.red('❌ Aucun fichier de traduction trouvé dans src/messages/'));
      return;
    }

    // Identifier le fichier de langue principale
    const primaryFile = translationFiles.find(file => path.basename(file) === `${PRIMARY_LANGUAGE}.json`);
    if (!primaryFile) {
      console.error(chalk.red(`❌ Fichier de langue principale ${PRIMARY_LANGUAGE}.json non trouvé`));
      return;
    }

    // Charger les traductions principales
    console.log(chalk.blue(`📚 Chargement du fichier source: ${primaryFile}`));
    const primaryTranslations = await loadTranslationFile(primaryFile);

    // Extraire les entrées à traduire
    const entries = extractEntriesFromObject(primaryTranslations);
    console.log(chalk.blue(`🔍 ${entries.length} entrées trouvées à traduire`));

    // Préparer le répertoire pour les traductions
    const messagesDir = path.resolve(projectRoot, 'src/messages');
    await fs.mkdir(messagesDir, { recursive: true });

    // Pour chaque langue supportée (sauf la langue principale)
    for (const language of SUPPORTED_LANGUAGES) {
      if (language === PRIMARY_LANGUAGE) continue;

      const targetFile = path.join(messagesDir, `${language}.json`);
      console.log(chalk.blue(`🔄 Mise à jour des traductions pour ${language}...`));

      // Charger les traductions existantes
      let existingTranslations = {};
      try {
        existingTranslations = await loadTranslationFile(targetFile);
      } catch (error) {
        console.log(chalk.yellow(`⚠️ Aucun fichier existant pour ${language}, création d'un nouveau fichier`));
      }

      // Traduire les entrées non-objets
      let updated = 0;
      const entriesToTranslate = entries.filter(entry => !entry.isObject);
      const totalEntries = entriesToTranslate.length;

      console.log(chalk.blue(`🔄 Traduction de ${totalEntries} entrées pour ${language}...`));

      // Traiter par lots pour éviter de surcharger les API
      const batchSize = 50;
      for (let i = 0; i < entriesToTranslate.length; i += batchSize) {
        const batch = entriesToTranslate.slice(i, i + batchSize);
        const progressPercent = Math.round((i / totalEntries) * 100);
        console.log(chalk.blue(`🔄 Traduction du lot ${i}-${i + batch.length} (${progressPercent}%)...`));

        // Traiter chaque entrée du lot
        for (const entry of batch) {
          const fullKey = buildTranslationKey(entry.path, entry.key);
          
          // Vérifier si la traduction existe déjà et si elle doit être mise à jour
          let existingValue = getNestedValue(existingTranslations, entry.path, entry.key);
          
          // Si la traduction n'existe pas ou doit être mise à jour (commence par [TO_TRANSLATE])
          if (existingValue === undefined || 
              existingValue === null || 
              (typeof existingValue === 'string' && existingValue.startsWith('[TO_TRANSLATE]'))) {
            
            try {
              // Traduire depuis la langue principale
              const translatedValue = await generateEnglishTranslation(entry.value);
              
              // Mettre à jour la traduction
              setNestedValue(existingTranslations, entry.path, entry.key, translatedValue);
              updated++;
              
              // Afficher un état d'avancement périodique
              if (updated % 10 === 0) {
                console.log(chalk.green(`✅ ${updated}/${totalEntries} entrées traduites pour ${language}`));
              }
            } catch (error) {
              console.error(chalk.red(`❌ Erreur lors de la traduction de "${fullKey}": ${error}`));
              setNestedValue(existingTranslations, entry.path, entry.key, `[TRANSLATION_ERROR] ${entry.value}`);
            }
          }
        }
      }

      // Sauvegarder les traductions mises à jour
      await saveTranslationFile(targetFile, existingTranslations);
      console.log(chalk.green(`✅ ${updated} entrées mises à jour pour ${language}`));
    }

    console.log(chalk.green('✅ Génération des traductions terminée avec succès'));
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la génération des traductions: ${error}`));
  }
}

/**
 * Récupère une valeur dans un objet imbriqué en suivant un chemin
 */
function getNestedValue(obj: any, path: string[], key: string): any {
  let current = obj;

  // Naviguer dans l'arborescence
  for (const segment of path) {
    if (!current[segment]) {
      return undefined;
    }
    current = current[segment];
  }

  // Retourner la valeur
  return current[key];
}

/**
 * Fonction principale
 */
async function main() {
  console.log(chalk.blue('🌐 Démarrage de la génération des traductions...'));
  
  try {
    await generateAllTranslations();
  } catch (error) {
    console.error(chalk.red(`❌ Erreur non gérée: ${error}`));
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(chalk.red(`❌ Erreur fatale: ${error}`));
    process.exit(1);
  });
}

export { generateAllTranslations }; 