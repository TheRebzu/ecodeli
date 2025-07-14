const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers de traduction
const frMessagesPath = path.join(__dirname, '../src/messages/fr.json');
const enMessagesPath = path.join(__dirname, '../src/messages/en.json');

console.log('🧹 Reconstruction complète des fichiers de traduction...');

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

// Créer des objets vides pour recommencer proprement
let frMessages = {};
let enMessages = {};

// Traductions de base communes
const commonTranslationsFr = {
  // Navigation commune
  "common.loading": "Chargement...",
  "common.error": "Erreur",
  "common.success": "Succès",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.edit": "Modifier",
  "common.view": "Voir",
  "common.back": "Retour",
  "common.next": "Suivant",
  "common.previous": "Précédent",
  "common.yes": "Oui",
  "common.no": "Non",
  "common.confirm": "Confirmer",
  "common.close": "Fermer",
  "common.email": "Email",
  "common.password": "Mot de passe",
  "common.name": "Nom",
  "common.firstName": "Prénom",
  "common.lastName": "Nom de famille",
  "common.phone": "Téléphone",
  "common.address": "Adresse",
  "common.city": "Ville",
  "common.postalCode": "Code postal",
  "common.country": "Pays",
  "common.status": "Statut",
  "common.date": "Date",
  "common.price": "Prix",
  "common.description": "Description",
  "common.title": "Titre",
  "common.type": "Type",
  "common.search": "Rechercher",
  "common.filter": "Filtrer",
  "common.sort": "Trier",
  "common.page": "Page",
  "common.of": "de",
  "common.total": "Total",
  "common.actions": "Actions",
  "common.details": "Détails",
  "common.settings": "Paramètres",
  "common.profile": "Profil",
  "common.logout": "Déconnexion",
  "common.login": "Connexion",
  "common.register": "Inscription",
  "common.dashboard": "Tableau de bord",
  "common.home": "Accueil",
  "common.about": "À propos",
  "common.contact": "Contact",
  "common.help": "Aide",
  "common.faq": "FAQ",
  "common.terms": "Conditions",
  "common.privacy": "Confidentialité",
  "common.legal": "Mentions légales"
};

const commonTranslationsEn = {
  // Navigation commune
  "common.loading": "Loading...",
  "common.error": "Error",
  "common.success": "Success",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.view": "View",
  "common.back": "Back",
  "common.next": "Next",
  "common.previous": "Previous",
  "common.yes": "Yes",
  "common.no": "No",
  "common.confirm": "Confirm",
  "common.close": "Close",
  "common.email": "Email",
  "common.password": "Password",
  "common.name": "Name",
  "common.firstName": "First Name",
  "common.lastName": "Last Name",
  "common.phone": "Phone",
  "common.address": "Address",
  "common.city": "City",
  "common.postalCode": "Postal Code",
  "common.country": "Country",
  "common.status": "Status",
  "common.date": "Date",
  "common.price": "Price",
  "common.description": "Description",
  "common.title": "Title",
  "common.type": "Type",
  "common.search": "Search",
  "common.filter": "Filter",
  "common.sort": "Sort",
  "common.page": "Page",
  "common.of": "of",
  "common.total": "Total",
  "common.actions": "Actions",
  "common.details": "Details",
  "common.settings": "Settings",
  "common.profile": "Profile",
  "common.logout": "Logout",
  "common.login": "Login",
  "common.register": "Register",
  "common.dashboard": "Dashboard",
  "common.home": "Home",
  "common.about": "About",
  "common.contact": "Contact",
  "common.help": "Help",
  "common.faq": "FAQ",
  "common.terms": "Terms",
  "common.privacy": "Privacy",
  "common.legal": "Legal"
};

