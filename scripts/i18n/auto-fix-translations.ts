import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TranslationMap {
  [key: string]: any;
}

// Mapping des traductions anglaises vers français basé sur les patterns courants
const commonTranslations: { [key: string]: string } = {
  // Dashboard
  "pageTitle": "Tableau de bord",
  "pageDescription": "Gérez vos activités et suivez vos performances",
  "title": "Tableau de bord",
  "subtitle": "Bienvenue sur votre espace",
  "welcomeMessage": "Bienvenue",
  "refreshDashboard": "Actualiser le tableau de bord",
  "statsTitle": "Statistiques",
  "errorTitle": "Erreur",
  "errorDescription": "Une erreur s'est produite",
  "retry": "Réessayer",
  
  // Stats
  "announcementsCount": "Nombre d'annonces",
  "deliveriesCount": "Nombre de livraisons",
  "averageRating": "Note moyenne",
  "estimatedSavings": "Économies estimées",
  
  // Financial
  "financialSummary": "Résumé financier",
  "currentMonthExpenses": "Dépenses du mois en cours",
  "comparedToPrevious": "Par rapport au mois précédent",
  "withEcoDeli": "Avec EcoDeli",
  "expenseEvolution": "Évolution des dépenses",
  
  // Activity
  "recentActivity": "Activité récente",
  "noRecentActivity": "Aucune activité récente",
  "activeDeliveries": "Livraisons actives",
  "unknownDeliverer": "Livreur inconnu",
  "noActiveDeliveries": "Aucune livraison active",
  "viewAllDeliveries": "Voir toutes les livraisons",
  "activeAnnouncements": "Annonces actives",
  "delivererInterested": "Livreur intéressé",
  "noActiveAnnouncements": "Aucune annonce active",
  "viewAllAnnouncements": "Voir toutes les annonces",
  "newAnnouncement": "Nouvelle annonce",
  
  // Common terms
  "availableDeliveries": "Livraisons disponibles",
  "availableDeliveriesDescription": "Livraisons disponibles dans votre zone",
  "activeDeliveriesDescription": "Livraisons en cours de traitement",
  
  // Service types
  "maintenance": "Maintenance",
  "cleaning": "Nettoyage",
  "repair": "Réparation",
  "installation": "Installation",
  "consulting": "Conseil",
  
  // Actions
  "Title": "Actions rapides",
  "quickActions": "Actions rapides"
};

async function extractFrenchFromCode(filePath: string): Promise<Map<string, string>> {
  const translations = new Map<string, string>();
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Pattern pour détecter les textes en français dans le code
    const patterns = [
      // Texte dans les composants React
      />\s*([A-ZÀ-ÿ][a-zà-ÿ\s'éèêëàâäôùûüçîï]+)\s*</g,
      // Labels et titres
      /label:\s*["']([^"']+)["']/g,
      /title:\s*["']([^"']+)["']/g,
      /description:\s*["']([^"']+)["']/g,
      // Placeholders
      /placeholder:\s*["']([^"']+)["']/g,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const text = match[1];
        // Filtrer uniquement les textes en français (contenant des caractères accentués ou mots français courants)
        if (/[àâäéèêëïîôùûüÿç]/i.test(text) || 
            /\b(le|la|les|un|une|des|de|du|et|ou|dans|pour|avec|sans|sur|sous)\b/i.test(text)) {
          // Essayer de deviner la clé correspondante
          const key = text
            .toLowerCase()
            .replace(/[àâä]/g, 'a')
            .replace(/[éèêë]/g, 'e')
            .replace(/[ïî]/g, 'i')
            .replace(/[ôö]/g, 'o')
            .replace(/[ùûü]/g, 'u')
            .replace(/[ÿ]/g, 'y')
            .replace(/ç/g, 'c')
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '');
          
          translations.set(key, text);
        }
      }
    });
  } catch (error) {
    // Ignorer les erreurs de lecture
  }
  
  return translations;
}

async function fixTranslations() {
  console.log("🔧 Correction automatique des traductions...\n");
  
  const messagesPath = path.join(__dirname, "../../src/messages/fr.json");
  
  try {
    // Lire le fichier de traductions actuel
    const content = await fs.readFile(messagesPath, 'utf-8');
    const translations: TranslationMap = JSON.parse(content);
    
    let fixedCount = 0;
    
    // Fonction récursive pour parcourir et corriger les traductions
    function fixObject(obj: any, path: string = ''): void {
      for (const key in obj) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (typeof obj[key] === 'string') {
          // Si la valeur commence par [EN], essayer de la traduire
          if (obj[key].startsWith('[EN]')) {
            const cleanKey = key.toLowerCase();
            
            // Chercher d'abord dans nos traductions communes
            if (commonTranslations[key]) {
              obj[key] = commonTranslations[key];
              console.log(`✅ ${fullPath}: "${commonTranslations[key]}"`);
              fixedCount++;
            } else if (commonTranslations[cleanKey]) {
              obj[key] = commonTranslations[cleanKey];
              console.log(`✅ ${fullPath}: "${commonTranslations[cleanKey]}"`);
              fixedCount++;
            } else {
              // Si la traduction contient déjà du français après [EN], l'utiliser
              const match = obj[key].match(/\[EN\]\s*(.+)/);
              if (match && match[1] && /[àâäéèêëïîôùûüÿç]/i.test(match[1])) {
                obj[key] = match[1];
                console.log(`✅ ${fullPath}: "${match[1]}" (extrait)`);
                fixedCount++;
              }
            }
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          fixObject(obj[key], fullPath);
        }
      }
    }
    
    // Appliquer les corrections
    fixObject(translations);
    
    // Corrections spécifiques pour dashboard.client
    if (translations.dashboard?.client) {
      const client = translations.dashboard.client;
      
      // S'assurer que toutes les clés essentielles sont présentes
      const essentialKeys = {
        pageTitle: "Tableau de bord client",
        pageDescription: "Gérez vos livraisons, services et annonces",
        title: "Tableau de bord",
        subtitle: "Bienvenue sur votre espace client EcoDeli"
      };
      
      for (const [key, value] of Object.entries(essentialKeys)) {
        if (!client[key] || client[key].startsWith('[EN]')) {
          client[key] = value;
          console.log(`✅ dashboard.client.${key}: "${value}"`);
          fixedCount++;
        }
      }
    }
    
    // Sauvegarder le fichier corrigé
    await fs.writeFile(
      messagesPath,
      JSON.stringify(translations, null, 2),
      'utf-8'
    );
    
    console.log(`\n✅ ${fixedCount} traductions corrigées avec succès!`);
    
  } catch (error) {
    console.error("❌ Erreur lors de la correction des traductions:", error);
  }
}

// Exécuter le script
fixTranslations();