const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers de traduction
const frMessagesPath = path.join(__dirname, '../src/messages/fr.json');
const enMessagesPath = path.join(__dirname, '../src/messages/en.json');

console.log('🔧 Correction finale - Contact, Developers et autres clés...');

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

// Fonction pour récupérer une valeur imbriquée
function getNestedValue(obj, keyPath) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (let key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}

// Nouvelles clés manquantes identifiées
const missingKeys = [
  // Contact page
  ['public.contact.badge', 'Contact', 'Contact'],
  ['public.contact.title', 'Contactez-nous', 'Contact us'],
  ['public.contact.subtitle', 'Nous sommes là pour vous aider', 'We are here to help you'],
  
  ['public.contact.phone.title', 'Téléphone', 'Phone'],
  ['public.contact.phone.description', 'Appelez-nous pour une assistance immédiate', 'Call us for immediate assistance'],
  ['public.contact.phone.button', 'Appeler maintenant', 'Call now'],
  
  ['public.contact.email.title', 'Email', 'Email'],
  ['public.contact.email.description', 'Envoyez-nous un email', 'Send us an email'],
  ['public.contact.email.button', 'Envoyer un email', 'Send email'],
  
  ['public.contact.address.title', 'Adresse', 'Address'],
  ['public.contact.address.description', 'Venez nous rendre visite', 'Come visit us'],
  ['public.contact.address.value', '110 rue de Flandre, 75019 Paris', '110 rue de Flandre, 75019 Paris'],
  ['public.contact.address.button', 'Voir sur la carte', 'View on map'],
  
  ['public.contact.schedule.badge', 'Horaires', 'Schedule'],
  ['public.contact.schedule.title', 'Nos horaires', 'Our schedule'],
  ['public.contact.schedule.subtitle', 'Quand nous contacter', 'When to contact us'],
  ['public.contact.schedule.mondayFriday', 'Lundi - Vendredi : 9h - 18h', 'Monday - Friday: 9am - 6pm'],
  ['public.contact.schedule.saturday', 'Samedi : 10h - 16h', 'Saturday: 10am - 4pm'],
  ['public.contact.schedule.sunday', 'Dimanche : Fermé', 'Sunday: Closed'],
  ['public.contact.schedule.closed', 'Fermé', 'Closed'],
  
  ['public.contact.form.badge', 'Formulaire', 'Form'],
  ['public.contact.form.title', 'Envoyez-nous un message', 'Send us a message'],
  ['public.contact.form.subtitle', 'Nous vous répondrons rapidement', 'We will reply quickly'],
  ['public.contact.form.firstName', 'Prénom', 'First name'],
  ['public.contact.form.firstNamePlaceholder', 'Votre prénom', 'Your first name'],
  ['public.contact.form.lastName', 'Nom', 'Last name'],
  ['public.contact.form.lastNamePlaceholder', 'Votre nom', 'Your last name'],
  ['public.contact.form.email', 'Email', 'Email'],
  ['public.contact.form.emailPlaceholder', 'votre@email.com', 'your@email.com'],
  ['public.contact.form.phone', 'Téléphone', 'Phone'],
  ['public.contact.form.phonePlaceholder', 'Votre numéro de téléphone', 'Your phone number'],
  ['public.contact.form.subject', 'Sujet', 'Subject'],
  ['public.contact.form.subjectPlaceholder', 'Sujet de votre message', 'Subject of your message'],
  ['public.contact.form.message', 'Message', 'Message'],
  ['public.contact.form.messagePlaceholder', 'Votre message...', 'Your message...'],
  ['public.contact.form.submit', 'Envoyer le message', 'Send message'],
  
  ['public.contact.social.badge', 'Réseaux sociaux', 'Social media'],
  ['public.contact.social.title', 'Suivez-nous', 'Follow us'],
  ['public.contact.social.subtitle', 'Restez connectés avec EcoDeli', 'Stay connected with EcoDeli'],
  
  // Developers API Keys page
  ['public.developers.apiKeys.title', 'Clés API', 'API Keys'],
  ['public.developers.apiKeys.description', 'Gérez vos clés d\'accès à l\'API EcoDeli', 'Manage your EcoDeli API access keys'],
  
  ['public.developers.apiKeys.management.title', 'Gestion des clés', 'Key management'],
  ['public.developers.apiKeys.management.description', 'Créez et gérez vos clés API', 'Create and manage your API keys'],
  
  ['public.developers.apiKeys.management.production.title', 'Clé de production', 'Production key'],
  ['public.developers.apiKeys.management.production.created', 'Créée le', 'Created on'],
  
  ['public.developers.apiKeys.management.test.title', 'Clé de test', 'Test key'],
  ['public.developers.apiKeys.management.test.created', 'Créée le', 'Created on'],
  
  ['public.developers.apiKeys.management.buttons.copy', 'Copier', 'Copy'],
  ['public.developers.apiKeys.management.buttons.regenerate', 'Régénérer', 'Regenerate'],
  ['public.developers.apiKeys.management.buttons.createNew', 'Créer une nouvelle clé', 'Create new key'],
  
  ['public.developers.apiKeys.usage.title', 'Utilisation', 'Usage'],
  ['public.developers.apiKeys.usage.authentication.title', 'Authentification', 'Authentication'],
  ['public.developers.apiKeys.usage.authentication.description', 'Utilisez votre clé API dans l\'en-tête Authorization', 'Use your API key in the Authorization header'],
  
  ['public.developers.apiKeys.usage.rateLimits.title', 'Limites de taux', 'Rate limits'],
  ['public.developers.apiKeys.usage.rateLimits.production', 'Production : 1000 requêtes/heure', 'Production: 1000 requests/hour'],
  ['public.developers.apiKeys.usage.rateLimits.test', 'Test : 100 requêtes/heure', 'Test: 100 requests/hour'],
  
  ['public.developers.apiKeys.usage.security.title', 'Sécurité', 'Security'],
  ['public.developers.apiKeys.usage.security.item1', 'Ne partagez jamais vos clés API', 'Never share your API keys'],
  ['public.developers.apiKeys.usage.security.item2', 'Utilisez HTTPS uniquement', 'Use HTTPS only'],
  ['public.developers.apiKeys.usage.security.item3', 'Régénérez vos clés régulièrement', 'Regenerate your keys regularly'],
  ['public.developers.apiKeys.usage.security.item4', 'Surveillez l\'utilisation de vos clés', 'Monitor your key usage'],
  
  // Service requests
  ['serviceRequests.pageTitle', 'Demandes de service', 'Service requests'],
  ['serviceRequests.pageDescription', 'Gérez vos demandes de service', 'Manage your service requests']
];

// Compter les clés ajoutées
let addedCount = 0;

missingKeys.forEach(([key, frValue, enValue]) => {
  // Ajouter en français
  if (!getNestedValue(frMessages, key)) {
    addNestedKey(frMessages, key, frValue);
    addedCount++;
  }
  
  // Ajouter en anglais
  if (!getNestedValue(enMessages, key)) {
    addNestedKey(enMessages, key, enValue);
  }
});

// Sauvegarder les fichiers
try {
  fs.writeFileSync(frMessagesPath, JSON.stringify(frMessages, null, 2), 'utf8');
  fs.writeFileSync(enMessagesPath, JSON.stringify(enMessages, null, 2), 'utf8');
  
  console.log(`✅ ${addedCount} clés ajoutées avec succès !`);
  console.log('📁 Fichiers fr.json et en.json mis à jour');
  console.log('💡 Relancez le build pour voir les améliorations');
} catch (error) {
  console.log('❌ Erreur lors de la sauvegarde:', error.message);
} 