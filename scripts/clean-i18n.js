#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script de nettoyage et validation des fichiers i18n pour EcoDeli
 * - Valide la structure JSON
 * - Trie les clés alphabétiquement
 * - Détecte les clés orphelines
 * - Formate le JSON proprement
 */

const MESSAGES_DIR = path.join(__dirname, '../src/messages');

/**
 * Trie un objet récursivement par clés
 */
function sortObjectKeys(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  
  const sortedObj = {};
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sortedObj[key] = sortObjectKeys(obj[key]);
    });
  
  return sortedObj;
}

/**
 * Extrait toutes les clés d'un objet imbriqué
 */
function extractAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractAllKeys(value, fullKey));
    }
  }
  
  return keys;
}

/**
 * Compare deux listes de clés et trouve les différences
 */
function compareKeys(keysFr, keysEn) {
  const setFr = new Set(keysFr);
  const setEn = new Set(keysEn);
  
  const onlyFr = keysFr.filter(key => !setEn.has(key));
  const onlyEn = keysEn.filter(key => !setFr.has(key));
  
  return { onlyFr, onlyEn };
}

/**
 * Valide la structure d'un fichier JSON
 */
function validateJsonStructure(obj, lang) {
  const errors = [];
  
  function validate(current, path = '') {
    for (const [key, value] of Object.entries(current)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Vérifier les noms de clés
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
        errors.push(`${lang}: Nom de clé invalide '${key}' à ${currentPath}`);
      }
      
      // Vérifier les valeurs vides
      if (typeof value === 'string' && value.trim() === '') {
        errors.push(`${lang}: Valeur vide à ${currentPath}`);
      }
      
      // Vérifier récursivement
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        validate(value, currentPath);
      }
    }
  }
  
  validate(obj);
  return errors;
}

/**
 * Script principal
 */
function main() {
  console.log('🧹 Nettoyage et validation des fichiers i18n...\n');

  const frPath = path.join(MESSAGES_DIR, 'fr.json');
  const enPath = path.join(MESSAGES_DIR, 'en.json');

  // Charger les fichiers
  let frMessages = {};
  let enMessages = {};
  let errors = [];

  try {
    const frContent = fs.readFileSync(frPath, 'utf8');
    frMessages = JSON.parse(frContent);
    console.log('✅ Fichier FR chargé');
  } catch (err) {
    errors.push(`❌ Erreur lecture FR: ${err.message}`);
  }

  try {
    const enContent = fs.readFileSync(enPath, 'utf8');
    enMessages = JSON.parse(enContent);
    console.log('✅ Fichier EN chargé');
  } catch (err) {
    errors.push(`❌ Erreur lecture EN: ${err.message}`);
  }

  if (errors.length > 0) {
    console.log('\n❌ Erreurs détectées:');
    errors.forEach(error => console.log(error));
    return;
  }

  // Extraire toutes les clés
  const keysFr = extractAllKeys(frMessages);
  const keysEn = extractAllKeys(enMessages);

  console.log(`\n📊 Statistiques:`);
  console.log(`🇫🇷 Clés FR: ${keysFr.length}`);
  console.log(`🇬🇧 Clés EN: ${keysEn.length}`);

  // Comparer les clés
  const { onlyFr, onlyEn } = compareKeys(keysFr, keysEn);

  if (onlyFr.length > 0) {
    console.log(`\n⚠️  Clés uniquement en FR (${onlyFr.length}):`);
    onlyFr.slice(0, 10).forEach(key => console.log(`  - ${key}`));
    if (onlyFr.length > 10) {
      console.log(`  ... et ${onlyFr.length - 10} autres`);
    }
  }

  if (onlyEn.length > 0) {
    console.log(`\n⚠️  Clés uniquement en EN (${onlyEn.length}):`);
    onlyEn.slice(0, 10).forEach(key => console.log(`  - ${key}`));
    if (onlyEn.length > 10) {
      console.log(`  ... et ${onlyEn.length - 10} autres`);
    }
  }

  // Valider la structure
  const frErrors = validateJsonStructure(frMessages, 'FR');
  const enErrors = validateJsonStructure(enMessages, 'EN');

  if (frErrors.length > 0 || enErrors.length > 0) {
    console.log(`\n❌ Erreurs de validation:`);
    [...frErrors, ...enErrors].forEach(error => console.log(`  ${error}`));
  }

  // Trier et nettoyer
  console.log('\n🔄 Nettoyage des fichiers...');
  
  const sortedFr = sortObjectKeys(frMessages);
  const sortedEn = sortObjectKeys(enMessages);

  // Sauvegarder les fichiers nettoyés
  fs.writeFileSync(frPath, JSON.stringify(sortedFr, null, 2), 'utf8');
  fs.writeFileSync(enPath, JSON.stringify(sortedEn, null, 2), 'utf8');

  console.log('✅ Fichiers triés et formatés');

  // Rapport final
  console.log('\n📄 Rapport final:');
  console.log(`🇫🇷 FR: ${keysFr.length} clés`);
  console.log(`🇬🇧 EN: ${keysEn.length} clés`);
  console.log(`🔍 Différences: ${onlyFr.length + onlyEn.length}`);
  console.log(`⚠️  Erreurs: ${frErrors.length + enErrors.length}`);

  if (onlyFr.length === 0 && onlyEn.length === 0 && frErrors.length === 0 && enErrors.length === 0) {
    console.log('\n🎉 Parfait ! Les fichiers sont synchronisés et valides.');
  } else {
    console.log('\n💡 Relancez le script d\'extraction pour synchroniser les clés manquantes.');
  }

  // Générer un rapport de nettoyage
  const reportPath = path.join(__dirname, 'i18n/cleaning-report.json');
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    totalKeysFr: keysFr.length,
    totalKeysEn: keysEn.length,
    onlyFr: onlyFr,
    onlyEn: onlyEn,
    validationErrors: [...frErrors, ...enErrors],
    status: onlyFr.length === 0 && onlyEn.length === 0 && frErrors.length === 0 && enErrors.length === 0 ? 'clean' : 'issues'
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`📊 Rapport détaillé: ${reportPath}`);
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { main, sortObjectKeys, extractAllKeys, compareKeys }; 