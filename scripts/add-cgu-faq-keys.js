const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers de traduction
const frMessagesPath = path.join(__dirname, '../src/messages/fr.json');
const enMessagesPath = path.join(__dirname, '../src/messages/en.json');

console.log('🔧 Ajout des clés CGU et FAQ manquantes...');

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

// Clés CGU à ajouter
const cguKeys = {
  "public.legal.cgu.title": {
    fr: "Conditions Générales d'Utilisation",
    en: "Terms of Service"
  },
  "public.legal.cgu.description": {
    fr: "Conditions régissant l'utilisation de la plateforme EcoDeli",
    en: "Terms governing the use of the EcoDeli platform"
  },
  "public.legal.cgu.article1.title": {
    fr: "Article 1 - Objet",
    en: "Article 1 - Purpose"
  },
  "public.legal.cgu.article1.content": {
    fr: "Les présentes conditions générales d'utilisation définissent les modalités d'accès et d'utilisation de la plateforme EcoDeli.",
    en: "These general terms of use define the terms of access and use of the EcoDeli platform."
  },
  "public.legal.cgu.article2.title": {
    fr: "Article 2 - Acceptation",
    en: "Article 2 - Acceptance"
  },
  "public.legal.cgu.article2.content": {
    fr: "L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes conditions.",
    en: "Use of the platform implies full acceptance of these terms."
  },
  "public.legal.cgu.article3.title": {
    fr: "Article 3 - Services proposés",
    en: "Article 3 - Services offered"
  },
  "public.legal.cgu.article3.intro": {
    fr: "EcoDeli propose les services suivants :",
    en: "EcoDeli offers the following services:"
  },
  "public.legal.cgu.article3.service1": {
    fr: "Livraison de colis entre particuliers",
    en: "Package delivery between individuals"
  },
  "public.legal.cgu.article3.service2": {
    fr: "Transport de personnes",
    en: "People transportation"
  },
  "public.legal.cgu.article3.service3": {
    fr: "Services à la personne",
    en: "Personal services"
  },
  "public.legal.cgu.article3.service4": {
    fr: "Stockage temporaire",
    en: "Temporary storage"
  },
  "public.legal.cgu.article4.title": {
    fr: "Article 4 - Responsabilités",
    en: "Article 4 - Responsibilities"
  },
  "public.legal.cgu.article4.content": {
    fr: "Chaque utilisateur est responsable de l'utilisation qu'il fait de la plateforme et des services.",
    en: "Each user is responsible for their use of the platform and services."
  },
  "public.legal.cgu.article5.title": {
    fr: "Article 5 - Données personnelles",
    en: "Article 5 - Personal data"
  },
  "public.legal.cgu.article5.content": {
    fr: "Le traitement des données personnelles est conforme au RGPD et à notre politique de confidentialité.",
    en: "Personal data processing complies with GDPR and our privacy policy."
  },
  "public.legal.cgu.article6.title": {
    fr: "Article 6 - Modification",
    en: "Article 6 - Modification"
  },
  "public.legal.cgu.article6.content": {
    fr: "EcoDeli se réserve le droit de modifier les présentes conditions à tout moment.",
    en: "EcoDeli reserves the right to modify these terms at any time."
  }
};

