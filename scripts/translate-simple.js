#!/usr/bin/env node

// Modernisation du script avec ESM et améliorations pour détecter les clés manquantes
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { globSync } from 'glob';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Charger les variables d'environnement
dotenv.config();

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyAjs1K5NQH3Um2gb97fry6elOyHcC5gya4';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../src');
const MESSAGES_DIR = path.resolve(__dirname, '../src/messages');

/**
 * Vérifie si une clé existe dans un objet imbriqué en suivant un chemin au format dot notation
 */
function keyExists(obj, path) {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (
      current === undefined ||
      current === null ||
      !Object.prototype.hasOwnProperty.call(current, part)
    ) {
      return false;
    }
    current = current[part];
  }

  return true;
}

/**
 * Extrait les textes par regex et les clés d'i18n depuis le fichier
 */
function extractTextsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const texts = [];

    // Extraire les textes JSX entre les balises
    const jsxRegex = />([^<>{}]+)</g;
    let match;
    while ((match = jsxRegex.exec(content)) !== null) {
      const text = match[1].trim();
      if (text && text.length > 1 && /[A-Za-z]/.test(text)) {
        texts.push(text);
      }
    }

    // Extraire les chaînes entre guillemets pour les attributs
    const attributeRegex = /(title|label|placeholder|description|message)=["']([^"']+)["']/g;
    while ((match = attributeRegex.exec(content)) !== null) {
      const text = match[2].trim();
      if (text && text.length > 1 && /[A-Za-z]/.test(text)) {
        texts.push(text);
      }
    }

    // Extraire les clés de traduction utilisées avec useTranslations
    const i18nUsageRegex =
      /(?:useTranslations|t)\(['"]([^'"]+)['"]\)(?:\.(\w+)|(?:\(['"]([^'"]+)['"]\)))?/g;
    let i18nMatch;
    while ((i18nMatch = i18nUsageRegex.exec(content)) !== null) {
      const namespace = i18nMatch[1];
      const key = i18nMatch[2] || i18nMatch[3] || '';
      if (namespace) {
        const fullKey = key ? `${namespace}.${key}` : namespace;
        texts.push({ key: fullKey, isI18nKey: true });
      }
    }

    return texts;
  } catch (error) {
    console.error(`Erreur lors de la lecture du fichier ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Traduit un texte vers le français
 */
async function translateText(text) {
  try {
    console.log(`Traduction de: "${text}"`);
    const response = await axios.get('https://translation.googleapis.com/language/translate/v2', {
      params: {
        q: text,
        target: 'fr',
        source: 'en',
        key: GOOGLE_API_KEY,
        format: 'text',
      },
    });

    if (
      response.data &&
      response.data.data &&
      response.data.data.translations &&
      response.data.data.translations.length > 0
    ) {
      return response.data.data.translations[0].translatedText;
    } else {
      console.error('Format de réponse inattendu:', response.data);
      return text;
    }
  } catch (error) {
    console.error('Erreur de traduction:', error.message);
    return text;
  }
}

/**
 * Génère une clé à partir d'un texte
 */
function generateKeyFromText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 40);
}

/**
 * Obtenir une valeur dans un objet imbriqué en utilisant un chemin en dot notation
 */
function getValueByPath(obj, path) {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Définir une valeur dans un objet imbriqué en utilisant un chemin en dot notation
 */
function setValueByPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!Object.prototype.hasOwnProperty.call(current, part) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Vérifie les clés manquantes dans les fichiers de traduction
 */
function checkMissingTranslationKeys(enMessages, frMessages) {
  const missingKeys = [];

  function traverse(obj, currentPath = '') {
    for (const key in obj) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key], newPath);
      } else {
        if (!keyExists(frMessages, newPath)) {
          missingKeys.push(newPath);
        }
      }
    }
  }

  traverse(enMessages);
  return missingKeys;
}

/**
 * Traduit et ajoute les clés manquantes à la traduction française
 */
async function addMissingKeys(enMessages, frMessages, missingKeys) {
  for (const key of missingKeys) {
    const enValue = getValueByPath(enMessages, key);
    if (typeof enValue === 'string') {
      console.log(`Traduction de la clé manquante: ${key}`);
      const frValue = await translateText(enValue);
      setValueByPath(frMessages, key, frValue);
      console.log(`Ajout de la traduction: ${key} => "${frValue}"`);
    }
  }
  return frMessages;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🌐 Démarrage du processus de traduction...');

  // Vérifier si le répertoire des messages existe
  if (!fs.existsSync(MESSAGES_DIR)) {
    fs.mkdirSync(MESSAGES_DIR, { recursive: true });
  }

  // Charger les traductions existantes
  let enTranslations = { common: {} };
  let frTranslations = { common: {} };

  try {
    enTranslations = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'en.json'), 'utf8'));
    frTranslations = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'fr.json'), 'utf8'));
    console.log('Fichiers de traduction existants chargés');
  } catch {
    console.log('Aucun fichier de traduction existant trouvé, création de nouveaux fichiers');
  }

  // Trouver tous les fichiers de composants React
  const files = globSync(`${ROOT_DIR}/**/*.{tsx,jsx}`, {
    ignore: ['**/node_modules/**', '**/.next/**'],
  });

  console.log(`${files.length} fichiers de composants trouvés`);

  // Extraire tous les textes
  const allTexts = [];
  const allI18nKeys = new Set();

  for (const file of files) {
    const extracted = extractTextsFromFile(file);
    if (extracted.length > 0) {
      console.log(`Extrait ${extracted.length} éléments de ${path.relative(ROOT_DIR, file)}`);

      for (const item of extracted) {
        if (typeof item === 'object' && item.isI18nKey) {
          allI18nKeys.add(item.key);
        } else {
          allTexts.push(item);
        }
      }
    }
  }

  // Vérifier les clés d'i18n pour s'assurer qu'elles existent dans les traductions
  console.log(`${allI18nKeys.size} clés de traduction utilisées trouvées`);
  const missingKeysInTranslations = [];

  for (const key of allI18nKeys) {
    if (!keyExists(enTranslations, key)) {
      missingKeysInTranslations.push(key);
    }
  }

  if (missingKeysInTranslations.length > 0) {
    console.log(
      `⚠️ ${missingKeysInTranslations.length} clés utilisées dans le code mais manquantes dans les traductions :`
    );
    missingKeysInTranslations.forEach(key => console.log(`  - ${key}`));
  }

  // Vérifier les clés manquantes entre les traductions EN et FR
  console.log('Vérification des clés manquantes entre en.json et fr.json...');
  const missingKeysInFrench = checkMissingTranslationKeys(enTranslations, frTranslations);

  if (missingKeysInFrench.length > 0) {
    console.log(`⚠️ ${missingKeysInFrench.length} clés manquantes dans fr.json :`);
    missingKeysInFrench.forEach(key => console.log(`  - ${key}`));

    // Traduire et ajouter les clés manquantes
    console.log('Traduction des clés manquantes...');
    frTranslations = await addMissingKeys(enTranslations, frTranslations, missingKeysInFrench);
  } else {
    console.log('✅ Aucune clé manquante dans fr.json');
  }

  // Dédupliquer les textes
  const uniqueTexts = [...new Set(allTexts)];
  console.log(`${uniqueTexts.length} textes uniques extraits`);

  // Traiter chaque texte
  let translatedCount = 0;
  for (const text of uniqueTexts) {
    // Ignorer les textes trop courts ou non pertinents
    if (text.length <= 1 || /^\d+$/.test(text) || /^[^A-Za-z]+$/.test(text)) {
      continue;
    }

    // Vérifier si le texte existe déjà dans les traductions
    let found = false;
    for (const ns in enTranslations) {
      for (const key in enTranslations[ns]) {
        if (enTranslations[ns][key] === text) {
          found = true;
          console.log(`Texte déjà traduit: "${text}"`);
          break;
        }
      }
      if (found) break;
    }

    if (found) continue;

    // Générer une nouvelle clé
    let key = generateKeyFromText(text);
    let counter = 1;

    // Assurer que la clé est unique
    while (enTranslations.common[key]) {
      key = `${generateKeyFromText(text)}_${counter}`;
      counter++;
    }

    // Ajouter à l'anglais
    enTranslations.common[key] = text;

    // Traduire et ajouter au français
    const frTranslation = await translateText(text);
    frTranslations.common[key] = frTranslation;

    translatedCount++;
    console.log(
      `Traduit (${translatedCount}/${uniqueTexts.length}): "${text}" => "${frTranslation}"`
    );

    // Petite pause pour ne pas dépasser les limites de l'API
    if (translatedCount % 5 === 0) {
      console.log("Pause pour respecter les limites de l'API...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Sauvegarder les fichiers de traduction
  fs.writeFileSync(
    path.join(MESSAGES_DIR, 'en.json'),
    JSON.stringify(enTranslations, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(MESSAGES_DIR, 'fr.json'),
    JSON.stringify(frTranslations, null, 2),
    'utf8'
  );

  console.log(`🎉 Traduction terminée. ${translatedCount} nouveaux textes traduits.`);
  console.log(`📝 ${missingKeysInFrench.length} clés manquantes ajoutées à fr.json.`);
  console.log(`📁 Fichiers de traduction enregistrés dans ${MESSAGES_DIR}`);
}

// Exécuter la fonction principale
main().catch(console.error);
