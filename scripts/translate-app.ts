#!/usr/bin/env tsx

/**
 * Script de traduction automatique pour EcoDeli
 *
 * Ce script utilise l'API Google Gemini pour traduire automatiquement
 * les fichiers de traduction du projet.
 *
 * Usage:
 *   - Traduction complète: npm run translate-js
 *   - Traduction avec transformation: npm run translate:transform
 *   - Extraction des clés: npm run translate-js -- --extract
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import JSON5 from 'json5';
import { glob } from 'glob';

// Configuration
dotenv.config();

// Obtenir le chemin du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const messagesDir = path.join(rootDir, 'src', 'messages');
const srcDir = path.join(rootDir, 'src');
const tempDir = path.join(rootDir, 'temp');

// Langues supportées
const SUPPORTED_LANGUAGES = ['en', 'fr'];
const SOURCE_LANGUAGE = 'en'; // Langue source par défaut

// Configuration du traitement par lots et des taux limites
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const FALLBACK_MODEL = 'gemini-1.0-pro';
const BATCH_SIZE = 5; // Nombre de requêtes à traiter en parallèle
const RATE_LIMIT_REQUESTS_PER_MINUTE = 30; // Maximum de requêtes par minute
const RATE_LIMIT_WAIT_MS = 60000 / RATE_LIMIT_REQUESTS_PER_MINUTE; // Intervalle entre les requêtes

// Format de prompt pour la traduction
const TRANSLATION_PROMPT = `
Tu es un traducteur professionnel spécialisé dans la localisation d'applications web.
Traduis le texte suivant de l'anglais vers le français en conservant exactement la même structure JSON.
Ne traduis pas les clés JSON, seulement les valeurs.
N'ajoute aucun commentaire ou explication, renvoie uniquement le JSON traduit.
Conserve tous les placeholders comme {value}, {{value}}, les balises HTML, et les caractères spéciaux.
Assure-toi que le résultat est un JSON valide et bien formaté.

Texte à traduire:
`;

// Vérifier si on est en mode transformation seulement
const isTransformMode = process.argv.includes('--transform');
// Vérifier si on est en mode extraction seulement
const isExtractMode = process.argv.includes('--extract');
// Vérifier si on est en mode reprise
const isResumeMode = process.argv.includes('--resume');

// Définition des types
interface TranslationChunk {
  obj: Record<string, unknown>;
  path: string[];
}

interface TranslationKey {
  key: string;
  file: string;
  line: number;
}

interface ProgressState {
  targetLang: string;
  processedChunks: number[];
  totalChunks: number;
  successCount: number;
  errorCount: number;
  lastUpdate: string;
}

/**
 * Initialise l'API Google Gemini
 */
function initializeGeminiApi() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Clé API Google Gemini manquante. Ajoutez GOOGLE_GEMINI_API_KEY dans le fichier .env'
    );
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * Charge le fichier de messages pour une langue donnée
 * @param language - Code de la langue
 * @returns Le contenu du fichier de messages
 */
async function loadMessagesFile(language: string): Promise<Record<string, unknown>> {
  try {
    const filePath = path.join(messagesDir, `${language}.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Erreur lors du chargement du fichier ${language}.json:`, error);
    throw error;
  }
}

/**
 * Vérifie si un fichier existe
 * @param filePath - Chemin du fichier
 * @returns true si le fichier existe, false sinon
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sauvegarde le fichier de messages traduit
 * @param language - Code de la langue
 * @param content - Contenu traduit
 */
