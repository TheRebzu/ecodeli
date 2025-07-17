#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration des fichiers de traduction
const MESSAGES_DIR = path.join(__dirname, '../src/messages');
const LANGUAGES = ['fr', 'en'];

// Traductions par défaut pour les clés manquantes
const DEFAULT_TRANSLATIONS = {
  'navigation.shipping': {
    fr: 'Expédition',
    en: 'Shipping'
  },
  'navigation.become_delivery': {
    fr: 'Devenir livreur',
    en: 'Become Delivery'
  },
  'navigation.blog': {
    fr: 'Blog',
    en: 'Blog'
  },
  'navigation.developers': {
    fr: 'Développeurs',
    en: 'Developers'
  },
  'navigation.api_docs': {
    fr: 'Documentation API',
    en: 'API Documentation'
  },
  'navigation.api_keys': {
    fr: 'Clés API',
    en: 'API Keys'
  },
  'navigation.api_manual': {
    fr: 'Manuel API',
    en: 'API Manual'
  },
  'navigation.support': {
    fr: 'Support',
    en: 'Support'
  },
  'navigation.faq': {
    fr: 'FAQ',
    en: 'FAQ'
  },
  'navigation.legal': {
    fr: 'Mentions légales',
    en: 'Legal Notice'
  },
  'navigation.terms': {
    fr: 'Conditions d\'utilisation',
    en: 'Terms of Service'
  },
  'navigation.privacy': {
    fr: 'Politique de confidentialité',
    en: 'Privacy Policy'
  },
  'navigation.cgu': {
    fr: 'CGU',
    en: 'Terms of Use'
  },
  'navigation.cgv': {
    fr: 'CGV',
    en: 'Terms of Sale'
  }
};

// Fonction pour définir une valeur dans un objet imbriqué
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// Fonction pour obtenir une valeur dans un objet imbriqué
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (!(key in current)) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

// Fonction pour corriger les traductions manquantes
function fixMissingTranslations() {
  console.log('🔍 Recherche des traductions manquantes...');
  
  let totalFixed = 0;
  
  for (const lang of LANGUAGES) {
    const filePath = path.join(MESSAGES_DIR, `${lang}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Fichier manquant: ${filePath}`);
      continue;
    }
    
    let messagesData;
    try {
      messagesData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.log(`❌ Erreur lecture ${filePath}:`, error.message);
      continue;
    }
    
    let langFixed = 0;
    
    for (const [key, translations] of Object.entries(DEFAULT_TRANSLATIONS)) {
      if (!getNestedValue(messagesData, key)) {
        console.log(`  ➕ Ajout de "${key}" en ${lang}: "${translations[lang]}"`);
        setNestedValue(messagesData, key, translations[lang]);
        langFixed++;
      }
    }
    
    if (langFixed > 0) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(messagesData, null, 2) + '\n');
        console.log(`✅ ${langFixed} traductions ajoutées dans ${lang}.json`);
        totalFixed += langFixed;
      } catch (error) {
        console.log(`❌ Erreur écriture ${filePath}:`, error.message);
      }
    } else {
      console.log(`✅ Aucune traduction manquante dans ${lang}.json`);
    }
  }
  
  console.log(`\n🎉 Terminé ! ${totalFixed} traductions ajoutées au total.`);
}

// Fonction pour valider que toutes les traductions sont présentes
function validateTranslations() {
  console.log('🔍 Validation des traductions...');
  
  let hasErrors = false;
  
  for (const lang of LANGUAGES) {
    const filePath = path.join(MESSAGES_DIR, `${lang}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Fichier manquant: ${filePath}`);
      hasErrors = true;
      continue;
    }
    
    let messagesData;
    try {
      messagesData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.log(`❌ Erreur lecture ${filePath}:`, error.message);
      hasErrors = true;
      continue;
    }
    
    for (const key of Object.keys(DEFAULT_TRANSLATIONS)) {
      if (!getNestedValue(messagesData, key)) {
        console.log(`❌ Traduction manquante: "${key}" dans ${lang}.json`);
        hasErrors = true;
      }
    }
  }
  
  if (!hasErrors) {
    console.log('✅ Toutes les traductions sont présentes !');
  }
  
  return !hasErrors;
}

// Fonction principale
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--validate')) {
    const isValid = validateTranslations();
    process.exit(isValid ? 0 : 1);
  } else {
    fixMissingTranslations();
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = {
  fixMissingTranslations,
  validateTranslations
};