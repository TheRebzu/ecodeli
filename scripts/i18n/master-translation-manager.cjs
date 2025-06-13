#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const { glob } = require("glob");

// Configuration
const CONFIG = {
  sourceLanguage: "fr",
  targetLanguages: ["en", "es", "de", "it"],
  messagesDir: path.resolve(__dirname, "../../src/messages"),
  scanDirectories: [
    "src/app",
    "src/components",
    "src/hooks",
    "src/lib",
    "src/server",
  ],
  scanExtensions: ["ts", "tsx", "js", "jsx"],
  masterFileName: "master-translations.json",
  outputFileName: "translation-progress.json",
};

// Patterns de détection des traductions
const TRANSLATION_PATTERNS = [
  // useTranslations('namespace')
  { regex: /useTranslations\(['"]([^'"]+)['"]\)/g, type: "namespace" },
  // t('key')
  { regex: /t\(['"]([^'"]+)['"]\)/g, type: "key" },
  // getTranslations('key')
  { regex: /getTranslations\(['"]([^'"]+)['"]\)/g, type: "key" },
  // {t('key')}
  { regex: /\{t\(['"]([^'"]+)['"]\)\}/g, type: "key" },
  // FormattedMessage
  { regex: /<FormattedMessage[^>]*id=['"]([^'"]+)['"]/g, type: "key" },
];

/**
 * Console avec couleurs simples
 */
const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  progress: (msg) => console.log(`🔄 ${msg}`),
};

/**
 * Scanne tous les fichiers du projet pour extraire les clés de traduction
 */