async function saveMessagesFile(language: string, content: Record<string, unknown>): Promise<void> {
  try {
    const filePath = path.join(messagesDir, `${language}.json`);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
    console.log(`✓ Fichier ${language}.json sauvegardé avec succès`);
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde du fichier ${language}.json:`, error);
    throw error;
  }
}

/**
 * Traite un fragment de texte JSON avec l'API Gemini
 * @param textFragment - Fragment JSON à traduire
 * @returns Le fragment traduit
 */
async function translateWithGemini(textFragment: string): Promise<Record<string, unknown>> {
  let retries = 0;
  let currentModel = 'gemini-1.5-pro';
  let backoffTime = RETRY_DELAY_MS;

  while (retries <= MAX_RETRIES) {
    try {
      const genAI = initializeGeminiApi();
      const model = genAI.getGenerativeModel({ model: currentModel });

      const prompt = `${TRANSLATION_PROMPT}${textFragment}`;

      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }], role: 'user' }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        },
      });

      const responseText = result.response.text();

      // Extraire le JSON de la réponse (au cas où il y aurait du texte avant/après)
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON5.parse(jsonMatch[1]);
      }

      // Si pas de bloc de code, essayer de parser directement
      return JSON5.parse(responseText);
    } catch (error) {
      retries++;

      // Extraire les détails d'erreur pour un meilleur diagnostic
      let retryDelay = backoffTime;
      let quotaExceeded = false;
      let serviceUnavailable = false;

      if (error instanceof Error) {
        const errorMessage = error.toString();

        // Vérifier si c'est une erreur de quota dépassé (429)
        quotaExceeded = errorMessage.includes('429') && errorMessage.includes('Too Many Requests');

        // Vérifier si c'est une erreur de service indisponible
        serviceUnavailable =
          errorMessage.includes('Service Unavailable') || errorMessage.includes('overloaded');

        // Extraire le retryDelay suggéré par l'API si disponible
        const retryDelayMatch = errorMessage.match(/retryDelay['"]?\s*:\s*['"]?(\d+)s['"]?/);
        if (retryDelayMatch && retryDelayMatch[1]) {
          const suggestedDelay = parseInt(retryDelayMatch[1], 10);
          if (!isNaN(suggestedDelay)) {
            retryDelay = suggestedDelay * 1000; // Convertir en millisecondes
          }
        }

        // Utiliser le modèle de fallback plus tôt en cas d'erreur de quota
        if ((quotaExceeded || serviceUnavailable) && currentModel === 'gemini-1.5-pro') {
          console.log(
            `Passage au modèle de fallback ${FALLBACK_MODEL} après erreur de quota/service...`
          );
          currentModel = FALLBACK_MODEL;
        }
      }

      // Appliquer un backoff exponentiel pour les tentatives ultérieures
      if (retries <= MAX_RETRIES) {
        backoffTime = Math.min(retryDelay * Math.pow(1.5, retries - 1), 60000); // Max 60 secondes
        console.log(
          `Erreur API Gemini: Nouvelle tentative ${retries}/${MAX_RETRIES} dans ${backoffTime / 1000} secondes...`
        );
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        continue;
      }

      console.error('Erreur lors de la traduction avec Gemini:', error);
      throw error;
    }
  }

  throw new Error(`Échec de la traduction après ${MAX_RETRIES} tentatives.`);
}

/**
 * Découpe un objet JSON en morceaux plus petits pour l'API
 * @param obj - L'objet JSON à découper
 * @returns Un tableau de fragments JSON
 */
function chunkObject(obj: Record<string, unknown>): TranslationChunk[] {
  const MAX_KEYS = 50; // Nombre maximum de clés par fragment
  const result: TranslationChunk[] = [];

  // Fonction récursive pour traiter les objets imbriqués
  function processObject(current: Record<string, unknown>, path: string[] = []): void {
    // Si l'objet est petit, l'ajouter directement
    const keys = Object.keys(current);
    if (keys.length <= MAX_KEYS) {
      const chunk = { obj: current, path };
      result.push(chunk);
      return;
    }

    // Sinon, traiter les propriétés imbriquées
    for (const key of keys) {
      const value = current[key];
      if (typeof value === 'object' && value !== null) {
        processObject(value as Record<string, unknown>, [...path, key]);
      } else {
        // Pour les valeurs simples, les regrouper par lots
        const simpleChunk = { obj: { [key]: value }, path };
        result.push(simpleChunk);
      }
    }
  }

  processObject(obj);
  return result;
}

/**
 * Fusionne les fragments traduits dans l'objet cible
 * @param target - Objet cible
 * @param translatedChunk - Fragment traduit
 * @param path - Chemin dans l'objet cible
 */
function mergeTranslatedChunk(
  target: Record<string, unknown>,
  translatedChunk: Record<string, unknown>,
  path: string[]
): void {
  let current = target;

  // Naviguer jusqu'au bon niveau dans l'objet cible
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  // Fusionner les propriétés traduites
  Object.assign(current, translatedChunk);
}

/**
 * Assure que le répertoire temp existe
 */
async function ensureTempDirExists(): Promise<void> {
  try {
    await fs.access(tempDir);
  } catch {
    await fs.mkdir(tempDir, { recursive: true });
  }
}

/**
 * Sauvegarde l'état de progression
 * @param state - État de progression
 */
async function saveProgressState(state: ProgressState): Promise<void> {
  await ensureTempDirExists();
  const fileName = `translate_progress_${state.targetLang}.json`;
  const filePath = path.join(tempDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
  console.log(
    `État de progression sauvegardé: ${state.successCount} fragments traités sur ${state.totalChunks}`
  );
}

/**
 * Charge l'état de progression
 * @param targetLang - Langue cible
 */
async function loadProgressState(targetLang: string): Promise<ProgressState | null> {
  try {
    await ensureTempDirExists();
    const fileName = `translate_progress_${targetLang}.json`;
    const filePath = path.join(tempDir, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Traite plusieurs fragments JSON avec l'API Gemini en respectant les limites de taux
 * @param chunks - Fragments JSON à traduire
 * @returns Tableau des résultats de traduction
 */
async function batchTranslateWithGemini(
  chunksWithMetadata: Array<{ fragment: string; chunkIndex: number; path: string[] }>
): Promise<(Record<string, unknown> | null)[]> {
  const results: (Record<string, unknown> | null)[] = new Array(chunksWithMetadata.length).fill(
    null
  );
  let successCount = 0;
  let failCount = 0;

  // Traiter les fragments un par un avec un délai pour respecter les limites de taux
  for (let i = 0; i < chunksWithMetadata.length; i++) {
    const { fragment, chunkIndex } = chunksWithMetadata[i];

    // Attendre entre les requêtes pour respecter la limite de taux
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
    }

    try {
      const result = await translateWithGemini(fragment);
      results[i] = result;
      successCount++;
    } catch (error) {
      console.error(`Échec de la traduction du fragment à l'index ${chunkIndex}:`, error);
      failCount++;
    }
  }

  console.log(`Lot traité: ${successCount} réussis, ${failCount} échoués`);
  return results;
}

