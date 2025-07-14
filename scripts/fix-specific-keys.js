#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script pour ajouter rapidement les clés spécifiques manquantes
 * identifiées dans les erreurs de build
 */

const MESSAGES_DIR = path.join(__dirname, '../src/messages');

// Clés spécifiques manquantes identifiées dans les erreurs de build
const MISSING_KEYS = {
  // Contact page
  'public.contact.phone.title': 'Téléphone',
  'public.contact.phone.description': 'Appelez-nous pour une assistance immédiate',
  'public.contact.phone.button': 'Appeler maintenant',
  'public.contact.email.title': 'Email',
  'public.contact.email.description': 'Envoyez-nous un message, nous répondons rapidement',
  'public.contact.email.button': 'Envoyer un email',
  'public.contact.address.title': 'Adresse',
  'public.contact.address.description': 'Venez nous rendre visite à notre siège social',
  'public.contact.address.value': '110 rue de Flandre, 75019 Paris',
  'public.contact.address.button': 'Voir sur la carte',
  'public.contact.schedule.badge': 'Horaires',
  'public.contact.schedule.title': 'Nos horaires d\'ouverture',
  'public.contact.schedule.subtitle': 'Nous sommes disponibles aux horaires suivants',
  'public.contact.schedule.mondayFriday': 'Lundi - Vendredi : 9h00 - 18h00',
  'public.contact.schedule.saturday': 'Samedi : 10h00 - 16h00',
  'public.contact.schedule.sunday': 'Dimanche : Fermé',
  'public.contact.schedule.closed': 'Fermé',
  'public.contact.form.badge': 'Contact',
  'public.contact.form.title': 'Contactez-nous',
  'public.contact.form.subtitle': 'Remplissez le formulaire ci-dessous',
  'public.contact.form.firstName': 'Prénom',
  'public.contact.form.firstNamePlaceholder': 'Votre prénom',
  'public.contact.form.lastName': 'Nom',
  'public.contact.form.lastNamePlaceholder': 'Votre nom',
  'public.contact.form.email': 'Email',
  'public.contact.form.emailPlaceholder': 'votre@email.com',
  'public.contact.form.phone': 'Téléphone',
  'public.contact.form.phonePlaceholder': '+33 6 12 34 56 78',
  'public.contact.form.subject': 'Sujet',
  'public.contact.form.subjectPlaceholder': 'L\'objet de votre message',
  'public.contact.form.message': 'Message',
  'public.contact.form.messagePlaceholder': 'Votre message...',
  'public.contact.form.submit': 'Envoyer le message',
  'public.contact.social.badge': 'Réseaux',
  'public.contact.social.title': 'Suivez-nous',
  'public.contact.social.subtitle': 'Restez connectés avec EcoDeli',

  // Become delivery page
  'public.becomeDelivery.badge': 'Recrutement',
  'public.becomeDelivery.title': 'Devenez Livreur EcoDeli',
  'public.becomeDelivery.subtitle': 'Rejoignez notre réseau de livreurs écologiques',
  'public.becomeDelivery.registerAsCourier': 'S\'inscrire comme coursier',
  'public.becomeDelivery.discoverAdvantages': 'Découvrir les avantages',
  'public.becomeDelivery.heroImageAlt': 'Livreur EcoDeli en action',
  'public.becomeDelivery.joinNetwork': 'Rejoindre le réseau',
  'public.becomeDelivery.advantagesBadge': 'Avantages',
  'public.becomeDelivery.advantagesTitle': 'Pourquoi choisir EcoDeli ?',
  'public.becomeDelivery.advantagesSubtitle': 'Découvrez tous les avantages de rejoindre notre équipe',
  'public.becomeDelivery.advantages.purchasingPower.title': 'Augmentez votre pouvoir d\'achat',
  'public.becomeDelivery.advantages.purchasingPower.description': 'Gagnez un complément de revenus flexible',
  'public.becomeDelivery.advantages.flexibility.title': 'Flexibilité totale',
  'public.becomeDelivery.advantages.flexibility.description': 'Travaillez quand vous voulez, où vous voulez',
  'public.becomeDelivery.advantages.ecologicalImpact.title': 'Impact écologique positif',
  'public.becomeDelivery.advantages.ecologicalImpact.description': 'Participez à la transition écologique',
  'public.becomeDelivery.advantages.security.title': 'Sécurité garantie',
  'public.becomeDelivery.advantages.security.description': 'Assurance et protection complètes',
  'public.becomeDelivery.advantages.fightIsolation.title': 'Luttez contre l\'isolement',
  'public.becomeDelivery.advantages.fightIsolation.description': 'Créez du lien social et de la solidarité',
  'public.becomeDelivery.advantages.variedServices.title': 'Services variés',
  'public.becomeDelivery.advantages.variedServices.description': 'Diversifiez vos activités et vos revenus',
  'public.becomeDelivery.processBadge': 'Processus',
  'public.becomeDelivery.processTitle': 'Comment devenir livreur',
  'public.becomeDelivery.processSubtitle': 'Suivez ces étapes simples pour nous rejoindre',
  'public.becomeDelivery.processSteps.register.title': 'Inscription',
  'public.becomeDelivery.processSteps.register.description': 'Créez votre compte et complétez votre profil',
  'public.becomeDelivery.processSteps.verification.title': 'Vérification',
  'public.becomeDelivery.processSteps.verification.description': 'Validation de vos documents et identité',
  'public.becomeDelivery.processSteps.announcements.title': 'Première mission',
  'public.becomeDelivery.processSteps.announcements.description': 'Acceptez votre première livraison',
  'public.becomeDelivery.processSteps.deliveryPayment.title': 'Paiement',
  'public.becomeDelivery.processSteps.deliveryPayment.description': 'Recevez votre rémunération',
  'public.becomeDelivery.becomeCourierNow': 'Devenir coursier maintenant',
  'public.becomeDelivery.servicesBadge': 'Services',
  'public.becomeDelivery.servicesTitle': 'Types de services',
  'public.becomeDelivery.servicesSubtitle': 'Découvrez la variété des missions disponibles',
  'public.becomeDelivery.parcelTransport.title': 'Transport de colis',
  'public.becomeDelivery.parcelTransport.feature1': 'Livraisons locales et nationales',
  'public.becomeDelivery.parcelTransport.feature2': 'Colis de toutes tailles',
  'public.becomeDelivery.parcelTransport.feature3': 'Suivi en temps réel',
  'public.becomeDelivery.parcelTransport.feature4': 'Assurance incluse',
  'public.becomeDelivery.parcelTransport.feature5': 'Paiement sécurisé',
  'public.becomeDelivery.personalServices.title': 'Services à la personne',
  'public.becomeDelivery.personalServices.feature1': 'Transport de personnes',
  'public.becomeDelivery.personalServices.feature2': 'Transferts aéroport',
  'public.becomeDelivery.personalServices.feature3': 'Courses et achats',
  'public.becomeDelivery.personalServices.feature4': 'Garde d\'animaux',
  'public.becomeDelivery.personalServices.feature5': 'Services à domicile',
  'public.becomeDelivery.personalServices.feature6': 'Assistance séniors',
  'public.becomeDelivery.paymentBadge': 'Rémunération',
  'public.becomeDelivery.paymentTitle': 'Comment vous êtes payé',
  'public.becomeDelivery.paymentSubtitle': 'Système de paiement transparent et équitable',
  'public.becomeDelivery.paymentSteps.step1': 'Acceptation de la mission',
  'public.becomeDelivery.paymentSteps.step2': 'Validation avec code 6 chiffres',
  'public.becomeDelivery.paymentSteps.step3': 'Crédit sur votre portefeuille',
  'public.becomeDelivery.paymentSteps.step4': 'Demande de virement',
  'public.becomeDelivery.paymentSteps.step5': 'Réception sous 24-48h',
  'public.becomeDelivery.cta.badge': 'Rejoignez-nous',
  'public.becomeDelivery.cta.title': 'Prêt à commencer ?',
  'public.becomeDelivery.cta.subtitle': 'Inscrivez-vous maintenant et commencez à gagner de l\'argent',
  'public.becomeDelivery.cta.registerAsCourier': 'S\'inscrire comme coursier',

  // Merchant pages
  'merchant.orders.title': 'Gestion des Commandes',
  'merchant.orders.description': 'Suivez et gérez toutes vos commandes clients',
  'merchant.products.title': 'Gestion des Produits',
  'merchant.products.description': 'Gérez votre catalogue de produits',
  'merchant.products.list.title': 'Liste des Produits',
  'merchant.products.list.description': 'Consultez et modifiez vos produits'
};

