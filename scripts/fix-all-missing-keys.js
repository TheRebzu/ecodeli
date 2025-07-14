const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers de traduction
const frMessagesPath = path.join(__dirname, '../src/messages/fr.json');
const enMessagesPath = path.join(__dirname, '../src/messages/en.json');

console.log('🔧 Correction finale de toutes les clés manquantes...');

// Charger les messages existants
let frMessages = {};
let enMessages = {};

try {
  frMessages = JSON.parse(fs.readFileSync(frMessagesPath, 'utf8'));
} catch (error) {
  console.log('❌ Erreur lors du chargement de fr.json:', error.message);
}

try {
  enMessages = JSON.parse(fs.readFileSync(enMessagesPath, 'utf8'));
} catch (error) {
  console.log('❌ Erreur lors du chargement de en.json:', error.message);
}

// Fonction pour ajouter une clé imbriquée
function addNestedKey(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
}

// 1. Clés d'authentification manquantes
console.log('🔐 Ajout des clés d\'authentification...');

const authKeysFr = {
  // Inscription Merchant
  "auth.register.merchant.title": "Devenir Commerçant Partenaire",
  "auth.register.merchant.subtitle": "Rejoignez notre réseau de commerçants et développez vos ventes",
  "auth.register.merchant.advantagesTitle": "Avantages commerçant",
  "auth.register.merchant.advantage1": "Augmentez votre zone de chalandise",
  "auth.register.merchant.advantage2": "Service de livraison clé en main",
  "auth.register.merchant.advantage3": "Tarifs préférentiels négociés",
  "auth.register.merchant.advantage4": "Support client dédié 7j/7",
  
  // Inscription Deliverer
  "auth.register.deliverer.title": "Devenir Livreur EcoDeli",
  "auth.register.deliverer.subtitle": "Gagnez de l'argent en livrant sur vos trajets",
  "auth.register.deliverer.advantagesTitle": "Avantages livreur",
  "auth.register.deliverer.advantage1": "Revenus complémentaires flexibles",
  "auth.register.deliverer.advantage2": "Optimisez vos déplacements",
  "auth.register.deliverer.advantage3": "Assurance incluse sur tous les colis",
  "auth.register.deliverer.advantage4": "Paiement rapide sous 24h",
  
  // Navigation commune
  "auth.register.chooseAnotherAccountType": "Choisir un autre type de compte",
  "auth.register.alreadyHaveAccount": "Vous avez déjà un compte ?",
  "auth.login.loginButton": "Se connecter"
};

const authKeysEn = {
  // Inscription Merchant
  "auth.register.merchant.title": "Become a Partner Merchant",
  "auth.register.merchant.subtitle": "Join our merchant network and grow your sales",
  "auth.register.merchant.advantagesTitle": "Merchant advantages",
  "auth.register.merchant.advantage1": "Expand your catchment area",
  "auth.register.merchant.advantage2": "Turnkey delivery service",
  "auth.register.merchant.advantage3": "Negotiated preferential rates",
  "auth.register.merchant.advantage4": "Dedicated customer support 7/7",
  
  // Inscription Deliverer
  "auth.register.deliverer.title": "Become an EcoDeli Courier",
  "auth.register.deliverer.subtitle": "Earn money by delivering on your routes",
  "auth.register.deliverer.advantagesTitle": "Courier advantages",
  "auth.register.deliverer.advantage1": "Flexible additional income",
  "auth.register.deliverer.advantage2": "Optimize your travels",
  "auth.register.deliverer.advantage3": "Insurance included on all packages",
  "auth.register.deliverer.advantage4": "Fast payment within 24h",
  
  // Navigation commune
  "auth.register.chooseAnotherAccountType": "Choose another account type",
  "auth.register.alreadyHaveAccount": "Already have an account?",
  "auth.login.loginButton": "Sign in"
};

// 2. Pages développeurs complètes
console.log('👩‍💻 Ajout des clés developers...');

