#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script pour ajouter les clés légales manquantes (CGU et mentions légales)
 */

const MESSAGES_DIR = path.join(__dirname, '../src/messages');

// Clés légales manquantes
const LEGAL_KEYS_FR = {
  // Page CGU
  'public.legal.cgu.title': 'Conditions Générales d\'Utilisation',
  'public.legal.cgu.description': 'Conditions d\'utilisation de la plateforme EcoDeli',
  'public.legal.cgu.article1.title': 'Article 1 - Objet',
  'public.legal.cgu.article1.content': 'Les présentes conditions générales d\'utilisation (CGU) régissent l\'utilisation de la plateforme EcoDeli, service de livraison écologique et de mise en relation entre clients, livreurs, commerçants et prestataires de services.',
  'public.legal.cgu.article2.title': 'Article 2 - Acceptation des conditions',
  'public.legal.cgu.article2.content': 'L\'utilisation de la plateforme EcoDeli implique l\'acceptation pleine et entière des présentes CGU. Si vous n\'acceptez pas ces conditions, vous ne devez pas utiliser nos services.',
  'public.legal.cgu.article3.title': 'Article 3 - Services proposés',
  'public.legal.cgu.article3.intro': 'EcoDeli propose les services suivants :',
  'public.legal.cgu.article3.service1': 'Transport et livraison de colis',
  'public.legal.cgu.article3.service2': 'Transport de personnes et transferts aéroport',
  'public.legal.cgu.article3.service3': 'Services à la personne (courses, garde d\'animaux, etc.)',
  'public.legal.cgu.article3.service4': 'Mise en relation avec des prestataires qualifiés',
  'public.legal.cgu.article4.title': 'Article 4 - Inscription et compte utilisateur',
  'public.legal.cgu.article4.content': 'Pour utiliser nos services, vous devez créer un compte en fournissant des informations exactes et à jour. Vous êtes responsable de la confidentialité de vos identifiants de connexion.',
  'public.legal.cgu.article5.title': 'Article 5 - Paiements et facturation',
  'public.legal.cgu.article5.content': 'Les paiements sont traités de manière sécurisée via notre partenaire Stripe. Les tarifs sont indiqués en euros TTC. Les factures sont générées automatiquement et envoyées par email.',
  'public.legal.cgu.article6.title': 'Article 6 - Responsabilités',
  'public.legal.cgu.article6.content': 'EcoDeli agit en qualité d\'intermédiaire. Nous mettons en œuvre tous les moyens pour assurer la qualité du service, mais ne pouvons être tenus responsables des dommages indirects ou imprévisibles.',

  // Mentions légales
  'public.legal.title': 'Mentions Légales',
  'public.legal.description': 'Informations légales concernant EcoDeli',
  'public.legal.legalInfo.title': 'Informations légales',
  'public.legal.legalInfo.companyName': 'EcoDeli SAS',
  'public.legal.legalInfo.address': '110 rue de Flandre, 75019 Paris',
  'public.legal.legalInfo.siret': 'SIRET : 123 456 789 00123',
  'public.legal.legalInfo.capital': 'Capital social : 50 000 €',
  'public.legal.legalInfo.director': 'Directeur de publication : Sylvain Levy',
  'public.legal.hosting.title': 'Hébergement',
  'public.legal.hosting.provider': 'Vercel Inc.',
  'public.legal.hosting.address': '440 N Barranca Ave, Covina, CA 91723, États-Unis',
  'public.legal.dataProtection.title': 'Protection des données',
  'public.legal.dataProtection.content': 'Vos données personnelles sont traitées conformément au RGPD. Pour plus d\'informations, consultez notre politique de confidentialité.',
  'public.legal.intellectualProperty.title': 'Propriété intellectuelle',
  'public.legal.intellectualProperty.content': 'Tous les éléments de ce site (textes, images, logos) sont protégés par le droit d\'auteur. Toute reproduction sans autorisation est interdite.'
};