// Clés FAQ à ajouter
const faqKeys = {
  "public.faq.badge": {
    fr: "FAQ",
    en: "FAQ"
  },
  "public.faq.title": {
    fr: "Foire Aux Questions",
    en: "Frequently Asked Questions"
  },
  "public.faq.subtitle": {
    fr: "Trouvez des réponses à vos questions les plus fréquentes",
    en: "Find answers to your most frequently asked questions"
  },
  "public.faq.searchPlaceholder": {
    fr: "Rechercher une question...",
    en: "Search for a question..."
  },
  "public.faq.categories.title": {
    fr: "Catégories",
    en: "Categories"
  },
  "public.faq.categories.announcements": {
    fr: "Annonces",
    en: "Announcements"
  },
  "public.faq.categories.shipping": {
    fr: "Expédition",
    en: "Shipping"
  },
  "public.faq.categories.delivery": {
    fr: "Livraison",
    en: "Delivery"
  },
  "public.faq.categories.services": {
    fr: "Services",
    en: "Services"
  },
  "public.faq.categories.payment": {
    fr: "Paiement",
    en: "Payment"
  },
  "public.faq.categories.security": {
    fr: "Sécurité",
    en: "Security"
  },
  "public.faq.categories.account": {
    fr: "Compte",
    en: "Account"
  },
  // Annonces
  "public.faq.announcements.title": {
    fr: "Questions sur les annonces",
    en: "Questions about announcements"
  },
  "public.faq.announcements.q1.question": {
    fr: "Comment créer une annonce ?",
    en: "How to create an announcement?"
  },
  "public.faq.announcements.q1.answer": {
    fr: "Connectez-vous à votre compte, cliquez sur 'Nouvelle annonce' et remplissez le formulaire avec les détails de votre demande.",
    en: "Log in to your account, click 'New announcement' and fill out the form with your request details."
  },
  "public.faq.announcements.q2.question": {
    fr: "Puis-je modifier mon annonce ?",
    en: "Can I edit my announcement?"
  },
  "public.faq.announcements.q2.answer": {
    fr: "Oui, vous pouvez modifier votre annonce tant qu'elle n'a pas été acceptée par un livreur.",
    en: "Yes, you can edit your announcement as long as it hasn't been accepted by a deliverer."
  },
  "public.faq.announcements.q3.question": {
    fr: "Combien coûte une annonce ?",
    en: "How much does an announcement cost?"
  },
  "public.faq.announcements.q3.answer": {
    fr: "Le prix dépend du type de service, de la distance et de l'urgence. Vous fixez votre budget lors de la création.",
    en: "The price depends on the service type, distance and urgency. You set your budget when creating."
  },
  "public.faq.announcements.q4.question": {
    fr: "Comment supprimer une annonce ?",
    en: "How to delete an announcement?"
  },
  "public.faq.announcements.q4.answer": {
    fr: "Accédez à vos annonces depuis votre tableau de bord et cliquez sur 'Supprimer'.",
    en: "Access your announcements from your dashboard and click 'Delete'."
  },
  // Expédition
  "public.faq.shipping.title": {
    fr: "Questions sur l'expédition",
    en: "Questions about shipping"
  },
  "public.faq.shipping.q1.question": {
    fr: "Quels types de colis puis-je envoyer ?",
    en: "What types of packages can I send?"
  },
  "public.faq.shipping.q1.answer": {
    fr: "Tous types de colis légaux, jusqu'à 30kg. Les objets fragiles, précieux ou dangereux nécessitent une mention spéciale.",
    en: "All types of legal packages, up to 30kg. Fragile, valuable or dangerous items require special mention."
  },
  "public.faq.shipping.q2.question": {
    fr: "Comment emballer mon colis ?",
    en: "How to pack my package?"
  },
  "public.faq.shipping.q2.answer": {
    fr: "Utilisez un emballage adapté et solide. Protégez les objets fragiles et indiquez clairement l'adresse.",
    en: "Use appropriate and sturdy packaging. Protect fragile items and clearly indicate the address."
  },
  "public.faq.shipping.q3.question": {
    fr: "Puis-je assurer mon colis ?",
    en: "Can I insure my package?"
  },
  "public.faq.shipping.q3.answer": {
    fr: "Oui, nos abonnements Starter et Premium incluent une assurance automatique jusqu'à 115€ et 3000€ respectivement.",
    en: "Yes, our Starter and Premium subscriptions include automatic insurance up to €115 and €3000 respectively."
  },
  "public.faq.shipping.q4.question": {
    fr: "Que faire si mon colis est perdu ?",
    en: "What to do if my package is lost?"
  },
  "public.faq.shipping.q4.answer": {
    fr: "Contactez immédiatement notre service client avec votre numéro de suivi. Nous lançons une enquête.",
    en: "Immediately contact our customer service with your tracking number. We launch an investigation."
  },
  // Livraison
  "public.faq.delivery.title": {
    fr: "Questions sur la livraison",
    en: "Questions about delivery"
  },
  "public.faq.delivery.q1.question": {
    fr: "Comment suivre ma livraison ?",
    en: "How to track my delivery?"
  },
  "public.faq.delivery.q1.answer": {
    fr: "Utilisez le numéro de suivi fourni dans votre espace client ou l'application mobile pour suivre en temps réel.",
    en: "Use the tracking number provided in your customer area or mobile app to track in real time."
  },
  "public.faq.delivery.q2.question": {
    fr: "Que faire si personne n'est présent à la livraison ?",
    en: "What to do if nobody is present for delivery?"
  },
  "public.faq.delivery.q2.answer": {
    fr: "Le livreur vous contactera. Vous pouvez reprogrammer la livraison ou désigner un point de retrait.",
    en: "The deliverer will contact you. You can reschedule delivery or designate a pickup point."
  },
  "public.faq.delivery.q3.question": {
    fr: "Comment valider la réception ?",
    en: "How to validate reception?"
  },
  "public.faq.delivery.q3.answer": {
    fr: "Donnez le code à 6 chiffres reçu par SMS au livreur pour confirmer la bonne réception.",
    en: "Give the 6-digit code received by SMS to the deliverer to confirm proper reception."
  },
  "public.faq.delivery.q4.question": {
    fr: "Puis-je changer l'adresse de livraison ?",
    en: "Can I change the delivery address?"
  },
  "public.faq.delivery.q4.answer": {
    fr: "Oui, avant que le livreur ne récupère le colis. Contactez-le directement via la messagerie.",
    en: "Yes, before the deliverer picks up the package. Contact them directly via messaging."
  }
};

// Fusionner toutes les clés
const allKeys = { ...cguKeys, ...faqKeys };

let addedCount = 0;

// Ajouter toutes les clés
Object.keys(allKeys).forEach(key => {
  const { fr, en } = allKeys[key];
  
  addNestedKey(frMessages, key, fr);
  addNestedKey(enMessages, key, en);
  addedCount++;
});

// Sauvegarder les fichiers
try {
  fs.writeFileSync(frMessagesPath, JSON.stringify(frMessages, null, 2), 'utf8');
  fs.writeFileSync(enMessagesPath, JSON.stringify(enMessages, null, 2), 'utf8');
  
  console.log(`✅ ${addedCount} clés ajoutées avec succès !`);
  console.log(`📝 Fichiers mis à jour :`);
  console.log(`   - ${frMessagesPath}`);
  console.log(`   - ${enMessagesPath}`);
} catch (error) {
  console.log('❌ Erreur lors de la sauvegarde:', error.message);
} 