/**
 * Transforme les fichiers de traduction existants
 * (ex: corriger les clés, le formatage, etc.)
 */
async function transformTranslationFiles(): Promise<void> {
  try {
    // Charger tous les fichiers de traduction
    const files = await Promise.all(
      SUPPORTED_LANGUAGES.map(async lang => {
        const content = await loadMessagesFile(lang);
        return { lang, content };
      })
    );

    // Traitement spécifique pour chaque fichier
    for (const { lang, content } of files) {
      // Exemple: normaliser les clés en camelCase
      const transformed = content;

      // Sauvegarde du fichier transformé
      await saveMessagesFile(lang, transformed);
    }

    console.log('✓ Transformation des fichiers de traduction terminée');
  } catch (error) {
    console.error('Erreur lors de la transformation des fichiers:', error);
  }
}

/**
 * Extrait une clé imbriquée d'un objet de traduction
 * @param obj - L'objet de traduction
 * @param keyPath - Le chemin de la clé (ex: 'common.buttons.submit')
 * @returns La valeur de la clé ou undefined si elle n'existe pas
 */
function getNestedTranslationValue(obj: Record<string, unknown>, keyPath: string): unknown {
  const keys = keyPath.split('.');
  let current = obj;

  for (const key of keys) {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return undefined;
    }
    current = current[key] as Record<string, unknown>;
  }

  return current;
}

/**
 * Définit une valeur imbriquée dans un objet de traduction
 * @param obj - L'objet de traduction
 * @param keyPath - Le chemin de la clé (ex: 'common.buttons.submit')
 * @param value - La valeur à définir
 */
function setNestedTranslationValue(
  obj: Record<string, unknown>,
  keyPath: string,
  value: unknown
): void {
  const keys = keyPath.split('.');
  let current = obj;

  // Naviguer jusqu'au niveau approprié
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  // Définir la valeur
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
}

/**
 * Extrait toutes les clés de traduction des fichiers source
 * @returns Un tableau de toutes les clés de traduction utilisées dans le projet
 */
async function extractTranslationKeys(): Promise<TranslationKey[]> {
  console.log('Extraction des clés de traduction du projet...');

  // Patterns pour trouver les clés de traduction dans le code
  const patterns = [
    // useTranslations().t('keyPath')
    /useTranslations\(\)\.t\(['"]([^'"]+)['"]\)/g,
    // t('keyPath')
    /\bt\(['"]([^'"]+)['"]\)/g,
    // <Trans i18nKey="keyPath" />
    /<Trans\s+i18nKey=["']([^"']+)["']/g,
    // <FormattedMessage id="keyPath" />
    /<FormattedMessage\s+id=["']([^"']+)["']/g,
  ];

  const result: TranslationKey[] = [];
  const processedKeys = new Set<string>();

  try {
    // Trouver tous les fichiers source
    const files = await glob(['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'], {
      cwd: srcDir,
      ignore: ['**/node_modules/**', '**/.next/**'],
    });

    console.log(`Analyse de ${files.length} fichiers source...`);

    for (const file of files) {
      const filePath = path.join(srcDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Vérifier chaque pattern
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(line)) !== null) {
            const key = match[1];

            // Éviter les doublons
            if (!processedKeys.has(key)) {
              processedKeys.add(key);
              result.push({
                key,
                file: filePath,
                line: i + 1,
              });
            }
          }
        }
      }
    }

    console.log(`✓ ${result.length} clés de traduction trouvées`);
    return result;
  } catch (error) {
    console.error("Erreur lors de l'extraction des clés de traduction:", error);
    return [];
  }
}

