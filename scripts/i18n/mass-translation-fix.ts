import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapping étendu des traductions anglaises vers français
const massTranslations: { [key: string]: string } = {
  // Actions communes
  "searchServices": "Rechercher des services",
  "trackDeliveries": "Suivre mes livraisons", 
  "scheduleService": "Programmer un service",
  "viewInvoices": "Voir mes factures",
  "updateProfile": "Modifier profil",
  "contactSupport": "Contacter le support",
  "bookStorage": "Réserver stockage",
  "createAnnouncement": "Créer une annonce",
  
  // Navigation et méta
  "metaTitle": "EcoDeli - Livraison écologique",
  "metaDescription": "Plateforme de livraison collaborative et écologique",
  "pageTitle": "Titre de page",
  "pageDescription": "Description de page",
  "description": "Description",
  
  // Statuts et états
  "pending": "En attente",
  "approved": "Approuvé", 
  "rejected": "Rejeté",
  "active": "Actif",
  "inactive": "Inactif",
  "completed": "Terminé",
  "cancelled": "Annulé",
  "verified": "Vérifié",
  
  // Formulaires
  "submit": "Soumettre",
  "save": "Enregistrer",
  "cancel": "Annuler",
  "edit": "Modifier",
  "delete": "Supprimer",
  "add": "Ajouter",
  "create": "Créer",
  "update": "Mettre à jour",
  "remove": "Retirer",
  "confirm": "Confirmer",
  "validate": "Valider",
  
  // Messages
  "success": "Succès",
  "error": "Erreur",
  "warning": "Attention",
  "info": "Information",
  "loading": "Chargement",
  "retry": "Réessayer",
  "back": "Retour",
  "next": "Suivant",
  "previous": "Précédent",
  "finish": "Terminer",
  "skip": "Passer",
  
  // Navigation
  "home": "Accueil",
  "dashboard": "Tableau de bord",
  "profile": "Profil",
  "settings": "Paramètres",
  "help": "Aide",
  "support": "Support",
  "about": "À propos",
  "contact": "Contact",
  "faq": "FAQ",
  "terms": "Conditions",
  "privacy": "Confidentialité",
  "legal": "Mentions légales",
  
  // Rôles et utilisateurs
  "client": "Client",
  "deliverer": "Livreur",
  "merchant": "Commerçant", 
  "provider": "Prestataire",
  "admin": "Administrateur",
  "user": "Utilisateur",
  "users": "Utilisateurs",
  "account": "Compte",
  
  // Services et livraisons
  "delivery": "Livraison",
  "deliveries": "Livraisons", 
  "announcement": "Annonce",
  "announcements": "Annonces",
  "service": "Service",
  "services": "Services",
  "order": "Commande",
  "orders": "Commandes",
  "booking": "Réservation",
  "bookings": "Réservations",
  "appointment": "Rendez-vous",
  "appointments": "Rendez-vous",
  
  // Finances
  "payment": "Paiement",
  "payments": "Paiements",
  "invoice": "Facture", 
  "invoices": "Factures",
  "billing": "Facturation",
  "price": "Prix",
  "cost": "Coût",
  "total": "Total",
  "amount": "Montant",
  "commission": "Commission",
  "wallet": "Portefeuille",
  
  // Temps et dates
  "date": "Date",
  "time": "Heure",
  "schedule": "Planning",
  "availability": "Disponibilité",
  "duration": "Durée",
  "deadline": "Échéance",
  "created": "Créé",
  "updated": "Mis à jour",
  "modified": "Modifié",
  
  // Localisations
  "address": "Adresse",
  "location": "Emplacement",
  "city": "Ville",
  "country": "Pays",
  "region": "Région",
  "zone": "Zone",
  "distance": "Distance",
  "route": "Itinéraire",
  
  // Documents et vérification
  "document": "Document",
  "documents": "Documents",
  "verification": "Vérification",
  "upload": "Télécharger",
  "download": "Télécharger",
  "file": "Fichier",
  "photo": "Photo",
  "image": "Image",
  
  // Statistiques et données
  "stats": "Statistiques",
  "analytics": "Analytique",
  "report": "Rapport",
  "reports": "Rapports",
  "data": "Données",
  "chart": "Graphique",
  "table": "Tableau",
  "list": "Liste",
  "count": "Nombre",
  "total": "Total",
  "average": "Moyenne",
  "rating": "Note",
  "review": "Avis",
  "reviews": "Avis",
  
  // Notifications et messages
  "notification": "Notification",
  "notifications": "Notifications",
  "message": "Message",
  "messages": "Messages",
  "alert": "Alerte",
  "email": "Email",
  "phone": "Téléphone",
  
  // Actions spécifiques
  "login": "Connexion",
  "logout": "Déconnexion",
  "register": "Inscription",
  "signin": "Se connecter",
  "signup": "S'inscrire",
  "forgot": "Mot de passe oublié",
  "reset": "Réinitialiser",
  "change": "Changer",
  "manage": "Gérer",
  "view": "Voir",
  "show": "Afficher",
  "hide": "Masquer",
  "open": "Ouvrir",
  "close": "Fermer",
  "start": "Démarrer",
  "stop": "Arrêter",
  "pause": "Pause",
  "resume": "Reprendre",
  "search": "Rechercher",
  "filter": "Filtrer",
  "sort": "Trier",
  "export": "Exporter",
  "import": "Importer",
  "share": "Partager",
  "copy": "Copier",
  "print": "Imprimer",
  
  // États et conditions
  "available": "Disponible",
  "unavailable": "Indisponible", 
  "online": "En ligne",
  "offline": "Hors ligne",
  "enabled": "Activé",
  "disabled": "Désactivé",
  "public": "Public",
  "private": "Privé",
  "visible": "Visible",
  "hidden": "Masqué",
  "required": "Requis",
  "optional": "Optionnel",
  "automatic": "Automatique",
  "manual": "Manuel",
  
  // Quantités et mesures
  "weight": "Poids",
  "size": "Taille",
  "dimension": "Dimension",
  "capacity": "Capacité",
  "quantity": "Quantité",
  "number": "Numéro",
  "code": "Code",
  "reference": "Référence",
  "type": "Type",
  "category": "Catégorie",
  "status": "Statut",
  "priority": "Priorité",
  "level": "Niveau",
  "version": "Version",
  
  // Interface utilisateur
  "button": "Bouton",
  "link": "Lien",
  "menu": "Menu",
  "tab": "Onglet",
  "page": "Page",
  "section": "Section",
  "form": "Formulaire",
  "field": "Champ",
  "input": "Saisie",
  "output": "Sortie",
  "result": "Résultat",
  "content": "Contenu",
  "title": "Titre",
  "subtitle": "Sous-titre",
  "header": "En-tête",
  "footer": "Pied de page",
  "sidebar": "Barre latérale",
  "toolbar": "Barre d'outils",
  "widget": "Widget",
  "component": "Composant",
  "element": "Élément",
  "item": "Élément",
  "option": "Option",
  "choice": "Choix",
  "selection": "Sélection",
  
  // Spécifique EcoDeli
  "ecodeli": "EcoDeli",
  "ecological": "Écologique",
  "eco": "Éco",
  "green": "Vert",
  "sustainable": "Durable",
  "environment": "Environnement",
  "carbon": "Carbone",
  "emission": "Émission",
  "footprint": "Empreinte",
  "crowdshipping": "Crowdshipping",
  "collaborative": "Collaboratif",
  "sharing": "Partage",
  "community": "Communauté"
};