const MISSING_KEYS_EN = {
  // Contact page
  'public.contact.phone.title': 'Phone',
  'public.contact.phone.description': 'Call us for immediate assistance',
  'public.contact.phone.button': 'Call now',
  'public.contact.email.title': 'Email',
  'public.contact.email.description': 'Send us a message, we respond quickly',
  'public.contact.email.button': 'Send email',
  'public.contact.address.title': 'Address',
  'public.contact.address.description': 'Visit us at our headquarters',
  'public.contact.address.value': '110 rue de Flandre, 75019 Paris',
  'public.contact.address.button': 'View on map',
  'public.contact.schedule.badge': 'Hours',
  'public.contact.schedule.title': 'Our opening hours',
  'public.contact.schedule.subtitle': 'We are available at the following times',
  'public.contact.schedule.mondayFriday': 'Monday - Friday: 9:00 AM - 6:00 PM',
  'public.contact.schedule.saturday': 'Saturday: 10:00 AM - 4:00 PM',
  'public.contact.schedule.sunday': 'Sunday: Closed',
  'public.contact.schedule.closed': 'Closed',
  'public.contact.form.badge': 'Contact',
  'public.contact.form.title': 'Contact us',
  'public.contact.form.subtitle': 'Fill out the form below',
  'public.contact.form.firstName': 'First Name',
  'public.contact.form.firstNamePlaceholder': 'Your first name',
  'public.contact.form.lastName': 'Last Name',
  'public.contact.form.lastNamePlaceholder': 'Your last name',
  'public.contact.form.email': 'Email',
  'public.contact.form.emailPlaceholder': 'your@email.com',
  'public.contact.form.phone': 'Phone',
  'public.contact.form.phonePlaceholder': '+33 6 12 34 56 78',
  'public.contact.form.subject': 'Subject',
  'public.contact.form.subjectPlaceholder': 'Subject of your message',
  'public.contact.form.message': 'Message',
  'public.contact.form.messagePlaceholder': 'Your message...',
  'public.contact.form.submit': 'Send message',
  'public.contact.social.badge': 'Social',
  'public.contact.social.title': 'Follow us',
  'public.contact.social.subtitle': 'Stay connected with EcoDeli',

  // Become delivery page (EN)
  'public.becomeDelivery.badge': 'Recruitment',
  'public.becomeDelivery.title': 'Become an EcoDeli Courier',
  'public.becomeDelivery.subtitle': 'Join our network of eco-friendly couriers',
  'public.becomeDelivery.registerAsCourier': 'Register as courier',
  'public.becomeDelivery.discoverAdvantages': 'Discover advantages',
  'public.becomeDelivery.heroImageAlt': 'EcoDeli courier in action',
  'public.becomeDelivery.joinNetwork': 'Join the network',
  'public.becomeDelivery.advantagesBadge': 'Advantages',
  'public.becomeDelivery.advantagesTitle': 'Why choose EcoDeli?',
  'public.becomeDelivery.advantagesSubtitle': 'Discover all the benefits of joining our team',
  'public.becomeDelivery.advantages.purchasingPower.title': 'Increase your purchasing power',
  'public.becomeDelivery.advantages.purchasingPower.description': 'Earn flexible additional income',
  'public.becomeDelivery.advantages.flexibility.title': 'Total flexibility',
  'public.becomeDelivery.advantages.flexibility.description': 'Work when you want, where you want',
  'public.becomeDelivery.advantages.ecologicalImpact.title': 'Positive ecological impact',
  'public.becomeDelivery.advantages.ecologicalImpact.description': 'Participate in the ecological transition',
  'public.becomeDelivery.advantages.security.title': 'Guaranteed security',
  'public.becomeDelivery.advantages.security.description': 'Complete insurance and protection',
  'public.becomeDelivery.advantages.fightIsolation.title': 'Fight isolation',
  'public.becomeDelivery.advantages.fightIsolation.description': 'Create social connections and solidarity',
  'public.becomeDelivery.advantages.variedServices.title': 'Varied services',
  'public.becomeDelivery.advantages.variedServices.description': 'Diversify your activities and income',
  'public.becomeDelivery.processBadge': 'Process',
  'public.becomeDelivery.processTitle': 'How to become a courier',
  'public.becomeDelivery.processSubtitle': 'Follow these simple steps to join us',
  'public.becomeDelivery.processSteps.register.title': 'Registration',
  'public.becomeDelivery.processSteps.register.description': 'Create your account and complete your profile',
  'public.becomeDelivery.processSteps.verification.title': 'Verification',
  'public.becomeDelivery.processSteps.verification.description': 'Validation of your documents and identity',
  'public.becomeDelivery.processSteps.announcements.title': 'First mission',
  'public.becomeDelivery.processSteps.announcements.description': 'Accept your first delivery',
  'public.becomeDelivery.processSteps.deliveryPayment.title': 'Payment',
  'public.becomeDelivery.processSteps.deliveryPayment.description': 'Receive your compensation',
  'public.becomeDelivery.becomeCourierNow': 'Become courier now',
  'public.becomeDelivery.servicesBadge': 'Services',
  'public.becomeDelivery.servicesTitle': 'Types of services',
  'public.becomeDelivery.servicesSubtitle': 'Discover the variety of available missions',
  'public.becomeDelivery.parcelTransport.title': 'Parcel transport',
  'public.becomeDelivery.parcelTransport.feature1': 'Local and national deliveries',
  'public.becomeDelivery.parcelTransport.feature2': 'Parcels of all sizes',
  'public.becomeDelivery.parcelTransport.feature3': 'Real-time tracking',
  'public.becomeDelivery.parcelTransport.feature4': 'Insurance included',
  'public.becomeDelivery.parcelTransport.feature5': 'Secure payment',
  'public.becomeDelivery.personalServices.title': 'Personal services',
  'public.becomeDelivery.personalServices.feature1': 'People transport',
  'public.becomeDelivery.personalServices.feature2': 'Airport transfers',
  'public.becomeDelivery.personalServices.feature3': 'Shopping and errands',
  'public.becomeDelivery.personalServices.feature4': 'Pet sitting',
  'public.becomeDelivery.personalServices.feature5': 'Home services',
  'public.becomeDelivery.personalServices.feature6': 'Senior assistance',
  'public.becomeDelivery.paymentBadge': 'Payment',
  'public.becomeDelivery.paymentTitle': 'How you get paid',
  'public.becomeDelivery.paymentSubtitle': 'Transparent and fair payment system',
  'public.becomeDelivery.paymentSteps.step1': 'Mission acceptance',
  'public.becomeDelivery.paymentSteps.step2': 'Validation with 6-digit code',
  'public.becomeDelivery.paymentSteps.step3': 'Credit to your wallet',
  'public.becomeDelivery.paymentSteps.step4': 'Transfer request',
  'public.becomeDelivery.paymentSteps.step5': 'Receipt within 24-48h',
  'public.becomeDelivery.cta.badge': 'Join us',
  'public.becomeDelivery.cta.title': 'Ready to start?',
  'public.becomeDelivery.cta.subtitle': 'Sign up now and start earning money',
  'public.becomeDelivery.cta.registerAsCourier': 'Register as courier',

  // Merchant pages (EN)
  'merchant.orders.title': 'Order Management',
  'merchant.orders.description': 'Track and manage all your customer orders',
  'merchant.products.title': 'Product Management',
  'merchant.products.description': 'Manage your product catalog',
  'merchant.products.list.title': 'Product List',
  'merchant.products.list.description': 'View and edit your products'
};

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
  current[lastKey] = value;
}