/**
 * Ajoute les clés manquantes aux fichiers de traduction
 * @param keys - Les clés à ajouter
 */
async function addMissingTranslationKeys(keys: TranslationKey[]): Promise<void> {
  try {
    // Charger les fichiers de traduction existants
    const translations: Record<string, Record<string, unknown>> = {};
    for (const lang of SUPPORTED_LANGUAGES) {
      try {
        translations[lang] = await loadMessagesFile(lang);
      } catch {
        console.log(`Création d'un nouveau fichier ${lang}.json`);
        translations[lang] = {};
      }
    }

    let keysAdded = 0;

    // Vérifier chaque clé
    for (const { key } of keys) {
      // Vérifier si la clé existe dans toutes les traductions
      for (const lang of SUPPORTED_LANGUAGES) {
        const value = getNestedTranslationValue(translations[lang], key);

        if (value === undefined) {
          // La clé n'existe pas, l'ajouter
          // Pour la langue source, utiliser la clé comme valeur
          if (lang === SOURCE_LANGUAGE) {
            // Utiliser le dernier segment de la clé comme valeur par défaut
            const defaultValue = key.split('.').pop() || key;
            setNestedTranslationValue(translations[lang], key, defaultValue);
            keysAdded++;
            console.log(
              `Ajout de la clé "${key}" au fichier ${lang}.json (valeur par défaut: "${defaultValue}")`
            );
          } else {
            // Pour les autres langues, laisser vide ou mettre une valeur temporaire
            // à traduire plus tard
            const sourceValue = getNestedTranslationValue(translations[SOURCE_LANGUAGE], key);
            const tempValue = sourceValue
              ? `[${SOURCE_LANGUAGE}] ${sourceValue}`
              : `[À TRADUIRE] ${key}`;
            setNestedTranslationValue(translations[lang], key, tempValue);
            console.log(`Ajout de la clé "${key}" au fichier ${lang}.json (valeur temporaire)`);
          }
        }
      }
    }

    // Sauvegarder les fichiers mis à jour
    for (const lang of SUPPORTED_LANGUAGES) {
      await saveMessagesFile(lang, translations[lang]);
    }

    console.log(`✓ ${keysAdded} nouvelles clés ajoutées aux fichiers de traduction`);
  } catch (error) {
    console.error("Erreur lors de l'ajout des clés manquantes:", error);
  }
}

/**
 * Génère un rapport des clés manquantes ou inutilisées
 * @param usedKeys - Les clés utilisées dans le projet
 */
