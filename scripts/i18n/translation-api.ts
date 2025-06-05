import chalk from 'chalk';
import config from './extraction.config';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(projectRoot, '.env') });

// Configuration des APIs de traduction
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || '';
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || '';

// URL des APIs
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

// Taille maximale des chunks pour les requêtes API
const MAX_CHUNK_SIZE = 1000;

// Codes de langue pour les APIs
const LANGUAGE_CODES = {
  fr: {
    deepl: 'FR',
    google: 'fr',
    name: 'Français',
  },
  en: {
    deepl: 'EN',
    google: 'en',
    name: 'English',
  },
  es: {
    deepl: 'ES',
    google: 'es',
    name: 'Español',
  },
  de: {
    deepl: 'DE',
    google: 'de',
    name: 'Deutsch',
  },
  it: {
    deepl: 'IT',
    google: 'it',
    name: 'Italiano',
  },
};

// Dictionnaire de traduction simplifiée fr -> en pour les mots courants
// Utilisé comme solution de repli si aucune API de traduction n'est configurée
const SIMPLE_DICTIONARY: Record<string, Record<string, string>> = {
  'fr-en': {
    // Termes généraux
    accueil: 'home',
    connexion: 'login',
    déconnexion: 'logout',
    inscription: 'register',
    profil: 'profile',
    paramètres: 'settings',
    utilisateur: 'user',
    utilisateurs: 'users',
    client: 'client',
    clients: 'clients',
    livreur: 'deliverer',
    livreurs: 'deliverers',
    commerçant: 'merchant',
    commerçants: 'merchants',
    prestataire: 'provider',
    prestataires: 'providers',
    admin: 'admin',
    administrateur: 'administrator',
    administrateurs: 'administrators',
    produit: 'product',
    produits: 'products',
    service: 'service',
    services: 'services',
    commande: 'order',
    commandes: 'orders',
    livraison: 'delivery',
    livraisons: 'deliveries',
    paiement: 'payment',
    paiements: 'payments',
    facture: 'invoice',
    factures: 'invoices',
    notification: 'notification',
    notifications: 'notifications',
    message: 'message',
    messages: 'messages',
    conversation: 'conversation',
    conversations: 'conversations',
    discussion: 'discussion',
    discussions: 'discussions',
    annonce: 'announcement',
    annonces: 'announcements',
    contrat: 'contract',
    contrats: 'contracts',
    document: 'document',
    documents: 'documents',
    dossier: 'folder',
    dossiers: 'folders',
    fichier: 'file',
    fichiers: 'files',
    image: 'image',
    images: 'images',
    photo: 'photo',
    photos: 'photos',
    vidéo: 'video',
    vidéos: 'videos',
    audio: 'audio',
    entrepôt: 'warehouse',
    entrepôts: 'warehouses',
    stock: 'stock',
    stocks: 'stocks',
    inventaire: 'inventory',
    catégorie: 'category',
    catégories: 'categories',
    étiquette: 'tag',
    étiquettes: 'tags',
    filtre: 'filter',
    filtres: 'filters',
    recherche: 'search',
    résultat: 'result',
    résultats: 'results',
    détail: 'detail',
    détails: 'details',
    aperçu: 'preview',
    erreur: 'error',
    erreurs: 'errors',
    succès: 'success',
    avertissement: 'warning',
    avertissements: 'warnings',
    information: 'information',
    informations: 'information',
    validation: 'validation',
    validations: 'validations',
    vérification: 'verification',
    vérifications: 'verifications',
    confirmation: 'confirmation',
    confirmations: 'confirmations',
    annulation: 'cancellation',
    annulations: 'cancellations',
    modification: 'modification',
    modifications: 'modifications',
    suppression: 'deletion',
    suppressions: 'deletions',
    création: 'creation',
    créations: 'creations',
    édition: 'edition',
    éditions: 'editions',
    'mise à jour': 'update',
    'mises à jour': 'updates',
    sauvegarde: 'save',
    sauvegardes: 'saves',
    enregistrement: 'save',
    enregistrements: 'saves',
    chargement: 'loading',
    traitement: 'processing',
    envoi: 'sending',
    réception: 'reception',
    réponse: 'response',
    réponses: 'responses',
    demande: 'request',
    demandes: 'requests',
    formulaire: 'form',
    formulaires: 'forms',
    champ: 'field',
    champs: 'fields',
    bouton: 'button',
    boutons: 'buttons',
    lien: 'link',
    liens: 'links',
    menu: 'menu',
    menus: 'menus',
    navigation: 'navigation',
    page: 'page',
    pages: 'pages',
    section: 'section',
    sections: 'sections',
    titre: 'title',
    titres: 'titles',
    description: 'description',
    descriptions: 'descriptions',
    contenu: 'content',
    contenus: 'contents',
    texte: 'text',
    textes: 'texts',
    icône: 'icon',
    icônes: 'icons',
    tableau: 'table',
    tableaux: 'tables',
    liste: 'list',
    listes: 'lists',
    élément: 'item',
    éléments: 'items',
    option: 'option',
    options: 'options',
    valeur: 'value',
    valeurs: 'values',
    date: 'date',
    dates: 'dates',
    heure: 'time',
    heures: 'times',
    jour: 'day',
    jours: 'days',
    semaine: 'week',
    semaines: 'weeks',
    mois: 'month',
    mois_singulier: 'month',
    mois_pluriel: 'months',
    année: 'year',
    années: 'years',
    "aujourd'hui": 'today',
    demain: 'tomorrow',
    hier: 'yesterday',
    maintenant: 'now',
    jamais: 'never',
    toujours: 'always',
    souvent: 'often',
    parfois: 'sometimes',
    rarement: 'rarely',
    oui: 'yes',
    non: 'no',
    'peut-être': 'maybe',
    obligatoire: 'required',
    optionnel: 'optional',
    nouveau: 'new',
    nouvelle: 'new',
    nouveaux: 'new',
    nouvelles: 'new',
    ancien: 'old',
    ancienne: 'old',
    anciens: 'old',
    anciennes: 'old',
    actif: 'active',
    active: 'active',
    actifs: 'active',
    actives: 'active',
    inactif: 'inactive',
    inactive: 'inactive',
    inactifs: 'inactive',
    inactives: 'inactive',
    disponible: 'available',
    disponibles: 'available',
    indisponible: 'unavailable',
    indisponibles: 'unavailable',
    activé: 'enabled',
    activée: 'enabled',
    activés: 'enabled',
    activées: 'enabled',
    désactivé: 'disabled',
    désactivée: 'disabled',
    désactivés: 'disabled',
    désactivées: 'disabled',
    approuvé: 'approved',
    approuvée: 'approved',
    approuvés: 'approved',
    approuvées: 'approved',
    rejeté: 'rejected',
    rejetée: 'rejected',
    rejetés: 'rejected',
    rejetées: 'rejected',
    nom: 'name',
    prénom: 'firstname',
    adresse: 'address',
    adresses: 'addresses',
    email: 'email',
    téléphone: 'phone',
    'mot de passe': 'password',
    confirmer: 'confirm',
    annuler: 'cancel',
    supprimer: 'delete',
    modifier: 'edit',
    ajouter: 'add',
    créer: 'create',
    enregistrer: 'save',
    sauvegarder: 'save',
    charger: 'load',
    envoyer: 'send',
    recevoir: 'receive',
    valider: 'validate',
    vérifier: 'verify',
    rechercher: 'search',
    filtrer: 'filter',
    trier: 'sort',
    afficher: 'display',
    masquer: 'hide',
    montrer: 'show',
    cacher: 'hide',
    télécharger: 'download',
    importer: 'import',
    exporter: 'export',
    générer: 'generate',
    configurer: 'configure',
    retour: 'back',
    suivant: 'next',
    précédent: 'previous',
    premier: 'first',
    dernier: 'last',
    début: 'start',
    fin: 'end',
    plus: 'more',
    moins: 'less',
    tous: 'all',
    toutes: 'all',
    aucun: 'none',
    aucune: 'none',
    autre: 'other',
    autres: 'others',
    bienvenue: 'welcome',
    bonjour: 'hello',
    aurevoir: 'goodbye',
    merci: 'thank you',
    félicitations: 'congratulations',
    désolé: 'sorry',
    attention: 'warning',
    important: 'important',
    identifiant: 'identifier',
    identifiants: 'identifiers',
    'se connecter': 'login',
    'se déconnecter': 'logout',
    "s'inscrire": 'register',
    'modifier le profil': 'edit profile',
    'changer le mot de passe': 'change password',
    'mot de passe oublié': 'forgot password',
    'réinitialiser le mot de passe': 'reset password',

    // Termes spécifiques à Todo
    'liste de tâches': 'todo list',
    tâche: 'task',
    tâches: 'tasks',
    'ajouter une nouvelle tâche': 'add a new task',
    'aucune tâche pour le moment': 'no tasks yet',
    'marquer comme terminée': 'mark as complete',
    'marquer comme non terminée': 'mark as incomplete',
    'modifier la tâche': 'edit task',
    'détails de la tâche': 'task details',
    'tout terminer': 'complete all',
    'supprimer les tâches terminées': 'clear completed tasks',
    // Filtres et états (suppression des doublons)
    tout: 'all',
    terminée: 'completed',
    terminées: 'completed',
    priorité: 'priority',
    haute: 'high',
    moyenne: 'medium',
    basse: 'low',
    "date d'échéance": 'due date',
    'trier par': 'sort by',
    'date de création': 'creation date',
  },
};

