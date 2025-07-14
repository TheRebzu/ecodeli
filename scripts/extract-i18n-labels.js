#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script d'extraction automatique des labels i18n pour EcoDeli
 * Scanne les fichiers TSX/TS et extrait les clés de traduction manquantes
 */

const SRC_DIR = path.join(__dirname, '../src');
const MESSAGES_DIR = path.join(__dirname, '../src/messages');
const OUTPUT_FILE = path.join(__dirname, 'i18n/extracted-labels.json');

// Patterns pour extraire les clés de traduction
const T_FUNCTION_PATTERNS = [
  /t\(\s*['"]([\w\.\-_]+)['"]\s*\)/g,
  /t\(\s*["`]([\w\.\-_]+)["`]\s*\)/g,
  /useTranslations\(\s*['"]([\w\.\-_]*)['"]\s*\)/g,
  /useTranslations\(\s*["`]([\w\.\-_]*)["`]\s*\)/g,
];

// Extensions de fichiers à scanner
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Valeurs par défaut selon le contexte
const DEFAULT_VALUES = {
  title: 'Titre',
  description: 'Description',
  subtitle: 'Sous-titre',
  message: 'Message',
  error: 'Erreur',
  success: 'Succès',
  loading: 'Chargement...',
  save: 'Enregistrer',
  cancel: 'Annuler',
  delete: 'Supprimer',
  edit: 'Modifier',
  add: 'Ajouter',
  create: 'Créer',
  update: 'Mettre à jour',
  view: 'Voir',
  back: 'Retour',
  next: 'Suivant',
  previous: 'Précédent',
  confirm: 'Confirmer',
  submit: 'Valider',
  name: 'Nom',
  email: 'Email',
  password: 'Mot de passe',
  phone: 'Téléphone',
  address: 'Adresse',
  city: 'Ville',
  country: 'Pays',
  date: 'Date',
  time: 'Heure',
  price: 'Prix',
  status: 'Statut',
  type: 'Type',
  category: 'Catégorie',
  search: 'Rechercher',
  filter: 'Filtrer',
  sort: 'Trier',
  export: 'Exporter',
  import: 'Importer',
  download: 'Télécharger',
  upload: 'Téléverser',
  settings: 'Paramètres',
  profile: 'Profil',
  dashboard: 'Tableau de bord',
  notifications: 'Notifications',
  help: 'Aide',
  contact: 'Contact',
  about: 'À propos',
  faq: 'FAQ',
  legal: 'Mentions légales',
  privacy: 'Politique de confidentialité',
  terms: 'Conditions d\'utilisation',
};

const DEFAULT_VALUES_EN = {
  title: 'Title',
  description: 'Description',
  subtitle: 'Subtitle',
  message: 'Message',
  error: 'Error',
  success: 'Success',
  loading: 'Loading...',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  add: 'Add',
  create: 'Create',
  update: 'Update',
  view: 'View',
  back: 'Back',
  next: 'Next',
  previous: 'Previous',
  confirm: 'Confirm',
  submit: 'Submit',
  name: 'Name',
  email: 'Email',
  password: 'Password',
  phone: 'Phone',
  address: 'Address',
  city: 'City',
  country: 'Country',
  date: 'Date',
  time: 'Time',
  price: 'Price',
  status: 'Status',
  type: 'Type',
  category: 'Category',
  search: 'Search',
  filter: 'Filter',
  sort: 'Sort',
  export: 'Export',
  import: 'Import',
  download: 'Download',
  upload: 'Upload',
  settings: 'Settings',
  profile: 'Profile',
  dashboard: 'Dashboard',
  notifications: 'Notifications',
  help: 'Help',
  contact: 'Contact',
  about: 'About',
  faq: 'FAQ',
  legal: 'Legal',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
};

/**
 * Récupère tous les fichiers dans un répertoire récursivement
 */
function getAllFiles(dirPath, filesList = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Ignorer node_modules, .next, etc.
      if (!['node_modules', '.next', 'dist', 'build'].includes(file)) {
        getAllFiles(filePath, filesList);
      }
    } else if (FILE_EXTENSIONS.includes(path.extname(file))) {
      filesList.push(filePath);
    }
  });

  return filesList;
}

/**
 * Extrait les clés de traduction d'un fichier
 */
function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();

  T_FUNCTION_PATTERNS.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        keys.add(match[1]);
      }
    }
  });

  return Array.from(keys);
}

/**
 * Génère une valeur par défaut pour une clé
 */
