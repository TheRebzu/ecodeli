#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
require("dotenv").config();

// Configuration
const CONFIG = {
  messagesDir: path.resolve(__dirname, "../../src/messages"),
  masterFileName: "master-translations.json",
  apiKeys: {
    deepl: process.env.DEEPL_API_KEY,
    google: process.env.GOOGLE_TRANSLATE_API_KEY,
  },
  apiUrls: {
    deepl: "https://api-free.deepl.com/v2/translate",
    google: "https://translation.googleapis.com/language/translate/v2",
  },
  requestDelay: 1000, // 1 seconde entre les requêtes
  chunkSize: 1000, // Taille max par requête
};

// Dictionnaire simple français -> autres langues
const SIMPLE_DICTIONARY = {
  "fr-en": {
    accueil: "home",
    connexion: "login",
    déconnexion: "logout",
    inscription: "register",
    profil: "profile",
    paramètres: "settings",
    utilisateur: "user",
    utilisateurs: "users",
    client: "client",
    livreur: "deliverer",
    commerçant: "merchant",
    prestataire: "provider",
    admin: "admin",
    produit: "product",
    service: "service",
    commande: "order",
    livraison: "delivery",
    paiement: "payment",
    facture: "invoice",
    notification: "notification",
    message: "message",
    annonce: "announcement",
    contrat: "contract",
    document: "document",
    entrepôt: "warehouse",
    catégorie: "category",
    recherche: "search",
    résultat: "result",
    détail: "detail",
    erreur: "error",
    succès: "success",
    confirmation: "confirmation",
    création: "creation",
    modification: "modification",
    suppression: "deletion",
    sauvegarde: "save",
    chargement: "loading",
    formulaire: "form",
    bouton: "button",
    menu: "menu",
    page: "page",
    titre: "title",
    description: "description",
    contenu: "content",
    liste: "list",
    tableau: "table",
    date: "date",
    heure: "time",
    jour: "day",
    semaine: "week",
    mois: "month",
    année: "year",
    "aujourd'hui": "today",
    demain: "tomorrow",
    hier: "yesterday",
    oui: "yes",
    non: "no",
    nouveau: "new",
    ancien: "old",
    actif: "active",
    inactif: "inactive",
    disponible: "available",
    nom: "name",
    email: "email",
    téléphone: "phone",
    adresse: "address",
    confirmer: "confirm",
    annuler: "cancel",
    supprimer: "delete",
    modifier: "edit",
    ajouter: "add",
    créer: "create",
    enregistrer: "save",
    valider: "validate",
    suivant: "next",
    précédent: "previous",
    premier: "first",
    dernier: "last",
    plus: "more",
    moins: "less",
    tous: "all",
    aucun: "none",
    bienvenue: "welcome",
    bonjour: "hello",
    merci: "thank you",
    important: "important",
  },
  "fr-es": {
    accueil: "inicio",
    connexion: "conexión",
    déconnexion: "desconexión",
    inscription: "registro",
    profil: "perfil",
    paramètres: "configuración",
    utilisateur: "usuario",
    client: "cliente",
    livreur: "repartidor",
    commerçant: "comerciante",
    prestataire: "proveedor",
    admin: "admin",
    produit: "producto",
    service: "servicio",
    commande: "pedido",
    livraison: "entrega",
    paiement: "pago",
    facture: "factura",
    notification: "notificación",
    message: "mensaje",
    annonce: "anuncio",
    contrat: "contrato",
    document: "documento",
    entrepôt: "almacén",
    catégorie: "categoría",
    recherche: "búsqueda",
    résultat: "resultado",
    erreur: "error",
    succès: "éxito",
    oui: "sí",
    non: "no",
    nouveau: "nuevo",
    actif: "activo",
    nom: "nombre",
    email: "email",
    adresse: "dirección",
    confirmer: "confirmar",
    annuler: "cancelar",
    supprimer: "eliminar",
    modifier: "modificar",
    ajouter: "añadir",
    créer: "crear",
    enregistrer: "guardar",
    suivant: "siguiente",
    précédent: "anterior",
    bienvenue: "bienvenido",
    merci: "gracias",
  },
  "fr-de": {
    accueil: "startseite",
    connexion: "anmeldung",
    déconnexion: "abmeldung",
    inscription: "registrierung",
    profil: "profil",
    paramètres: "einstellungen",
    utilisateur: "benutzer",
    client: "kunde",
    livreur: "lieferant",
    admin: "admin",
    produit: "produkt",
    service: "service",
    commande: "bestellung",
    livraison: "lieferung",
    paiement: "zahlung",
    facture: "rechnung",
    message: "nachricht",
    document: "dokument",
    catégorie: "kategorie",
    recherche: "suche",
    erreur: "fehler",
    succès: "erfolg",
    oui: "ja",
    non: "nein",
    nouveau: "neu",
    nom: "name",
    email: "email",
    adresse: "adresse",
    confirmer: "bestätigen",
    annuler: "abbrechen",
    supprimer: "löschen",
    modifier: "bearbeiten",
    ajouter: "hinzufügen",
    créer: "erstellen",
    enregistrer: "speichern",
    suivant: "weiter",
    précédent: "zurück",
    bienvenue: "willkommen",
    merci: "danke",
  },
  "fr-it": {
    accueil: "home",
    connexion: "accesso",
    déconnexion: "disconnessione",
    inscription: "registrazione",
    profil: "profilo",
    paramètres: "impostazioni",
    utilisateur: "utente",
    client: "cliente",
    livreur: "corriere",
    admin: "admin",
    produit: "prodotto",
    service: "servizio",
    commande: "ordine",
    livraison: "consegna",
    paiement: "pagamento",
    facture: "fattura",
    message: "messaggio",
    document: "documento",
    catégorie: "categoria",
    recherche: "ricerca",
    erreur: "errore",
    succès: "successo",
    oui: "sì",
    non: "no",
    nouveau: "nuovo",
    nom: "nome",
    email: "email",
    adresse: "indirizzo",
    confirmer: "confermare",
    annuler: "annullare",
    supprimer: "eliminare",
    modifier: "modificare",
    ajouter: "aggiungere",
    créer: "creare",
    enregistrer: "salvare",
    suivant: "successivo",
    précédent: "precedente",
    bienvenue: "benvenuto",
    merci: "grazie",
  },
};