/**
 * Découpe un texte en fragments pour éviter de dépasser les limites des APIs
 */
function splitTextIntoChunks(text: string): string[] {
  if (text.length <= MAX_CHUNK_SIZE) {
    return [text];
  }

  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    // Trouver la fin du chunk sur un séparateur naturel
    let endIndex = Math.min(currentIndex + MAX_CHUNK_SIZE, text.length);

    // Si on n'est pas à la fin, chercher le dernier séparateur
    if (endIndex < text.length) {
      const lastSeparator = text.lastIndexOf('\n', endIndex);
      if (lastSeparator > currentIndex && lastSeparator <= endIndex) {
        endIndex = lastSeparator;
      } else {
        const lastSpace = text.lastIndexOf(' ', endIndex);
        if (lastSpace > currentIndex && lastSpace <= endIndex) {
          endIndex = lastSpace;
        }
      }
    }

    chunks.push(text.substring(currentIndex, endIndex));
    currentIndex = endIndex;
  }

  return chunks;
}

/**
 * Traduit un texte avec l'API DeepL
 */
async function translateWithDeepL(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  try {
    if (!DEEPL_API_KEY) {
      throw new Error('Clé API DeepL non configurée');
    }

    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang:
          LANGUAGE_CODES[sourceLang as keyof typeof LANGUAGE_CODES]?.deepl ||
          sourceLang.toUpperCase(),
        target_lang:
          LANGUAGE_CODES[targetLang as keyof typeof LANGUAGE_CODES]?.deepl ||
          targetLang.toUpperCase(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur DeepL: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.translations?.[0]?.text || text;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur DeepL API: ${error}`));
    throw error;
  }
}

/**
 * Traduit un texte avec l'API Google Translate
 */
async function translateWithGoogle(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  try {
    if (!GOOGLE_TRANSLATE_API_KEY) {
      throw new Error('Clé API Google Translate non configurée');
    }

    const response = await fetch(`${GOOGLE_TRANSLATE_API_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: LANGUAGE_CODES[sourceLang as keyof typeof LANGUAGE_CODES]?.google || sourceLang,
        target: LANGUAGE_CODES[targetLang as keyof typeof LANGUAGE_CODES]?.google || targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur Google Translate: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data?.translations?.[0]?.translatedText || text;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur Google Translate API: ${error}`));
    throw error;
  }
}

/**
 * Traduit un texte avec le dictionnaire simple
 */
function translateWithDictionary(text: string, sourceLang: string, targetLang: string): string {
  const dictKey = `${sourceLang}-${targetLang}`;
  const dict = SIMPLE_DICTIONARY[dictKey];

  if (!dict) {
    console.warn(chalk.yellow(`⚠️ Dictionnaire non disponible pour ${dictKey}`));
    return text;
  }

  // Translation très basique mot à mot
  let translatedText = text;
  Object.entries(dict).forEach(([key, value]) => {
    // Utiliser une regex pour remplacer seulement les mots entiers
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    translatedText = translatedText.replace(regex, value);
  });

  return translatedText;
}

/**
 * Obtient une traduction à partir d'une API de traduction configurée
 */
export async function getTranslationFromAPI(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  // Ne pas traduire si les langues sont identiques
  if (sourceLanguage === targetLanguage) {
    return text;
  }

  // Ne pas traduire le texte vide
  if (!text || text.trim() === '') {
    return text;
  }

  console.log(
    chalk.blue(
      `🔄 Traduction de "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" de ${sourceLanguage} vers ${targetLanguage}`
    )
  );

  try {
    // Essayer DeepL en premier (meilleure qualité généralement)
    if (DEEPL_API_KEY) {
      console.log(chalk.blue('🔄 Utilisation de DeepL API'));
      return await translateWithDeepL(text, sourceLanguage, targetLanguage);
    }

    // Sinon, essayer Google Translate
    if (GOOGLE_TRANSLATE_API_KEY) {
      console.log(chalk.blue('🔄 Utilisation de Google Translate API'));
      return await translateWithGoogle(text, sourceLanguage, targetLanguage);
    }

    // Si aucune API n'est configurée, utiliser le dictionnaire simple
    console.warn(
      chalk.yellow('⚠️ Aucune API de traduction configurée, utilisation du dictionnaire simple')
    );
    return translateWithDictionary(text, sourceLanguage, targetLanguage);
  } catch (error) {
    console.error(chalk.red(`❌ Erreur de traduction: ${error}`));

    // En cas d'erreur, utiliser le dictionnaire simple
    console.warn(chalk.yellow('⚠️ Fallback vers le dictionnaire simple'));
    return translateWithDictionary(text, sourceLanguage, targetLanguage);
  }
}

/**
 * Traduit un texte français vers l'anglais
 */
export async function generateEnglishTranslation(frenchText: string): Promise<string> {
  if (!frenchText || frenchText.trim() === '') {
    return frenchText;
  }

  // Enlever les marqueurs de traduction
  const cleanText = frenchText.replace(/\[TO_TRANSLATE\]\s*/g, '');

  // Diviser en chunks pour respecter les limites des APIs
  const chunks = splitTextIntoChunks(cleanText);

  // Traduire chaque chunk
  const translatedChunks = await Promise.all(
    chunks.map(chunk => getTranslationFromAPI(chunk, 'fr', 'en'))
  );

  // Recombiner les chunks traduits
  return translatedChunks.join(' ');
}

/**
 * Traduit un texte vers toutes les langues cibles
 */
export async function translateToAllLanguages(
  sourceText: string,
  sourceLanguage: string,
  targetLanguages: string[]
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  // Ne pas traduire le texte vide
  if (!sourceText || sourceText.trim() === '') {
    targetLanguages.forEach(lang => {
      results[lang] = sourceText;
    });
    return results;
  }

  // Enlever les marqueurs de traduction
  const cleanText = sourceText.replace(/\[TO_TRANSLATE\]\s*/g, '');

  // Diviser en chunks pour respecter les limites des APIs
  const chunks = splitTextIntoChunks(cleanText);

  // Pour chaque langue cible
  for (const targetLang of targetLanguages) {
    // Sauter la langue source
    if (targetLang === sourceLanguage) {
      results[targetLang] = sourceText;
      continue;
    }

    try {
      // Traduire chaque chunk
      const translatedChunks = await Promise.all(
        chunks.map(chunk => getTranslationFromAPI(chunk, sourceLanguage, targetLang))
      );

      // Recombiner les chunks traduits
      results[targetLang] = translatedChunks.join(' ');
    } catch (error) {
      console.error(chalk.red(`❌ Erreur lors de la traduction vers ${targetLang}: ${error}`));
      results[targetLang] = `[FAILED_TRANSLATION] ${sourceText}`;
    }
  }

  return results;
}

/**
 * Vérifie si les API de traduction sont configurées
 */
export function checkTranslationAPIAvailability(): {
  deepl: boolean;
  google: boolean;
  dictionary: boolean;
  message: string;
} {
  const deepl = !!DEEPL_API_KEY;
  const google = !!GOOGLE_TRANSLATE_API_KEY;
  const dictionary = true; // Toujours disponible

  let message;
  if (deepl) {
    message = "✅ DeepL API configurée et prête à l'utilisation";
  } else if (google) {
    message = "✅ Google Translate API configurée et prête à l'utilisation";
  } else {
    message =
      '⚠️ Aucune API de traduction configurée, utilisation du dictionnaire simple uniquement';
  }

  return { deepl, google, dictionary, message };
}
