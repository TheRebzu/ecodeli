// scripts/translate-app.ts
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import generate from '@babel/generator';
import { transformAsync } from '@babel/core';
import dotenv from 'dotenv';
import axios from 'axios';

// Charger les variables d'environnement
dotenv.config();

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const ROOT_DIR = path.resolve(__dirname, '../src');
const MESSAGES_DIR = path.resolve(__dirname, '../src/messages');
const TARGET_LANGUAGE = 'fr';
const SOURCE_LANGUAGE = 'en';
const NAMESPACE_DELIMITER = '.';

// Structure pour maintenir les traductions
interface TranslationMap {
  [key: string]: string | TranslationMap;
}

// Charger les traductions existantes
let enTranslations: TranslationMap = {};
let frTranslations: TranslationMap = {};

try {
  enTranslations = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'en.json'), 'utf8'));
  frTranslations = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'fr.json'), 'utf8'));
  console.log('Fichiers de traduction existants chargés');
} catch (error) {
  console.log('Aucun fichier de traduction existant trouvé, création de nouveaux fichiers');
}

// Fonction pour traduire un texte avec l'API Google Translate
async function translateText(
  text: string,
  targetLanguage: string = TARGET_LANGUAGE
): Promise<string> {
  try {
    const response = await axios.get('https://translation.googleapis.com/language/translate/v2', {
      params: {
        q: text,
        target: targetLanguage,
        source: SOURCE_LANGUAGE,
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
    console.error('Erreur de traduction:', error);
    return text; // Retourner le texte original en cas d'erreur
  }
}

// Fonction pour extraire les textes des composants React
async function extractTextsFromFile(filePath: string): Promise<string[]> {
  const content = fs.readFileSync(filePath, 'utf8');
  const texts: string[] = [];

  // Ignorer les fichiers qui sont déjà internationalisés
  if (content.includes('useTranslations(') || content.includes('import { useTranslations }')) {
    console.log(`Fichier déjà internationalisé: ${filePath}`);
    return texts;
  }

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
    });

    traverse(ast, {
      JSXText(path) {
        const text = path.node.value.trim();
        if (text && text.length > 1 && !/^\d+$/.test(text) && !/^[^A-Za-z]+$/.test(text)) {
          texts.push(text);
        }
      },
      StringLiteral(path) {
        // Extraire uniquement les chaînes pertinentes (pas les clés d'objets, etc.)
        const parent = path.parent;
        if (
          parent &&
          ((parent.type === 'JSXAttribute' &&
            parent.name.name !== 'className' &&
            parent.name.name !== 'id' &&
            parent.name.name !== 'key' &&
            parent.name.name !== 'href' &&
            parent.name.name !== 'src') ||
            parent.type === 'JSXExpressionContainer' ||
            (parent.type === 'ObjectProperty' &&
              parent.key.type === 'Identifier' &&
              (parent.key.name === 'title' ||
                parent.key.name === 'label' ||
                parent.key.name === 'placeholder' ||
                parent.key.name === 'description' ||
                parent.key.name === 'message')))
        ) {
          const text = path.node.value.trim();
          if (text && text.length > 1 && !/^\d+$/.test(text) && !/^[^A-Za-z]+$/.test(text)) {
            texts.push(text);
          }
        }
      },
    });
  } catch (error) {
    console.error(`Erreur d'analyse de ${filePath}:`, error);
  }

  return texts;
}

// Fonction pour générer une clé à partir d'un texte
function generateKeyFromText(text: string): string {
  // Nettoyer et transformer le texte en une clé valide
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 40);
}

// Fonction pour mettre à jour les fichiers de traduction
function updateTranslationFile(
  translations: TranslationMap,
  key: string,
  value: string,
  namespace: string = 'common'
): TranslationMap {
  // Créer des namespaces si nécessaire
  if (!translations[namespace]) {
    translations[namespace] = {};
  }

  const nsTranslations = translations[namespace] as TranslationMap;
  nsTranslations[key] = value;

  return translations;
}

