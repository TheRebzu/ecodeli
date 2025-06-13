#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔧 Reconstruction des fichiers de traduction propres...");

const messagesDir = path.join(process.cwd(), "src/messages");

// Lire le fichier français (source de vérité)
const frPath = path.join(messagesDir, "fr.json");
const frContent = JSON.parse(fs.readFileSync(frPath, "utf8"));

console.log("📖 Fichier français lu avec succès");

// Fonction pour créer un fichier de traduction vide avec structure française
function createEmptyTranslationFile(sourceObj, targetLang) {
  function processValue(value, key) {
    if (typeof value === "string") {
      // Pour les clés critiques, fournir des traductions de base
      const criticalTranslations = {
        en: {
          metaTitle: "EcoDeli - Eco-friendly Delivery Platform",
          metaDescription:
            "Professional delivery platform focused on sustainability",
          pageTitle: "Page Title",
          pageDescription: "Page Description",
          welcome: "Welcome",
          connectToAccount: "Connect to your account",
          createAccount: "Create Account",
          enterDetails: "Enter your details",
          title: "Title",
          description: "Description",
          about: "About",
        },
        es: {
          metaTitle: "EcoDeli - Plataforma de Entrega Ecológica",
          metaDescription:
            "Plataforma de entrega profesional enfocada en sostenibilidad",
          pageTitle: "Título de Página",
          pageDescription: "Descripción de Página",
          welcome: "Bienvenido",
          connectToAccount: "Conecta a tu cuenta",
          createAccount: "Crear Cuenta",
          enterDetails: "Ingresa tus detalles",
          title: "Título",
          description: "Descripción",
          about: "Acerca de",
        },
        de: {
          metaTitle: "EcoDeli - Umweltfreundliche Lieferplattform",
          metaDescription:
            "Professionelle Lieferplattform mit Fokus auf Nachhaltigkeit",
          pageTitle: "Seitentitel",
          pageDescription: "Seitenbeschreibung",
          welcome: "Willkommen",
          connectToAccount: "Mit Ihrem Konto verbinden",
          createAccount: "Konto erstellen",
          enterDetails: "Geben Sie Ihre Daten ein",
          title: "Titel",
          description: "Beschreibung",
          about: "Über uns",
        },
        it: {
          metaTitle: "EcoDeli - Piattaforma di Consegna Ecologica",
          metaDescription:
            "Piattaforma di consegna professionale focalizzata sulla sostenibilità",
          pageTitle: "Titolo Pagina",
          pageDescription: "Descrizione Pagina",
          welcome: "Benvenuto",
          connectToAccount: "Connetti al tuo account",
          createAccount: "Crea Account",
          enterDetails: "Inserisci i tuoi dettagli",
          title: "Titolo",
          description: "Descrizione",
          about: "Chi siamo",
        },
      };

      // Chercher une traduction critique
      if (
        criticalTranslations[targetLang] &&
        criticalTranslations[targetLang][key]
      ) {
        return criticalTranslations[targetLang][key];
      }

      // Pour les autres, marquer comme à traduire
      return `[${targetLang.toUpperCase()}] ${value}`;
    } else if (typeof value === "object" && value !== null) {
      const result = {};
      for (const [subKey, subValue] of Object.entries(value)) {
        result[subKey] = processValue(subValue, subKey);
      }
      return result;
    }
    return value;
  }

  return processValue(sourceObj);
}

// Créer les fichiers de traduction propres
const languages = ["en", "es", "de", "it"];

languages.forEach((lang) => {
  console.log(`🔄 Création du fichier ${lang}.json propre...`);

  const cleanTranslations = createEmptyTranslationFile(frContent, lang);
  const filePath = path.join(messagesDir, `${lang}.json`);

  fs.writeFileSync(filePath, JSON.stringify(cleanTranslations, null, 2));
  console.log(`✅ Fichier ${lang}.json créé proprement`);
});

console.log("✨ Reconstruction terminée!");

// Statistiques
languages.forEach((lang) => {
  const filePath = path.join(messagesDir, `${lang}.json`);
  const content = fs.readFileSync(filePath, "utf8");

  const toTranslateCount = (
    content.match(new RegExp(`\\[${lang.toUpperCase()}\\]`, "g")) || []
  ).length;
  const totalLines = content.split("\n").length;

  console.log(
    `📊 ${lang.toUpperCase()}: ${toTranslateCount} clés à traduire sur ~${totalLines} lignes`,
  );
});

console.log("");
console.log("🎯 Prochaines étapes:");
console.log("   1. Lancer: pnpm i18n:smart (pour analyser)");
console.log("   2. Configurer DEEPL_API_KEY dans .env");
console.log("   3. Lancer: pnpm i18n:smart-translate");