async function scanProjectForTranslationKeys() {
  logger.progress("Scan du projet pour les clés de traduction...");

  const foundKeys = new Set();
  const fileOccurrences = {};

  // Obtenir tous les fichiers à scanner
  const allFiles = [];
  for (const dir of CONFIG.scanDirectories) {
    for (const ext of CONFIG.scanExtensions) {
      const pattern = path.join(dir, `**/*.${ext}`);
      try {
        const files = await glob(pattern, {
          ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
          cwd: path.resolve(__dirname, "../.."),
        });
        allFiles.push(...files.map((f) => path.resolve(__dirname, "../..", f)));
      } catch (error) {
        logger.error(
          `Erreur lors du scan avec le pattern ${pattern}: ${error.message}`,
        );
      }
    }
  }

  logger.info(`${allFiles.length} fichiers trouvés à analyser`);

  // Analyser chaque fichier
  for (const filePath of allFiles) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const relativePath = path.relative(
        path.resolve(__dirname, "../.."),
        filePath,
      );

      // Détecter les namespaces
      const namespaces = [];
      for (const pattern of TRANSLATION_PATTERNS) {
        if (pattern.type === "namespace") {
          let match;
          while ((match = pattern.regex.exec(content)) !== null) {
            namespaces.push(match[1]);
          }
        }
      }

      // Si aucun namespace, utiliser 'Common'
      if (namespaces.length === 0) {
        namespaces.push("Common");
      }

      // Détecter les clés
      for (const pattern of TRANSLATION_PATTERNS) {
        if (pattern.type === "key") {
          let match;
          pattern.regex.lastIndex = 0; // Reset regex
          while ((match = pattern.regex.exec(content)) !== null) {
            const key = match[1];

            // Si la clé contient déjà un point, l'utiliser telle quelle
            if (key.includes(".")) {
              foundKeys.add(key);
              if (!fileOccurrences[key]) fileOccurrences[key] = [];
              fileOccurrences[key].push(relativePath);
            } else {
              // Sinon, préfixer avec chaque namespace
              for (const ns of namespaces) {
                const fullKey = `${ns}.${key}`;
                foundKeys.add(fullKey);
                if (!fileOccurrences[fullKey]) fileOccurrences[fullKey] = [];
                fileOccurrences[fullKey].push(relativePath);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error(
        `Erreur lors de la lecture de ${filePath}: ${error.message}`,
      );
    }
  }

  logger.success(`${foundKeys.size} clés de traduction uniques trouvées`);
  return { keys: Array.from(foundKeys), occurrences: fileOccurrences };
}

/**
 * Charge un fichier de traduction existant
 */
async function loadTranslationFile(language) {
  const filePath = path.join(CONFIG.messagesDir, `${language}.json`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    logger.warning(
      `Fichier ${language}.json non trouvé ou invalide, création d'un nouveau`,
    );
    return {};
  }
}

/**
 * Transforme une clé en chemin d'objet et définit la valeur
 */
function setDeepValue(obj, keyPath, value) {
  const keys = keyPath.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  if (!current[lastKey]) {
    current[lastKey] = value;
  }

  return current[lastKey];
}

/**
 * Obtient une valeur profonde dans un objet
 */
function getDeepValue(obj, keyPath) {
  const keys = keyPath.split(".");
  let current = obj;

  for (const key of keys) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Crée un fichier maître avec toutes les traductions centralisées
 */
async function createMasterTranslationFile(detectedKeys, existingTranslations) {
  logger.progress("Création du fichier maître de traduction...");

  const masterTranslations = {
    _metadata: {
      version: "1.0.0",
      created: new Date().toISOString(),
      sourceLanguage: CONFIG.sourceLanguage,
      targetLanguages: CONFIG.targetLanguages,
      totalKeys: detectedKeys.keys.length,
      description:
        "Fichier maître pour toutes les traductions - Modifiez ce fichier pour propager les changements",
    },
    translations: {},
  };

  // Pour chaque clé détectée
  for (const key of detectedKeys.keys) {
    const translationEntry = {
      key: key,
      sourceText: "",
      translations: {},
      status: "pending",
      files: detectedKeys.occurrences[key] || [],
      notes: "",
    };

    // Obtenir le texte source depuis le fichier français
    const frenchValue = getDeepValue(existingTranslations.fr, key);
    if (frenchValue && typeof frenchValue === "string") {
      translationEntry.sourceText = frenchValue;
      translationEntry.status = "source_available";
    } else {
      // Utiliser la clé comme texte par défaut
      const defaultText = key.split(".").pop();
      translationEntry.sourceText = defaultText;
      translationEntry.status = "needs_source";
    }

    // Vérifier les traductions existantes pour chaque langue
    for (const lang of CONFIG.targetLanguages) {
      const existingValue = getDeepValue(existingTranslations[lang], key);
      if (existingValue && typeof existingValue === "string") {
        if (
          existingValue.startsWith("[TO_TRANSLATE]") ||
          existingValue.startsWith("[TRANSLATION_ERROR]")
        ) {
          translationEntry.translations[lang] = {
            text: "",
            status: "needs_translation",
            lastUpdated: null,
          };
        } else {
          translationEntry.translations[lang] = {
            text: existingValue,
            status: "translated",
            lastUpdated: new Date().toISOString(),
          };
        }
      } else {
        translationEntry.translations[lang] = {
          text: "",
          status: "needs_translation",
          lastUpdated: null,
        };
      }
    }

    // Ajouter au fichier maître
    masterTranslations.translations[key] = translationEntry;
  }

  // Sauvegarder le fichier maître
  const masterPath = path.join(CONFIG.messagesDir, CONFIG.masterFileName);
  await fs.writeFile(
    masterPath,
    JSON.stringify(masterTranslations, null, 2),
    "utf-8",
  );

  logger.success(`Fichier maître créé: ${masterPath}`);
  return masterTranslations;
}

/**
 * Génère tous les fichiers de langue à partir du fichier maître
 */
async function generateLanguageFilesFromMaster(masterTranslations) {
  logger.progress("Génération des fichiers de langue...");

  // Créer le fichier source (français)
  const sourceTranslations = {};
  for (const [key, entry] of Object.entries(masterTranslations.translations)) {
    setDeepValue(sourceTranslations, key, entry.sourceText);
  }

  const sourcePath = path.join(
    CONFIG.messagesDir,
    `${CONFIG.sourceLanguage}.json`,
  );
  await fs.writeFile(
    sourcePath,
    JSON.stringify(sourceTranslations, null, 2),
    "utf-8",
  );
  logger.success(`Fichier source ${CONFIG.sourceLanguage}.json généré`);

  // Créer les fichiers de langue cible
  for (const lang of CONFIG.targetLanguages) {
    const langTranslations = {};
    let translatedCount = 0;
    let totalCount = 0;

    for (const [key, entry] of Object.entries(
      masterTranslations.translations,
    )) {
      totalCount++;
      const translation = entry.translations[lang];

      if (
        translation &&
        translation.text &&
        translation.status === "translated"
      ) {
        setDeepValue(langTranslations, key, translation.text);
        translatedCount++;
      } else {
        // Marquer comme à traduire
        setDeepValue(
          langTranslations,
          key,
          `[TO_TRANSLATE] ${entry.sourceText}`,
        );
      }
    }

    const langPath = path.join(CONFIG.messagesDir, `${lang}.json`);
    await fs.writeFile(
      langPath,
      JSON.stringify(langTranslations, null, 2),
      "utf-8",
    );

    const completionPercent = Math.round((translatedCount / totalCount) * 100);
    logger.success(
      `Fichier ${lang}.json généré (${translatedCount}/${totalCount} traduits - ${completionPercent}%)`,
    );
  }
}

/**
 * Génère un rapport de progression des traductions
 */
async function generateTranslationReport(masterTranslations) {
  const report = {
    summary: {
      totalKeys: Object.keys(masterTranslations.translations).length,
      sourceLanguage: CONFIG.sourceLanguage,
      targetLanguages: CONFIG.targetLanguages,
      generatedAt: new Date().toISOString(),
    },
    languageProgress: {},
    missingTranslations: {},
    keysByStatus: {},
  };

  // Analyser chaque langue
  for (const lang of CONFIG.targetLanguages) {
    let translated = 0;
    let needsTranslation = 0;
    const missing = [];

    for (const [key, entry] of Object.entries(
      masterTranslations.translations,
    )) {
      const translation = entry.translations[lang];
      if (translation && translation.status === "translated") {
        translated++;
      } else {
        needsTranslation++;
        missing.push({
          key,
          sourceText: entry.sourceText,
          files: entry.files,
        });
      }
    }

    report.languageProgress[lang] = {
      translated,
      needsTranslation,
      completionPercent: Math.round(
        (translated / report.summary.totalKeys) * 100,
      ),
    };

    report.missingTranslations[lang] = missing;
  }

  // Analyser par statut
  const statusCounts = {};
  for (const entry of Object.values(masterTranslations.translations)) {
    const status = entry.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }
  report.keysByStatus = statusCounts;

  // Sauvegarder le rapport
  const reportPath = path.join(CONFIG.messagesDir, CONFIG.outputFileName);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");

  logger.success(`Rapport de progression généré: ${reportPath}`);
  return report;
}

/**
 * Affiche un résumé des traductions
 */
function displaySummary(report) {
  console.log("\n📊 RÉSUMÉ DES TRADUCTIONS\n");
  console.log(`📝 Total des clés: ${report.summary.totalKeys}`);
  console.log(`🌐 Langues cibles: ${CONFIG.targetLanguages.join(", ")}\n`);

  for (const [lang, progress] of Object.entries(report.languageProgress)) {
    const emoji =
      progress.completionPercent === 100
        ? "✅"
        : progress.completionPercent > 50
          ? "🟡"
          : "🔴";
    console.log(
      `${emoji} ${lang.toUpperCase()}: ${progress.translated}/${report.summary.totalKeys} (${progress.completionPercent}%)`,
    );
  }

  console.log("\n🎯 PROCHAINES ÉTAPES:");
  console.log(`1. Éditez le fichier: ${CONFIG.masterFileName}`);
  console.log("2. Remplissez les traductions manquantes");
  console.log("3. Relancez ce script pour régénérer tous les fichiers");
  console.log(
    "4. Ou utilisez: pnpm i18n:translate pour la traduction automatique\n",
  );
}

/**
 * Fonction principale
 */
async function main() {
  try {
    logger.info("🚀 Démarrage du gestionnaire de traductions maître");

    // Créer le répertoire des messages s'il n'existe pas
    await fs.mkdir(CONFIG.messagesDir, { recursive: true });

    // 1. Scanner le projet pour les clés
    const detectedKeys = await scanProjectForTranslationKeys();

    // 2. Charger les traductions existantes
    logger.progress("Chargement des traductions existantes...");
    const existingTranslations = {};
    existingTranslations[CONFIG.sourceLanguage] = await loadTranslationFile(
      CONFIG.sourceLanguage,
    );

    for (const lang of CONFIG.targetLanguages) {
      existingTranslations[lang] = await loadTranslationFile(lang);
    }

    // 3. Créer le fichier maître
    const masterTranslations = await createMasterTranslationFile(
      detectedKeys,
      existingTranslations,
    );

    // 4. Générer tous les fichiers de langue
    await generateLanguageFilesFromMaster(masterTranslations);

    // 5. Générer le rapport
    const report = await generateTranslationReport(masterTranslations);

    // 6. Afficher le résumé
    displaySummary(report);

    logger.success("✨ Processus terminé avec succès!");
  } catch (error) {
    logger.error(`Erreur fatale: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  scanProjectForTranslationKeys,
  createMasterTranslationFile,
  generateLanguageFilesFromMaster,
  generateTranslationReport,
};
