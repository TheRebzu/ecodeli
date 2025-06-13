#!/usr/bin/env node
/**
 * Script de fusion des schémas Prisma fragmentés
 *
 * Ce script récupère tous les fragments de schéma dans prisma/schemas/
 * et les fusionne en un seul fichier prisma/schema.prisma selon l'ordre
 * logique des dépendances entre domaines.
 */

import fs from "fs";
import path from "path";
import chalk from "chalk";
import { globSync } from "glob";

// Configuration
const SCHEMAS_DIR = path.resolve(process.cwd(), "prisma/schemas");
const OUTPUT_SCHEMA = path.resolve(process.cwd(), "prisma/schema.prisma");

// Ordre de chargement des domaines (du moins dépendant au plus dépendant)
const DOMAIN_ORDER = [
  "shared", // Enums partagés (dépendance zéro)
  "users", // Modèles utilisateur (dépendance fondamentale)
  "deliveries", // Dépend de users
  "services", // Dépend de users
  "appointments", // Dépend de users et services
  "storage", // Dépend de users
  "payments", // Dépend de users, deliveries, services, storage
  "billing", // Dépend de payments et users
  "admin", // Dépend de tous les autres domaines
  "messages", // Dépend de users pour les relations de messagerie
];

// Structure Prisma principale (début du fichier)
const PRISMA_HEADER = `// Ce fichier est généré automatiquement à partir des fichiers fragmentés dans /prisma/schemas/
// Ne pas modifier directement - éditer les fichiers sources puis reconstruire avec pnpm db:schema:build

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

async function main() {
  console.log(chalk.blue("🔄 Fusion des schémas Prisma fragmentés EcoDeli"));
  console.log(chalk.gray("========================================="));

  try {
    const outputContent = await buildSchemaContent();

    // Écrire le schéma fusionné
    fs.writeFileSync(OUTPUT_SCHEMA, outputContent);

    console.log(
      chalk.green(
        `✅ Schéma fusionné avec succès dans ${path.relative(process.cwd(), OUTPUT_SCHEMA)}`,
      ),
    );
    console.log(
      chalk.gray(
        `   Taille du fichier: ${(outputContent.length / 1024).toFixed(2)} Ko`,
      ),
    );
  } catch (error) {
    console.error(chalk.red("❌ Erreur lors de la fusion des schémas:"), error);
    process.exit(1);
  }
}

async function buildSchemaContent() {
  let outputContent = PRISMA_HEADER;

  // Ajouter les commentaires d'import (pour documentation)
  outputContent += getDomainImportComments();

  // Pour chaque domaine dans l'ordre spécifié
  for (const domain of DOMAIN_ORDER) {
    const domainPath = path.join(SCHEMAS_DIR, domain);

    if (!fs.existsSync(domainPath)) {
      console.warn(chalk.yellow(`⚠️ Domaine non trouvé: ${domain}`));
      continue;
    }

    console.log(chalk.gray(`📂 Traitement du domaine: ${domain}`));

    // Trouver tous les fichiers .prisma dans ce domaine
    const pattern = path.join(domainPath, "*.prisma").replace(/\\/g, "/");
    console.log(chalk.gray(`  🔍 Recherche avec pattern: ${pattern}`));

    const schemaFiles = globSync(pattern);

    if (schemaFiles.length === 0) {
      console.warn(
        chalk.yellow(`⚠️ Aucun fichier schema trouvé dans ${domain}`),
      );
      continue;
    }

    console.log(
      chalk.gray(`  📄 Trouvé ${schemaFiles.length} fichiers de schéma`),
    );

    // Ajouter un séparateur pour ce domaine
    outputContent += `\n// ----- DOMAINE: ${domain.toUpperCase()} -----\n\n`;

    // Traiter chaque fichier
    for (const schemaFile of schemaFiles) {
      const fileName = path.basename(schemaFile);
      console.log(chalk.gray(`  📄 Ajout de ${fileName}`));

      const fileContent = fs.readFileSync(schemaFile, "utf8");
      const processedContent = processFileContent(fileContent);

      outputContent += processedContent + "\n";
    }
  }

  return outputContent;
}

function processFileContent(content: string) {
  // Supprimer les lignes d'import, de generator, datasource qui seraient dans les fragments
  const linesToRemove = [
    /^import\s+.*/gm,
    /^generator\s+.*/gm,
    /^datasource\s+.*/gm,
  ];

  let result = content;
  linesToRemove.forEach((pattern) => {
    result = result.replace(pattern, "");
  });

  // Fusionner les lignes vides multiples en une seule
  result = result.replace(/\n{3,}/g, "\n\n");

  return result;
}

function getDomainImportComments() {
  let comments = "";

  for (const domain of DOMAIN_ORDER) {
    comments += `// Import schémas du domaine ${domain}\n`;
  }

  return comments + "\n";
}

// Exécuter le script
main().catch((err) => {
  console.error(chalk.red("❌ Erreur fatale:"), err);
  process.exit(1);
});
