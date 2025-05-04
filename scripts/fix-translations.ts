/**
 * Script pour corriger les traductions manquantes ou incorrectes
 * Usage : pnpm tsx scripts/fix-translations.ts
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const MESSAGES_DIR = path.join(process.cwd(), 'src', 'messages');
const SOURCE_LOCALE = 'en';
const TARGET_LOCALES = ['fr'];

/**
 * Vérifie si une valeur est un objet
 */
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Convertit une valeur de traduction en format correct
 */
function cleanTranslationValue(value: string): string {
  // Si la valeur est au format [fr] quelque chose ou [en] quelque chose
  if (typeof value === 'string' && (value.startsWith('[fr] ') || value.startsWith('[en] '))) {
    return value.substring(5);
  }
  return value;
}

/**
 * Corrige récursivement les traductions dans un objet
 */
function fixTranslations(obj: any, path = ''): any {
  if (!isObject(obj)) {
    return obj;
  }

  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (isObject(value)) {
      result[key] = fixTranslations(value, currentPath);
    } else if (typeof value === 'string') {
      const cleanValue = cleanTranslationValue(value);
      result[key] = cleanValue;
      
      // Afficher les corrections
      if (cleanValue !== value) {
        console.log(chalk.green(`Correction: ${currentPath} = ${chalk.yellow(value)} → ${chalk.blue(cleanValue)}`));
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Fonction principale
 */
async function main() {
  console.log(chalk.blue('Début de la correction des fichiers de traduction...'));

  // Parcourir les locales cibles
  for (const locale of TARGET_LOCALES) {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    console.log(chalk.yellow(`Traitement du fichier: ${filePath}`));

    try {
      // Lire le fichier JSON
      const content = fs.readFileSync(filePath, 'utf8');
      const translations = JSON.parse(content);

      // Corriger les traductions
      const fixedTranslations = fixTranslations(translations);

      // Sauvegarder le résultat
      const output = JSON.stringify(fixedTranslations, null, 2);
      fs.writeFileSync(filePath, output);

      console.log(chalk.green(`Fichier ${locale}.json mis à jour avec succès.`));
    } catch (error) {
      console.error(chalk.red(`Erreur lors du traitement de ${filePath}:`), error);
    }
  }

  console.log(chalk.blue('Correction terminée.'));
}

// Exécuter le script
main().catch(error => {
  console.error(chalk.red('Erreur lors de l\'exécution du script:'), error);
  process.exit(1);
}); 