const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers de traduction
const frMessagesPath = path.join(__dirname, '../src/messages/fr.json');
const enMessagesPath = path.join(__dirname, '../src/messages/en.json');

console.log('🔧 Ajout des clés privacy manquantes...');

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

// Clés privacy à ajouter
const privacyKeys = {
  "public.privacy.title": {
    fr: "Politique de Confidentialité",
    en: "Privacy Policy"
  },
  "public.privacy.lastUpdated": {
    fr: "Dernière mise à jour : Janvier 2025",
    en: "Last updated: January 2025"
  },
  "public.privacy.section1.title": {
    fr: "Introduction",
    en: "Introduction"
  },
  "public.privacy.section1.content": {
    fr: "EcoDeli s'engage à protéger votre vie privée. Cette politique décrit comment nous collectons, utilisons et protégeons vos données personnelles conformément au RGPD.",
    en: "EcoDeli is committed to protecting your privacy. This policy describes how we collect, use and protect your personal data in accordance with GDPR."
  },
  "public.privacy.section2.title": {
    fr: "Données collectées",
    en: "Data collected"
  },
  "public.privacy.section2.intro": {
    fr: "Nous collectons les types de données suivants :",
    en: "We collect the following types of data:"
  },
  "public.privacy.section2.item1": {
    fr: "Informations d'identification : nom, prénom, email, téléphone",
    en: "Identification information: name, surname, email, phone"
  },
  "public.privacy.section2.item2": {
    fr: "Données de localisation pour les services de livraison",
    en: "Location data for delivery services"
  },
  "public.privacy.section2.item3": {
    fr: "Historique des transactions et commandes",
    en: "Transaction and order history"
  },
  "public.privacy.section2.item4": {
    fr: "Données de navigation et cookies techniques",
    en: "Browsing data and technical cookies"
  },
  "public.privacy.section2.item5": {
    fr: "Documents d'identité pour la validation des comptes livreurs",
    en: "Identity documents for deliverer account validation"
  },
  "public.privacy.section3.title": {
    fr: "Utilisation des données",
    en: "Data usage"
  },
  "public.privacy.section3.content": {
    fr: "Vos données sont utilisées pour fournir nos services de livraison, gérer votre compte, améliorer notre plateforme et respecter nos obligations légales. Nous ne vendons jamais vos données à des tiers.",
    en: "Your data is used to provide our delivery services, manage your account, improve our platform and comply with our legal obligations. We never sell your data to third parties."
  },
  "public.privacy.section4.title": {
    fr: "Base légale",
    en: "Legal basis"
  },
  "public.privacy.section4.content": {
    fr: "Le traitement de vos données est basé sur l'exécution du contrat de service, votre consentement explicite, et le respect de nos obligations légales en tant que plateforme de mise en relation.",
    en: "The processing of your data is based on the performance of the service contract, your explicit consent, and compliance with our legal obligations as a matchmaking platform."
  },
  "public.privacy.section5.title": {
    fr: "Partage des données",
    en: "Data sharing"
  },
  "public.privacy.section5.intro": {
    fr: "Nous pouvons partager vos données dans les cas suivants :",
    en: "We may share your data in the following cases:"
  },
  "public.privacy.section5.item1": {
    fr: "Avec les livreurs pour l'exécution des livraisons",
    en: "With deliverers for delivery execution"
  },
  "public.privacy.section5.item2": {
    fr: "Avec nos prestataires de paiement sécurisés",
    en: "With our secure payment providers"
  },
  "public.privacy.section5.item3": {
    fr: "En cas d'obligation légale ou judiciaire",
    en: "In case of legal or judicial obligation"
  },
  "public.privacy.section5.item4": {
    fr: "Avec votre consentement explicite",
    en: "With your explicit consent"
  },
  "public.privacy.section5.item5": {
    fr: "Pour la prévention de la fraude et la sécurité",
    en: "For fraud prevention and security"
  },
  "public.privacy.section6.title": {
    fr: "Vos droits",
    en: "Your rights"
  },
  "public.privacy.section6.content": {
    fr: "Vous disposez des droits d'accès, de rectification, d'effacement, de portabilité, de limitation du traitement et d'opposition. Contactez-nous à privacy@ecodeli.fr pour exercer vos droits.",
    en: "You have the rights of access, rectification, erasure, portability, limitation of processing and opposition. Contact us at privacy@ecodeli.fr to exercise your rights."
  },
  "public.privacy.section7.title": {
    fr: "Contact",
    en: "Contact"
  },
  "public.privacy.section7.content": {
    fr: "Pour toute question relative à cette politique de confidentialité, contactez notre DPO à privacy@ecodeli.fr ou par courrier au 110 rue de Flandre, 75019 Paris.",
    en: "For any questions regarding this privacy policy, contact our DPO at privacy@ecodeli.fr or by mail at 110 rue de Flandre, 75019 Paris."
  }
};

let addedCount = 0;

// Ajouter toutes les clés
Object.keys(privacyKeys).forEach(key => {
  const { fr, en } = privacyKeys[key];
  
  addNestedKey(frMessages, key, fr);
  addNestedKey(enMessages, key, en);
  addedCount++;
});

// Sauvegarder les fichiers
try {
  fs.writeFileSync(frMessagesPath, JSON.stringify(frMessages, null, 2), 'utf8');
  fs.writeFileSync(enMessagesPath, JSON.stringify(enMessages, null, 2), 'utf8');
  
  console.log(`✅ ${addedCount} clés privacy ajoutées avec succès !`);
  console.log(`📝 Fichiers mis à jour :`);
  console.log(`   - ${frMessagesPath}`);
  console.log(`   - ${enMessagesPath}`);
} catch (error) {
  console.log('❌ Erreur lors de la sauvegarde:', error.message);
} 