// Pages API docs
const apiDocsKeysFr = {
  "public.developers.apiDocs.title": "Documentation API EcoDeli",
  "public.developers.apiDocs.description": "Documentation complète de l'API EcoDeli pour développeurs",
  "public.developers.apiDocs.apiInfo.title": "Informations API",
  "public.developers.apiDocs.apiInfo.description": "Notre API REST permet d'intégrer les services EcoDeli dans vos applications",
  "public.developers.apiDocs.apiInfo.mainFeatures.title": "Fonctionnalités principales",
  "public.developers.apiDocs.apiInfo.mainFeatures.item1": "Gestion des livraisons et colis",
  "public.developers.apiDocs.apiInfo.mainFeatures.item2": "Intégration des paiements Stripe",
  "public.developers.apiDocs.apiInfo.mainFeatures.item3": "Suivi en temps réel des livraisons",
  "public.developers.apiDocs.apiInfo.mainFeatures.item4": "Gestion des utilisateurs et authentification",
  "public.developers.apiDocs.apiInfo.mainFeatures.item5": "Notifications push et webhooks",
  "public.developers.apiDocs.apiInfo.technicalInfo.title": "Informations techniques",
  "public.developers.apiDocs.apiInfo.technicalInfo.item1": "API REST avec authentification Bearer Token",
  "public.developers.apiDocs.apiInfo.technicalInfo.item2": "Réponses JSON standardisées",
  "public.developers.apiDocs.apiInfo.technicalInfo.item3": "Rate limiting : 1000 requêtes/heure",
  "public.developers.apiDocs.apiInfo.technicalInfo.item4": "Support HTTPS avec certificats SSL",
  "public.developers.apiDocs.apiInfo.technicalInfo.item5": "Documentation OpenAPI 3.0 disponible",
  "public.developers.apiDocs.interactiveDocs.title": "Documentation interactive",
  "public.developers.apiDocs.interactiveDocs.description": "Testez nos endpoints directement depuis cette interface",
  "public.developers.apiDocs.quickLinks.apiKeys.title": "Clés API",
  "public.developers.apiDocs.quickLinks.apiKeys.description": "Générez et gérez vos clés d'accès API",
  "public.developers.apiDocs.quickLinks.apiKeys.link": "Gérer les clés",
  "public.developers.apiDocs.quickLinks.codeSamples.title": "Exemples de code",
  "public.developers.apiDocs.quickLinks.codeSamples.description": "Exemples d'intégration en plusieurs langages",
  "public.developers.apiDocs.quickLinks.codeSamples.link": "Voir les exemples",
  "public.developers.apiDocs.quickLinks.support.title": "Support développeur",
  "public.developers.apiDocs.quickLinks.support.description": "Obtenez de l'aide pour vos intégrations",
  "public.developers.apiDocs.quickLinks.support.link": "Contacter le support"
};

const apiDocsKeysEn = {
  "public.developers.apiDocs.title": "EcoDeli API Documentation",
  "public.developers.apiDocs.description": "Complete EcoDeli API documentation for developers",
  "public.developers.apiDocs.apiInfo.title": "API Information",
  "public.developers.apiDocs.apiInfo.description": "Our REST API allows you to integrate EcoDeli services into your applications",
  "public.developers.apiDocs.apiInfo.mainFeatures.title": "Main Features",
  "public.developers.apiDocs.apiInfo.mainFeatures.item1": "Delivery and package management",
  "public.developers.apiDocs.apiInfo.mainFeatures.item2": "Stripe payment integration",
  "public.developers.apiDocs.apiInfo.mainFeatures.item3": "Real-time delivery tracking",
  "public.developers.apiDocs.apiInfo.mainFeatures.item4": "User management and authentication",
  "public.developers.apiDocs.apiInfo.mainFeatures.item5": "Push notifications and webhooks",
  "public.developers.apiDocs.apiInfo.technicalInfo.title": "Technical Information",
  "public.developers.apiDocs.apiInfo.technicalInfo.item1": "REST API with Bearer Token authentication",
  "public.developers.apiDocs.apiInfo.technicalInfo.item2": "Standardized JSON responses",
  "public.developers.apiDocs.apiInfo.technicalInfo.item3": "Rate limiting: 1000 requests/hour",
  "public.developers.apiDocs.apiInfo.technicalInfo.item4": "HTTPS support with SSL certificates",
  "public.developers.apiDocs.apiInfo.technicalInfo.item5": "OpenAPI 3.0 documentation available",
  "public.developers.apiDocs.interactiveDocs.title": "Interactive Documentation",
  "public.developers.apiDocs.interactiveDocs.description": "Test our endpoints directly from this interface",
  "public.developers.apiDocs.quickLinks.apiKeys.title": "API Keys",
  "public.developers.apiDocs.quickLinks.apiKeys.description": "Generate and manage your API access keys",
  "public.developers.apiDocs.quickLinks.apiKeys.link": "Manage keys",
  "public.developers.apiDocs.quickLinks.codeSamples.title": "Code Samples",
  "public.developers.apiDocs.quickLinks.codeSamples.description": "Integration examples in multiple languages",
  "public.developers.apiDocs.quickLinks.codeSamples.link": "View samples",
  "public.developers.apiDocs.quickLinks.support.title": "Developer Support",
  "public.developers.apiDocs.quickLinks.support.description": "Get help with your integrations",
  "public.developers.apiDocs.quickLinks.support.link": "Contact support"
};

