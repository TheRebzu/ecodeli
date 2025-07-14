const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers de traduction
const frPath = path.join(__dirname, '../src/messages/fr.json');
const enPath = path.join(__dirname, '../src/messages/en.json');

// Clé manquante pour FAQ
const missingKeys = {
  fr: {
    "public.faq.notFound.contactUs": "nous contacter"
  },
  en: {
    "public.faq.notFound.contactUs": "contact us"
  }
};

function addMissingKeys() {
  // Ajouter les clés françaises
  const frContent = JSON.parse(fs.readFileSync(frPath, 'utf8'));
  
  // Fonction pour ajouter une clé imbriquée
  function setNestedKey(obj, keyPath, value) {
    const keys = keyPath.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }
  
  // Ajouter les clés françaises
  Object.entries(missingKeys.fr).forEach(([key, value]) => {
    setNestedKey(frContent, key, value);
  });
  
  // Ajouter les clés anglaises
  const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  Object.entries(missingKeys.en).forEach(([key, value]) => {
    setNestedKey(enContent, key, value);
  });
  
  // Sauvegarder les fichiers
  fs.writeFileSync(frPath, JSON.stringify(frContent, null, 2), 'utf8');
  fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2), 'utf8');
  
  console.log('✅ Clé FAQ manquante ajoutée avec succès !');
}

// Exécuter le script
addMissingKeys(); 