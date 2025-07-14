const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers de traduction
const frMessagesPath = path.join(__dirname, '../src/messages/fr.json');
const enMessagesPath = path.join(__dirname, '../src/messages/en.json');

console.log('🔧 Ajout des dernières clés legal et CGV...');

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
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  const lastKey = keys[keys.length - 1];
  if (current && typeof current === 'object') {
    current[lastKey] = value;
  }
}

// Dernières clés manquantes
const legalKeys = {
  // CGV supplémentaires
  "public.legal.cgv.article3.intro": {
    fr: "EcoDeli propose plusieurs types de services via sa plateforme :",
    en: "EcoDeli offers several types of services through its platform:"
  },
  "public.legal.cgv.article5.title": {
    fr: "Modalités de paiement",
    en: "Payment terms"
  },
  "public.legal.cgv.article5.content": {
    fr: "Les paiements s'effectuent via Stripe selon les tarifs affichés. Le paiement est dû avant la prestation de service.",
    en: "Payments are made via Stripe according to displayed rates. Payment is due before service delivery."
  },
  "public.legal.cgv.article6.title": {
    fr: "Responsabilités et assurances",
    en: "Responsibilities and insurance"
  },
  "public.legal.cgv.article6.content": {
    fr: "EcoDeli agit comme intermédiaire. Les utilisateurs sont responsables de leurs actions et doivent posséder les assurances appropriées.",
    en: "EcoDeli acts as an intermediary. Users are responsible for their actions and must have appropriate insurance."
  },
  
  // Page legal principale
  "public.legal.title": {
    fr: "Mentions Légales",
    en: "Legal Notice"
  },
  "public.legal.description": {
    fr: "Informations légales relatives à EcoDeli",
    en: "Legal information relating to EcoDeli"
  },
  "public.legal.legalInfo.title": {
    fr: "Informations légales",
    en: "Legal information"
  },
  "public.legal.legalInfo.companyName": {
    fr: "Dénomination sociale : EcoDeli SAS",
    en: "Company name: EcoDeli SAS"
  },
  "public.legal.legalInfo.address": {
    fr: "Adresse : 110 rue de Flandre, 75019 Paris",
    en: "Address: 110 rue de Flandre, 75019 Paris"
  },
  "public.legal.legalInfo.siret": {
    fr: "SIRET : 123 456 789 00010",
    en: "SIRET: 123 456 789 00010"
  },
  "public.legal.legalInfo.capital": {
    fr: "Capital social : 100 000 €",
    en: "Share capital: €100,000"
  },
  "public.legal.legalInfo.director": {
    fr: "Directeur de publication : Sylvain Levy",
    en: "Publishing director: Sylvain Levy"
  },
  "public.legal.hosting.title": {
    fr: "Hébergement",
    en: "Hosting"
  },
  "public.legal.hosting.provider": {
    fr: "Hébergeur : OVH SAS",
    en: "Host: OVH SAS"
  },
  "public.legal.hosting.address": {
    fr: "2 rue Kellermann, 59100 Roubaix",
    en: "2 rue Kellermann, 59100 Roubaix"
  },
  "public.legal.dataProtection.title": {
    fr: "Protection des données",
    en: "Data protection"
  },
  "public.legal.dataProtection.content": {
    fr: "EcoDeli respecte le RGPD. Consultez notre politique de confidentialité pour plus d'informations.",
    en: "EcoDeli complies with GDPR. See our privacy policy for more information."
  },
  "public.legal.intellectualProperty.title": {
    fr: "Propriété intellectuelle",
    en: "Intellectual property"
  },
  "public.legal.intellectualProperty.content": {
    fr: "Tous les contenus du site sont protégés par le droit d'auteur. Toute reproduction est interdite sans autorisation.",
    en: "All site content is protected by copyright. Any reproduction is prohibited without authorization."
  }
};

let addedCount = 0;

// Ajouter toutes les clés
Object.keys(legalKeys).forEach(key => {
  const { fr, en } = legalKeys[key];
  
  addNestedKey(frMessages, key, fr);
  addNestedKey(enMessages, key, en);
  addedCount++;
});

// Sauvegarder les fichiers
try {
  fs.writeFileSync(frMessagesPath, JSON.stringify(frMessages, null, 2), 'utf8');
  fs.writeFileSync(enMessagesPath, JSON.stringify(enMessages, null, 2), 'utf8');
  
  console.log(`✅ ${addedCount} clés legal ajoutées avec succès !`);
  console.log(`📝 Fichiers mis à jour :`);
  console.log(`   - ${frMessagesPath}`);
  console.log(`   - ${enMessagesPath}`);
} catch (error) {
  console.log('❌ Erreur lors de la sauvegarde:', error.message);
} 