function generateDefaultValue(key, lang = 'fr') {
  const keyParts = key.split('.');
  const lastPart = keyParts[keyParts.length - 1];
  
  const defaults = lang === 'en' ? DEFAULT_VALUES_EN : DEFAULT_VALUES;
  
  if (defaults[lastPart]) {
    return defaults[lastPart];
  }
  
  // Générer une valeur basée sur la clé
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
}

/**
 * Ajoute une clé imbriquée à un objet
 */
function setNestedKey(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  const lastKey = keys[keys.length - 1];
  if (!(lastKey in current)) {
    current[lastKey] = value;
  }
}

/**
 * Vérifie si une clé existe dans un objet imbriqué
 */
function hasNestedKey(obj, keyPath) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (typeof current !== 'object' || !(key in current)) {
      return false;
    }
    current = current[key];
  }
  
  return true;
}

/**
 * Script principal
 */
function main() {
  console.log('🔍 Extraction des labels i18n...\n');

  // Récupérer tous les fichiers
  const files = getAllFiles(SRC_DIR);
  console.log(`📁 Fichiers trouvés: ${files.length}`);

  // Extraire toutes les clés
  const allKeys = new Set();
  let fileCount = 0;

  files.forEach(file => {
    const keys = extractKeysFromFile(file);
    if (keys.length > 0) {
      fileCount++;
      keys.forEach(key => allKeys.add(key));
    }
  });

  console.log(`🔑 Clés trouvées: ${allKeys.size} dans ${fileCount} fichiers`);

  // Charger les fichiers de messages existants
  const frPath = path.join(MESSAGES_DIR, 'fr.json');
  const enPath = path.join(MESSAGES_DIR, 'en.json');

  let frMessages = {};
  let enMessages = {};

  try {
    frMessages = JSON.parse(fs.readFileSync(frPath, 'utf8'));
  } catch (err) {
    console.log('⚠️  Fichier fr.json non trouvé, création d\'un nouveau');
  }

  try {
    enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  } catch (err) {
    console.log('⚠️  Fichier en.json non trouvé, création d\'un nouveau');
  }

  // Identifier les clés manquantes
  const missingKeysFr = [];
  const missingKeysEn = [];

  Array.from(allKeys).forEach(key => {
    if (!hasNestedKey(frMessages, key)) {
      missingKeysFr.push(key);
    }
    if (!hasNestedKey(enMessages, key)) {
      missingKeysEn.push(key);
    }
  });

  console.log(`\n❌ Clés manquantes FR: ${missingKeysFr.length}`);
  console.log(`❌ Clés manquantes EN: ${missingKeysEn.length}`);

  // Ajouter les clés manquantes
  missingKeysFr.forEach(key => {
    const defaultValue = generateDefaultValue(key, 'fr');
    setNestedKey(frMessages, key, defaultValue);
    console.log(`  ✅ FR: ${key} = "${defaultValue}"`);
  });

  missingKeysEn.forEach(key => {
    const defaultValue = generateDefaultValue(key, 'en');
    setNestedKey(enMessages, key, defaultValue);
    console.log(`  ✅ EN: ${key} = "${defaultValue}"`);
  });

  // Sauvegarder les fichiers mis à jour
  fs.writeFileSync(frPath, JSON.stringify(frMessages, null, 2), 'utf8');
  fs.writeFileSync(enPath, JSON.stringify(enMessages, null, 2), 'utf8');

  // Créer le rapport d'extraction
  const extractedData = {
    timestamp: new Date().toISOString(),
    totalKeys: allKeys.size,
    filesScanned: fileCount,
    missingKeysFr: missingKeysFr.length,
    missingKeysEn: missingKeysEn.length,
    extractedKeys: Array.from(allKeys),
    addedKeysFr: missingKeysFr,
    addedKeysEn: missingKeysEn,
  };

  // Créer le répertoire de sortie s'il n'existe pas
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(extractedData, null, 2), 'utf8');

  console.log(`\n✅ Extraction terminée !`);
  console.log(`📄 Rapport sauvegardé: ${OUTPUT_FILE}`);
  console.log(`🇫🇷 Fichier FR mis à jour: ${frPath}`);
  console.log(`🇬🇧 Fichier EN mis à jour: ${enPath}`);
  
  if (missingKeysFr.length === 0 && missingKeysEn.length === 0) {
    console.log(`\n🎉 Aucune clé manquante ! Tous les labels sont présents.`);
  } else {
    console.log(`\n🔧 ${missingKeysFr.length + missingKeysEn.length} clés ajoutées automatiquement.`);
    console.log(`💡 Relancez 'pnpm run build' pour vérifier que les erreurs sont corrigées.`);
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { main, extractKeysFromFile, generateDefaultValue }; 