const developersKeysFr = {
  // Page principale developers
  "public.developers.title": "Développeurs EcoDeli",
  "public.developers.description": "Intégrez les services EcoDeli dans vos applications",
  "public.developers.apiKeys": "Clés API",
  "public.developers.apiManual": "Manuel API",
  
  // Section API
  "public.developers.api.title": "API REST EcoDeli",
  "public.developers.api.description": "Notre API robuste pour intégrer tous nos services",
  
  // Section Webhooks
  "public.developers.webhooks.title": "Webhooks temps réel",
  "public.developers.webhooks.description": "Recevez les événements en temps réel",
  
  // Section SDKs
  "public.developers.sdks.title": "SDKs officiels",
  "public.developers.sdks.description": "Bibliothèques dans vos langages préférés",
  "public.developers.sdks.js": "JavaScript / Node.js",
  "public.developers.sdks.python": "Python",
  "public.developers.sdks.php": "PHP",
  
  // Section Documentation
  "public.developers.docs.title": "Documentation complète",
  "public.developers.docs.description": "Guides et références pour bien commencer",
  "public.developers.docs.quickstart": "Guide de démarrage rapide",
  "public.developers.docs.apiReference": "Référence API",
  "public.developers.docs.examples": "Exemples de code",
  "public.developers.docs.errorHandling": "Gestion des erreurs"
};

const developersKeysEn = {
  // Page principale developers
  "public.developers.title": "EcoDeli Developers",
  "public.developers.description": "Integrate EcoDeli services into your applications",
  "public.developers.apiKeys": "API Keys",
  "public.developers.apiManual": "API Manual",
  
  // Section API
  "public.developers.api.title": "EcoDeli REST API",
  "public.developers.api.description": "Our robust API to integrate all our services",
  
  // Section Webhooks
  "public.developers.webhooks.title": "Real-time Webhooks",
  "public.developers.webhooks.description": "Receive events in real-time",
  
  // Section SDKs
  "public.developers.sdks.title": "Official SDKs",
  "public.developers.sdks.description": "Libraries in your favorite languages",
  "public.developers.sdks.js": "JavaScript / Node.js",
  "public.developers.sdks.python": "Python",
  "public.developers.sdks.php": "PHP",
  
  // Section Documentation
  "public.developers.docs.title": "Complete Documentation",
  "public.developers.docs.description": "Guides and references to get started",
  "public.developers.docs.quickstart": "Quick Start Guide",
  "public.developers.docs.apiReference": "API Reference",
  "public.developers.docs.examples": "Code Examples",
  "public.developers.docs.errorHandling": "Error Handling"
};

// 3. Pages publiques
console.log('🌐 Ajout des clés pages publiques...');

const publicPagesFr = {
  "public.partners": "Partenaires",
  "public.faq": "FAQ",
  "public.BecomeProvider.description": "Rejoignez notre réseau de prestataires de services"
};

const publicPagesEn = {
  "public.partners": "Partners",
  "public.faq": "FAQ",
  "public.BecomeProvider.description": "Join our network of service providers"
};

// 4. Clés CGV manquantes
console.log('📄 Ajout des clés CGV...');

const cgvKeysFr = {
  "public.legal.cgv.title": "Conditions Générales de Vente",
  "public.legal.cgv.description": "Conditions régissant l'utilisation des services EcoDeli",
  "public.legal.cgv.article1.title": "Article 1 - Champ d'application",
  "public.legal.cgv.article1.content": "Les présentes conditions générales de vente s'appliquent à tous les services proposés par EcoDeli.",
  "public.legal.cgv.article2.title": "Article 2 - Prix et tarification",
  "public.legal.cgv.article2.intro": "Les prix sont indiqués en euros TTC et comprennent :",
  "public.legal.cgv.article2.item1": "Les frais de livraison calculés selon la distance",
  "public.legal.cgv.article2.item2": "La commission de plateforme",
  "public.legal.cgv.article2.item3": "La TVA applicable",
  "public.legal.cgv.article2.note": "Les prix peuvent être modifiés à tout moment mais ne s'appliquent qu'aux nouvelles commandes.",
  "public.legal.cgv.article3.title": "Article 3 - Responsabilité",
  "public.legal.cgv.article3.content": "EcoDeli met en relation les utilisateurs et ne peut être tenu responsable des dommages entre parties.",
  "public.legal.cgv.article4.title": "Article 4 - Protection des données",
  "public.legal.cgv.article4.content": "Vos données personnelles sont traitées conformément à notre politique de confidentialité."
};