async function massFixTranslations() {
  console.log("🔧 Correction en masse des traductions françaises...\n");
  
  const messagesPath = path.join(__dirname, "../../src/messages/fr.json");
  
  try {
    // Lire le fichier de traductions actuel
    const content = await fs.readFile(messagesPath, 'utf-8');
    const translations = JSON.parse(content);
    
    let fixedCount = 0;
    
    // Fonction récursive pour parcourir et corriger les traductions
    function fixObject(obj: any, path: string = ''): void {
      for (const key in obj) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (typeof obj[key] === 'string') {
          // Si la valeur commence par [EN], essayer de la traduire
          if (obj[key].startsWith('[EN]')) {
            const cleanKey = key.toLowerCase();
            const cleanValue = obj[key].replace('[EN] ', '').trim();
            
            // 1. Chercher dans nos traductions massives
            if (massTranslations[key]) {
              obj[key] = massTranslations[key];
              console.log(`✅ ${fullPath}: "${massTranslations[key]}"`);
              fixedCount++;
            } else if (massTranslations[cleanKey]) {
              obj[key] = massTranslations[cleanKey];
              console.log(`✅ ${fullPath}: "${massTranslations[cleanKey]}"`);
              fixedCount++;
            } 
            // 2. Si la valeur après [EN] contient déjà du français, l'utiliser
            else if (cleanValue && /[àâäéèêëïîôùûüÿç]/i.test(cleanValue)) {
              obj[key] = cleanValue;
              console.log(`✅ ${fullPath}: "${cleanValue}" (extrait)`);
              fixedCount++;
            }
            // 3. Pour les clés simples, utiliser le pattern français courant
            else if (cleanKey.length < 20 && !cleanKey.includes('.')) {
              // Transformer en français basique pour les mots simples
              const frenchVersion = transformToFrench(cleanKey);
              if (frenchVersion !== cleanKey) {
                obj[key] = frenchVersion;
                console.log(`✅ ${fullPath}: "${frenchVersion}" (transformé)`);
                fixedCount++;
              }
            }
          }
          // Si la valeur est juste une clé (pas de traduction)
          else if (obj[key] === key && massTranslations[key.toLowerCase()]) {
            obj[key] = massTranslations[key.toLowerCase()];
            console.log(`✅ ${fullPath}: "${massTranslations[key.toLowerCase()]}" (clé corrigée)`);
            fixedCount++;
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          fixObject(obj[key], fullPath);
        }
      }
    }
    
    // Appliquer les corrections
    fixObject(translations);
    
    // Sauvegarder le fichier corrigé
    await fs.writeFile(
      messagesPath,
      JSON.stringify(translations, null, 2),
      'utf-8'
    );
    
    console.log(`\n✅ ${fixedCount} traductions corrigées avec succès!`);
    console.log(`📄 Fichier sauvegardé: ${messagesPath}`);
    
  } catch (error) {
    console.error("❌ Erreur lors de la correction en masse:", error);
  }
}

