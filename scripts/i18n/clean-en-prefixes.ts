import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanEnPrefixes() {
  console.log("🧹 Nettoyage des préfixes [EN] dans les traductions...\n");
  
  const messagesPath = path.join(__dirname, "../../src/messages/fr.json");
  
  try {
    // Lire le fichier de traductions actuel
    const content = await fs.readFile(messagesPath, 'utf-8');
    const translations = JSON.parse(content);
    
    let cleanedCount = 0;
    
    // Fonction récursive pour nettoyer les préfixes [EN]
    function cleanObject(obj: any, path: string = ''): void {
      for (const key in obj) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (typeof obj[key] === 'string') {
          // Si la valeur commence par [EN], retirer le préfixe
          if (obj[key].startsWith('[EN]')) {
            const cleaned = obj[key].replace(/^\[EN\]\s*/, '').trim();
            
            // Si après nettoyage il reste du contenu français valide
            if (cleaned && cleaned.length > 0) {
              obj[key] = cleaned;
              console.log(`✅ ${fullPath}: "${cleaned}"`);
              cleanedCount++;
            }
            // Sinon, essayer une traduction basique basée sur la clé
            else {
              const basicTranslation = getBasicTranslation(key);
              if (basicTranslation) {
                obj[key] = basicTranslation;
                console.log(`✅ ${fullPath}: "${basicTranslation}" (traduction basique)`);
                cleanedCount++;
              }
            }
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          cleanObject(obj[key], fullPath);
        }
      }
    }
    
    // Appliquer le nettoyage
    cleanObject(translations);
    
    // Sauvegarder le fichier nettoyé
    await fs.writeFile(
      messagesPath,
      JSON.stringify(translations, null, 2),
      'utf-8'
    );
    
    console.log(`\n✅ ${cleanedCount} préfixes [EN] nettoyés avec succès!`);
    console.log(`📄 Fichier sauvegardé: ${messagesPath}`);
    
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage:", error);
  }
}

function getBasicTranslation(key: string): string | null {
  // Traductions basiques pour les clés courantes
  const basicTranslations: { [key: string]: string } = {
    "title": "Titre",
    "description": "Description", 
    "name": "Nom",
    "email": "Email",
    "password": "Mot de passe",
    "submit": "Soumettre",
    "cancel": "Annuler",
    "save": "Enregistrer",
    "edit": "Modifier",
    "delete": "Supprimer",
    "back": "Retour",
    "next": "Suivant",
    "previous": "Précédent",
    "loading": "Chargement...",
    "error": "Erreur",
    "success": "Succès",
    "warning": "Attention",
    "info": "Information",
    "search": "Rechercher",
    "filter": "Filtrer",
    "sort": "Trier",
    "view": "Voir",
    "show": "Afficher",
    "hide": "Masquer",
    "open": "Ouvrir",
    "close": "Fermer",
    "add": "Ajouter",
    "remove": "Retirer",
    "create": "Créer",
    "update": "Mettre à jour",
    "confirm": "Confirmer",
    "yes": "Oui",
    "no": "Non",
    "ok": "OK",
    "settings": "Paramètres",
    "profile": "Profil",
    "dashboard": "Tableau de bord",
    "home": "Accueil",
    "contact": "Contact",
    "help": "Aide",
    "about": "À propos",
    "services": "Services",
    "price": "Prix",
    "date": "Date",
    "time": "Heure",
    "address": "Adresse",
    "city": "Ville",
    "country": "Pays",
    "phone": "Téléphone",
    "status": "Statut",
    "active": "Actif",
    "inactive": "Inactif",
    "pending": "En attente",
    "approved": "Approuvé",
    "rejected": "Rejeté",
    "completed": "Terminé",
    "cancelled": "Annulé",
    "available": "Disponible",
    "unavailable": "Indisponible"
  };
  
  const lowercaseKey = key.toLowerCase();
  return basicTranslations[lowercaseKey] || null;
}

// Exécuter le script
cleanEnPrefixes();