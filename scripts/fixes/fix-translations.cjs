#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const translationsFile = path.join(process.cwd(), "src/messages/fr.json");

// Traductions françaises pour remplacer les [EN]
const frenchTranslations = {
  // HomePage
  subtitle: "Votre plateforme de livraison écologique",

  // Common.Onboarding.actions
  next: "Suivant",
  previous: "Précédent",
  skip: "Passer le tutoriel",
  finish: "Terminer",

  // Announcements
  myAnnouncements: "Mes annonces",
  manageYourAnnouncements: "Gérez vos annonces",
  filter: "Filtrer",
  refresh: "Actualiser",
  createNew: "Créer nouveau",
  error: "Erreur",
  activeAnnouncements: "Annonces actives",
  announcementHistory: "Historique des annonces",
  noActiveAnnouncements: "Aucune annonce active",
  createAnnouncementPrompt: "Créez votre première annonce",
  createAnnouncement: "Créer une annonce",
  noAnnouncementHistory: "Aucun historique d'annonce",
  completedAnnouncementsWillAppearHere:
    "Les annonces terminées apparaîtront ici",
  proximitySearchSuccess: "Recherche de proximité réussie",
  proximitySearchError: "Erreur de recherche de proximité",
  locationError: "Erreur de localisation",
  geolocationNotSupported: "Géolocalisation non supportée",
  availableAnnouncements: "Annonces disponibles",
  findDeliveryOpportunities: "Trouvez des opportunités de livraison",
  proximitySearch: "Recherche de proximité",
  findAnnouncementsNearby: "Trouvez des annonces à proximité",
  searchRadius: "Rayon de recherche",
  searchingLocation: "Recherche de localisation",
  searchNearMe: "Rechercher près de moi",
  myApplications: "Mes candidatures",
  noAvailableAnnouncements: "Aucune annonce disponible",
  checkBackLater: "Revenez plus tard",
  searchNearby: "Rechercher à proximité",
  noApplications: "Aucune candidature",
  applyToAnnouncements: "Postulez aux annonces",
  browseAnnouncements: "Parcourir les annonces",
  deleteSuccess: "Suppression réussie",
  announcementDeleted: "Annonce supprimée",
  deleteError: "Erreur de suppression",
  announcementNotFound: "Annonce non trouvée",
  backToList: "Retour à la liste",
  createdAt: "Créé le",
  back: "Retour",
  edit: "Modifier",
  delete: "Supprimer",
  details: "Détails",
  proposals: "Propositions",
  noProposalsYet: "Aucune proposition pour le moment",
  proposalsWillAppearHere: "Les propositions apparaîtront ici",
  quickActions: "Actions rapides",
  editAnnouncement: "Modifier l'annonce",
  trackDelivery: "Suivre la livraison",
  makePayment: "Effectuer le paiement",
  announcementInfo: "Informations de l'annonce",
  locations: "Emplacements",
  from: "De",
  to: "À",
  dates: "Dates",
  pickupDate: "Date de collecte",
  notSpecified: "Non spécifié",
  deliveryDate: "Date de livraison",
  price: "Prix",
  deleteConfirmation: "Confirmation de suppression",
  deleteConfirmationText: "Êtes-vous sûr de vouloir supprimer cette annonce ?",
  cancel: "Annuler",
  confirmDelete: "Confirmer la suppression",
  createSuccess: "Création réussie",
  announcementCreated: "Annonce créée",
  createError: "Erreur de création",
  announcementCreatedDescription: "Votre annonce a été créée avec succès",
  nextStepsTitle: "Prochaines étapes",
  nextStepsDescription: "Description des prochaines étapes",

  // Contracts - Traductions spécifiques
  title: "Contrats",
  subtitle: "Gérez vos contrats et accords",
  myContracts: "Mes contrats",
  newContract: "Nouveau contrat",
  downloadSuccess: "Téléchargement réussi",
  downloadSuccessDesc: "Le contrat a été téléchargé avec succès",
  downloadError: "Erreur de téléchargement",
  downloadErrorDesc: "Impossible de télécharger le contrat",
  renewSuccess: "Renouvellement réussi",
  renewSuccessDesc: "Le contrat a été renouvelé avec succès",
  renewError: "Erreur de renouvellement",
  renewErrorDesc: "Impossible de renouveler le contrat",

  // Reviews
  writeReview: "Écrire un avis",
  allReviews: "Tous les avis",
  serviceReviews: "Avis services",
  deliveryReviews: "Avis livraisons",
  deleteSuccessDesc: "L'avis a été supprimé avec succès",
  deleteErrorDesc: "Impossible de supprimer l'avis",
  voteSuccess: "Vote enregistré",
  voteHelpfulSuccess: "Avis marqué comme utile",
  voteNotHelpfulSuccess: "Avis marqué comme non utile",
  voteError: "Erreur de vote",
  voteErrorDesc: "Impossible d'enregistrer votre vote",
  reportSuccess: "Signalement envoyé",
  reportSuccessDesc: "L'avis a été signalé aux modérateurs",
  reportError: "Erreur de signalement",
  reportErrorDesc: "Impossible de signaler cet avis",

  // Appointments
  bookNew: "Réserver nouveau",
  allStatuses: "Tous les statuts",
  allTypes: "Tous les types",
};

function fixTranslations() {
  try {
    // Lire le fichier JSON
    const content = fs.readFileSync(translationsFile, "utf8");
    let data = JSON.parse(content);

    // Fonction récursive pour remplacer les [EN]
    function replaceENTags(obj, parentKey = "") {
      if (typeof obj === "string" && obj.startsWith("[EN] ")) {
        const key = obj.replace("[EN] ", "");
        const fullKey = parentKey ? `${parentKey}.${key}` : key;

        // Chercher une traduction française
        if (frenchTranslations[key]) {
          console.log(`✅ Remplacé: "${obj}" -> "${frenchTranslations[key]}"`);
          return frenchTranslations[key];
        } else {
          console.log(`⚠️  Traduction manquante pour: ${key} (${fullKey})`);
          return key; // Enlever juste le [EN]
        }
      } else if (typeof obj === "object" && obj !== null) {
        const result = Array.isArray(obj) ? [] : {};
        for (const [key, value] of Object.entries(obj)) {
          const newParentKey = parentKey ? `${parentKey}.${key}` : key;
          result[key] = replaceENTags(value, newParentKey);
        }
        return result;
      }
      return obj;
    }

    // Appliquer les corrections
    data = replaceENTags(data);

    // Écrire le fichier corrigé
    fs.writeFileSync(translationsFile, JSON.stringify(data, null, 2), "utf8");

    console.log("✅ Traductions corrigées avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de la correction des traductions:", error);
  }
}

// Exécuter le script
fixTranslations();