async function generateTranslationReport(usedKeys: TranslationKey[]): Promise<void> {
  try {
    console.log('\n=== Rapport de traduction ===');

    // Convertir les clés en ensemble pour une recherche rapide
    const usedKeysSet = new Set(usedKeys.map(k => k.key));

    // Charger les fichiers de traduction
    const translations: Record<string, Record<string, unknown>> = {};
    for (const lang of SUPPORTED_LANGUAGES) {
      try {
        translations[lang] = await loadMessagesFile(lang);
      } catch {
        console.log(`Impossible de charger le fichier ${lang}.json`);
        translations[lang] = {};
      }
    }

    // Collecter toutes les clés de traduction depuis les fichiers
    const translationKeys = new Set<string>();
    const langKeysMap: Record<string, Set<string>> = {};

    // Fonction pour aplatir un objet imbriqué
    const flattenObject = (obj: Record<string, unknown>, prefix = '', langCode = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          flattenObject(value as Record<string, unknown>, newKey, langCode);
        } else {
          if (langCode === SOURCE_LANGUAGE) {
            translationKeys.add(newKey);
          }

          // Ajouter la clé à l'ensemble spécifique à la langue
          if (!langKeysMap[langCode]) {
            langKeysMap[langCode] = new Set<string>();
          }
          langKeysMap[langCode].add(newKey);
        }
      }
    };

    // Aplatir les objets de traduction pour chaque langue
    for (const lang of SUPPORTED_LANGUAGES) {
      if (translations[lang]) {
        flattenObject(translations[lang], '', lang);
      }
    }

    // Clés manquantes (utilisées dans le code mais pas dans les fichiers)
    const missingKeys = [...usedKeysSet].filter(key => !translationKeys.has(key));
    if (missingKeys.length > 0) {
      console.log(`\n🔍 ${missingKeys.length} clés manquantes dans les fichiers de traduction:`);
      for (const key of missingKeys.slice(0, 10)) {
        console.log(`  - ${key}`);
      }
      if (missingKeys.length > 10) {
        console.log(`  ... et ${missingKeys.length - 10} autres`);
      }
    } else {
      console.log('\n✓ Aucune clé manquante dans les fichiers de traduction');
    }

    // Clés inutilisées (dans les fichiers mais pas dans le code)
    const unusedKeys = [...translationKeys].filter(key => !usedKeysSet.has(key));
    if (unusedKeys.length > 0) {
      console.log(`\n🔍 ${unusedKeys.length} clés potentiellement inutilisées:`);
      for (const key of unusedKeys.slice(0, 10)) {
        console.log(`  - ${key}`);
      }
      if (unusedKeys.length > 10) {
        console.log(`  ... et ${unusedKeys.length - 10} autres`);
      }
    } else {
      console.log('\n✓ Aucune clé inutilisée dans les fichiers de traduction');
    }

    // Statistiques de traduction
    console.log('\n📊 Statistiques de traduction:');
    for (const lang of SUPPORTED_LANGUAGES) {
      if (lang === SOURCE_LANGUAGE) {
        const total = translationKeys.size;
        const translated = langKeysMap[lang]?.size || 0;
        const percentage = total > 0 ? Math.round((translated / total) * 100) : 0;

        console.log(`  - ${lang}: ${translated}/${total} (${percentage}%) [SOURCE]`);
      } else {
        const total = translationKeys.size;
        const translated = langKeysMap[lang]?.size || 0;
        const percentage = total > 0 ? Math.round((translated / total) * 100) : 0;

        console.log(`  - ${lang}: ${translated}/${total} (${percentage}%)`);
      }
    }

    console.log('\n=== Fin du rapport ===\n');
  } catch (error) {
    console.error('Erreur lors de la génération du rapport:', error);
  }
}

/**
 * Extrait et ajoute les clés de traduction manquantes
 */
async function extractAndAddTranslationKeys(): Promise<void> {
  try {
    // Extraire les clés de traduction du projet
    const keys = await extractTranslationKeys();

    // Ajouter les clés manquantes
    await addMissingTranslationKeys(keys);

    // Générer un rapport
    await generateTranslationReport(keys);

    console.log('✓ Extraction et ajout des clés de traduction terminés');
  } catch (error) {
    console.error("Erreur lors de l'extraction et de l'ajout des clés de traduction:", error);
  }
}

/**
 * Traduit tous les fichiers de messages
 */