const LEGAL_KEYS_EN = {
  // CGU page
  'public.legal.cgu.title': 'Terms of Service',
  'public.legal.cgu.description': 'Terms of use for the EcoDeli platform',
  'public.legal.cgu.article1.title': 'Article 1 - Purpose',
  'public.legal.cgu.article1.content': 'These general terms of use (GTU) govern the use of the EcoDeli platform, an ecological delivery service and connection between customers, couriers, merchants and service providers.',
  'public.legal.cgu.article2.title': 'Article 2 - Acceptance of conditions',
  'public.legal.cgu.article2.content': 'Using the EcoDeli platform implies full acceptance of these GTU. If you do not accept these conditions, you must not use our services.',
  'public.legal.cgu.article3.title': 'Article 3 - Services offered',
  'public.legal.cgu.article3.intro': 'EcoDeli offers the following services:',
  'public.legal.cgu.article3.service1': 'Transport and delivery of packages',
  'public.legal.cgu.article3.service2': 'People transport and airport transfers',
  'public.legal.cgu.article3.service3': 'Personal services (shopping, pet sitting, etc.)',
  'public.legal.cgu.article3.service4': 'Connection with qualified service providers',
  'public.legal.cgu.article4.title': 'Article 4 - Registration and user account',
  'public.legal.cgu.article4.content': 'To use our services, you must create an account by providing accurate and up-to-date information. You are responsible for the confidentiality of your login credentials.',
  'public.legal.cgu.article5.title': 'Article 5 - Payments and billing',
  'public.legal.cgu.article5.content': 'Payments are processed securely via our partner Stripe. Prices are indicated in euros including VAT. Invoices are generated automatically and sent by email.',
  'public.legal.cgu.article6.title': 'Article 6 - Responsibilities',
  'public.legal.cgu.article6.content': 'EcoDeli acts as an intermediary. We implement all means to ensure service quality, but cannot be held responsible for indirect or unforeseeable damages.',

  // Legal notices
  'public.legal.title': 'Legal Notice',
  'public.legal.description': 'Legal information about EcoDeli',
  'public.legal.legalInfo.title': 'Legal information',
  'public.legal.legalInfo.companyName': 'EcoDeli SAS',
  'public.legal.legalInfo.address': '110 rue de Flandre, 75019 Paris',
  'public.legal.legalInfo.siret': 'SIRET: 123 456 789 00123',
  'public.legal.legalInfo.capital': 'Share capital: €50,000',
  'public.legal.legalInfo.director': 'Publication director: Sylvain Levy',
  'public.legal.hosting.title': 'Hosting',
  'public.legal.hosting.provider': 'Vercel Inc.',
  'public.legal.hosting.address': '440 N Barranca Ave, Covina, CA 91723, United States',
  'public.legal.dataProtection.title': 'Data protection',
  'public.legal.dataProtection.content': 'Your personal data is processed in accordance with GDPR. For more information, see our privacy policy.',
  'public.legal.intellectualProperty.title': 'Intellectual property',
  'public.legal.intellectualProperty.content': 'All elements of this site (texts, images, logos) are protected by copyright. Any reproduction without authorization is prohibited.'
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
  console.log('⚖️  Ajout des clés légales manquantes...\n');

  const frPath = path.join(MESSAGES_DIR, 'fr.json');
  const enPath = path.join(MESSAGES_DIR, 'en.json');

  // Charger les fichiers existants
  let frMessages = {};
  let enMessages = {};

  try {
    frMessages = JSON.parse(fs.readFileSync(frPath, 'utf8'));
    console.log('✅ Fichier FR chargé');
  } catch (err) {
    console.log('⚠️  Fichier FR non trouvé');
  }

  try {
    enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    console.log('✅ Fichier EN chargé');
  } catch (err) {
    console.log('⚠️  Fichier EN non trouvé');
  }

  // Ajouter les clés légales FR
  console.log('\n🇫🇷 Ajout des clés légales FR...');
  let addedFr = 0;
  Object.entries(LEGAL_KEYS_FR).forEach(([key, value]) => {
    setNestedKey(frMessages, key, value);
    addedFr++;
    console.log(`  ✅ ${key}`);
  });

  // Ajouter les clés légales EN
  console.log('\n🇬🇧 Ajout des clés légales EN...');
  let addedEn = 0;
  Object.entries(LEGAL_KEYS_EN).forEach(([key, value]) => {
    setNestedKey(enMessages, key, value);
    addedEn++;
    console.log(`  ✅ ${key}`);
  });

  // Sauvegarder
  fs.writeFileSync(frPath, JSON.stringify(frMessages, null, 2), 'utf8');
  fs.writeFileSync(enPath, JSON.stringify(enMessages, null, 2), 'utf8');

  console.log(`\n✅ Clés légales ajoutées !`);
  console.log(`🇫🇷 Clés FR: ${addedFr}`);
  console.log(`🇬🇧 Clés EN: ${addedEn}`);
  console.log(`💡 Relancez le build pour vérifier.`);
}

if (require.main === module) {
  main();
}

module.exports = { main }; 