function transformToFrench(englishKey: string): string {
  // Transformations basiques anglais -> français pour les mots courants
  const basicTransforms: { [key: string]: string } = {
    "loading": "chargement",
    "saving": "sauvegarde", 
    "editing": "modification",
    "creating": "création",
    "updating": "mise à jour",
    "deleting": "suppression",
    "searching": "recherche",
    "filtering": "filtrage",
    "sorting": "tri",
    "processing": "traitement",
    "sending": "envoi",
    "receiving": "réception",
    "downloading": "téléchargement",
    "uploading": "téléversement",
    "connecting": "connexion",
    "disconnecting": "déconnexion",
    "validating": "validation",
    "verifying": "vérification",
    "confirming": "confirmation",
    "activating": "activation",
    "deactivating": "désactivation",
    "name": "nom",
    "firstname": "prénom",
    "lastname": "nom de famille",
    "email": "email",
    "password": "mot de passe",
    "phone": "téléphone",
    "address": "adresse",
    "city": "ville",
    "country": "pays",
    "language": "langue",
    "theme": "thème",
    "mode": "mode",
    "color": "couleur",
    "size": "taille",
    "width": "largeur",
    "height": "hauteur",
    "length": "longueur",
    "weight": "poids",
    "price": "prix",
    "cost": "coût",
    "fee": "frais",
    "tax": "taxe",
    "discount": "remise",
    "total": "total",
    "subtotal": "sous-total",
    "quantity": "quantité",
    "amount": "montant",
    "balance": "solde",
    "credit": "crédit",
    "debit": "débit"
  };
  
  const key = englishKey.toLowerCase();
  
  if (basicTransforms[key]) {
    return basicTransforms[key];
  }
  
  // Si pas de traduction trouvée, capitaliser la première lettre
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// Exécuter le script
massFixTranslations();