const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  progress: (msg) => console.log(`🔄 ${msg}`),
};

/**
 * Délai entre les requêtes
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Traduction avec DeepL
 */
async function translateWithDeepL(text, targetLang) {
  if (!CONFIG.apiKeys.deepl) {
    throw new Error("Clé API DeepL non configurée");
  }

  const langMap = {
    en: "EN",
    es: "ES",
    de: "DE",
    it: "IT",
  };

  try {
    const response = await fetch(CONFIG.apiUrls.deepl, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${CONFIG.apiKeys.deepl}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [text],
        source_lang: "FR",
        target_lang: langMap[targetLang] || targetLang.toUpperCase(),
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data = await response.json();
    return data.translations?.[0]?.text || text;
  } catch (error) {
    logger.error(`DeepL error: ${error.message}`);
    throw error;
  }
}

/**
 * Traduction avec Google Translate
 */
async function translateWithGoogle(text, targetLang) {
  if (!CONFIG.apiKeys.google) {
    throw new Error("Clé API Google non configurée");
  }

  try {
    const response = await fetch(
      `${CONFIG.apiUrls.google}?key=${CONFIG.apiKeys.google}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          source: "fr",
          target: targetLang,
          format: "text",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data?.translations?.[0]?.translatedText || text;
  } catch (error) {
    logger.error(`Google error: ${error.message}`);
    throw error;
  }
}

/**
 * Traduction avec dictionnaire simple
 */
function translateWithDictionary(text, targetLang) {
  const dictKey = `fr-${targetLang}`;
  const dict = SIMPLE_DICTIONARY[dictKey];

  if (!dict) {
    logger.warning(`Dictionnaire non disponible pour ${dictKey}`);
    return text;
  }

  let translated = text.toLowerCase();

  // Remplacer les mots entiers
  for (const [french, target] of Object.entries(dict)) {
    const regex = new RegExp(`\\b${french}\\b`, "gi");
    translated = translated.replace(regex, target);
  }

  return translated;
}

/**
 * Traduit un texte vers une langue cible
 */
async function translateText(text, targetLang) {
  if (!text || text.trim() === "") return text;

  // Nettoyer le texte
  const cleanText = text.replace(/\[TO_TRANSLATE\]\s*/g, "").trim();

  try {
    // Essayer DeepL en premier
    if (CONFIG.apiKeys.deepl) {
      logger.progress(
        `Traduction avec DeepL: "${cleanText.substring(0, 50)}..." vers ${targetLang}`,
      );
      const result = await translateWithDeepL(cleanText, targetLang);
      await delay(CONFIG.requestDelay);
      return result;
    }

    // Sinon Google
    if (CONFIG.apiKeys.google) {
      logger.progress(
        `Traduction avec Google: "${cleanText.substring(0, 50)}..." vers ${targetLang}`,
      );
      const result = await translateWithGoogle(cleanText, targetLang);
      await delay(CONFIG.requestDelay);
      return result;
    }

    // Sinon dictionnaire
    logger.warning("Aucune API configurée, utilisation du dictionnaire");
    return translateWithDictionary(cleanText, targetLang);
  } catch (error) {
    logger.error(`Erreur de traduction: ${error.message}`);
    // Fallback vers dictionnaire
    return translateWithDictionary(cleanText, targetLang);
  }
}

/**
 * Traduit toutes les entrées manquantes dans le fichier maître
 */
async function translateMasterFile() {
  const masterPath = path.join(CONFIG.messagesDir, CONFIG.masterFileName);

  try {
    // Charger le fichier maître
    const content = await fs.readFile(masterPath, "utf-8");
    const masterData = JSON.parse(content);

    if (!masterData.translations) {
      logger.error("Fichier maître invalide - pas de section translations");
      return;
    }

    // Statistiques
    let totalProcessed = 0;
    let totalTranslated = 0;
    const stats = {};

    // Pour chaque langue cible
    const targetLanguages = masterData._metadata?.targetLanguages || [
      "en",
      "es",
      "de",
      "it",
    ];

    for (const lang of targetLanguages) {
      logger.progress(`\n🌐 Traduction vers ${lang.toUpperCase()}...`);
      stats[lang] = { processed: 0, translated: 0, skipped: 0 };

      // Pour chaque clé de traduction
      for (const [key, entry] of Object.entries(masterData.translations)) {
        if (
          !entry.translations[lang] ||
          !entry.translations[lang].text ||
          entry.translations[lang].status === "needs_translation"
        ) {
          try {
            logger.progress(`Traduction de "${key}": "${entry.sourceText}"`);

            const translatedText = await translateText(entry.sourceText, lang);

            // Mettre à jour l'entrée
            if (!entry.translations[lang]) {
              entry.translations[lang] = {};
            }

            entry.translations[lang].text = translatedText;
            entry.translations[lang].status = "translated";
            entry.translations[lang].lastUpdated = new Date().toISOString();
            entry.translations[lang].method = CONFIG.apiKeys.deepl
              ? "deepl"
              : CONFIG.apiKeys.google
                ? "google"
                : "dictionary";

            stats[lang].translated++;
            totalTranslated++;
          } catch (error) {
            logger.error(
              `Erreur lors de la traduction de "${key}": ${error.message}`,
            );
            stats[lang].skipped++;
          }
        } else {
          stats[lang].skipped++;
        }

        stats[lang].processed++;
        totalProcessed++;
      }

      logger.success(
        `${lang.toUpperCase()}: ${stats[lang].translated} nouvelles traductions, ${stats[lang].skipped} ignorées`,
      );
    }

    // Mettre à jour les métadonnées
    masterData._metadata.lastTranslation = new Date().toISOString();
    masterData._metadata.translationStats = stats;

    // Sauvegarder le fichier maître mis à jour
    await fs.writeFile(
      masterPath,
      JSON.stringify(masterData, null, 2),
      "utf-8",
    );

    logger.success(
      `\n✨ Traduction terminée: ${totalTranslated} nouvelles traductions sur ${totalProcessed} entrées`,
    );

    return masterData;
  } catch (error) {
    logger.error(`Erreur lors de la traduction: ${error.message}`);
    throw error;
  }
}

/**
 * Régénère tous les fichiers de langue après traduction
 */
async function regenerateLanguageFiles(masterData) {
  logger.progress("Régénération des fichiers de langue...");

  // Génération du fichier source (français)
  const sourceTranslations = {};
  for (const [key, entry] of Object.entries(masterData.translations)) {
    setDeepValue(sourceTranslations, key, entry.sourceText);
  }

  const sourcePath = path.join(CONFIG.messagesDir, "fr.json");
  await fs.writeFile(
    sourcePath,
    JSON.stringify(sourceTranslations, null, 2),
    "utf-8",
  );
  logger.success("Fichier fr.json régénéré");

  // Génération des fichiers cibles
  const targetLanguages = masterData._metadata?.targetLanguages || [
    "en",
    "es",
    "de",
    "it",
  ];

  for (const lang of targetLanguages) {
    const langTranslations = {};
    let completedCount = 0;
    let totalCount = 0;

    for (const [key, entry] of Object.entries(masterData.translations)) {
      totalCount++;
      const translation = entry.translations[lang];

      if (
        translation &&
        translation.text &&
        translation.status === "translated"
      ) {
        setDeepValue(langTranslations, key, translation.text);
        completedCount++;
      } else {
        setDeepValue(
          langTranslations,
          key,
          `[TO_TRANSLATE] ${entry.sourceText}`,
        );
      }
    }

    const langPath = path.join(CONFIG.messagesDir, `${lang}.json`);
    await fs.writeFile(
      langPath,
      JSON.stringify(langTranslations, null, 2),
      "utf-8",
    );

    const percentage = Math.round((completedCount / totalCount) * 100);
    logger.success(
      `Fichier ${lang}.json régénéré (${completedCount}/${totalCount} - ${percentage}%)`,
    );
  }
}

/**
 * Utilitaire pour définir une valeur profonde
 */
function setDeepValue(obj, keyPath, value) {
  const keys = keyPath.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Affiche l'état des API de traduction
 */
function checkAPIs() {
  logger.info("🔍 Vérification des API de traduction...");

  if (CONFIG.apiKeys.deepl) {
    logger.success("DeepL API configurée");
  } else if (CONFIG.apiKeys.google) {
    logger.success("Google Translate API configurée");
  } else {
    logger.warning(
      "Aucune API configurée - utilisation du dictionnaire uniquement",
    );
    logger.info("Pour configurer une API:");
    logger.info("  - DeepL: ajoutez DEEPL_API_KEY à votre .env");
    logger.info("  - Google: ajoutez GOOGLE_TRANSLATE_API_KEY à votre .env");
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    logger.info("🚀 Démarrage de la traduction automatique...");

    // Vérifier les API
    checkAPIs();

    // Vérifier que le fichier maître existe
    const masterPath = path.join(CONFIG.messagesDir, CONFIG.masterFileName);
    try {
      await fs.access(masterPath);
    } catch {
      logger.error(`Fichier maître non trouvé: ${masterPath}`);
      logger.info("Exécutez d'abord: node master-translation-manager.js");
      process.exit(1);
    }

    // Lancer la traduction
    const masterData = await translateMasterFile();

    // Régénérer tous les fichiers
    await regenerateLanguageFiles(masterData);

    logger.success("✨ Traduction automatique terminée!");
    logger.info("📁 Vérifiez les fichiers dans src/messages/");
  } catch (error) {
    logger.error(`Erreur fatale: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  translateText,
  translateMasterFile,
  regenerateLanguageFiles,
};
