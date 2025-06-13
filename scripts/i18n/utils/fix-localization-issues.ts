#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { glob } from "glob";
import { fileURLToPath } from "url";

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");

// Langues supportées
const SUPPORTED_LANGUAGES = ["fr", "en", "es", "de", "it"];
const PRIMARY_LANGUAGE = "fr";

interface ComponentUsage {
  component: string;
  file: string;
  line: number;
  key: string;
  namespace: string | null;
}

/**
 * Trouve tous les composants qui utilisent des traductions
 */
async function findTranslationUsage(): Promise<ComponentUsage[]> {
  console.log(
    chalk.blue("🔍 Recherche des composants utilisant des traductions..."),
  );

  const usages: ComponentUsage[] = [];

  // Rechercher tous les fichiers React pour trouver les usages de useTranslations
  const tsxFiles = await glob("src/**/*.{tsx,ts}", { cwd: projectRoot });

  for (const file of tsxFiles) {
    const filePath = path.resolve(projectRoot, file);
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");

    // Trouver les déclarations de useTranslations
    const namespaceRegex = /useTranslations\(['"]([^'"]+)['"]\)/g;
    const namespaces = new Map<number, string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;

      while ((match = namespaceRegex.exec(line)) !== null) {
        namespaces.set(i, match[1]);
      }
    }

    // Trouver les usages de t()
    const translationUsageRegex = /t\(['"]([\w\.]+)['"]|t\(`([\w\.]+)`/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;

      // Trouver le namespace le plus proche pour cette ligne
      let activeNamespace: string | null = null;
      let closestLine = -1;

      for (const [nsLine, ns] of namespaces.entries()) {
        if (nsLine <= i && nsLine > closestLine) {
          closestLine = nsLine;
          activeNamespace = ns;
        }
      }

      while ((match = translationUsageRegex.exec(line)) !== null) {
        const key = match[1] || match[2];

        usages.push({
          component: path.basename(file),
          file: filePath,
          line: i + 1,
          key,
          namespace: activeNamespace,
        });
      }
    }
  }

  console.log(
    chalk.green(
      `✅ ${usages.length} usages de traduction trouvés dans les composants`,
    ),
  );
  return usages;
}

/**
 * Charge tous les fichiers de traduction
 */
async function loadTranslationFiles(): Promise<Record<string, any>> {
  console.log(chalk.blue("📚 Chargement des fichiers de traduction..."));

  const translations: Record<string, any> = {};

  // Charger chaque fichier de traduction
  for (const lang of SUPPORTED_LANGUAGES) {
    try {
      const filePath = path.resolve(projectRoot, `src/messages/${lang}.json`);
      const content = await fs.readFile(filePath, "utf-8");
      translations[lang] = JSON.parse(content);
    } catch (error) {
      console.warn(
        chalk.yellow(
          `⚠️ Impossible de charger le fichier de traduction pour ${lang}`,
        ),
      );
      translations[lang] = {};
    }
  }

  console.log(
    chalk.green(
      `✅ ${Object.keys(translations).length} fichiers de traduction chargés`,
    ),
  );
  return translations;
}

/**
 * Vérifie si une clé existe dans un objet de traduction (de manière récursive)
 */
function doesKeyExist(translations: any, key: string): boolean {
  const parts = key.split(".");
  let current = translations;

  for (const part of parts) {
    if (
      current === undefined ||
      current === null ||
      typeof current !== "object"
    ) {
      return false;
    }
    current = current[part];
  }

  return current !== undefined;
}

/**
 * Définit une valeur dans un objet de traduction
 */
function setTranslationValue(
  translations: any,
  key: string,
  value: string,
): void {
  const parts = key.split(".");
  let current = translations;

  // Créer la structure d'objets imbriqués si nécessaire
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    } else if (typeof current[part] !== "object") {
      // Si la partie est déjà une valeur, la transformer en objet
      current[part] = {};
    }
    current = current[part];
  }

  // Définir la valeur
  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}

/**
 * Résout les problèmes de clés manquantes dans les fichiers de traduction
 */