async function translateAllMessages(): Promise<void> {
  try {
    // Charger le fichier source (anglais par défaut)
    console.log(`Chargement du fichier source (${SOURCE_LANGUAGE}.json)...`);
    const sourceContent = await loadMessagesFile(SOURCE_LANGUAGE);

    // Traiter chaque langue cible
    for (const targetLang of SUPPORTED_LANGUAGES) {
      // Ignorer la langue source
      if (targetLang === SOURCE_LANGUAGE) continue;

      console.log(`\nTraduction vers ${targetLang}...`);

      try {
        // Créer une version vide ou charger la version existante
        let targetContent: Record<string, unknown> = {};
        const targetFilePath = path.join(messagesDir, `${targetLang}.json`);

        // Vérifier si le fichier cible existe déjà
        if (await fileExists(targetFilePath)) {
          targetContent = await loadMessagesFile(targetLang);
          console.log(`Fichier ${targetLang}.json existant chargé`);
        } else {
          console.log(`Création d'un nouveau fichier ${targetLang}.json`);
        }

        // Découper le contenu source en fragments
        const chunks = chunkObject(sourceContent);
        console.log(`Traitement de ${chunks.length} fragments...`);

        // Variables pour le suivi de progression
        let successCount = 0;
        let errorCount = 0;

        // Vérifier s'il y a un état de progression sauvegardé
        let processedChunks: number[] = [];
        if (isResumeMode) {
          const progressState = await loadProgressState(targetLang);
          if (progressState) {
            processedChunks = progressState.processedChunks;
            successCount = progressState.successCount;
            errorCount = progressState.errorCount;
            console.log(
              `Reprise de la traduction: ${successCount} fragments déjà traités, ${chunks.length - processedChunks.length} fragments restants`
            );
          }
        }

        // Filtrer les chunks qui n'ont pas encore été traités
        const chunksToProcess = chunks.filter((_, chunkIdx) => !processedChunks.includes(chunkIdx));

        // Préparer les fragments pour le traitement par lots
        const allChunks = chunksToProcess.map(chunk => {
          // Trouver l'index original du chunk dans le tableau complet
          const originalIndex = chunks.findIndex(
            c =>
              c.path.join('.') === chunk.path.join('.') &&
              JSON.stringify(c.obj) === JSON.stringify(chunk.obj)
          );

          return {
            fragment: JSON.stringify(chunk.obj, null, 2),
            chunkIndex: originalIndex, // Index dans le tableau original pour le suivi de progression
            path: chunk.path,
          };
        });

        // Traiter les fragments par lots
        for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
          const currentBatch = allChunks.slice(i, i + BATCH_SIZE);
          console.log(
            `Traitement du lot ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / BATCH_SIZE)} (fragments ${i + 1}-${Math.min(i + BATCH_SIZE, allChunks.length)}/${allChunks.length})`
          );

          const results = await batchTranslateWithGemini(currentBatch);

          // Traiter les résultats du lot
          for (let j = 0; j < currentBatch.length; j++) {
            const { path, chunkIndex } = currentBatch[j];
            const result = results[j];

            if (result) {
              // Fusionner le fragment traduit
              mergeTranslatedChunk(targetContent, result, path);
              successCount++;
              processedChunks.push(chunkIndex);
            } else {
              errorCount++;
            }
          }

          // Sauvegarder le fichier traduit périodiquement (après chaque lot)
          await saveMessagesFile(targetLang, targetContent);
          console.log(
            `✓ Sauvegarde intermédiaire du fichier ${targetLang}.json réussie (${successCount} fragments traités)`
          );

          // Sauvegarder l'état de progression
          await saveProgressState({
            targetLang,
            processedChunks,
            totalChunks: chunks.length,
            successCount,
            errorCount,
            lastUpdate: new Date().toISOString(),
          });

          // Petite pause entre les lots pour éviter de surcharger l'API
          if (i + BATCH_SIZE < allChunks.length) {
            console.log("Pause entre les lots pour respecter les limites de l'API...");
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        // Sauvegarder le fichier traduit
        await saveMessagesFile(targetLang, targetContent);
        console.log(
          `\n✓ Traduction vers ${targetLang} terminée: ${successCount} fragments réussis, ${errorCount} échecs`
        );

        // Si tous les fragments ont été traités, supprimer le fichier d'état de progression
        if (processedChunks.length === chunks.length) {
          try {
            const progressFilePath = path.join(tempDir, `translate_progress_${targetLang}.json`);
            await fs.unlink(progressFilePath);
            console.log(`État de progression supprimé, traduction terminée`);
          } catch (error) {
            console.error("Erreur lors de la suppression du fichier d'état de progression:", error);
          }
        }
      } catch (error) {
        console.error(`Erreur lors de la traduction vers ${targetLang}:`, error);
      }
    }

    console.log('\n✓ Traduction de tous les fichiers terminée');
  } catch (error) {
    console.error('Erreur lors de la traduction:', error);
  }
}

/**
 * Fonction principale
 */
async function main(): Promise<void> {
  console.log('🌐 EcoDeli - Script de traduction automatique');

  try {
    // Vérifier d'abord la configuration
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ Erreur: Clé API Gemini manquante dans le fichier .env');
      process.exit(1);
    }

    console.log('✓ Configuration vérifiée');

    if (isExtractMode) {
      // Mode extraction de clés
      console.log('Mode: Extraction des clés de traduction');
      await extractAndAddTranslationKeys();
    } else if (isTransformMode) {
      // Mode transformation seulement
      console.log('Mode: Transformation des fichiers existants');
      await transformTranslationFiles();
    } else {
      // Mode traduction complet
      console.log('Mode: Traduction complète');
      await translateAllMessages();
    }
  } catch (error) {
    console.error('❌ Erreur dans le processus de traduction:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Non disponible');
    process.exit(1);
  }
}

// Exécution du script
main();
