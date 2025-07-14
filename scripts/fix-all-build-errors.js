const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers de traduction
const frMessagesPath = path.join(__dirname, '../src/messages/fr.json');
const enMessagesPath = path.join(__dirname, '../src/messages/en.json');

console.log('🔧 Correction massive de toutes les erreurs de build...');

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

// Toutes les clés manquantes extraites des erreurs de build
const missingKeys = [
  // FAQ page
  ['public.faq.services.title', 'Services', 'Services'],
  ['public.faq.services.q1.question', 'Comment puis-je faire livrer un colis ?', 'How can I have a package delivered?'],
  ['public.faq.services.q1.answer', 'Créez une annonce avec les détails de votre colis, choisissez un livreur et effectuez le paiement.', 'Create an announcement with your package details, choose a deliverer and make the payment.'],
  ['public.faq.services.q2.question', 'Quels types de services proposez-vous ?', 'What types of services do you offer?'],
  ['public.faq.services.q2.answer', 'Nous proposons la livraison de colis, le transport de personnes, les transferts aéroport et les services à domicile.', 'We offer package delivery, people transport, airport transfers and home services.'],
  ['public.faq.services.q3.question', 'Comment les prix sont-ils déterminés ?', 'How are prices determined?'],
  ['public.faq.services.q3.answer', 'Les prix dépendent de la distance, du type de service et de l\'urgence de la demande.', 'Prices depend on distance, type of service and urgency of the request.'],
  ['public.faq.services.q4.question', 'Puis-je suivre ma livraison en temps réel ?', 'Can I track my delivery in real time?'],
  ['public.faq.services.q4.answer', 'Oui, vous pouvez suivre votre livraison en temps réel via votre espace client.', 'Yes, you can track your delivery in real time via your client area.'],
  
  ['public.faq.payment.title', 'Paiement', 'Payment'],
  ['public.faq.payment.q1.question', 'Quels modes de paiement acceptez-vous ?', 'What payment methods do you accept?'],
  ['public.faq.payment.q1.answer', 'Nous acceptons les cartes bancaires, PayPal et les virements bancaires.', 'We accept credit cards, PayPal and bank transfers.'],
  ['public.faq.payment.q2.question', 'Quand suis-je débité ?', 'When am I charged?'],
  ['public.faq.payment.q2.answer', 'Le paiement est effectué à la validation de la livraison par le destinataire.', 'Payment is made when the delivery is validated by the recipient.'],
  ['public.faq.payment.q3.question', 'Puis-je annuler une commande ?', 'Can I cancel an order?'],
  ['public.faq.payment.q3.answer', 'Oui, vous pouvez annuler une commande avant qu\'elle soit acceptée par un livreur.', 'Yes, you can cancel an order before it is accepted by a deliverer.'],
  ['public.faq.payment.q4.question', 'Comment fonctionne le remboursement ?', 'How does refund work?'],
  ['public.faq.payment.q4.answer', 'Les remboursements sont traités sous 3-5 jours ouvrés selon votre mode de paiement.', 'Refunds are processed within 3-5 business days depending on your payment method.'],
  
  ['public.faq.security.title', 'Sécurité', 'Security'],
  ['public.faq.security.q1.question', 'Comment vérifiez-vous vos livreurs ?', 'How do you verify your deliverers?'],
  ['public.faq.security.q1.answer', 'Tous nos livreurs passent par un processus de vérification incluant contrôle d\'identité et d\'assurance.', 'All our deliverers go through a verification process including identity and insurance checks.'],
  ['public.faq.security.q2.question', 'Que se passe-t-il si mon colis est perdu ?', 'What happens if my package is lost?'],
  ['public.faq.security.q2.answer', 'Nous offrons une assurance couvrant vos colis jusqu\'à 500€ par défaut, extensible selon votre abonnement.', 'We offer insurance covering your packages up to €500 by default, extendable according to your subscription.'],
  ['public.faq.security.q3.question', 'Mes données personnelles sont-elles protégées ?', 'Are my personal data protected?'],
  ['public.faq.security.q3.answer', 'Oui, nous respectons le RGPD et utilisons le chiffrement SSL pour protéger vos données.', 'Yes, we comply with GDPR and use SSL encryption to protect your data.'],
  ['public.faq.security.q4.question', 'Comment signaler un problème ?', 'How to report a problem?'],
  ['public.faq.security.q4.answer', 'Vous pouvez nous contacter via notre support client 24h/7j depuis votre espace personnel.', 'You can contact us via our 24/7 customer support from your personal area.'],
  
  ['public.faq.account.title', 'Compte', 'Account'],
  ['public.faq.account.q1.question', 'Comment créer un compte ?', 'How to create an account?'],
  ['public.faq.account.q1.answer', 'Cliquez sur "S\'inscrire" et suivez les étapes. La vérification par email est requise.', 'Click on "Sign up" and follow the steps. Email verification is required.'],
  ['public.faq.account.q2.question', 'J\'ai oublié mon mot de passe, que faire ?', 'I forgot my password, what to do?'],
  ['public.faq.account.q2.answer', 'Utilisez le lien "Mot de passe oublié" sur la page de connexion pour réinitialiser votre mot de passe.', 'Use the "Forgot password" link on the login page to reset your password.'],
  ['public.faq.account.q3.question', 'Puis-je modifier mes informations personnelles ?', 'Can I modify my personal information?'],
  ['public.faq.account.q3.answer', 'Oui, vous pouvez modifier vos informations depuis votre espace personnel à tout moment.', 'Yes, you can modify your information from your personal area at any time.'],
  ['public.faq.account.q4.question', 'Comment supprimer mon compte ?', 'How to delete my account?'],
  ['public.faq.account.q4.answer', 'Contactez notre support client pour demander la suppression de votre compte et de toutes vos données.', 'Contact our customer support to request deletion of your account and all your data.'],
  
  ['public.faq.notFound.title', 'Question non trouvée ?', 'Question not found?'],
  ['public.faq.notFound.subtitle', 'Contactez notre équipe support pour plus d\'aide', 'Contact our support team for more help'],
  
  // About page
  ['public.about.badge', 'À propos', 'About'],
  ['public.about.title', 'Notre histoire', 'Our story'],
  ['public.about.subtitle', 'Découvrez l\'aventure EcoDeli depuis 2018', 'Discover the EcoDeli adventure since 2018'],
  ['public.about.foundingTeamAlt', 'Équipe fondatrice EcoDeli', 'EcoDeli founding team'],
  ['public.about.concept', 'Notre concept révolutionnaire', 'Our revolutionary concept'],
  ['public.about.conceptBadge', 'Concept', 'Concept'],
  ['public.about.conceptTitle', 'Le crowdshipping écologique', 'Ecological crowdshipping'],
  ['public.about.conceptDescription1', 'EcoDeli révolutionne la livraison en optimisant les trajets existants.', 'EcoDeli revolutionizes delivery by optimizing existing routes.'],
  ['public.about.conceptDescription2', 'Notre plateforme met en relation particuliers et professionnels pour un transport plus écologique.', 'Our platform connects individuals and professionals for more ecological transport.'],
  ['public.about.conceptDescription3', 'Réduisez votre empreinte carbone tout en augmentant votre pouvoir d\'achat.', 'Reduce your carbon footprint while increasing your purchasing power.'],
  ['public.about.conceptDescription4', 'Rejoignez la communauté de livraison collaborative et responsable.', 'Join the collaborative and responsible delivery community.'],
  ['public.about.joinCommunity', 'Rejoindre la communauté', 'Join the community'],
  
  ['public.about.missionBadge', 'Mission', 'Mission'],
  ['public.about.missionTitle', 'Notre mission', 'Our mission'],
  ['public.about.missionSubtitle', 'Transformer la livraison pour un monde plus durable', 'Transform delivery for a more sustainable world'],
  ['public.about.missionItems.reduceImpact.title', 'Réduire l\'impact environnemental', 'Reduce environmental impact'],
  ['public.about.missionItems.reduceImpact.description', 'Optimiser les trajets pour diminuer les émissions de CO2', 'Optimize routes to reduce CO2 emissions'],
  ['public.about.missionItems.createPurchasingPower.title', 'Créer du pouvoir d\'achat', 'Create purchasing power'],
  ['public.about.missionItems.createPurchasingPower.description', 'Permettre à chacun de gagner de l\'argent avec ses déplacements', 'Allow everyone to earn money with their travels'],
  ['public.about.missionItems.fightIsolation.title', 'Lutter contre l\'isolement', 'Fight against isolation'],
  ['public.about.missionItems.fightIsolation.description', 'Créer du lien social dans les communautés locales', 'Create social bonds in local communities'],
  ['public.about.missionItems.optimizeResources.title', 'Optimiser les ressources', 'Optimize resources'],
  ['public.about.missionItems.optimizeResources.description', 'Utiliser au mieux les capacités de transport existantes', 'Make the best use of existing transport capacities'],
  ['public.about.missionItems.offerVariedServices.title', 'Offrir des services variés', 'Offer varied services'],
  ['public.about.missionItems.offerVariedServices.description', 'Au-delà de la livraison, proposer des services à la personne', 'Beyond delivery, offer personal services'],
  ['public.about.missionItems.supportLocalEconomy.title', 'Soutenir l\'économie locale', 'Support local economy'],
  ['public.about.missionItems.supportLocalEconomy.description', 'Favoriser les échanges et l\'entraide de proximité', 'Promote local exchanges and mutual aid'],
  
  ['public.about.servicesBadge', 'Services', 'Services'],
  ['public.about.servicesTitle', 'Nos services', 'Our services'],
  ['public.about.servicesSubtitle', 'Une gamme complète pour tous vos besoins', 'A complete range for all your needs'],
  ['public.about.parcelTransport.title', 'Transport de colis', 'Package transport'],
  ['public.about.parcelTransport.item1', 'Livraison rapide et sécurisée', 'Fast and secure delivery'],
  ['public.about.parcelTransport.item2', 'Suivi en temps réel', 'Real-time tracking'],
  ['public.about.parcelTransport.item3', 'Assurance incluse', 'Insurance included'],
  ['public.about.parcelTransport.item4', 'Code de validation', 'Validation code'],
  ['public.about.parcelTransport.item5', 'Tarifs compétitifs', 'Competitive rates'],
  ['public.about.parcelTransport.item6', 'Service client 24h/7j', '24/7 customer service'],
  ['public.about.personalServices.title', 'Services à la personne', 'Personal services'],
  ['public.about.personalServices.item1', 'Transport de personnes', 'People transport'],
  
  // Merchant pages
  ['merchant.products.list.title', 'Liste des produits', 'Product list'],
  ['merchant.products.list.description', 'Gérez votre catalogue de produits', 'Manage your product catalog'],
  
  // Admin pages
  ['pages.admin.contracts', 'Contrats', 'Contracts']
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