async function fixMissingKeys(
  usages: ComponentUsage[],
  translations: Record<string, any>,
): Promise<void> {
  console.log(chalk.blue("🔧 Analyse des clés manquantes..."));

  const missingKeys: Record<string, string[]> = {};

  // Pour chaque langue
  for (const lang of SUPPORTED_LANGUAGES) {
    missingKeys[lang] = [];

    // Pour chaque usage trouvé dans les composants
    for (const usage of usages) {
      let fullKey = usage.key;

      // Si l'usage a un namespace et que la clé n'est pas déjà qualifiée
      if (usage.namespace && !usage.key.includes(".")) {
        fullKey = `${usage.namespace}.${usage.key}`;
      }

      // Vérifier si la clé existe dans les traductions
      if (!doesKeyExist(translations[lang], fullKey)) {
        missingKeys[lang].push(fullKey);

        console.log(
          chalk.yellow(
            `⚠️ Clé manquante: ${fullKey} dans ${lang}.json (utilisée dans ${usage.component}:${usage.line})`,
          ),
        );

        // Créer les clés manquantes en utilisant la valeur du langage primaire
        // ou la clé elle-même comme valeur par défaut
        let defaultValue = usage.key.split(".").pop() || usage.key;

        if (
          lang !== PRIMARY_LANGUAGE &&
          doesKeyExist(translations[PRIMARY_LANGUAGE], fullKey)
        ) {
          const value = getNestedValue(translations[PRIMARY_LANGUAGE], fullKey);
          defaultValue =
            lang === PRIMARY_LANGUAGE ? value : `[TO_TRANSLATE] ${value}`;
        }

        setTranslationValue(translations[lang], fullKey, defaultValue);
      }

      // Vérifier également si la clé est accessible sans le namespace
      // (cas où le composant utilise useTranslations('namespace') puis t('key'))
      if (usage.namespace && usage.key.includes(".")) {
        const directKey = usage.key; // Sans le namespace

        if (!doesKeyExist(translations[lang], directKey)) {
          missingKeys[lang].push(directKey);

          console.log(
            chalk.yellow(
              `⚠️ Clé directe manquante: ${directKey} dans ${lang}.json (utilisée dans ${usage.component}:${usage.line})`,
            ),
          );

          // Créer aussi la clé directe
          let defaultValue = directKey.split(".").pop() || directKey;

          if (
            lang !== PRIMARY_LANGUAGE &&
            doesKeyExist(translations[PRIMARY_LANGUAGE], directKey)
          ) {
            const value = getNestedValue(
              translations[PRIMARY_LANGUAGE],
              directKey,
            );
            defaultValue =
              lang === PRIMARY_LANGUAGE ? value : `[TO_TRANSLATE] ${value}`;
          }

          setTranslationValue(translations[lang], directKey, defaultValue);
        }
      }
    }
  }

  // Sauvegarder les fichiers de traduction modifiés
  for (const lang of SUPPORTED_LANGUAGES) {
    if (missingKeys[lang].length > 0) {
      console.log(
        chalk.blue(
          `📝 Mise à jour de ${lang}.json avec ${missingKeys[lang].length} nouvelles clés...`,
        ),
      );

      const filePath = path.resolve(projectRoot, `src/messages/${lang}.json`);
      await fs.writeFile(
        filePath,
        JSON.stringify(translations[lang], null, 2),
        "utf-8",
      );
    }
  }

  console.log(chalk.green("✅ Corrections des clés manquantes terminées"));
}

/**
 * Récupère une valeur depuis un objet imbriqué
 */
function getNestedValue(obj: any, key: string): any {
  const parts = key.split(".");
  let current = obj;

  for (const part of parts) {
    if (
      current === undefined ||
      current === null ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Fonction principale
 */
async function main() {
  try {
    console.log(
      chalk.blue.bold(
        "🚀 Démarrage de la correction automatique des problèmes de localisation...",
      ),
    );

    // Trouver tous les usages de traductions dans les composants
    const usages = await findTranslationUsage();

    // Charger tous les fichiers de traduction
    const translations = await loadTranslationFiles();

    // Résoudre les problèmes de clés manquantes
    await fixMissingKeys(usages, translations);

    console.log(
      chalk.green.bold(
        "✅ Correction des problèmes de localisation terminée avec succès",
      ),
    );
  } catch (error) {
    console.error(
      chalk.red(
        `❌ Erreur lors de la correction des problèmes de localisation: ${error}`,
      ),
    );
    throw error;
  }
}

// Exécuter le script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(chalk.red(`❌ Erreur non gérée: ${error}`));
    process.exit(1);
  });
}

export { main as fixLocalizationIssues };