/**
 * Script principal
 */
function main() {
  console.log('🔧 Ajout des clés spécifiques manquantes...\n');

  const frPath = path.join(MESSAGES_DIR, 'fr.json');
  const enPath = path.join(MESSAGES_DIR, 'en.json');

  // Charger les fichiers existants
  let frMessages = {};
  let enMessages = {};

  try {
    frMessages = JSON.parse(fs.readFileSync(frPath, 'utf8'));
    console.log('✅ Fichier FR chargé');
  } catch (err) {
    console.log('⚠️  Fichier FR non trouvé, création d\'un nouveau');
  }

  try {
    enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    console.log('✅ Fichier EN chargé');
  } catch (err) {
    console.log('⚠️  Fichier EN non trouvé, création d\'un nouveau');
  }

  // Ajouter les clés manquantes FR
  console.log('\n🇫🇷 Ajout des clés FR...');
  let addedFr = 0;
  Object.entries(MISSING_KEYS).forEach(([key, value]) => {
    setNestedKey(frMessages, key, value);
    addedFr++;
    console.log(`  ✅ ${key} = "${value}"`);
  });

  // Ajouter les clés manquantes EN
  console.log('\n🇬🇧 Ajout des clés EN...');
  let addedEn = 0;
  Object.entries(MISSING_KEYS_EN).forEach(([key, value]) => {
    setNestedKey(enMessages, key, value);
    addedEn++;
    console.log(`  ✅ ${key} = "${value}"`);
  });

  // Sauvegarder les fichiers
  fs.writeFileSync(frPath, JSON.stringify(frMessages, null, 2), 'utf8');
  fs.writeFileSync(enPath, JSON.stringify(enMessages, null, 2), 'utf8');

  console.log(`\n✅ Ajout terminé !`);
  console.log(`🇫🇷 Clés FR ajoutées: ${addedFr}`);
  console.log(`🇬🇧 Clés EN ajoutées: ${addedEn}`);
  console.log(`📄 Fichier FR mis à jour: ${frPath}`);
  console.log(`📄 Fichier EN mis à jour: ${enPath}`);
  console.log(`\n💡 Relancez 'pnpm run build' pour vérifier les corrections.`);
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { main }; 