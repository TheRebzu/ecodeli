#!/usr/bin/env node
/**
 * Script de migration vers le schéma Prisma fragmenté
 *
 * Ce script assure une transition sécurisée du schéma monolithique
 * vers le schéma fragmenté en réalisant les étapes suivantes :
 * 1. Sauvegarde complète du schéma et de la base de données
 * 2. Validation de l'intégrité des fragments
 * 3. Génération du schéma fusionné
 * 4. Tests de validation
 * 5. Migration en production
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";

// Configuration
const ROOT_DIR = process.cwd();
const BACKUP_DIR = path.join(ROOT_DIR, "prisma/backups");
const SCHEMA_PATH = path.join(ROOT_DIR, "prisma/schema.prisma");
const SCHEMA_BACKUP_PATH = path.join(
  BACKUP_DIR,
  `schema_backup_${getTimestamp()}.prisma`,
);
const DB_BACKUP_PATH = path.join(BACKUP_DIR, `db_backup_${getTimestamp()}.sql`);

// Fonction principale
async function main() {
  console.log(chalk.blue("🚀 Migration vers le schéma Prisma fragmenté"));
  console.log(chalk.gray("========================================="));

  try {
    // 1. Créer un répertoire de backup si nécessaire
    await createBackupDir();

    // 2. Sauvegarder le schéma actuel
    await backupCurrentSchema();

    // 3. Sauvegarder la base de données
    await backupDatabase();

    // 4. Valider l'intégrité des fragments
    await validateSchemaFragments();

    // 5. Générer le nouveau schéma
    await generateMergedSchema();

    // 6. Valider le schéma généré
    await validateGeneratedSchema();

    // 7. Exécuter les tests automatisés
    await runTests();

    // 8. Générer le client Prisma
    await generatePrismaClient();

    // 9. Vérification post-migration
    await performPostMigrationChecks();

    console.log(
      chalk.green("\n✅ Migration vers le schéma fragmenté réussie !"),
    );
    console.log(
      chalk.gray(
        "Pour annuler cette migration, exécutez : pnpm prisma:rollback-fragmentation",
      ),
    );
  } catch (error) {
    console.error(chalk.red("\n❌ Erreur durant la migration:"), error);
    console.log(chalk.yellow("\nExécution du rollback automatique..."));

    try {
      await rollbackMigration();
      console.log(chalk.yellow("✅ Rollback effectué avec succès."));
    } catch (rollbackError) {
      console.error(chalk.red("❌ Erreur durant le rollback:"), rollbackError);
      console.log(chalk.red("⚠️ Une intervention manuelle est nécessaire."));
    }

    process.exit(1);
  }
}

// Création du répertoire de backup
async function createBackupDir() {
  console.log(chalk.gray("📁 Préparation du répertoire de backup..."));

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  console.log(chalk.green("  ✅ Répertoire de backup prêt"));
}

// Sauvegarde du schéma actuel
async function backupCurrentSchema() {
  console.log(chalk.gray("💾 Sauvegarde du schéma Prisma actuel..."));

  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(
      `Le fichier schema.prisma est introuvable à ${SCHEMA_PATH}`,
    );
  }

  fs.copyFileSync(SCHEMA_PATH, SCHEMA_BACKUP_PATH);
  console.log(
    chalk.green(
      `  ✅ Schéma sauvegardé dans ${path.relative(ROOT_DIR, SCHEMA_BACKUP_PATH)}`,
    ),
  );
}

// Sauvegarde de la base de données
async function backupDatabase() {
  console.log(chalk.gray("💾 Sauvegarde de la base de données..."));

  try {
    // Utiliser les variables d'environnement pour la connexion
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "La variable d'environnement DATABASE_URL n'est pas définie",
      );
    }

    // Extraire les informations de connexion
    const url = new URL(databaseUrl);
    const host = url.hostname;
    const port = url.port;
    const database = url.pathname.substring(1);
    const username = url.username;

    // Créer la commande de backup selon l'environnement
    const isWindows = process.platform === "win32";

    if (isWindows) {
      // Utiliser Docker si disponible (recommandé pour Windows)
      console.log(chalk.gray("  Utilisation de Docker pour le backup..."));

      // Vérifier si Docker est disponible
      try {
        execSync("docker --version", { stdio: "ignore" });
      } catch (e) {
        throw new Error(
          "Docker n'est pas installé. Impossible de créer un backup de la base de données sur Windows",
        );
      }

      // Exécuter pg_dump via Docker
      execSync(
        `docker run --rm -v "${BACKUP_DIR}:/backup" -e PGPASSWORD="${url.password}" postgres:14 pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f /backup/${path.basename(DB_BACKUP_PATH)}`,
        { stdio: "inherit" },
      );
    } else {
      // Utiliser pg_dump directement sur Linux/macOS
      execSync(
        `PGPASSWORD="${url.password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f ${DB_BACKUP_PATH}`,
        { stdio: "inherit" },
      );
    }

    console.log(
      chalk.green(
        `  ✅ Base de données sauvegardée dans ${path.relative(ROOT_DIR, DB_BACKUP_PATH)}`,
      ),
    );
  } catch (error) {
    console.error(
      chalk.yellow("  ⚠️ Impossible de sauvegarder la base de données:"),
      error,
    );
    console.log(
      chalk.yellow(
        "  ⚠️ Continuation sans sauvegarde de la base. Assurez-vous d'avoir un backup récent.",
      ),
    );
  }
}

// Validation des fragments de schéma
async function validateSchemaFragments() {
  console.log(chalk.gray("🔍 Validation des fragments de schéma..."));

  try {
    execSync("pnpm db:schema:validate", { stdio: "inherit" });
    console.log(chalk.green("  ✅ Fragments de schéma validés avec succès"));
  } catch (error) {
    throw new Error(
      "La validation des fragments a échoué. Corrigez les erreurs avant de continuer.",
    );
  }
}

// Génération du schéma fusionné
async function generateMergedSchema() {
  console.log(chalk.gray("🔄 Génération du schéma fusionné..."));

  try {
    execSync("pnpm db:schema:build", { stdio: "inherit" });
    console.log(chalk.green("  ✅ Schéma fusionné généré avec succès"));
  } catch (error) {
    throw new Error("La génération du schéma fusionné a échoué.");
  }
}

// Validation du schéma généré
async function validateGeneratedSchema() {
  console.log(chalk.gray("🔍 Validation du schéma généré..."));

  try {
    execSync("prisma validate", { stdio: "inherit" });
    console.log(chalk.green("  ✅ Schéma Prisma validé avec succès"));
  } catch (error) {
    throw new Error("La validation du schéma généré a échoué.");
  }
}

// Exécution des tests automatisés
async function runTests() {
  console.log(chalk.gray("🧪 Exécution des tests automatisés..."));

  try {
    // Exécuter directement le script de validation Node.js au lieu de vitest
    execSync("node -r tsx/cjs tests/schemas/fragmentation.test.ts", {
      stdio: "inherit",
    });
    console.log(chalk.green("  ✅ Tests réussis"));
  } catch (error) {
    console.log(
      chalk.yellow("  ⚠️ Certains tests ont échoué. Vérifiez les résultats."),
    );

    // Demander confirmation pour continuer
    const readline = await import("readline").then((module) =>
      module.default.createInterface({
        input: process.stdin,
        output: process.stdout,
      }),
    );

    return new Promise<void>((resolve, reject) => {
      readline.question(
        chalk.yellow(
          "  ⚠️ Voulez-vous continuer malgré les erreurs de test ? (y/N) ",
        ),
        (answer: string) => {
          readline.close();

          if (answer.toLowerCase() === "y") {
            console.log(
              chalk.yellow("  ⚠️ Continuation avec les erreurs de test..."),
            );
            resolve();
          } else {
            reject(
              new Error("Migration interrompue en raison d'échecs de test."),
            );
          }
        },
      );
    });
  }
}

// Génération du client Prisma
async function generatePrismaClient() {
  console.log(chalk.gray("🔧 Génération du client Prisma..."));

  try {
    execSync("prisma generate", { stdio: "inherit" });
    console.log(chalk.green("  ✅ Client Prisma généré avec succès"));
  } catch (error) {
    throw new Error("La génération du client Prisma a échoué.");
  }
}

// Vérification post-migration
async function performPostMigrationChecks() {
  console.log(chalk.gray("🔍 Vérifications post-migration..."));

  // 1. Vérifier que le schéma fusionné est bien formé
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error("Le fichier schema.prisma n'a pas été généré correctement");
  }

  const schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8");
  if (
    !schemaContent.includes("generator client") ||
    !schemaContent.includes("datasource db")
  ) {
    throw new Error(
      "Le schéma généré est incomplet. Vérifiez le contenu du fichier.",
    );
  }

  // 2. Vérifier que les scripts package.json sont à jour
  const packageJsonPath = path.join(ROOT_DIR, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  const requiredScripts = [
    "db:schema:build",
    "db:schema:validate",
    "db:generate",
  ];

  for (const script of requiredScripts) {
    if (!packageJson.scripts[script]) {
      console.log(
        chalk.yellow(
          `  ⚠️ Le script '${script}' est manquant dans package.json`,
        ),
      );
    }
  }

  console.log(chalk.green("  ✅ Vérifications post-migration terminées"));
}

// Rollback de la migration
async function rollbackMigration() {
  console.log(chalk.gray("🔄 Rollback de la migration..."));

  // Restaurer le schéma d'origine s'il existe
  if (fs.existsSync(SCHEMA_BACKUP_PATH)) {
    fs.copyFileSync(SCHEMA_BACKUP_PATH, SCHEMA_PATH);
    console.log(
      chalk.green(
        `  ✅ Schéma d'origine restauré depuis ${path.relative(ROOT_DIR, SCHEMA_BACKUP_PATH)}`,
      ),
    );

    // Régénérer le client Prisma
    execSync("prisma generate", { stdio: "inherit" });
  } else {
    throw new Error(
      "Impossible de trouver le backup du schéma pour le rollback",
    );
  }
}

// Utilitaire pour obtenir un timestamp formaté
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

// Exécuter le script
main().catch((err) => {
  console.error(chalk.red("❌ Erreur fatale:"), err);
  process.exit(1);
});
