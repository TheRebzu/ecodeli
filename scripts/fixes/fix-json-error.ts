#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";

/**
 * Script pour corriger l'erreur JSON dans fr.json
 */

function fixJsonFile(filePath: string): boolean {
  try {
    console.log(`🔧 Correction du fichier JSON: ${filePath}`);

    let content = readFileSync(filePath, "utf-8");
    const originalContent = content;

    // Essayer de parser le JSON pour identifier l'erreur
    try {
      JSON.parse(content);
      console.log("✅ Le fichier JSON est déjà valide");
      return true;
    } catch (error: any) {
      console.log(`❌ Erreur JSON détectée: ${error.message}`);

      // Extraire la position de l'erreur
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        console.log(`📍 Position de l'erreur: ${position}`);

        // Examiner le contexte autour de l'erreur
        const start = Math.max(0, position - 50);
        const end = Math.min(content.length, position + 50);
        const context = content.substring(start, end);
        console.log(`🔍 Contexte autour de l'erreur:`);
        console.log(context);

        // Corrections communes
        // 1. Virgule en trop à la fin d'un objet
        content = content.replace(/,(\s*})/g, "$1");

        // 2. Virgule en trop à la fin d'un tableau
        content = content.replace(/,(\s*])/g, "$1");

        // 3. Guillemets non fermés
        content = content.replace(/([^\\])"([^"]*?)$/gm, '$1"$2"');

        // 4. Caractères de contrôle invalides
        content = content.replace(/[\x00-\x1F\x7F]/g, "");

        // Essayer de parser à nouveau
        try {
          JSON.parse(content);
          console.log("✅ Erreur JSON corrigée avec succès");

          if (content !== originalContent) {
            writeFileSync(filePath, content, "utf-8");
            console.log("💾 Fichier sauvegardé");
            return true;
          }
        } catch (secondError: any) {
          console.log(
            `❌ Impossible de corriger automatiquement: ${secondError.message}`,
          );

          // Tentative de correction manuelle pour les cas spécifiques
          const lines = content.split("\n");
          const errorLine = Math.floor(position / 80); // Estimation approximative

          console.log(`🔍 Ligne approximative de l'erreur: ${errorLine}`);
          if (errorLine < lines.length) {
            console.log(`Contenu de la ligne: ${lines[errorLine]}`);
          }

          return false;
        }
      }
    }

    return false;
  } catch (error) {
    console.error(`❌ Erreur lors de la correction: ${error}`);
    return false;
  }
}

async function main() {
  console.log("🔧 Correction des erreurs JSON...\n");

  const jsonFiles = [
    "src/messages/fr.json",
    "src/messages/en.json",
    "src/messages/es.json",
    "src/messages/de.json",
    "src/messages/it.json",
  ];

  let totalFixed = 0;

  for (const file of jsonFiles) {
    try {
      const fixed = fixJsonFile(file);
      if (fixed) {
        totalFixed++;
      }
    } catch (error) {
      console.log(`⚠️ Impossible de traiter ${file}: ${error}`);
    }
    console.log(""); // Ligne vide entre les fichiers
  }

  console.log(`📊 RÉSUMÉ:`);
  console.log(`✅ Fichiers corrigés: ${totalFixed}`);
  console.log(`📁 Fichiers traités: ${jsonFiles.length}`);

  if (totalFixed > 0) {
    console.log(
      '\n💡 Exécutez "pnpm run build" pour vérifier que les erreurs sont corrigées.',
    );
  }
}

// Vérifier si le script est exécuté directement
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main().catch(console.error);
}

export { fixJsonFile };
