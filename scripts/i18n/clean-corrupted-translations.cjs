#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🧹 Nettoyage des fichiers de traduction corrompus...");

const messagesDir = path.join(process.cwd(), "src/messages");
const languages = ["en", "es", "de", "it"];

// Sauvegarder les fichiers originaux
console.log("💾 Sauvegarde des fichiers corrompus...");
languages.forEach((lang) => {
  const filePath = path.join(messagesDir, `${lang}.json`);
  const backupPath = path.join(messagesDir, `${lang}.json.corrupted.backup`);

  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Sauvegardé: ${lang}.json -> ${lang}.json.corrupted.backup`);
  }
});

// Restaurer les fichiers depuis git (version propre)
console.log("🔄 Restauration depuis git...");
const { execSync } = require("child_process");

try {
  // Récupérer la version propre depuis git
  execSync(
    "git checkout HEAD -- src/messages/en.json src/messages/es.json src/messages/de.json src/messages/it.json",
    {
      stdio: "pipe",
    },
  );
  console.log("✅ Fichiers restaurés depuis git");
} catch (error) {
  console.log(
    "⚠️  Impossible de restaurer depuis git, création de fichiers propres...",
  );

  // Créer des fichiers propres de base
  const baseTranslations = {
    en: {
      HomePage: {
        title: "Welcome to EcoDeli",
        subtitle: "Your eco-friendly delivery platform",
        about: "About",
      },
      Common: {
        metaTitle: "EcoDeli - Eco-friendly Delivery Platform",
        metaDescription:
          "Professional delivery platform focused on sustainability",
        pageTitle: "Page Title",
        pageDescription: "Page Description",
        welcome: "Welcome",
        connectToAccount: "Connect to your account",
        createAccount: "Create Account",
        enterDetails: "Enter your details",
      },
    },
    es: {
      HomePage: {
        title: "Bienvenido a EcoDeli",
        subtitle: "Tu plataforma de entrega ecológica",
        about: "Acerca de",
      },
      Common: {
        metaTitle: "EcoDeli - Plataforma de Entrega Ecológica",
        metaDescription:
          "Plataforma de entrega profesional enfocada en sostenibilidad",
        pageTitle: "Título de Página",
        pageDescription: "Descripción de Página",
        welcome: "Bienvenido",
        connectToAccount: "Conecta a tu cuenta",
        createAccount: "Crear Cuenta",
        enterDetails: "Ingresa tus detalles",
      },
    },
    de: {
      HomePage: {
        title: "Willkommen bei EcoDeli",
        subtitle: "Ihre umweltfreundliche Lieferplattform",
        about: "Über uns",
      },
      Common: {
        metaTitle: "EcoDeli - Umweltfreundliche Lieferplattform",
        metaDescription:
          "Professionelle Lieferplattform mit Fokus auf Nachhaltigkeit",
        pageTitle: "Seitentitel",
        pageDescription: "Seitenbeschreibung",
        welcome: "Willkommen",
        connectToAccount: "Mit Ihrem Konto verbinden",
        createAccount: "Konto erstellen",
        enterDetails: "Geben Sie Ihre Daten ein",
      },
    },
    it: {
      HomePage: {
        title: "Benvenuto su EcoDeli",
        subtitle: "La tua piattaforma di consegna ecologica",
        about: "Chi siamo",
      },
      Common: {
        metaTitle: "EcoDeli - Piattaforma di Consegna Ecologica",
        metaDescription:
          "Piattaforma di consegna professionale focalizzata sulla sostenibilità",
        pageTitle: "Titolo Pagina",
        pageDescription: "Descrizione Pagina",
        welcome: "Benvenuto",
        connectToAccount: "Connetti al tuo account",
        createAccount: "Crea Account",
        enterDetails: "Inserisci i tuoi dettagli",
      },
    },
  };

  languages.forEach((lang) => {
    const filePath = path.join(messagesDir, `${lang}.json`);
    fs.writeFileSync(filePath, JSON.stringify(baseTranslations[lang], null, 2));
    console.log(`✅ Créé fichier propre: ${lang}.json`);
  });
}

console.log("✨ Nettoyage terminé!");
console.log("📋 Prochaines étapes:");
console.log("   1. Lancer: pnpm i18n:smart");
console.log("   2. Configurer API de traduction");
console.log("   3. Lancer: pnpm i18n:smart-translate");