// Fonction pour remplacer les textes par des appels à la fonction de traduction
async function transformFile(
  filePath: string,
  textToKeyMap: Map<string, string>,
  namespace: string = 'common'
): Promise<void> {
  // Lire le contenu du fichier
  const content = fs.readFileSync(filePath, 'utf8');

  // Si le fichier est déjà internationalisé, le sauter
  if (content.includes('useTranslations(') || content.includes('import { useTranslations }')) {
    return;
  }

  try {
    // Transformer le code
    const result = await transformAsync(content, {
      filename: filePath,
      presets: ['@babel/preset-typescript', '@babel/preset-react'],
      plugins: [
        function () {
          return {
            visitor: {
              Program: {
                enter(path) {
                  // Ajouter l'import pour useTranslations si ce n'est pas déjà présent
                  const importStatement = t.importDeclaration(
                    [
                      t.importSpecifier(
                        t.identifier('useTranslations'),
                        t.identifier('useTranslations')
                      ),
                    ],
                    t.stringLiteral('next-intl')
                  );
                  path.unshiftContainer('body', importStatement);
                },
              },
              FunctionDeclaration(path) {
                if (path.node.id && path.scope.parent) {
                  // Ajouter l'initialisation de t au début de la fonction
                  const tInit = t.variableDeclaration('const', [
                    t.variableDeclarator(
                      t.identifier('t'),
                      t.callExpression(t.identifier('useTranslations'), [
                        t.stringLiteral(namespace),
                      ])
                    ),
                  ]);

                  if (path.node.body.body.length > 0) {
                    path.node.body.body.unshift(tInit);
                  }
                }
              },
              FunctionExpression(path) {
                if (path.scope.parent) {
                  // Même chose pour les expressions de fonction
                  const tInit = t.variableDeclaration('const', [
                    t.variableDeclarator(
                      t.identifier('t'),
                      t.callExpression(t.identifier('useTranslations'), [
                        t.stringLiteral(namespace),
                      ])
                    ),
                  ]);

                  if (path.node.body.body.length > 0) {
                    path.node.body.body.unshift(tInit);
                  }
                }
              },
              ArrowFunctionExpression(path) {
                if (path.scope.parent && path.node.body.type === 'BlockStatement') {
                  // Même chose pour les fonctions fléchées
                  const tInit = t.variableDeclaration('const', [
                    t.variableDeclarator(
                      t.identifier('t'),
                      t.callExpression(t.identifier('useTranslations'), [
                        t.stringLiteral(namespace),
                      ])
                    ),
                  ]);

                  if ((path.node.body as t.BlockStatement).body.length > 0) {
                    (path.node.body as t.BlockStatement).body.unshift(tInit);
                  }
                }
              },
              JSXText(path) {
                const text = path.node.value.trim();
                if (text && text.length > 1 && textToKeyMap.has(text)) {
                  const key = textToKeyMap.get(text);
                  // Remplacer le texte par {t("key")}
                  const expression = t.jsxExpressionContainer(
                    t.callExpression(t.identifier('t'), [t.stringLiteral(key!)])
                  );
                  path.replaceWith(expression);
                }
              },
              StringLiteral(path) {
                const parent = path.parent;
                if (
                  parent &&
                  ((parent.type === 'JSXAttribute' &&
                    parent.name.name !== 'className' &&
                    parent.name.name !== 'id' &&
                    parent.name.name !== 'key' &&
                    parent.name.name !== 'href' &&
                    parent.name.name !== 'src') ||
                    parent.type === 'JSXExpressionContainer' ||
                    (parent.type === 'ObjectProperty' &&
                      parent.key.type === 'Identifier' &&
                      (parent.key.name === 'title' ||
                        parent.key.name === 'label' ||
                        parent.key.name === 'placeholder' ||
                        parent.key.name === 'description' ||
                        parent.key.name === 'message')))
                ) {
                  const text = path.node.value.trim();
                  if (text && text.length > 1 && textToKeyMap.has(text)) {
                    const key = textToKeyMap.get(text);
                    // Remplacer la chaîne par t("key")
                    const expression = t.callExpression(t.identifier('t'), [t.stringLiteral(key!)]);
                    path.replaceWith(expression);
                  }
                }
              },
            },
          };
        },
      ],
    });

    if (result && result.code) {
      // Créer une copie de sauvegarde
      fs.writeFileSync(`${filePath}.bak`, content);

      // Écrire le fichier transformé
      fs.writeFileSync(filePath, result.code);

      console.log(`Fichier transformé: ${filePath}`);
    }
  } catch (error) {
    console.error(`Erreur de transformation de ${filePath}:`, error);
  }
}

