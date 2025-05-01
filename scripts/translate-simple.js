const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { globSync } = require('glob');

// Configuration
const GOOGLE_API_KEY = 'AIzaSyAjs1K5NQH3Um2gb97fry6elOyHcC5gya4';
const ROOT_DIR = path.resolve(__dirname, '../src');
const MESSAGES_DIR = path.resolve(__dirname, '../src/messages');

// Fonction pour extraire les textes avec regex
function extractTextsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Ignorer les fichiers qui sont déjà internationalisés
    if (content.includes('useTranslations(') || content.includes('import { useTranslations }')) {
      console.log(`Fichier déjà internationalisé: ${filePath}`);
      return [];
    }

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

    return texts;
  } catch (error) {
    console.error(`Erreur lors de la lecture du fichier ${filePath}:`, error.message);
    return [];
  }
}

// Fonction pour traduire un texte
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

// Fonction pour générer une clé à partir d'un texte
function generateKeyFromText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 40);
}

// Fonction principale
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
  } catch (error) {
    console.log('Aucun fichier de traduction existant trouvé, création de nouveaux fichiers');
  }

  // Trouver tous les fichiers de composants React
  const files = globSync(`${ROOT_DIR}/**/*.{tsx,jsx}`, {
    ignore: ['**/node_modules/**', '**/.next/**', '**/api/**'],
  });

  console.log(`${files.length} fichiers de composants trouvés`);

  // Extraire tous les textes
  const allTexts = [];
  for (const file of files) {
    const texts = extractTextsFromFile(file);
    if (texts.length > 0) {
      console.log(`Extrait ${texts.length} textes de ${path.relative(ROOT_DIR, file)}`);
      allTexts.push(...texts);
    }
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
  console.log(`📁 Fichiers de traduction enregistrés dans ${MESSAGES_DIR}`);
}

// Exécuter la fonction principale
main().catch(console.error);
