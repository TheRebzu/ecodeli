const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers de traduction
const frMessagesPath = path.join(__dirname, '../src/messages/fr.json');
const enMessagesPath = path.join(__dirname, '../src/messages/en.json');

console.log('🔧 Ajout des clés spécifiques manquantes...');

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

// Toutes les clés manquantes spécifiques
const specificKeys = {
  // Developers API Manual
  "public.developers.apiManual.title": {
    fr: "Manuel de l'API EcoDeli",
    en: "EcoDeli API Manual"
  },
  "public.developers.apiManual.description": {
    fr: "Documentation complète de l'API REST EcoDeli pour les développeurs",
    en: "Complete EcoDeli REST API documentation for developers"
  },
  "public.developers.apiManual.statusBanner.badge": {
    fr: "API En Ligne",
    en: "API Online"
  },
  "public.developers.apiManual.statusBanner.description": {
    fr: "L'API EcoDeli est opérationnelle et prête à être utilisée",
    en: "EcoDeli API is operational and ready to use"
  },
  "public.developers.apiManual.tabs.auth": {
    fr: "Authentification",
    en: "Authentication"
  },
  "public.developers.apiManual.tabs.announcements": {
    fr: "Annonces",
    en: "Announcements"
  },
  "public.developers.apiManual.tabs.deliveries": {
    fr: "Livraisons",
    en: "Deliveries"
  },
  "public.developers.apiManual.tabs.services": {
    fr: "Services",
    en: "Services"
  },
  "public.developers.apiManual.tabs.admin": {
    fr: "Administration",
    en: "Administration"
  },
  "public.developers.apiManual.auth.title": {
    fr: "Authentification",
    en: "Authentication"
  },
  "public.developers.apiManual.auth.methods.title": {
    fr: "Méthodes d'authentification",
    en: "Authentication methods"
  },
  "public.developers.apiManual.auth.methods.session.title": {
    fr: "Session (Cookie)",
    en: "Session (Cookie)"
  },
  "public.developers.apiManual.auth.methods.session.description": {
    fr: "Authentification par session avec cookies sécurisés",
    en: "Session authentication with secure cookies"
  },
  "public.developers.apiManual.auth.methods.jwt.title": {
    fr: "JWT Token",
    en: "JWT Token"
  },
  "public.developers.apiManual.auth.methods.jwt.description": {
    fr: "Token JWT pour l'authentification API",
    en: "JWT token for API authentication"
  },
  "public.developers.apiManual.auth.endpoints.title": {
    fr: "Endpoints d'authentification",
    en: "Authentication endpoints"
  },
  "public.developers.apiManual.auth.endpoints.signin.description": {
    fr: "Connexion utilisateur avec email et mot de passe",
    en: "User login with email and password"
  },
  "public.developers.apiManual.auth.endpoints.session.description": {
    fr: "Récupération des informations de session utilisateur",
    en: "Retrieve user session information"
  },
  "public.developers.apiManual.announcements.title": {
    fr: "Gestion des annonces",
    en: "Announcements management"
  },
  "public.developers.apiManual.announcements.list.description": {
    fr: "Récupérer la liste des annonces avec filtres et pagination",
    en: "Retrieve announcements list with filters and pagination"
  },
  "public.developers.apiManual.announcements.create.description": {
    fr: "Créer une nouvelle annonce de livraison ou service",
    en: "Create a new delivery or service announcement"
  },
  "public.developers.apiManual.deliveries.title": {
    fr: "Gestion des livraisons",
    en: "Deliveries management"
  },
  "public.developers.apiManual.deliveries.search.description": {
    fr: "Rechercher des livraisons disponibles par zone géographique",
    en: "Search available deliveries by geographic area"
  },
  "public.developers.apiManual.deliveries.updateLocation.description": {
    fr: "Mettre à jour la position GPS d'une livraison en cours",
    en: "Update GPS location of an ongoing delivery"
  },
  "public.developers.apiManual.services.title": {
    fr: "Services à la personne",
    en: "Personal services"
  },
  "public.developers.apiManual.services.search.description": {
    fr: "Rechercher des services disponibles par catégorie et localisation",
    en: "Search available services by category and location"
  },
  "public.developers.apiManual.services.book.description": {
    fr: "Réserver un créneau pour un service à la personne",
    en: "Book a slot for a personal service"
  },
  "public.developers.apiManual.admin.title": {
    fr: "Administration",
    en: "Administration"
  },
  "public.developers.apiManual.admin.users.list.description": {
    fr: "Lister tous les utilisateurs avec filtres par rôle",
    en: "List all users with role filters"
  },
  "public.developers.apiManual.admin.stats.dashboard.description": {
    fr: "Récupérer les statistiques globales de la plateforme",
    en: "Retrieve global platform statistics"
  },
  "public.developers.apiManual.quickReference.title": {
    fr: "Référence rapide",
    en: "Quick reference"
  },
  "public.developers.apiManual.quickReference.urls.title": {
    fr: "URLs de base",
    en: "Base URLs"
  },
  "public.developers.apiManual.quickReference.urls.apiBase": {
    fr: "API de base : https://api.ecodeli.fr",
    en: "Base API: https://api.ecodeli.fr"
  },
  "public.developers.apiManual.quickReference.urls.trpc": {
    fr: "tRPC : https://api.ecodeli.fr/trpc",
    en: "tRPC: https://api.ecodeli.fr/trpc"
  },
  "public.developers.apiManual.quickReference.urls.auth": {
    fr: "Auth : https://api.ecodeli.fr/auth",
    en: "Auth: https://api.ecodeli.fr/auth"
  },
  "public.developers.apiManual.quickReference.urls.openapi": {
    fr: "OpenAPI : https://api.ecodeli.fr/swagger",
    en: "OpenAPI: https://api.ecodeli.fr/swagger"
  },
  "public.developers.apiManual.quickReference.statusCodes.title": {
    fr: "Codes de statut",
    en: "Status codes"
  },
  "public.developers.apiManual.quickReference.statusCodes.200": {
    fr: "200 - Succès",
    en: "200 - Success"
  },
  "public.developers.apiManual.quickReference.statusCodes.400": {
    fr: "400 - Requête invalide",
    en: "400 - Bad request"
  },
  "public.developers.apiManual.quickReference.statusCodes.401": {
    fr: "401 - Non authentifié",
    en: "401 - Unauthorized"
  },
  "public.developers.apiManual.quickReference.statusCodes.403": {
    fr: "403 - Accès interdit",
    en: "403 - Forbidden"
  },
  "public.developers.apiManual.quickReference.statusCodes.404": {
    fr: "404 - Non trouvé",
    en: "404 - Not found"
  },
  "public.developers.apiManual.quickReference.statusCodes.500": {
    fr: "500 - Erreur serveur",
    en: "500 - Server error"
  },
  "public.developers.apiManual.statusCheck.title": {
    fr: "Vérification du statut",
    en: "Status check"
  },
  "public.developers.apiManual.statusCheck.description": {
    fr: "Tester la connectivité et la disponibilité de l'API",
    en: "Test API connectivity and availability"
  },
  "public.developers.apiManual.statusCheck.button": {
    fr: "Tester l'API",
    en: "Test API"
  },
  
  // Partners
  "public.partners.title": {
    fr: "Nos Partenaires",
    en: "Our Partners"
  },
  "public.partners.description": {
    fr: "Rejoignez l'écosystème EcoDeli et développez votre activité",
    en: "Join the EcoDeli ecosystem and grow your business"
  },
  "public.partners.merchants.title": {
    fr: "Commerçants",
    en: "Merchants"
  },
  "public.partners.merchants.description": {
    fr: "Proposez vos services de livraison et augmentez votre zone de chalandise",
    en: "Offer your delivery services and expand your customer base"
  },
  "public.partners.merchants.button": {
    fr: "Devenir commerçant",
    en: "Become a merchant"
  },
  "public.partners.providers.title": {
    fr: "Prestataires",
    en: "Service Providers"
  },
  "public.partners.providers.description": {
    fr: "Offrez vos services à la personne et développez votre clientèle",
    en: "Offer your personal services and develop your clientele"
  },
  "public.partners.providers.button": {
    fr: "Devenir prestataire",
    en: "Become a provider"
  },
  "public.partners.deliverers.title": {
    fr: "Livreurs",
    en: "Deliverers"
  },
  "public.partners.deliverers.description": {
    fr: "Rejoignez notre réseau de livreurs et gagnez de l'argent en livrant",
    en: "Join our delivery network and earn money by delivering"
  },
  "public.partners.deliverers.button": {
    fr: "Devenir livreur",
    en: "Become a deliverer"
  },
  
  // Admin Contracts
  "pages.admin.contracts.title": {
    fr: "Gestion des Contrats",
    en: "Contracts Management"
  },
  "pages.admin.contracts.description": {
    fr: "Gérer les contrats avec les commerçants et prestataires",
    en: "Manage contracts with merchants and providers"
  },
  
  // CGU manquantes
  "public.legal.cgv.article3.item1": {
    fr: "Livraison de colis entre particuliers et professionnels",
    en: "Package delivery between individuals and professionals"
  },
  "public.legal.cgv.article3.item2": {
    fr: "Transport de personnes et transferts aéroport",
    en: "People transportation and airport transfers"
  },
  "public.legal.cgv.article3.item3": {
    fr: "Services à domicile : ménage, jardinage, bricolage",
    en: "Home services: cleaning, gardening, handyman"
  },
  "public.legal.cgv.article3.note": {
    fr: "Tous les services sont soumis à validation préalable par EcoDeli",
    en: "All services are subject to prior validation by EcoDeli"
  }
};

let addedCount = 0;

// Ajouter toutes les clés
Object.keys(specificKeys).forEach(key => {
  const { fr, en } = specificKeys[key];
  
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