// Pages blog
const blogKeysFr = {
  "public.blog.title": "Blog EcoDeli",
  "public.blog.description": "Actualités, conseils et guides sur la livraison écologique",
  "public.blog.post1.title": "Comment EcoDeli révolutionne la livraison urbaine",
  "public.blog.post1.description": "Découvrez comment notre plateforme de crowdshipping transforme la logistique en ville",
  "public.blog.post1.date": "15 janvier 2025",
  "public.blog.post1.readTime": "5 min de lecture",
  "public.blog.post2.title": "Guide complet pour devenir livreur EcoDeli",
  "public.blog.post2.description": "Toutes les étapes pour rejoindre notre réseau de livreurs partenaires",
  "public.blog.post2.date": "10 janvier 2025",
  "public.blog.post2.readTime": "8 min de lecture",
  "public.blog.post3.title": "Les avantages du crowdshipping pour l'environnement",
  "public.blog.post3.description": "Impact positif de la livraison collaborative sur l'empreinte carbone",
  "public.blog.post3.date": "5 janvier 2025",
  "public.blog.post3.readTime": "6 min de lecture",
  "public.blog.post4.title": "Optimiser vos livraisons avec l'IA d'EcoDeli",
  "public.blog.post4.description": "Comment notre intelligence artificielle améliore l'efficacité logistique",
  "public.blog.post4.date": "28 décembre 2024",
  "public.blog.post4.readTime": "7 min de lecture",
  "public.blog.post5.title": "Sécurité et assurance : nos garanties EcoDeli",
  "public.blog.post5.description": "Tout savoir sur nos mesures de protection des colis et utilisateurs",
  "public.blog.post5.date": "20 décembre 2024",
  "public.blog.post5.readTime": "4 min de lecture",
  "public.blog.post6.title": "Expansion européenne : EcoDeli s'internationalise",
  "public.blog.post6.description": "Notre déploiement dans les principales villes européennes",
  "public.blog.post6.date": "15 décembre 2024",
  "public.blog.post6.readTime": "5 min de lecture"
};

const blogKeysEn = {
  "public.blog.title": "EcoDeli Blog",
  "public.blog.description": "News, tips and guides about ecological delivery",
  "public.blog.post1.title": "How EcoDeli revolutionizes urban delivery",
  "public.blog.post1.description": "Discover how our crowdshipping platform transforms city logistics",
  "public.blog.post1.date": "January 15, 2025",
  "public.blog.post1.readTime": "5 min read",
  "public.blog.post2.title": "Complete guide to becoming an EcoDeli courier",
  "public.blog.post2.description": "All steps to join our network of partner couriers",
  "public.blog.post2.date": "January 10, 2025",
  "public.blog.post2.readTime": "8 min read",
  "public.blog.post3.title": "Environmental benefits of crowdshipping",
  "public.blog.post3.description": "Positive impact of collaborative delivery on carbon footprint",
  "public.blog.post3.date": "January 5, 2025",
  "public.blog.post3.readTime": "6 min read",
  "public.blog.post4.title": "Optimize your deliveries with EcoDeli's AI",
  "public.blog.post4.description": "How our artificial intelligence improves logistics efficiency",
  "public.blog.post4.date": "December 28, 2024",
  "public.blog.post4.readTime": "7 min read",
  "public.blog.post5.title": "Security and insurance: our EcoDeli guarantees",
  "public.blog.post5.description": "Everything about our package and user protection measures",
  "public.blog.post5.date": "December 20, 2024",
  "public.blog.post5.readTime": "4 min read",
  "public.blog.post6.title": "European expansion: EcoDeli goes international",
  "public.blog.post6.description": "Our deployment in major European cities",
  "public.blog.post6.date": "December 15, 2024",
  "public.blog.post6.readTime": "5 min read"
};

