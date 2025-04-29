import fs from 'fs';
import path from 'path';

const enFile = path.resolve('src/messages/en.json');
const frFile = path.resolve('src/messages/fr.json');

// Lire les fichiers de traduction
const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));
const fr = JSON.parse(fs.readFileSync(frFile, 'utf8'));

// Fonction récursive pour vérifier les clés manquantes
function findMissingKeys(enObj, frObj, parentKey = '') {
  const missingKeys = [];
  
  for (const key in enObj) {
    const currentKey = parentKey ? `${parentKey}.${key}` : key;
    
    if (!(key in frObj)) {
      missingKeys.push({ key: currentKey, value: enObj[key] });
      continue;
    }
    
    if (typeof enObj[key] === 'object' && enObj[key] !== null && 
        typeof frObj[key] === 'object' && frObj[key] !== null) {
      const nestedMissing = findMissingKeys(enObj[key], frObj[key], currentKey);
      missingKeys.push(...nestedMissing);
    }
  }
  
  return missingKeys;
}

// Trouver les clés manquantes dans chaque direction
const missingInFr = findMissingKeys(en, fr);
const missingInEn = findMissingKeys(fr, en);

console.log('Clés manquantes dans le fichier français:');
if (missingInFr.length === 0) {
  console.log('  Aucune clé manquante');
} else {
  missingInFr.forEach(item => {
    console.log(`  ${item.key}: ${JSON.stringify(item.value)}`);
  });
}

console.log('\nClés manquantes dans le fichier anglais:');
if (missingInEn.length === 0) {
  console.log('  Aucune clé manquante');
} else {
  missingInEn.forEach(item => {
    console.log(`  ${item.key}: ${JSON.stringify(item.value)}`);
  });
}

// Fonction pour corriger automatiquement les fichiers
function fixMissingTranslations() {
  // Ajouter les clés manquantes au fichier français
  let fixedFr = {...fr};
  
  missingInFr.forEach(item => {
    const keys = item.key.split('.');
    let currentObj = fixedFr;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!currentObj[keys[i]]) {
        currentObj[keys[i]] = {};
      }
      currentObj = currentObj[keys[i]];
    }
    
    const lastKey = keys[keys.length - 1];
    currentObj[lastKey] = item.value;
  });
  
  // Ajouter les clés manquantes au fichier anglais
  let fixedEn = {...en};
  
  missingInEn.forEach(item => {
    const keys = item.key.split('.');
    let currentObj = fixedEn;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!currentObj[keys[i]]) {
        currentObj[keys[i]] = {};
      }
      currentObj = currentObj[keys[i]];
    }
    
    const lastKey = keys[keys.length - 1];
    currentObj[lastKey] = item.value;
  });
  
  // Écrire les fichiers corrigés
  if (missingInFr.length > 0) {
    fs.writeFileSync(frFile, JSON.stringify(fixedFr, null, 2), 'utf8');
    console.log('\nFichier français corrigé et enregistré.');
  }
  
  if (missingInEn.length > 0) {
    fs.writeFileSync(enFile, JSON.stringify(fixedEn, null, 2), 'utf8');
    console.log('Fichier anglais corrigé et enregistré.');
  }
}

// Demander à l'utilisateur s'il souhaite corriger automatiquement
console.log('\nVoulez-vous corriger automatiquement les fichiers de traduction? (O/N)');
process.stdin.once('data', input => {
  const answer = input.toString().trim().toLowerCase();
  if (answer === 'o' || answer === 'oui' || answer === 'y' || answer === 'yes') {
    fixMissingTranslations();
  }
  process.exit();
}); 