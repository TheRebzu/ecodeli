/**
 * Configuration pour les scripts d'extraction et de traduction
 */
export default {
  // Langues prises en charge
  languages: {
    // Langue source (principale) du projet
    sourceLanguage: "fr",
    // Toutes les langues supportées (y compris la source)
    supportedLanguages: ["fr", "en"],
  },

  // Configuration de l'extraction des chaînes
  extraction: {
    // Répertoires à analyser pour l'extraction des chaînes
    directories: [
      "src/app",
      "src/components",
      "src/hooks",
      "src/lib",
      "src/server",
    ],
    // Extensions de fichiers à analyser
    extensions: ["ts", "tsx", "js", "jsx"],
    // Expressions régulières pour détecter les chaînes à traduire
    patterns: [
      // next-intl: t(...)
      {
        regex: /t\(['"]([^'"]+)['"]\)/g,
        group: 1,
      },
      // next-intl: t(..., {...})
      {
        regex: /t\(['"]([^'"]+)['"]\s*,/g,
        group: 1,
      },
      // const t = useTranslations('namespace')
      {
        regex: /useTranslations\(['"]([^'"]+)['"]\)/g,
        group: 1,
      },
      // formatMessage({ id: ... })
      {
        regex: /formatMessage\(\s*{\s*id:\s*['"]([^'"]+)['"]\s*}/g,
        group: 1,
      },
      // useTranslations().messages.*
      {
        regex: /useTranslations\(\)[.\s]*messages\.([a-zA-Z0-9_.]+)/g,
        group: 1,
      },
    ],
    // Répertoire de sortie pour les fichiers de traduction
    outputDir: "src/messages",
  },

  // Configuration pour la traduction automatique
  autoTranslation: {
    // Activer/désactiver la traduction automatique
    enabled: true,
    // Nombre maximum de caractères par requête API
    chunkSize: 4000,
    // Délai entre les requêtes API (ms)
    requestDelay: 500,
    // Préfixe pour les traductions non vérifiées
    unverifiedPrefix: "[TO_TRANSLATE] ",
  },

  // Configuration pour le rapport de traduction
  report: {
    // Chemin du fichier de rapport
    filePath: "translation-report.json",
    // Ignorer certaines clés lors de la génération du rapport
    ignoreKeys: [
      "common.system.error",
      "common.system.warning",
      "common.system.info",
    ],
  },

  // Chemin du rapport d'extraction
  outputPath: "translation-report.json",
};
