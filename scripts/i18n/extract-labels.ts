#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import config from './extraction.config';

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Interfaces pour les traductions
 */
interface FoundTranslation {
  key: string;
  file: string;
  line: number;
}

interface TranslationMap {
  [key: string]: {
    occurrences: Array<{ file: string; line: number }>;
  };
}

// Patterns de détection améliorés pour tous les cas possibles
const translationPatterns = [
  // useTranslations('namespace')
  { regex: /useTranslations\(['"]([\w\.]+)['"]/, group: 1, type: 'namespace' },

  // t('key')
  { regex: /t\(['"]([\w\.]+)['"]/, group: 1, type: 'key' },

  // getTranslations('namespace')
  { regex: /getTranslations\(['"]([\w\.]+)['"]/, group: 1, type: 'namespace' },

  // formatMessage({ id: 'key' })
  { regex: /formatMessage\(\s*\{\s*id:\s*['"]([\w\.]+)['"]/, group: 1, type: 'key' },

  // FormattedMessage id="key"
  { regex: /<FormattedMessage[^>]*id=["']([\w\.]+)["']/, group: 1, type: 'key' },

  // Trans i18nKey="key"
  { regex: /<Trans[^>]*i18nKey=["']([\w\.]+)["']/, group: 1, type: 'key' },

  // getTranslation('key')
  { regex: /getTranslation\(['"]([\w\.]+)['"]/, group: 1, type: 'key' },

  // translate('key')
  { regex: /translate\(['"]([\w\.]+)['"]/, group: 1, type: 'key' },

  // NextIntl direct usage
  { regex: /NextIntl\.(['"]([\w\.]+)['"])/, group: 2, type: 'key' },

  // next-intl getMessage
  { regex: /getMessage\([^,]*,\s*['"]([\w\.]+)['"]/, group: 1, type: 'key' },

  // useTranslations().format
  { regex: /useTranslations\(\)\.format\(['"]([\w\.]+)['"]/, group: 1, type: 'key' },

  // any function with t.key pattern
  { regex: /\bt\.['"]([\w\.]+)['"]/, group: 1, type: 'key' },

  // JSX: {t('key')}
  { regex: /\{t\(['"]([\w\.]+)['"]\)\}/, group: 1, type: 'key' },

  // formatMessage patterns
  { regex: /formatMessage\(\{[^}]*defaultMessage:["'](.*?)["']/, group: 1, type: 'value' },
];

/**
 * Extrait les chaînes de traduction d'un fichier
 */
async function extractFromFile(
  filePath: string,
  patterns = translationPatterns
): Promise<FoundTranslation[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const foundTranslations: FoundTranslation[] = [];
    let namespaces: string[] = [];

    // Première passe pour trouver les namespaces
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const pattern of patterns) {
        if (pattern.type === 'namespace') {
          const regex = new RegExp(pattern.regex, 'g');
          let match;

          while ((match = regex.exec(line)) !== null) {
            if (match[pattern.group]) {
              namespaces.push(match[pattern.group]);
            }
          }
        }
      }
    }

    // Utiliser le namespace par défaut si aucun n'est trouvé
    if (namespaces.length === 0) {
      namespaces = ['common'];
    }

    // Deuxième passe pour les clés en utilisant les namespaces détectés
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const pattern of patterns) {
        if (pattern.type === 'key') {
          const regex = new RegExp(pattern.regex, 'g');
          let match;

          while ((match = regex.exec(line)) !== null) {
            if (match[pattern.group]) {
              const key = match[pattern.group];

              // Si la clé contient déjà un point, c'est qu'elle est déjà qualifiée
              if (key.includes('.')) {
                foundTranslations.push({
                  key,
                  file: filePath,
                  line: lineIndex + 1,
                });
              } else {
                // Sinon, on préfixe avec chaque namespace trouvé
                for (const namespace of namespaces) {
                  foundTranslations.push({
                    key: `${namespace}.${key}`,
                    file: filePath,
                    line: lineIndex + 1,
                  });
                }
              }
            }
          }
        }
      }
    }

    return foundTranslations;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de l'analyse du fichier ${filePath}: ${error}`));
    return [];
  }
}

/**
 * Récupère tous les fichiers à analyser
 */
async function getFilesToProcess(): Promise<string[]> {
  const allFiles: string[] = [];

  for (const directory of config.extraction.directories) {
    const fullDirPath = path.resolve(projectRoot, directory);
    console.log(chalk.blue(`🔍 Analyse du répertoire: ${fullDirPath}`));

    for (const ext of config.extraction.extensions) {
      // Utiliser le pattern relatif avec cwd qui fonctionne le mieux sur Windows
      const pattern = `${directory}/**/*.${ext}`;

      try {
        console.log(chalk.blue(`🔍 Recherche avec le pattern: ${pattern}`));
        const files = await glob(pattern, {
          ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
          cwd: projectRoot,
        });

        // Convertir les chemins relatifs en chemins absolus
        const absFiles = files.map(f => path.resolve(projectRoot, f));

        console.log(chalk.green(`✅ ${files.length} fichiers trouvés pour ${pattern}`));

        if (files.length > 0) {
          allFiles.push(...absFiles);

          // Afficher quelques fichiers trouvés (pour le debug)
          const sampleFiles = files.slice(0, 3);
          console.log(chalk.blue(`📄 Exemples: ${sampleFiles.join(', ')}`));
        }
      } catch (error) {
        console.error(
          chalk.red(`❌ Erreur lors de la recherche avec le pattern ${pattern}: ${error}`)
        );
      }
    }
  }

  // Éliminer les doublons
  const uniqueFiles = [...new Set(allFiles)];
  console.log(chalk.green(`✅ Total: ${uniqueFiles.length} fichiers uniques à analyser`));

  return uniqueFiles;
}

/**
 * Analyse un fichier pour trouver les chaînes de traduction à extraire directement
 */
async function findUseTranslationsNamespaces(file: string): Promise<string[]> {
  try {
    const content = await fs.readFile(file, 'utf-8');
    const useTransPattern = /useTranslations\(['"]([^'"]+)['"]\)/g;
    const namespaces: string[] = [];

    let match;
    while ((match = useTransPattern.exec(content)) !== null) {
      if (match[1]) {
        namespaces.push(match[1]);
      }
    }

    if (namespaces.length > 0) {
      console.log(
        chalk.green(
          `✅ Trouvé ${namespaces.length} namespace(s) dans ${file}: ${namespaces.join(', ')}`
        )
      );
    }

    return namespaces;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de l'analyse des namespaces dans ${file}: ${error}`));
    return [];
  }
}

/**
 * Extrait toutes les chaînes de traduction des fichiers
 */
async function extractAllTranslations(): Promise<TranslationMap> {
  const files = await getFilesToProcess();
  console.log(chalk.blue(`🔍 Analyse de ${files.length} fichiers...`));

  const translationMap: TranslationMap = {};

  for (const file of files) {
    try {
      const relativeFilePath = path.relative(projectRoot, file);
      console.log(chalk.blue(`🔍 Analyse du fichier: ${relativeFilePath}`));

      const foundTranslations = await extractFromFile(file);

      for (const translation of foundTranslations) {
        if (!translationMap[translation.key]) {
          translationMap[translation.key] = {
            occurrences: [],
          };
        }

        translationMap[translation.key].occurrences.push({
          file: relativeFilePath,
          line: translation.line,
        });
      }
    } catch (error) {
      console.error(chalk.red(`❌ Erreur lors de l'analyse du fichier ${file}: ${error}`));
    }
  }

  console.log(
    chalk.green(`✅ Extraction terminée: ${Object.keys(translationMap).length} clés trouvées`)
  );

  return translationMap;
}

/**
 * Génère les fichiers de traduction à partir de la carte de traduction
 */
async function generateTranslationFiles(translationMap: TranslationMap): Promise<void> {
  try {
    // Vérifier si les répertoires existent, sinon les créer
    const messagesDir = path.resolve(projectRoot, 'src/messages');
    await fs.mkdir(messagesDir, { recursive: true });

    // Lire les traductions existantes
    const frPath = path.resolve(messagesDir, 'fr.json');
    const enPath = path.resolve(messagesDir, 'en.json');

    let existingFrTranslations = {};
    let existingEnTranslations = {};

    try {
      const frContent = await fs.readFile(frPath, 'utf-8');
      existingFrTranslations = JSON.parse(frContent);
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️ Impossible de lire fr.json: ${error}. Création d'un nouveau fichier.`)
      );
    }

    try {
      const enContent = await fs.readFile(enPath, 'utf-8');
      existingEnTranslations = JSON.parse(enContent);
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️ Impossible de lire en.json: ${error}. Création d'un nouveau fichier.`)
      );
    }

    // Générer les nouvelles traductions
    const frTranslations = createNestedObject(translationMap, existingFrTranslations, true);
    const enTranslations = createNestedObject(translationMap, existingEnTranslations, false);

    // Écrire les fichiers
    await fs.writeFile(frPath, JSON.stringify(frTranslations, null, 2), 'utf-8');
    await fs.writeFile(enPath, JSON.stringify(enTranslations, null, 2), 'utf-8');

    console.log(chalk.green(`✅ Fichiers de traduction générés avec succès.`));
  } catch (error) {
    console.error(
      chalk.red(`❌ Erreur lors de la génération des fichiers de traduction: ${error}`)
    );
  }
}

/**
 * Crée un objet imbriqué à partir d'une carte de traduction plate
 */
function createNestedObject(
  translationMap: TranslationMap,
  existingTranslations: Record<string, any>,
  isSourceLanguage: boolean
): Record<string, any> {
  const result = { ...existingTranslations };

  for (const key of Object.keys(translationMap)) {
    const parts = key.split('.');
    let current = result;

    // Parcourir tous les niveaux sauf le dernier
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      } else if (typeof current[part] !== 'object') {
        // Si ce n'est pas un objet, le transformer en objet
        current[part] = {};
      }
      current = current[part];
    }

    // Pour le dernier niveau
    const lastPart = parts[parts.length - 1];

    // Ne pas écraser les traductions existantes
    if (!current[lastPart]) {
      if (isSourceLanguage) {
        // Pour la langue source (fr), utiliser la clé comme valeur par défaut
        current[lastPart] = lastPart;
      } else {
        // Pour les autres langues, marquer comme à traduire
        current[lastPart] = '[TO_TRANSLATE] ' + lastPart;
      }
    }
  }

  return result;
}

/**
 * Fonction principale
 */
async function main() {
  console.log(chalk.blue("🔍 Début de l'extraction des chaînes de traduction..."));

  try {
    const translationMap = await extractAllTranslations();
    await generateTranslationFiles(translationMap);

    console.log(chalk.green('✅ Extraction des clés de traduction terminée avec succès'));
    console.log(
      chalk.blue('ℹ️ Vous pouvez maintenant générer les traductions avec: pnpm i18n:generate')
    );
  } catch (error) {
    console.error(chalk.red(`❌ Erreur pendant l'extraction: ${error}`));
    process.exit(1);
  }
}

// Exécution si appelé directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(chalk.red(`❌ Erreur non gérée: ${error}`));
    process.exit(1);
  });
}

export { extractAllTranslations, generateTranslationFiles };