// Pages merchant
const merchantKeysFr = {
  "merchant.products.add.title": "Ajouter un produit",
  "merchant.products.add.description": "Ajoutez un nouveau produit à votre catalogue",
  "merchant.products.import.title": "Importer des produits",
  "merchant.products.import.description": "Importez plusieurs produits via un fichier CSV"
};

const merchantKeysEn = {
  "merchant.products.add.title": "Add Product",
  "merchant.products.add.description": "Add a new product to your catalog",
  "merchant.products.import.title": "Import Products",
  "merchant.products.import.description": "Import multiple products via CSV file"
};

console.log('📝 Ajout des traductions de base...');
// Ajouter toutes les traductions
Object.entries(commonTranslationsFr).forEach(([key, value]) => {
  addNestedKey(frMessages, key, value);
});
Object.entries(commonTranslationsEn).forEach(([key, value]) => {
  addNestedKey(enMessages, key, value);
});

console.log('📚 Ajout des clés API docs...');
Object.entries(apiDocsKeysFr).forEach(([key, value]) => {
  addNestedKey(frMessages, key, value);
});
Object.entries(apiDocsKeysEn).forEach(([key, value]) => {
  addNestedKey(enMessages, key, value);
});

console.log('📰 Ajout des clés blog...');
Object.entries(blogKeysFr).forEach(([key, value]) => {
  addNestedKey(frMessages, key, value);
});
Object.entries(blogKeysEn).forEach(([key, value]) => {
  addNestedKey(enMessages, key, value);
});

console.log('🏪 Ajout des clés merchant...');
Object.entries(merchantKeysFr).forEach(([key, value]) => {
  addNestedKey(frMessages, key, value);
});
Object.entries(merchantKeysEn).forEach(([key, value]) => {
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
console.log('💾 Sauvegarde des nouveaux fichiers...');
const sortedFrMessages = sortObjectRecursively(frMessages);
const sortedEnMessages = sortObjectRecursively(enMessages);

try {
  fs.writeFileSync(frMessagesPath, JSON.stringify(sortedFrMessages, null, 2) + '\n', 'utf8');
  console.log('✅ Fichier fr.json reconstruit avec succès');
} catch (error) {
  console.error('❌ Erreur lors de la sauvegarde de fr.json:', error.message);
}

try {
  fs.writeFileSync(enMessagesPath, JSON.stringify(sortedEnMessages, null, 2) + '\n', 'utf8');
  console.log('✅ Fichier en.json reconstruit avec succès');
} catch (error) {
  console.error('❌ Erreur lors de la sauvegarde de en.json:', error.message);
}

// Compter les clés totales
const totalFrKeys = Object.keys(commonTranslationsFr).length + 
                   Object.keys(apiDocsKeysFr).length + 
                   Object.keys(blogKeysFr).length + 
                   Object.keys(merchantKeysFr).length;
                   
const totalEnKeys = Object.keys(commonTranslationsEn).length + 
                   Object.keys(apiDocsKeysEn).length + 
                   Object.keys(blogKeysEn).length + 
                   Object.keys(merchantKeysEn).length;

console.log(`✅ Reconstruction terminée !`);
console.log(`📊 Statistiques :`);
console.log(`   • ${totalFrKeys} clés françaises créées`);
console.log(`   • ${totalEnKeys} clés anglaises créées`);
console.log(`   • Total : ${totalFrKeys + totalEnKeys} clés créées`);
console.log(`\n🔧 Prochaines étapes :`);
console.log(`   1. Corriger l'erreur PageHeader sur page CGV`);
console.log(`   2. Relancer le build pour vérifier`); 