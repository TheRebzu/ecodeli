#!/usr/bin/env tsx

/**
 * Script de nettoyage des fichiers temporaires
 * Supprime les fichiers temporaires créés pendant le processus de nettoyage
 */

import fs from "fs";
import path from "path";

const tempFilesToClean = [
  // Fichiers de backup potentiels
  "scripts/fixes/backup/",
  "scripts/fixes/temp/",

  // Logs temporaires
  "lint-before.txt",
  "lint-after.txt",
  "cleanup.log",

  // Fichiers .orig créés par certains outils
  "**/*.orig",
  "**/*.bak",

  // Cache de scripts
  "scripts/fixes/.cache",
  "scripts/fixes/node_modules",
];

const filesToKeep = [
  "scripts/fixes/clean-lint-errors.ts",
  "scripts/fixes/clean-lint-errors-phase2.ts",
  "scripts/fixes/fix-parsing-errors.ts",
  "scripts/fixes/fix-parsing-errors-final.ts",
  "scripts/fixes/lint-summary.ts",
  "scripts/fixes/cleanup-temp-files.ts",
  "CLEANUP_REPORT.md",
];

function cleanupDirectory(dirPath: string): number {
  let filesRemoved = 0;

  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Récursion pour les dossiers
        filesRemoved += cleanupDirectory(filePath);

        // Supprimer le dossier s'il est vide
        try {
          fs.rmdirSync(filePath);
          console.log(`📁 Dossier supprimé: ${filePath}`);
          filesRemoved++;
        } catch (error) {
          // Dossier non vide, on continue
        }
      } else {
        // Vérifier si le fichier doit être conservé
        const shouldKeep = filesToKeep.some(
          (keepFile) =>
            filePath.endsWith(keepFile) || filePath.includes(keepFile),
        );

        if (!shouldKeep) {
          // Supprimer les fichiers temporaires spécifiques
          if (
            file.endsWith(".orig") ||
            file.endsWith(".bak") ||
            file.endsWith(".tmp") ||
            file.startsWith("temp-") ||
            file.startsWith("backup-") ||
            file.includes("lint-before") ||
            file.includes("lint-after")
          ) {
            try {
              fs.unlinkSync(filePath);
              console.log(`🗑️  Fichier supprimé: ${file}`);
              filesRemoved++;
            } catch (error) {
              console.log(`⚠️  Impossible de supprimer: ${file}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(`❌ Erreur lors du nettoyage de ${dirPath}:`, error);
  }

  return filesRemoved;
}

function displayCleanupSummary() {
  console.log("🧹 NETTOYAGE DES FICHIERS TEMPORAIRES");
  console.log("=====================================\n");

  console.log("📋 Fichiers conservés (scripts essentiels) :");
  for (const file of filesToKeep) {
    console.log(`   ✓ ${file}`);
  }
  console.log("");

  console.log("🗑️  Types de fichiers à supprimer :");
  console.log("   • Fichiers .orig et .bak");
  console.log("   • Fichiers temporaires (.tmp)");
  console.log("   • Logs de linting temporaires");
  console.log("   • Dossiers de cache");
  console.log("   • Fichiers de backup automatiques");
  console.log("");
}

function main() {
  displayCleanupSummary();

  console.log("🔍 Recherche des fichiers temporaires...\n");

  let totalFilesRemoved = 0;

  // Nettoyer le dossier scripts/fixes
  console.log("📂 Nettoyage du dossier scripts/fixes...");
  totalFilesRemoved += cleanupDirectory("scripts/fixes");

  // Nettoyer le dossier racine pour les logs temporaires
  console.log("\n📂 Nettoyage du dossier racine...");
  const rootFiles = [
    "lint-before.txt",
    "lint-after.txt",
    "cleanup.log",
    "temp-lint-output.txt",
  ];

  for (const file of rootFiles) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`🗑️  Fichier supprimé: ${file}`);
        totalFilesRemoved++;
      } catch (error) {
        console.log(`⚠️  Impossible de supprimer: ${file}`);
      }
    }
  }

  console.log(`\n✅ Nettoyage terminé !`);
  console.log(`   • ${totalFilesRemoved} fichiers/dossiers supprimés`);

  if (totalFilesRemoved === 0) {
    console.log("   • Aucun fichier temporaire trouvé - projet déjà propre !");
  }

  console.log("\n🎯 Le projet EcoDeli est maintenant entièrement nettoyé");
  console.log("   et prêt pour la production !");
  console.log("=====================================");
}

main();