// Fonction principale
async function main() {
  // Vérifier si le répertoire des messages existe
  if (!fs.existsSync(MESSAGES_DIR)) {
    fs.mkdirSync(MESSAGES_DIR, { recursive: true });
  }

  // Trouver tous les fichiers de composants React
  const files = glob.sync(`${ROOT_DIR}/**/*.{tsx,jsx}`, {
    ignore: ['**/node_modules/**', '**/.next/**', '**/api/**'],
  });

  console.log(`${files.length} fichiers de composants trouvés`);

  // Extraire tous les textes de tous les fichiers
  const allTexts: string[] = [];
  for (const file of files) {
    const texts = await extractTextsFromFile(file);
    allTexts.push(...texts);
  }

  // Dédupliquer les textes
  const uniqueTexts = [...new Set(allTexts)];
  console.log(`${uniqueTexts.length} textes uniques extraits`);

  // Map pour stocker la correspondance texte -> clé
  const textToKeyMap = new Map<string, string>();

  // Traiter chaque texte
  let translatedCount = 0;
  for (const text of uniqueTexts) {
    // Ignorer les textes trop courts ou non pertinents
    if (text.length <= 1 || /^\d+$/.test(text) || /^[^A-Za-z]+$/.test(text)) {
      continue;
    }

    // Vérifier si le texte existe déjà dans les traductions
    let existingKey = '';
    let found = false;

    // Parcourir les namespaces
    for (const ns in enTranslations) {
      const nsTranslations = enTranslations[ns] as TranslationMap;

      // Chercher dans ce namespace
      for (const key in nsTranslations) {
        if (nsTranslations[key] === text) {
          existingKey = key;
          found = true;
          textToKeyMap.set(text, `${ns}${NAMESPACE_DELIMITER}${key}`);
          break;
        }
      }

      if (found) break;
    }

    if (found) {
      console.log(`Texte déjà traduit avec la clé: ${existingKey}`);
      continue;
    }

    // Générer une nouvelle clé
    let key = generateKeyFromText(text);
    let namespace = 'common';
    let counter = 1;

    // Assurer que la clé est unique
    while ((enTranslations[namespace] as TranslationMap)?.[key]) {
      key = `${generateKeyFromText(text)}_${counter}`;
      counter++;
    }

    // Stocker la correspondance texte -> clé
    textToKeyMap.set(text, `${namespace}${NAMESPACE_DELIMITER}${key}`);

    // Ajouter à l'anglais
    enTranslations = updateTranslationFile(enTranslations, key, text, namespace);

    // Traduire et ajouter au français
    const frTranslation = await translateText(text);
    frTranslations = updateTranslationFile(frTranslations, key, frTranslation, namespace);

    translatedCount++;
    console.log(
      `Traduit (${translatedCount}/${uniqueTexts.length}): "${text}" => "${frTranslation}"`
    );

    // Petite pause pour ne pas dépasser les limites de l'API
    if (translatedCount % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
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

  console.log('Fichiers de traduction mis à jour avec succès');

  // Demander si l'utilisateur veut transformer les fichiers
  const args = process.argv.slice(2);
  if (args.includes('--transform')) {
    console.log('Transformation des fichiers pour utiliser les traductions...');

    for (const file of files) {
      await transformFile(file, textToKeyMap);
    }

    console.log('Transformation terminée !');
  } else {
    console.log(
      'Pour transformer les fichiers et remplacer les textes par des appels à la fonction de traduction, exécutez:'
    );
    console.log('npm run translate -- --transform');
  }
}

// Exécuter la fonction principale
main().catch(console.error);
