#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { program } from 'commander';
import { execSync } from 'child_process';
import readline from 'readline';
import { glob } from 'glob';
import { translateToAllLanguages } from './translation-api';

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Langues déjà supportées
const CURRENT_LANGUAGES = ['fr', 'en', 'es', 'de', 'it'];
const PRIMARY_LANGUAGE = 'fr';

// Correspondance entre codes ISO et noms des langues
const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  ru: 'Русский',
  ar: 'العربية',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
};

// Options de la ligne de commande
program
  .argument('[langCode]', 'Code ISO de la langue à ajouter (ex: "es" pour espagnol)')
  .option('-f, --force', 'Forcer l\'ajout même si la langue existe déjà')
  .option('-t, --translate', 'Traduire automatiquement les chaînes depuis la langue principale')
  .option('-n, --no-update', 'Ne pas mettre à jour le fichier de routing.ts')
  .parse(process.argv);

const options = program.opts();
let langCode = program.args[0]?.toLowerCase();

/**
 * Crée une interface pour l'entrée utilisateur
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Demande à l'utilisateur de fournir un code de langue
 */
async function askForLanguageCode(): Promise<string> {
  const rl = createInterface();
  
  return new Promise((resolve) => {
    rl.question(chalk.blue('🌐 Entrez le code ISO de la langue à ajouter (ex: "es" pour espagnol): '), (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

/**
 * Demande à l'utilisateur de confirmer une action
 */
async function confirm(message: string): Promise<boolean> {
  const rl = createInterface();
  
  return new Promise((resolve) => {
    rl.question(`${message} (o/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'o' || answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Vérifie si une langue est déjà supportée
 */
function isLanguageSupported(code: string): boolean {
  return CURRENT_LANGUAGES.includes(code);
}

/**
 * Récupère le nom de la langue à partir du code ISO
 */
function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

/**
 * Met à jour le fichier de routage i18n
 */
async function updateRoutingFile(langCode: string): Promise<void> {
  const routingFilePath = path.resolve(projectRoot, 'src/i18n/routing.ts');
  
  try {
    // Lire le fichier de routage actuel
    const content = await fs.readFile(routingFilePath, 'utf-8');
    
    // Vérifier si la langue est déjà présente
    if (content.includes(`['${langCode}'`) || content.includes(`["${langCode}"`)) {
      console.log(chalk.yellow(`⚠️ La langue '${langCode}' est déjà présente dans le fichier de routage.`));
      return;
    }
    
    // Mettre à jour la liste des langues supportées
    const updatedContent = content.replace(
      /(locales:\s*\[)([^\]]+)(\])/,
      (match, prefix, locales, suffix) => {
        // Ajouter la nouvelle langue à la liste
        const updatedLocales = locales.includes(langCode) ? 
          locales : 
          `${locales}${locales.trim().endsWith(',') ? ' ' : ', '}'${langCode}'`;
        
        return `${prefix}${updatedLocales}${suffix}`;
      }
    );
    
    // Sauvegarder le fichier mis à jour
    await fs.writeFile(routingFilePath, updatedContent, 'utf-8');
    console.log(chalk.green(`✅ Fichier de routage mis à jour: ${routingFilePath}`));
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la mise à jour du fichier de routage: ${error}`));
    throw error;
  }
}

/**
 * Crée un nouveau fichier de traduction
 */
async function createLanguageFile(langCode: string, translate: boolean = false): Promise<void> {
  const messagesDir = path.resolve(projectRoot, 'src/messages');
  const sourceFilePath = path.resolve(messagesDir, `${PRIMARY_LANGUAGE}.json`);
  const targetFilePath = path.resolve(messagesDir, `${langCode}.json`);
  
  try {
    // Vérifier si le répertoire existe
    await fs.mkdir(messagesDir, { recursive: true });
    
    // Vérifier si le fichier source existe
    let sourceContent;
    try {
      sourceContent = await fs.readFile(sourceFilePath, 'utf-8');
    } catch (error) {
      console.error(chalk.red(`❌ Fichier source non trouvé: ${sourceFilePath}`));
      throw new Error(`Fichier source ${PRIMARY_LANGUAGE}.json non trouvé.`);
    }
    
    // Vérifier si le fichier cible existe déjà
    try {
      await fs.access(targetFilePath);
      
      // Si le fichier existe et --force n'est pas spécifié
      if (!options.force) {
        const shouldOverwrite = await confirm(chalk.yellow(`⚠️ Le fichier pour ${langCode} existe déjà. Voulez-vous l'écraser?`));
        
        if (!shouldOverwrite) {
          console.log(chalk.blue('ℹ️ Opération annulée.'));
          return;
        }
      }
    } catch (error) {
      // Le fichier n'existe pas, c'est normal
    }
    
    // Charger le fichier source
    const sourceTranslations = JSON.parse(sourceContent);
    
    let targetTranslations: any;
    
    if (translate) {
      console.log(chalk.blue(`🔄 Traduction automatique du contenu vers ${langCode}...`));
      
      // Créer une version plate des traductions pour optimiser la traduction
      const flatTranslations: Record<string, string> = {};
      flattenObject(sourceTranslations, '', flatTranslations);
      
      // Traduire toutes les valeurs
      const translatedFlat: Record<string, string> = {};
      
      // Traiter par lots pour éviter de surcharger les API
      const keys = Object.keys(flatTranslations);
      const batchSize = 20;
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batchKeys = keys.slice(i, i + batchSize);
        const progressPercent = Math.round((i / keys.length) * 100);
        
        console.log(chalk.blue(`🔄 Traduction du lot ${i}-${i + batchKeys.length} (${progressPercent}%)...`));
        
        for (const key of batchKeys) {
          const sourceValue = flatTranslations[key];
          try {
            // Traduire la valeur
            const translations = await translateToAllLanguages(sourceValue, PRIMARY_LANGUAGE, [langCode]);
            translatedFlat[key] = translations[langCode] || `[TO_TRANSLATE] ${sourceValue}`;
          } catch (error) {
            console.error(chalk.red(`❌ Erreur lors de la traduction de "${key}": ${error}`));
            translatedFlat[key] = `[TRANSLATION_ERROR] ${sourceValue}`;
          }
        }
      }
      
      // Reconstruire l'objet traduit
      targetTranslations = {};
      for (const key in translatedFlat) {
        setNestedValue(targetTranslations, key.split('.'), translatedFlat[key]);
      }
    } else {
      // Créer une version non traduite (TO_TRANSLATE)
      targetTranslations = JSON.parse(JSON.stringify(sourceTranslations));
      markForTranslation(targetTranslations);
    }
    
    // Mise à jour des informations spécifiques à la langue
    if (targetTranslations.common && targetTranslations.common.languages) {
      // Mettre à jour le nom de la langue
      if (targetTranslations.common.languageName) {
        targetTranslations.common.languageName = getLanguageName(langCode);
      }
      
      // S'assurer que toutes les langues sont correctement nommées
      for (const code in LANGUAGE_NAMES) {
        if (langCode === code) {
          // Pour la langue courante, utiliser le nom natif
          targetTranslations.common.languages[code] = LANGUAGE_NAMES[code];
        } else if (targetTranslations.common.languages[code]) {
          // Pour les autres langues, utiliser la traduction standard (ou garder l'existant)
          targetTranslations.common.languages[code] = targetTranslations.common.languages[code];
        }
      }
    }
    
    // Sauvegarder le fichier cible
    await fs.writeFile(targetFilePath, JSON.stringify(targetTranslations, null, 2), 'utf-8');
    
    console.log(chalk.green(`✅ Fichier de traduction créé pour ${langCode}: ${targetFilePath}`));
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la création du fichier de traduction: ${error}`));
    throw error;
  }
}

/**
 * Aplatit un objet imbriqué
 */
function flattenObject(obj: any, prefix: string = '', result: Record<string, string> = {}): Record<string, string> {
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      flattenObject(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
}

/**
 * Définit une valeur dans un objet imbriqué
 */
function setNestedValue(obj: any, path: string[], value: any): void {
  let current = obj;
  
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }
  
  const lastKey = path[path.length - 1];
  current[lastKey] = value;
}

/**
 * Marque récursivement les valeurs pour traduction
 */
function markForTranslation(obj: any): void {
  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null) {
      markForTranslation(value);
    } else if (typeof value === 'string') {
      obj[key] = `[TO_TRANSLATE] ${value}`;
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    console.log(chalk.blue('🌐 Ajout d\'une nouvelle langue au système de traduction...'));
    
    // Si aucun code de langue n'est fourni, demander à l'utilisateur
    if (!langCode) {
      langCode = await askForLanguageCode();
    }
    
    // Valider le code de langue
    if (!langCode || langCode.length < 2) {
      console.error(chalk.red('❌ Code de langue invalide. Utilisez un code ISO valide (ex: "es" pour espagnol).'));
      process.exit(1);
    }
    
    // Vérifier si la langue est déjà supportée
    if (isLanguageSupported(langCode) && !options.force) {
      const shouldContinue = await confirm(chalk.yellow(`⚠️ La langue '${langCode}' est déjà supportée. Voulez-vous continuer?`));
      
      if (!shouldContinue) {
        console.log(chalk.blue('ℹ️ Opération annulée.'));
        process.exit(0);
      }
    }
    
    // Créer le fichier de traduction pour la nouvelle langue
    await createLanguageFile(langCode, options.translate);
    
    // Mettre à jour le fichier de routage si nécessaire
    if (options.update) {
      await updateRoutingFile(langCode);
    }
    
    // Exécuter la validation
    console.log(chalk.blue('🔍 Exécution de la validation des traductions...'));
    try {
      execSync('npx tsx scripts/i18n/run-validation.ts', { stdio: 'inherit' });
    } catch (error) {
      console.warn(chalk.yellow('⚠️ La validation a échoué mais le processus d\'ajout est terminé.'));
    }
    
    console.log(chalk.green(`✅ Langue ${langCode} (${getLanguageName(langCode)}) ajoutée avec succès!`));
    console.log(chalk.blue('\nProchaines étapes:'));
    console.log(`1. Vérifiez le fichier src/messages/${langCode}.json pour compléter les traductions manquantes.`);
    console.log('2. Exécutez npm run i18n:validate pour vérifier la qualité des traductions.');
    console.log('3. Relancez l\'application pour voir les changements.');
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de l'ajout de la langue: ${error}`));
    process.exit(1);
  }
}

// Exécuter le script
main().catch(error => {
  console.error(chalk.red(`❌ Erreur non gérée: ${error}`));
  process.exit(1);
}); 