#!/usr/bin/env node
/**
 * Script de rollback de la fragmentation du schéma Prisma
 *
 * Ce script annule la migration vers le schéma fragmenté et
 * permet de revenir au schéma monolithique précédent.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";
import { globSync } from "glob";

// Configuration
const ROOT_DIR = process.cwd();
const BACKUP_DIR = path.join(ROOT_DIR, "prisma/backups");
const SCHEMA_PATH = path.join(ROOT_DIR, "prisma/schema.prisma");
const SCHEMAS_DIR = path.join(ROOT_DIR, "prisma/schemas");

// Fonction principale
async function main() {
  console.log(chalk.yellow("🔄 Rollback de la fragmentation du schéma Prisma"));
  console.log(chalk.gray("=============================================="));

  try {
    // 1. Trouver le dernier backup de schéma
    const latestBackup = await findLatestSchemaBackup();
    if (!latestBackup) {
      throw new Error(
        "Aucun backup de schéma trouvé. Impossible de procéder au rollback.",
      );
    }

    // 2. Confirmer le rollback
    await confirmRollback(latestBackup);

    // 3. Restaurer le schéma depuis le backup
    await restoreSchema(latestBackup);

    // 4. Sauvegarder les fragments actuels (au cas où)
    await backupCurrentFragments();

    // 5. Régénérer le client Prisma
    await regeneratePrismaClient();

    // 6. Vérifier le schéma restauré
    await validateRestoredSchema();

    console.log(chalk.green("\n✅ Rollback effectué avec succès !"));
    console.log(
      chalk.gray(
        "Les fragments de schéma ont été conservés dans le répertoire des backups.",
      ),
    );
  } catch (error) {
    console.error(chalk.red("\n❌ Erreur durant le rollback:"), error);
    console.log(
      chalk.red(
        "⚠️ Le rollback a échoué. Une intervention manuelle peut être nécessaire.",
      ),
    );
    process.exit(1);
  }
}

// Trouver le dernier backup de schéma
async function findLatestSchemaBackup(): Promise<string | null> {
  console.log(chalk.gray("🔍 Recherche du dernier backup de schéma..."));

  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(chalk.yellow("  ⚠️ Répertoire de backup inexistant."));
    return null;
  }

  const backupFiles = globSync(path.join(BACKUP_DIR, "schema_backup_*.prisma"));

  if (backupFiles.length === 0) {
    console.log(chalk.yellow("  ⚠️ Aucun fichier de backup trouvé."));
    return null;
  }

  // Trier les fichiers par date de modification (le plus récent en premier)
  backupFiles.sort((a: string, b: string) => {
    const statA = fs.statSync(a);
    const statB = fs.statSync(b);
    return statB.mtime.getTime() - statA.mtime.getTime();
  });

  const latestBackup = backupFiles[0];
  console.log(
    chalk.green(
      `  ✅ Dernier backup trouvé: ${path.relative(ROOT_DIR, latestBackup)}`,
    ),
  );

  return latestBackup;
}

// Confirmer le rollback
async function confirmRollback(backupFile: string): Promise<void> {
  console.log(
    chalk.yellow(
      "⚠️ Vous êtes sur le point d'annuler la fragmentation du schéma Prisma.",
    ),
  );
  console.log(
    chalk.yellow(
      "   Cette opération va restaurer le schéma monolithique précédent.",
    ),
  );
  console.log(
    chalk.gray(
      `   Le schéma sera restauré depuis: ${path.relative(ROOT_DIR, backupFile)}`,
    ),
  );

  // Utiliser un import dynamique au lieu de require
  const readline = await import("readline").then((module) =>
    module.default.createInterface({
      input: process.stdin,
      output: process.stdout,
    }),
  );

  return new Promise<void>((resolve, reject) => {
    readline.question(
      chalk.yellow("   Confirmez-vous cette opération ? (y/N) "),
      (answer: string) => {
        readline.close();

        if (answer.toLowerCase() === "y") {
          console.log(chalk.gray("   Rollback confirmé."));
          resolve();
        } else {
          reject(new Error("Rollback annulé par l'utilisateur."));
        }
      },
    );
  });
}

// Restaurer le schéma depuis le backup
async function restoreSchema(backupFile: string): Promise<void> {
  console.log(chalk.gray("🔄 Restauration du schéma monolithique..."));

  // Copier le fichier de backup vers le schéma principal
  fs.copyFileSync(backupFile, SCHEMA_PATH);

  console.log(
    chalk.green(
      `  ✅ Schéma restauré depuis ${path.relative(ROOT_DIR, backupFile)}`,
    ),
  );
}

// Sauvegarder les fragments actuels
async function backupCurrentFragments(): Promise<void> {
  console.log(chalk.gray("💾 Sauvegarde des fragments actuels..."));

  if (!fs.existsSync(SCHEMAS_DIR)) {
    console.log(
      chalk.yellow(
        "  ⚠️ Répertoire des fragments inexistant. Rien à sauvegarder.",
      ),
    );
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fragmentsBackupDir = path.join(
    BACKUP_DIR,
    `fragments_backup_${timestamp}`,
  );

  // Créer le répertoire de backup pour les fragments
  fs.mkdirSync(fragmentsBackupDir, { recursive: true });

  // Copier les répertoires de fragments
  const domains = fs.readdirSync(SCHEMAS_DIR);

  for (const domain of domains) {
    const domainPath = path.join(SCHEMAS_DIR, domain);
    const domainStat = fs.statSync(domainPath);

    if (domainStat.isDirectory()) {
      const domainBackupPath = path.join(fragmentsBackupDir, domain);
      fs.mkdirSync(domainBackupPath, { recursive: true });

      // Copier les fichiers de schéma
      const schemaFiles = globSync(path.join(domainPath, "*.prisma"));

      for (const schemaFile of schemaFiles) {
        const fileName = path.basename(schemaFile);
        fs.copyFileSync(schemaFile, path.join(domainBackupPath, fileName));
      }
    }
  }

  console.log(
    chalk.green(
      `  ✅ Fragments sauvegardés dans ${path.relative(ROOT_DIR, fragmentsBackupDir)}`,
    ),
  );
}

// Régénérer le client Prisma
async function regeneratePrismaClient(): Promise<void> {
  console.log(chalk.gray("🔧 Régénération du client Prisma..."));

  try {
    execSync("prisma generate", { stdio: "inherit" });
    console.log(chalk.green("  ✅ Client Prisma régénéré avec succès"));
  } catch (error) {
    throw new Error("La régénération du client Prisma a échoué.");
  }
}

// Valider le schéma restauré
async function validateRestoredSchema(): Promise<void> {
  console.log(chalk.gray("🔍 Validation du schéma restauré..."));

  try {
    execSync("prisma validate", { stdio: "inherit" });
    console.log(chalk.green("  ✅ Schéma Prisma validé avec succès"));
  } catch (error) {
    throw new Error("La validation du schéma restauré a échoué.");
  }
}

// Exécuter le script
main().catch((err) => {
  console.error(chalk.red("❌ Erreur fatale:"), err);
  process.exit(1);
});