const cgvKeysEn = {
  "public.legal.cgv.title": "Terms of Sale",
  "public.legal.cgv.description": "Terms governing the use of EcoDeli services",
  "public.legal.cgv.article1.title": "Article 1 - Scope",
  "public.legal.cgv.article1.content": "These general terms of sale apply to all services offered by EcoDeli.",
  "public.legal.cgv.article2.title": "Article 2 - Prices and rates",
  "public.legal.cgv.article2.intro": "Prices are shown in euros including tax and include:",
  "public.legal.cgv.article2.item1": "Delivery costs calculated by distance",
  "public.legal.cgv.article2.item2": "Platform commission",
  "public.legal.cgv.article2.item3": "Applicable VAT",
  "public.legal.cgv.article2.note": "Prices may be changed at any time but only apply to new orders.",
  "public.legal.cgv.article3.title": "Article 3 - Liability",
  "public.legal.cgv.article3.content": "EcoDeli connects users and cannot be held responsible for damages between parties.",
  "public.legal.cgv.article4.title": "Article 4 - Data protection",
  "public.legal.cgv.article4.content": "Your personal data is processed in accordance with our privacy policy."
};

// Ajouter toutes les clés
console.log('➕ Ajout des clés françaises...');
Object.entries(authKeysFr).forEach(([key, value]) => {
  addNestedKey(frMessages, key, value);
});
Object.entries(developersKeysFr).forEach(([key, value]) => {
  addNestedKey(frMessages, key, value);
});
Object.entries(publicPagesFr).forEach(([key, value]) => {
  addNestedKey(frMessages, key, value);
});
Object.entries(cgvKeysFr).forEach(([key, value]) => {
  addNestedKey(frMessages, key, value);
});

console.log('➕ Ajout des clés anglaises...');
Object.entries(authKeysEn).forEach(([key, value]) => {
  addNestedKey(enMessages, key, value);
});
Object.entries(developersKeysEn).forEach(([key, value]) => {
  addNestedKey(enMessages, key, value);
});
Object.entries(publicPagesEn).forEach(([key, value]) => {
  addNestedKey(enMessages, key, value);
});
Object.entries(cgvKeysEn).forEach(([key, value]) => {
  addNestedKey(enMessages, key, value);
});

// Fonction de tri récursif
function sortObjectRecursively(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj;
  }
  
  const sortedObj = {};
  Object.keys(obj).sort().forEach(key => {
    sortedObj[key] = sortObjectRecursively(obj[key]);
  });
  
  return sortedObj;
}

// Sauvegarder les fichiers triés
console.log('💾 Sauvegarde des fichiers mis à jour...');
const sortedFrMessages = sortObjectRecursively(frMessages);
const sortedEnMessages = sortObjectRecursively(enMessages);

try {
  fs.writeFileSync(frMessagesPath, JSON.stringify(sortedFrMessages, null, 2) + '\n', 'utf8');
  console.log('✅ Fichier fr.json mis à jour avec succès');
} catch (error) {
  console.error('❌ Erreur lors de la sauvegarde de fr.json:', error.message);
}

try {
  fs.writeFileSync(enMessagesPath, JSON.stringify(sortedEnMessages, null, 2) + '\n', 'utf8');
  console.log('✅ Fichier en.json mis à jour avec succès');
} catch (error) {
  console.error('❌ Erreur lors de la sauvegarde de en.json:', error.message);
}

// Compter les clés ajoutées
const totalFrKeys = Object.keys(authKeysFr).length + 
                   Object.keys(developersKeysFr).length + 
                   Object.keys(publicPagesFr).length + 
                   Object.keys(cgvKeysFr).length;
                   
const totalEnKeys = Object.keys(authKeysEn).length + 
                   Object.keys(developersKeysEn).length + 
                   Object.keys(publicPagesEn).length + 
                   Object.keys(cgvKeysEn).length;

console.log(`✅ Correction finale terminée !`);
console.log(`📊 Statistiques :`);
console.log(`   • ${totalFrKeys} clés françaises ajoutées`);
console.log(`   • ${totalEnKeys} clés anglaises ajoutées`);
console.log(`   • Total : ${totalFrKeys + totalEnKeys} clés ajoutées`);
console.log(`\n🎯 Nouveau total de clés dans les fichiers :`);

// Compter les clés totales
function countKeys(obj) {
  let count = 0;
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      count += countKeys(obj[key]);
    } else {
      count++;
    }
  }
  return count;
}

const totalFrKeysInFile = countKeys(sortedFrMessages);
const totalEnKeysInFile = countKeys(sortedEnMessages);

console.log(`   • ${totalFrKeysInFile} clés totales en français`);
console.log(`   • ${totalEnKeysInFile} clés totales en anglais`);
console.log(`   • Total : ${totalFrKeysInFile + totalEnKeysInFile} clés dans les fichiers`);

console.log(`\n🔧 Prochaines étapes :`);
console.log(`   1. Relancer le build pour vérifier les clés manquantes`);
console.log(`   2. Corriger les imports de composants si nécessaire`); 