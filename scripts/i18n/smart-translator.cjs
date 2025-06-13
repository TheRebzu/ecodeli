#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
require("dotenv").config();

// Configuration
const CONFIG = {
  messagesDir: path.resolve(__dirname, "../../src/messages"),
  masterFileName: "master-translations.json",
  apiKeys: {
    deepl: process.env.DEEPL_API_KEY,
    google: process.env.GOOGLE_TRANSLATE_API_KEY,
  },
  apiUrls: {
    deepl: "https://api-free.deepl.com/v2/translate",
    google: "https://translation.googleapis.com/language/translate/v2",
  },
  requestDelay: 1500, // 1.5 secondes entre les requêtes pour éviter les limits
  batchSize: 10, // Traiter par petits lots
  maxRetries: 3,
};

const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  progress: (msg) => console.log(`🔄 ${msg}`),
};

/**
 * Délai entre les requêtes
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Traduction avec DeepL (méthode recommandée)
 */
async function translateWithDeepL(text, targetLang) {
  if (!CONFIG.apiKeys.deepl) {
    throw new Error("Clé API DeepL non configurée");
  }

  const langMap = {
    en: "EN-US",
    es: "ES",
    de: "DE",
    it: "IT",
  };

  const targetCode = langMap[targetLang];
  if (!targetCode) {
    throw new Error(`Langue ${targetLang} non supportée par DeepL`);
  }

  try {
    const response = await fetch(CONFIG.apiUrls.deepl, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${CONFIG.apiKeys.deepl}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [text],
        source_lang: "FR",
        target_lang: targetCode,
        formality: "default",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepL API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const translated = data.translations?.[0]?.text;

    if (!translated) {
      throw new Error("Réponse DeepL invalide");
    }

    return translated.trim();
  } catch (error) {
    logger.error(`DeepL error pour "${text}": ${error.message}`);
    throw error;
  }
}

/**
 * Traduction avec Google Translate
 */
async function translateWithGoogle(text, targetLang) {
  if (!CONFIG.apiKeys.google) {
    throw new Error("Clé API Google non configurée");
  }

  try {
    const response = await fetch(
      `${CONFIG.apiUrls.google}?key=${CONFIG.apiKeys.google}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          source: "fr",
          target: targetLang,
          format: "text",
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const translated = data.data?.translations?.[0]?.translatedText;

    if (!translated) {
      throw new Error("Réponse Google invalide");
    }

    return translated.trim();
  } catch (error) {
    logger.error(`Google error pour "${text}": ${error.message}`);
    throw error;
  }
}

/**
 * Traduit un texte avec retry automatique
 */
async function translateWithRetry(text, targetLang, method = "auto") {
  if (!text || text.trim() === "") return text;

  const cleanText = text.trim();
  let lastError;

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      let translated;

      if (method === "auto") {
        // Essayer DeepL en premier, puis Google
        if (CONFIG.apiKeys.deepl) {
          translated = await translateWithDeepL(cleanText, targetLang);
        } else if (CONFIG.apiKeys.google) {
          translated = await translateWithGoogle(cleanText, targetLang);
        } else {
          throw new Error("Aucune API de traduction configurée");
        }
      } else if (method === "deepl") {
        translated = await translateWithDeepL(cleanText, targetLang);
      } else if (method === "google") {
        translated = await translateWithGoogle(cleanText, targetLang);
      }

      if (translated && translated !== cleanText) {
        return translated;
      } else {
        throw new Error("Traduction identique au texte source");
      }
    } catch (error) {
      lastError = error;
      if (attempt < CONFIG.maxRetries) {
        const waitTime = CONFIG.requestDelay * attempt;
        logger.warning(
          `Tentative ${attempt} échouée pour "${cleanText}", retry dans ${waitTime}ms`,
        );
        await delay(waitTime);
      }
    }
  }

  throw lastError;
}

/**
 * Traduit toutes les entrées manquantes dans le fichier maître
 */
async function translateMasterFile() {
  const masterPath = path.join(CONFIG.messagesDir, CONFIG.masterFileName);

  try {
    // Charger le fichier maître
    const content = await fs.readFile(masterPath, "utf-8");
    const masterData = JSON.parse(content);

    if (!masterData.translations) {
      logger.error("Fichier maître invalide - pas de section translations");
      return;
    }

    // Vérifier la disponibilité des API
    const hasDeepL = !!CONFIG.apiKeys.deepl;
    const hasGoogle = !!CONFIG.apiKeys.google;

    if (!hasDeepL && !hasGoogle) {
      logger.error("❌ Aucune API de traduction configurée!");
      logger.info("Ajoutez une de ces clés dans votre .env:");
      logger.info("  DEEPL_API_KEY=votre_cle_deepl (recommandé)");
      logger.info("  GOOGLE_TRANSLATE_API_KEY=votre_cle_google");
      return;
    }

    logger.info(
      `🔑 API disponible: ${hasDeepL ? "DeepL (recommandé)" : "Google Translate"}`,
    );

    // Statistiques
    let totalProcessed = 0;
    let totalTranslated = 0;
    let totalErrors = 0;
    const stats = {};

    // Pour chaque langue cible
    const targetLanguages = masterData._metadata?.targetLanguages || [
      "en",
      "es",
      "de",
      "it",
    ];

    for (const lang of targetLanguages) {
      logger.progress(`\n🌐 Traduction vers ${lang.toUpperCase()}...`);
      stats[lang] = { processed: 0, translated: 0, skipped: 0, errors: 0 };

      // Filtrer les entrées qui ont besoin de traduction
      const entriesToTranslate = [];
      for (const [key, entry] of Object.entries(masterData.translations)) {
        if (
          !entry.translations[lang] ||
          !entry.translations[lang].text ||
          entry.translations[lang].status === "needs_translation"
        ) {
          if (entry.sourceText && entry.sourceText.length > 0) {
            entriesToTranslate.push({ key, entry });
          }
        }
      }

      logger.info(
        `📝 ${entriesToTranslate.length} entrées à traduire pour ${lang}`,
      );

      if (entriesToTranslate.length === 0) {
        logger.success(`${lang.toUpperCase()}: Aucune traduction nécessaire`);
        continue;
      }

      // Traiter par lots
      for (let i = 0; i < entriesToTranslate.length; i += CONFIG.batchSize) {
        const batch = entriesToTranslate.slice(i, i + CONFIG.batchSize);
        const progressPercent = Math.round(
          (i / entriesToTranslate.length) * 100,
        );

        logger.progress(
          `📦 Lot ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(entriesToTranslate.length / CONFIG.batchSize)} (${progressPercent}%)`,
        );

        // Traiter chaque entrée du lot
        for (const { key, entry } of batch) {
          try {
            logger.progress(`🔤 Traduction: "${entry.sourceText}" -> ${lang}`);

            const translatedText = await translateWithRetry(
              entry.sourceText,
              lang,
            );

            // Mettre à jour l'entrée
            if (!entry.translations[lang]) {
              entry.translations[lang] = {};
            }

            entry.translations[lang].text = translatedText;
            entry.translations[lang].status = "translated";
            entry.translations[lang].lastUpdated = new Date().toISOString();
            entry.translations[lang].method = hasDeepL ? "deepl" : "google";
            entry.translations[lang].quality = "api";

            stats[lang].translated++;
            totalTranslated++;

            logger.success(`✨ "${key}": "${translatedText}"`);
          } catch (error) {
            logger.error(`💥 Erreur "${key}": ${error.message}`);

            // Marquer comme erreur mais ne pas arrêter
            if (!entry.translations[lang]) {
              entry.translations[lang] = {};
            }
            entry.translations[lang].text = "";
            entry.translations[lang].status = "translation_failed";
            entry.translations[lang].error = error.message;
            entry.translations[lang].lastUpdated = new Date().toISOString();

            stats[lang].errors++;
            totalErrors++;
          }

          stats[lang].processed++;
          totalProcessed++;

          // Délai entre chaque traduction
          await delay(CONFIG.requestDelay);
        }

        logger.info(
          `📊 ${lang}: ${stats[lang].translated} traduites, ${stats[lang].errors} erreurs`,
        );
      }

      logger.success(
        `🎉 ${lang.toUpperCase()}: ${stats[lang].translated} nouvelles traductions`,
      );
    }

    // Mettre à jour les métadonnées
    masterData._metadata.lastTranslation = new Date().toISOString();
    masterData._metadata.translationStats = stats;
    masterData._metadata.apiUsed = hasDeepL ? "deepl" : "google";

    // Sauvegarder le fichier maître mis à jour
    await fs.writeFile(
      masterPath,
      JSON.stringify(masterData, null, 2),
      "utf-8",
    );

    logger.success(`\n🎯 RÉSUMÉ FINAL:`);
    logger.success(`✅ ${totalTranslated} nouvelles traductions`);
    logger.success(`❌ ${totalErrors} erreurs`);
    logger.success(`📊 ${totalProcessed} entrées traitées`);

    return masterData;
  } catch (error) {
    logger.error(`Erreur lors de la traduction: ${error.message}`);
    throw error;
  }
}

/**
 * Régénère les fichiers de langue depuis le maître
 */
async function regenerateLanguageFiles(masterData) {
  logger.progress("🔄 Régénération des fichiers de langue...");

  // Fonction utilitaire pour créer un objet imbriqué
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

    current[keys[keys.length - 1]] = value;
  }

  // Génération du fichier source (français)
  const sourceTranslations = {};
  for (const [key, entry] of Object.entries(masterData.translations)) {
    if (entry.sourceText) {
      setDeepValue(sourceTranslations, key, entry.sourceText);
    }
  }

  const sourcePath = path.join(CONFIG.messagesDir, "fr.json");
  await fs.writeFile(
    sourcePath,
    JSON.stringify(sourceTranslations, null, 2),
    "utf-8",
  );
  logger.success("📄 Fichier fr.json régénéré");

  // Génération des fichiers cibles
  const targetLanguages = masterData._metadata?.targetLanguages || [
    "en",
    "es",
    "de",
    "it",
  ];

  for (const lang of targetLanguages) {
    const langTranslations = {};
    let completedCount = 0;
    let totalCount = 0;

    for (const [key, entry] of Object.entries(masterData.translations)) {
      totalCount++;
      const translation = entry.translations[lang];

      if (
        translation &&
        translation.text &&
        translation.status === "translated"
      ) {
        setDeepValue(langTranslations, key, translation.text);
        completedCount++;
      } else {
        // Ne pas marquer comme [TO_TRANSLATE] si on a une API
        if (CONFIG.apiKeys.deepl || CONFIG.apiKeys.google) {
          // Laisser vide pour indiquer qu'il faut relancer la traduction
          setDeepValue(langTranslations, key, "");
        } else {
          setDeepValue(
            langTranslations,
            key,
            `[NEEDS_TRANSLATION] ${entry.sourceText}`,
          );
        }
      }
    }

    const langPath = path.join(CONFIG.messagesDir, `${lang}.json`);
    await fs.writeFile(
      langPath,
      JSON.stringify(langTranslations, null, 2),
      "utf-8",
    );

    const percentage = Math.round((completedCount / totalCount) * 100);
    logger.success(
      `📄 ${lang}.json: ${completedCount}/${totalCount} (${percentage}%)`,
    );
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    logger.info("🚀 Démarrage du traducteur intelligent...");

    // Vérifier que le fichier maître existe
    const masterPath = path.join(CONFIG.messagesDir, CONFIG.masterFileName);
    try {
      await fs.access(masterPath);
    } catch {
      logger.error(`❌ Fichier maître non trouvé: ${masterPath}`);
      logger.info("Exécutez d'abord: pnpm i18n:smart");
      process.exit(1);
    }

    // Lancer la traduction
    const masterData = await translateMasterFile();

    if (masterData) {
      // Régénérer tous les fichiers
      await regenerateLanguageFiles(masterData);

      logger.success("🎉 Traduction intelligente terminée!");
      logger.info("📁 Vérifiez les fichiers dans src/messages/");
    }
  } catch (error) {
    logger.error(`💥 Erreur fatale: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  translateWithRetry,
  translateMasterFile,
  regenerateLanguageFiles,
};
