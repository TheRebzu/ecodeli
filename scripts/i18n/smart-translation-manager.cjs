#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const { glob } = require("glob");

// Configuration améliorée
const CONFIG = {
  sourceLanguage: "fr",
  targetLanguages: ["en", "es", "de", "it"],
  messagesDir: path.resolve(__dirname, "../../src/messages"),
  scanDirectories: ["src/app", "src/components"],
  scanExtensions: ["ts", "tsx"],
  masterFileName: "master-translations.json",
  outputFileName: "translation-progress.json",
};

// Patterns pour détecter de VRAIES traductions (pas des imports/constantes)
const REAL_TRANSLATION_PATTERNS = [
  // useTranslations('namespace') - capture le namespace
  {
    regex: /useTranslations\(['"]([a-zA-Z][a-zA-Z0-9_]*)['"]\)/g,
    type: "namespace",
  },

  // t('key') - clés simples
  { regex: /\bt\(['"]([a-zA-Z][a-zA-Z0-9_.]*)['"]\)/g, type: "key" },

  // {t('key')} dans JSX
  { regex: /\{t\(['"]([a-zA-Z][a-zA-Z0-9_.]*)['"]\)\}/g, type: "key" },

  // t(`key`) avec backticks
  { regex: /\bt\([`]([a-zA-Z][a-zA-Z0-9_.]*)[`]\)/g, type: "key" },
];

// Filtres pour exclure les faux positifs
const EXCLUSION_FILTERS = [
  // Imports et chemins de fichiers
  /^@\//,
  /^\.{1,2}\//,
  /\.(ts|tsx|js|jsx|json|css|scss)$/,
  /^src\//,
  /^node_modules/,

  // Constantes techniques
  /^[A-Z_]{3,}$/, // CONSTANTES_EN_MAJUSCULES
  /^[a-z]+(-[a-z]+)+$/, // kebab-case technique

  // Signatures/headers
  /signature$/,
  /^Authorization$/,
  /^Content-Type$/,
  /^csrf-token$/,

  // Extensions et formats
  /^(PDF|CSV|JSON|EXCEL|XML)$/,
  /^(hex|base64|utf8)$/,

  // Caractères isolés ou techniques
  /^[-:,\/\s]+$/,
  /^[TZ]$/,
  /^\d+[a-z]*$/, // 2d, 100vh etc.

  // Patterns techniques Next.js/React
  /^calc\(/,
  /^\[locale\]/,
  /^next\//,
  /^react/,
];

const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  progress: (msg) => console.log(`🔄 ${msg}`),
};

/**
 * Vérifie si une clé est valide (pas un import/constante technique)
 */
function isValidTranslationKey(key) {
  if (!key || typeof key !== "string" || key.length < 2) {
    return false;
  }

  // Appliquer les filtres d'exclusion
  for (const filter of EXCLUSION_FILTERS) {
    if (filter.test(key)) {
      return false;
    }
  }

  // La clé doit contenir au moins une lettre
  if (!/[a-zA-Z]/.test(key)) {
    return false;
  }

  // Exclure les clés qui sont juste des mots techniques anglais
  const technicalWords = [
    "upgrade",
    "referer",
    "status",
    "tracking",
    "analytics",
    "style",
    "month",
    "week",
    "day",
    "year",
    "name",
    "date",
    "search",
    "relevance",
    "asc",
    "desc",
    "sales",
    "type",
  ];

  if (technicalWords.includes(key.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Charge les traductions existantes depuis un fichier
 */
async function loadExistingTranslations(language) {
  const filePath = path.join(CONFIG.messagesDir, `${language}.json`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    logger.warning(`Fichier ${language}.json non trouvé ou invalide`);
    return {};
  }
}

/**
 * Extrait toutes les clés d'un objet de traductions de façon récursive
 */
function extractKeysFromTranslationObject(obj, prefix = "") {
  const keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Récursion pour les objets imbriqués
      keys.push(...extractKeysFromTranslationObject(value, fullKey));
    } else if (typeof value === "string") {
      // C'est une vraie traduction
      keys.push({
        key: fullKey,
        value: value,
        isReal: value !== fullKey && value !== key, // La valeur ne doit pas être identique à la clé
      });
    }
  }

  return keys;
}

/**
 * Scanne le code pour trouver les clés utilisées
 */
async function scanCodeForTranslationKeys() {
  logger.progress("Scan du code pour les clés de traduction...");

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

  let validKeysCount = 0;
  let invalidKeysCount = 0;

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
      for (const pattern of REAL_TRANSLATION_PATTERNS) {
        if (pattern.type === "namespace") {
          let match;
          pattern.regex.lastIndex = 0;
          while ((match = pattern.regex.exec(content)) !== null) {
            if (isValidTranslationKey(match[1])) {
              namespaces.push(match[1]);
            }
          }
        }
      }

      // Si aucun namespace, utiliser 'Common'
      if (namespaces.length === 0) {
        namespaces.push("Common");
      }

      // Détecter les clés
      for (const pattern of REAL_TRANSLATION_PATTERNS) {
        if (pattern.type === "key") {
          let match;
          pattern.regex.lastIndex = 0;
          while ((match = pattern.regex.exec(content)) !== null) {
            const key = match[1];

            if (!isValidTranslationKey(key)) {
              invalidKeysCount++;
              continue;
            }

            validKeysCount++;

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

  logger.success(
    `${foundKeys.size} clés valides trouvées (${invalidKeysCount} clés techniques ignorées)`,
  );
  return { keys: Array.from(foundKeys), occurrences: fileOccurrences };
}

/**
 * Crée le fichier maître en fusionnant le code scanné et les traductions existantes
 */
async function createSmartMasterFile() {
  logger.progress("Création du fichier maître intelligent...");

  // 1. Scanner le code
  const scannedKeys = await scanCodeForTranslationKeys();

  // 2. Charger les traductions existantes
  const existingTranslations = {};
  existingTranslations[CONFIG.sourceLanguage] = await loadExistingTranslations(
    CONFIG.sourceLanguage,
  );

  for (const lang of CONFIG.targetLanguages) {
    existingTranslations[lang] = await loadExistingTranslations(lang);
  }

  // 3. Extraire toutes les clés des fichiers de traduction existants
  const existingKeys = extractKeysFromTranslationObject(
    existingTranslations[CONFIG.sourceLanguage],
  );

  // 4. Fusionner les clés scannées et existantes
  const allKeys = new Set([
    ...scannedKeys.keys,
    ...existingKeys.filter((k) => k.isReal).map((k) => k.key),
  ]);

  logger.info(
    `${allKeys.size} clés uniques après fusion (code: ${scannedKeys.keys.length}, existantes: ${existingKeys.filter((k) => k.isReal).length})`,
  );

  // 5. Créer le fichier maître
  const masterTranslations = {
    _metadata: {
      version: "2.0.0",
      created: new Date().toISOString(),
      sourceLanguage: CONFIG.sourceLanguage,
      targetLanguages: CONFIG.targetLanguages,
      totalKeys: allKeys.size,
      scannedFromCode: scannedKeys.keys.length,
      existingTranslations: existingKeys.filter((k) => k.isReal).length,
      description:
        "Fichier maître intelligent - Traductions réelles uniquement",
    },
    translations: {},
  };

  // Obtenir la valeur depuis les traductions existantes
  function getValueFromTranslations(key, translations) {
    const parts = key.split(".");
    let current = translations;

    for (const part of parts) {
      if (!current || typeof current !== "object" || !(part in current)) {
        return null;
      }
      current = current[part];
    }

    return typeof current === "string" ? current : null;
  }

  // 6. Traiter chaque clé
  for (const key of allKeys) {
    const translationEntry = {
      key: key,
      sourceText: "",
      translations: {},
      status: "pending",
      files: scannedKeys.occurrences[key] || [],
      notes: "",
      isFromCode: scannedKeys.keys.includes(key),
      isFromExisting: existingKeys.some((k) => k.key === key),
    };

    // Obtenir le texte source depuis le fichier français
    const frenchValue = getValueFromTranslations(
      key,
      existingTranslations[CONFIG.sourceLanguage],
    );
    if (frenchValue && frenchValue !== key && frenchValue.length > 1) {
      translationEntry.sourceText = frenchValue;
      translationEntry.status = "source_available";
    } else {
      // Utiliser une valeur par défaut lisible
      const lastPart = key.split(".").pop();
      translationEntry.sourceText =
        lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
      translationEntry.status = "needs_source";
    }

    // Vérifier les traductions existantes pour chaque langue
    for (const lang of CONFIG.targetLanguages) {
      const existingValue = getValueFromTranslations(
        key,
        existingTranslations[lang],
      );
      if (
        existingValue &&
        existingValue !== key &&
        existingValue.length > 1 &&
        !existingValue.startsWith("[TO_TRANSLATE]") &&
        !existingValue.startsWith("[TRANSLATION_ERROR]")
      ) {
        translationEntry.translations[lang] = {
          text: existingValue,
          status: "translated",
          lastUpdated: new Date().toISOString(),
          method: "existing",
        };
      } else {
        translationEntry.translations[lang] = {
          text: "",
          status: "needs_translation",
          lastUpdated: null,
          method: null,
        };
      }
    }

    masterTranslations.translations[key] = translationEntry;
  }

  // 7. Sauvegarder le fichier maître
  const masterPath = path.join(CONFIG.messagesDir, CONFIG.masterFileName);
  await fs.writeFile(
    masterPath,
    JSON.stringify(masterTranslations, null, 2),
    "utf-8",
  );

  logger.success(`Fichier maître intelligent créé: ${masterPath}`);
  return masterTranslations;
}

/**
 * Génère un rapport de progression
 */
async function generateProgressReport(masterTranslations) {
  const report = {
    summary: {
      totalKeys: Object.keys(masterTranslations.translations).length,
      sourceLanguage: CONFIG.sourceLanguage,
      targetLanguages: CONFIG.targetLanguages,
      generatedAt: new Date().toISOString(),
      fromCode: Object.values(masterTranslations.translations).filter(
        (t) => t.isFromCode,
      ).length,
      fromExisting: Object.values(masterTranslations.translations).filter(
        (t) => t.isFromExisting,
      ).length,
    },
    languageProgress: {},
    topMissingKeys: {},
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
          priority: entry.isFromCode ? "high" : "medium",
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

    // Top 20 clés manquantes les plus importantes (utilisées dans le code)
    report.topMissingKeys[lang] = missing
      .filter((m) => m.priority === "high")
      .slice(0, 20);
  }

  // Sauvegarder le rapport
  const reportPath = path.join(CONFIG.messagesDir, CONFIG.outputFileName);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");

  logger.success(`Rapport de progression généré: ${reportPath}`);
  return report;
}

/**
 * Affiche un résumé
 */
function displaySmartSummary(report) {
  console.log("\n📊 ANALYSE INTELLIGENTE DES TRADUCTIONS\n");
  console.log(`📝 Total des clés réelles: ${report.summary.totalKeys}`);
  console.log(`🔍 Détectées dans le code: ${report.summary.fromCode}`);
  console.log(`📁 Déjà existantes: ${report.summary.fromExisting}`);
  console.log(`🌐 Langues cibles: ${CONFIG.targetLanguages.join(", ")}\n`);

  for (const [lang, progress] of Object.entries(report.languageProgress)) {
    const emoji =
      progress.completionPercent === 100
        ? "✅"
        : progress.completionPercent > 70
          ? "🟡"
          : "🔴";
    console.log(
      `${emoji} ${lang.toUpperCase()}: ${progress.translated}/${report.summary.totalKeys} (${progress.completionPercent}%)`,
    );

    if (report.topMissingKeys[lang].length > 0) {
      console.log(`   🔥 Top clés manquantes utilisées dans le code:`);
      report.topMissingKeys[lang].slice(0, 5).forEach((key) => {
        console.log(`      - ${key.key}: "${key.sourceText}"`);
      });
    }
  }

  console.log("\n🎯 RECOMMANDATIONS:");
  console.log(
    '1. Concentrez-vous sur les clés "🔥 Top clés manquantes" en priorité',
  );
  console.log(
    "2. Configurez une API de traduction (DeepL/Google) dans votre .env",
  );
  console.log("3. Utilisez le fichier maître pour les corrections manuelles");
  console.log("4. Lancez pnpm i18n:translate pour la traduction automatique\n");
}

/**
 * Fonction principale
 */
async function main() {
  try {
    logger.info("🚀 Démarrage de l'analyse intelligente des traductions");

    // Créer le répertoire des messages s'il n'existe pas
    await fs.mkdir(CONFIG.messagesDir, { recursive: true });

    // Créer le fichier maître intelligent
    const masterTranslations = await createSmartMasterFile();

    // Générer le rapport
    const report = await generateProgressReport(masterTranslations);

    // Afficher le résumé
    displaySmartSummary(report);

    logger.success("✨ Analyse intelligente terminée avec succès!");
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
  scanCodeForTranslationKeys,
  createSmartMasterFile,
  generateProgressReport,
};
