#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { glob } from "glob";
import { fileURLToPath } from "url";
import { program } from "commander";

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

// Options de la ligne de commande
program
  .option("-l, --locale <locale>", "Langue à valider (par défaut: toutes)", "")
  .option("-v, --verbose", "Afficher des informations détaillées")
  .option("-f, --fix", "Tenter de corriger automatiquement les problèmes")
  .parse(process.argv);

const options = program.opts();

/**
 * Interface pour les erreurs de traduction
 */
interface TranslationError {
  type: "missing" | "unused" | "invalid" | "placeholder";
  key: string;
  file?: string;
  line?: number;
  locale?: string;
  message: string;
}

/**
 * Extraire toutes les clés utilisées dans le code
 */
async function extractUsedKeys(): Promise<Set<string>> {
  const usedKeys = new Set<string>();

  // Récupérer tous les fichiers source
  const files = await glob("src/**/*.{ts,tsx,js,jsx}", {
    ignore: ["**/node_modules/**", "**/.next/**"],
    cwd: projectRoot,
  });

  for (const file of files) {
    const filePath = path.resolve(projectRoot, file);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");

      // Détecter les namespaces utilisés avec useTranslations
      const namespaces = new Set<string>();
      const namespaceMatches = content.matchAll(
        /useTranslations\(['"]([\w\.]+)['"]\)/g,
      );
      for (const match of namespaceMatches) {
        namespaces.add(match[1]);
      }

      // Si pas de namespace explicite, utiliser 'common'
      if (namespaces.size === 0) {
        namespaces.add("common");
      }

      // Extraire les clés de traduction
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Chercher les appels t('key')
        const tMatches = line.matchAll(/\bt\(['"]([\w\.]+)['"]/g);
        for (const match of tMatches) {
          const key = match[1];

          // Si la clé contient déjà un namespace, l'utiliser directement
          if (key.includes(".")) {
            usedKeys.add(key);
          } else {
            // Sinon, combiner avec tous les namespaces détectés
            for (const ns of namespaces) {
              usedKeys.add(`${ns}.${key}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️ Impossible de lire le fichier ${file}: ${error}`),
      );
    }
  }

  return usedKeys;
}

/**
 * Charger un fichier de traduction
 */
async function loadTranslationFile(
  locale: string,
): Promise<Record<string, any>> {
  const filePath = path.resolve(projectRoot, "src/messages", `${locale}.json`);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Impossible de charger le fichier de traduction pour ${locale}: ${error}`,
    );
  }
}

/**
 * Extraire toutes les clés d'un objet de traduction de manière récursive
 */
function extractTranslationKeys(
  obj: Record<string, any>,
  prefix = "",
): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Récursion pour les objets imbriqués
      const nestedKeys = extractTranslationKeys(value, fullKey);
      for (const nestedKey of nestedKeys) {
        keys.add(nestedKey);
      }
    } else {
      // Clé finale
      keys.add(fullKey);
    }
  }

  return keys;
}

/**
 * Valider les traductions pour une langue
 */
async function validateLocale(
  locale: string,
  usedKeys: Set<string>,
): Promise<TranslationError[]> {
  const errors: TranslationError[] = [];

  try {
    const translations = await loadTranslationFile(locale);
    const availableKeys = extractTranslationKeys(translations);

    // Chercher les clés manquantes
    for (const usedKey of usedKeys) {
      if (!availableKeys.has(usedKey)) {
        errors.push({
          type: "missing",
          key: usedKey,
          locale,
          message: `Clé de traduction manquante: ${usedKey}`,
        });
      }
    }

    // Chercher les clés inutilisées (seulement en mode verbose)
    if (options.verbose) {
      for (const availableKey of availableKeys) {
        if (!usedKeys.has(availableKey)) {
          errors.push({
            type: "unused",
            key: availableKey,
            locale,
            message: `Clé de traduction non utilisée: ${availableKey}`,
          });
        }
      }
    }
  } catch (error) {
    errors.push({
      type: "invalid",
      key: "file",
      locale,
      message: `Erreur lors du chargement du fichier de traduction: ${error}`,
    });
  }

  return errors;
}

/**
 * Créer une structure d'objet imbriquée à partir d'une clé pointée
 */
function setNestedValue(
  obj: Record<string, any>,
  keyPath: string,
  value: any,
): void {
  const keys = keyPath.split(".");
  let current = obj;

  // Naviguer jusqu'à la clé parent
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (
      !current[key] ||
      typeof current[key] !== "object" ||
      Array.isArray(current[key])
    ) {
      current[key] = {};
    }
    current = current[key];
  }

  // Définir la valeur finale
  const finalKey = keys[keys.length - 1];
  current[finalKey] = value;
}

/**
 * Corriger automatiquement les erreurs de traduction
 */
async function fixTranslationErrors(errors: TranslationError[]): Promise<void> {
  const errorsByLocale = new Map<string, TranslationError[]>();

  // Grouper les erreurs par langue
  for (const error of errors) {
    if (error.type === "missing" && error.locale) {
      if (!errorsByLocale.has(error.locale)) {
        errorsByLocale.set(error.locale, []);
      }
      errorsByLocale.get(error.locale)!.push(error);
    }
  }

  // Corriger chaque fichier de langue
  for (const [locale, localeErrors] of errorsByLocale) {
    try {
      const translations = await loadTranslationFile(locale);
      let modified = false;

      for (const error of localeErrors) {
        if (error.type === "missing") {
          // Vérifier si la clé existe déjà (éviter les doublons)
          const availableKeys = extractTranslationKeys(translations);
          if (!availableKeys.has(error.key)) {
            // Déterminer la valeur de traduction appropriée
            let translationValue: string;

            if (locale === "fr") {
              // Pour le français, essayer de deviner une traduction raisonnable
              const keyParts = error.key.split(".");
              const lastPart = keyParts[keyParts.length - 1];

              // Mappings courants pour les actions
              const commonTranslations: Record<string, string> = {
                // Actions du dashboard client
                createAnnouncement: "Créer une annonce",
                searchServices: "Rechercher des services",
                trackDeliveries: "Suivre mes livraisons",
                bookStorage: "Réserver stockage",
                scheduleService: "Programmer un service",
                viewInvoices: "Voir mes factures",
                updateProfile: "Modifier profil",
                contactSupport: "Contacter le support",

                // Titres communs
                title: "Titre",
                quickActions: "Actions rapides",
                recentActivity: "Activité récente",
                dashboard: "Tableau de bord",

                // Actions générales
                save: "Enregistrer",
                cancel: "Annuler",
                delete: "Supprimer",
                edit: "Modifier",
                create: "Créer",
                view: "Voir",
                update: "Mettre à jour",
                search: "Rechercher",
                filter: "Filtrer",
                export: "Exporter",
                import: "Importer",
                upload: "Télécharger",
                download: "Télécharger",
                back: "Retour",
                next: "Suivant",
                previous: "Précédent",
                submit: "Soumettre",
                confirm: "Confirmer",
                yes: "Oui",
                no: "Non",
              };

              translationValue =
                commonTranslations[lastPart] || `[À TRADUIRE] ${lastPart}`;
            } else {
              // Pour les autres langues, marquer comme à traduire
              translationValue = `[TO_TRANSLATE] ${error.key}`;
            }

            // Ajouter la clé avec la valeur appropriée
            setNestedValue(translations, error.key, translationValue);
            modified = true;
            console.log(
              chalk.green(
                `➕ Ajout de la clé manquante: ${error.key} = "${translationValue}"`,
              ),
            );
          }
        }
      }

      // Sauvegarder le fichier modifié
      if (modified) {
        const filePath = path.resolve(
          projectRoot,
          "src/messages",
          `${locale}.json`,
        );
        await fs.writeFile(
          filePath,
          JSON.stringify(translations, null, 2) + "\n",
          "utf-8",
        );
        console.log(chalk.green(`✅ Fichier ${locale}.json mis à jour`));
      }
    } catch (error) {
      console.error(
        chalk.red(`❌ Erreur lors de la correction pour ${locale}: ${error}`),
      );
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log(chalk.blue("🔍 Validation des clés de traduction manquantes..."));

  try {
    // Extraire les clés utilisées dans le code
    console.log(chalk.blue("📝 Extraction des clés utilisées..."));
    const usedKeys = await extractUsedKeys();
    console.log(chalk.green(`✅ ${usedKeys.size} clés trouvées dans le code`));

    if (options.verbose) {
      console.log(chalk.blue("📋 Exemples de clés utilisées:"));
      const examples = Array.from(usedKeys).slice(0, 10);
      examples.forEach((key) => console.log(`   - ${key}`));

      if (usedKeys.size > 10) {
        console.log(`   ... et ${usedKeys.size - 10} autres`);
      }
    }

    // Déterminer les langues à valider
    const locales = options.locale ? [options.locale] : ["fr", "en"];

    // Valider chaque langue
    const allErrors: TranslationError[] = [];

    for (const locale of locales) {
      console.log(chalk.blue(`🔍 Validation de la langue: ${locale}`));
      const errors = await validateLocale(locale, usedKeys);
      allErrors.push(...errors);

      const missingErrors = errors.filter((e) => e.type === "missing");
      const unusedErrors = errors.filter((e) => e.type === "unused");

      if (missingErrors.length === 0) {
        console.log(chalk.green(`✅ Aucune clé manquante pour ${locale}`));
      } else {
        console.log(
          chalk.yellow(
            `⚠️ ${missingErrors.length} clé(s) manquante(s) pour ${locale}`,
          ),
        );

        if (options.verbose) {
          missingErrors.slice(0, 5).forEach((error) => {
            console.log(`   ❌ ${error.message}`);
          });
          if (missingErrors.length > 5) {
            console.log(
              `   ... et ${missingErrors.length - 5} autres clés manquantes`,
            );
          }
        }
      }

      if (options.verbose && unusedErrors.length > 0) {
        console.log(
          chalk.blue(
            `ℹ️ ${unusedErrors.length} clé(s) inutilisée(s) pour ${locale}`,
          ),
        );
      }
    }

    // Résumé des erreurs
    const missingErrors = allErrors.filter((e) => e.type === "missing");

    if (missingErrors.length > 0) {
      console.log(chalk.yellow("\n📊 Résumé des clés manquantes:"));

      const errorsByLocale = new Map<string, number>();
      for (const error of missingErrors) {
        if (error.locale) {
          errorsByLocale.set(
            error.locale,
            (errorsByLocale.get(error.locale) || 0) + 1,
          );
        }
      }

      for (const [locale, count] of errorsByLocale) {
        console.log(`   ${locale}: ${count} clé(s) manquante(s)`);
      }

      // Correction automatique si demandée
      if (options.fix) {
        console.log(
          chalk.blue("\n🔧 Correction automatique des clés manquantes..."),
        );
        await fixTranslationErrors(missingErrors);
        console.log(chalk.green("✅ Correction terminée!"));
      } else {
        console.log(
          chalk.blue(
            "\n💡 Utilisez --fix pour corriger automatiquement les clés manquantes",
          ),
        );
        process.exit(1);
      }
    } else {
      console.log(
        chalk.green("\n✅ Toutes les clés de traduction sont présentes !"),
      );
    }
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la validation: ${error}`));
    process.exit(1);
  }
}

// Exécuter le script
main().catch((error) => {
  console.error(chalk.red(`❌ Erreur non gérée: ${error}`));
  process.exit(1);
});
