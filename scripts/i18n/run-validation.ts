#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import config from './extraction.config';
import { fileURLToPath } from 'url';

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Charge un fichier de traduction
 */
async function loadTranslationFile(language: string): Promise<Record<string, any>> {
  const filePath = path.join(config.extraction.outputDir, `${language}.json`);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors du chargement du fichier de traduction ${language}: ${error}`));
    return {};
  }
}

/**
 * Transforme un objet imbriqué en paires clé-valeur à plat
 */
function flattenObject(obj: Record<string, any>, prefix: string = ''): Record<string, string> {
  return Object.keys(obj).reduce((acc: Record<string, string>, key: string) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(acc, flattenObject(obj[key], prefixedKey));
    } else {
      acc[prefixedKey] = obj[key];
    }
    
    return acc;
  }, {});
}

/**
 * Vérifie la cohérence des traductions
 */
async function validateTranslations() {
  try {
    console.log(chalk.blue('🔍 Vérification de la cohérence des traductions...'));
    
    // Charger les fichiers de traduction
    const { sourceLanguage, supportedLanguages } = config.languages;
    const source = await loadTranslationFile(sourceLanguage);
    const languages: Record<string, Record<string, any>> = {};
    
    // Charger les fichiers de traduction de toutes les langues
    for (const lang of supportedLanguages) {
      languages[lang] = await loadTranslationFile(lang);
    }
    
    // Aplatir les objets pour faciliter la comparaison
    const flatSource = flattenObject(source);
    const flatLanguages: Record<string, Record<string, string>> = {};
    
    for (const lang of supportedLanguages) {
      flatLanguages[lang] = flattenObject(languages[lang]);
    }
    
    // Vérifier les clés manquantes et les valeurs non traduites
    let hasErrors = false;
    let hasWarnings = false;
    
    for (const lang of supportedLanguages) {
      if (lang === sourceLanguage) continue;
      
      console.log(chalk.blue(`\n📋 Vérification des traductions pour ${lang}:`));
      
      const flatLang = flatLanguages[lang];
      let missingKeys = 0;
      let untranslatedKeys = 0;
      
      // Vérifier les clés manquantes
      for (const key in flatSource) {
        if (!flatLang[key]) {
          console.log(chalk.red(`❌ Clé manquante: ${key}`));
          missingKeys++;
          hasErrors = true;
        } else if (flatLang[key] === flatSource[key] && lang !== sourceLanguage) {
          console.log(chalk.yellow(`⚠️ Valeur non traduite: ${key} = "${flatLang[key]}"`));
          untranslatedKeys++;
          hasWarnings = true;
        } else if (flatLang[key].includes('[TO_TRANSLATE]')) {
          console.log(chalk.yellow(`⚠️ Traduction automatique non vérifiée: ${key} = "${flatLang[key]}"`));
          untranslatedKeys++;
          hasWarnings = true;
        }
      }
      
      // Vérifier les clés orphelines (présentes dans la traduction mais pas dans la source)
      let orphanedKeys = 0;
      for (const key in flatLang) {
        if (!flatSource[key]) {
          console.log(chalk.yellow(`⚠️ Clé orpheline: ${key} = "${flatLang[key]}"`));
          orphanedKeys++;
          hasWarnings = true;
        }
      }
      
      // Afficher le rapport pour cette langue
      console.log(chalk.blue(`\n📊 Statistiques pour ${lang}:`));
      console.log(`Total des clés source: ${Object.keys(flatSource).length}`);
      console.log(`Total des clés cible: ${Object.keys(flatLang).length}`);
      console.log(`Clés manquantes: ${missingKeys}`);
      console.log(`Clés non traduites: ${untranslatedKeys}`);
      console.log(`Clés orphelines: ${orphanedKeys}`);
    }
    
    // Conclusion
    if (hasErrors) {
      console.log(chalk.red('\n❌ Des problèmes critiques ont été détectés.'));
      if (process.argv.includes('--strict')) {
        process.exit(1);
      }
    } else if (hasWarnings) {
      console.log(chalk.yellow('\n⚠️ Des avertissements ont été détectés, mais aucun problème critique.'));
    } else {
      console.log(chalk.green('\n✅ Les traductions sont cohérentes!'));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la validation des traductions: ${error}`));
    process.exit(1);
  }
}

// Exécuter la validation
validateTranslations(); 