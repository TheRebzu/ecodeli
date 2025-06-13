#!/usr/bin/env node
/**
 * Script de validation du schéma Prisma fragmenté
 *
 * Ce script vérifie l'intégrité des fragments de schéma Prisma pour EcoDeli.
 * Il s'assure que :
 * - Tous les modèles référencés existent
 * - Les enums sont correctement définis
 * - Aucun modèle n'est dupliqué
 * - Les relations entre modèles sont valides
 * - La génération Prisma fonctionne sans erreur
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";
import { globSync } from "glob";

// Configuration
const SCHEMAS_DIR = path.resolve(process.cwd(), "prisma/schemas");
const MAIN_SCHEMA = path.resolve(process.cwd(), "prisma/schema.prisma");
const TEMP_SCHEMA = path.resolve(process.cwd(), "prisma/schema.temp.prisma");

// Types
interface SchemaFile {
  path: string;
  content: string;
  models: string[];
  enums: string[];
  relations: Relation[];
}

interface Relation {
  model: string;
  field: string;
  references: string;
  foreignModel: string;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  type: "ERROR" | "WARNING";
  message: string;
  file?: string;
  model?: string;
  details?: string;
}

// Fonctions principales
async function main() {
  console.log(chalk.blue("🔍 Validation du schéma Prisma fragmenté EcoDeli"));
  console.log(chalk.gray("========================================="));

  try {
    // 1. Analyser tous les fichiers de schéma
    const schemaFiles = await readSchemaFiles();
    const { models, enums } = extractSchemaComponents(schemaFiles);

    // 2. Valider les composants du schéma
    const validationResult = validateSchema(schemaFiles, models, enums);

    // 3. Afficher les résultats
    displayValidationResults(validationResult);

    // 4. Vérifier que le schéma Prisma peut être généré
    if (validationResult.valid) {
      await validatePrismaGeneration();
    }

    // Conclusion
    if (validationResult.valid) {
      console.log(chalk.green("✅ Le schéma Prisma fragmenté est valide!"));
      process.exit(0);
    } else {
      console.log(chalk.red("❌ Le schéma Prisma contient des erreurs."));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red("❌ Erreur lors de la validation:"), error);
    process.exit(1);
  }
}

// Lecture des fichiers de schéma
async function readSchemaFiles(): Promise<SchemaFile[]> {
  console.log(chalk.gray("1. Lecture des fichiers de schéma fragmentés..."));

  const schemaFiles: SchemaFile[] = [];
  const domains = await fs.promises.readdir(SCHEMAS_DIR);

  for (const domain of domains) {
    const domainPath = path.join(SCHEMAS_DIR, domain);
    const stats = await fs.promises.stat(domainPath);

    if (!stats.isDirectory()) continue;

    const files = await fs.promises.readdir(domainPath);
    for (const file of files) {
      if (!file.endsWith(".prisma")) continue;

      const filePath = path.join(domainPath, file);
      const content = await fs.promises.readFile(filePath, "utf8");

      const models = extractModels(content);
      const enums = extractEnums(content);
      const relations = extractRelations(content, models);

      schemaFiles.push({
        path: filePath,
        content,
        models,
        enums,
        relations,
      });

      console.log(
        chalk.gray(`  - Analysé: ${path.relative(process.cwd(), filePath)}`),
      );
    }
  }

  console.log(
    chalk.green(`  ✅ ${schemaFiles.length} fichiers de schéma analysés`),
  );
  return schemaFiles;
}

// Extraction des composants du schéma
function extractSchemaComponents(files: SchemaFile[]) {
  const models: Map<string, string> = new Map();
  const enums: Map<string, string> = new Map();

  for (const file of files) {
    file.models.forEach((model) => models.set(model, file.path));
    file.enums.forEach((enumName) => enums.set(enumName, file.path));
  }

  console.log(
    chalk.green(`  ✅ ${models.size} modèles et ${enums.size} enums extraits`),
  );
  return { models, enums };
}

// Validation du schéma
function validateSchema(
  files: SchemaFile[],
  models: Map<string, string>,
  enums: Map<string, string>,
): ValidationResult {
  console.log(chalk.gray("2. Validation de l'intégrité du schéma..."));

  const issues: ValidationIssue[] = [];
  const duplicateModels = findDuplicateModels(files);
  const duplicateEnums = findDuplicateEnums(files);
  const invalidRelations = validateRelations(files, models);

  // Ajouter les problèmes détectés
  duplicateModels.forEach(({ model, files }) => {
    issues.push({
      type: "ERROR",
      message: `Le modèle "${model}" est dupliqué dans plusieurs fichiers`,
      details: `Fichiers: ${files.join(", ")}`,
    });
  });

  duplicateEnums.forEach(({ enum: enumName, files }) => {
    issues.push({
      type: "ERROR",
      message: `L'enum "${enumName}" est dupliqué dans plusieurs fichiers`,
      details: `Fichiers: ${files.join(", ")}`,
    });
  });

  invalidRelations.forEach((relation) => {
    issues.push({
      type: "ERROR",
      message: `Relation invalide: "${relation.model}.${relation.field}" référence "${relation.foreignModel}" qui n'existe pas`,
      file: relation.file,
      model: relation.model,
    });
  });

  const valid = issues.filter((issue) => issue.type === "ERROR").length === 0;

  return { valid, issues };
}

// Affichage des résultats de validation
function displayValidationResults(result: ValidationResult) {
  const { issues } = result;
  const errors = issues.filter((issue) => issue.type === "ERROR");
  const warnings = issues.filter((issue) => issue.type === "WARNING");

  console.log(chalk.gray("3. Résultats de la validation:"));

  if (errors.length === 0 && warnings.length === 0) {
    console.log(
      chalk.green("  ✅ Aucun problème détecté dans les schémas fragmentés"),
    );
    return;
  }

  if (errors.length > 0) {
    console.log(chalk.red(`  ❌ ${errors.length} erreurs détectées:`));
    errors.forEach((issue, index) => {
      console.log(chalk.red(`  ${index + 1}. ${issue.message}`));
      if (issue.details) console.log(chalk.gray(`     ${issue.details}`));
      if (issue.file) console.log(chalk.gray(`     Fichier: ${issue.file}`));
    });
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow(`  ⚠️ ${warnings.length} avertissements:`));
    warnings.forEach((issue, index) => {
      console.log(chalk.yellow(`  ${index + 1}. ${issue.message}`));
      if (issue.details) console.log(chalk.gray(`     ${issue.details}`));
      if (issue.file) console.log(chalk.gray(`     Fichier: ${issue.file}`));
    });
  }
}

// Validation de la génération Prisma
async function validatePrismaGeneration() {
  console.log(chalk.gray("4. Vérification de la génération Prisma..."));

  try {
    // Créer une copie temporaire du schéma
    fs.copyFileSync(MAIN_SCHEMA, TEMP_SCHEMA);

    // Valider le schéma avec Prisma CLI (sans générer le client)
    execSync("npx prisma validate --schema=prisma/schema.temp.prisma", {
      stdio: "inherit",
    });

    console.log(chalk.green("  ✅ Validation Prisma réussie"));
    return true;
  } catch (error) {
    console.error(chalk.red("  ❌ La validation Prisma a échoué:"), error);
    return false;
  } finally {
    // Nettoyer les fichiers temporaires
    if (fs.existsSync(TEMP_SCHEMA)) {
      fs.unlinkSync(TEMP_SCHEMA);
    }
  }
}

// Fonctions utilitaires
function extractModels(content: string): string[] {
  const modelRegex = /model\s+(\w+)\s+{/g;
  const models: string[] = [];
  let match;

  while ((match = modelRegex.exec(content)) !== null) {
    models.push(match[1]);
  }

  return models;
}

function extractEnums(content: string): string[] {
  const enumRegex = /enum\s+(\w+)\s+{/g;
  const enums: string[] = [];
  let match;

  while ((match = enumRegex.exec(content)) !== null) {
    enums.push(match[1]);
  }

  return enums;
}

function extractRelations(content: string, modelNames: string[]): Relation[] {
  const relations: Relation[] = [];

  for (const model of modelNames) {
    const modelRegex = new RegExp(`model\\s+${model}\\s+{([^}]+)}`, "s");
    const modelMatch = modelRegex.exec(content);

    if (!modelMatch) continue;

    const modelContent = modelMatch[1];

    const fieldLines = modelContent
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) => line && !line.startsWith("//") && !line.startsWith("@@"),
      );

    for (const line of fieldLines) {
      if (line.includes("@relation")) {
        const fieldMatch = line.match(/^\s*(\w+)\s+(\w+)/);
        if (fieldMatch) {
          const [_, fieldName, fieldType] = fieldMatch;

          if (fieldType.match(/^[A-Z]/)) {
            const relationMatch = line.match(
              /@relation\(\s*(?:name\s*:\s*"([^"]+)")?\s*,?\s*fields\s*:\s*\[([^\]]+)\]\s*,\s*references\s*:\s*\[([^\]]+)\]/,
            );

            if (relationMatch) {
              relations.push({
                model,
                field: fieldName,
                references: relationMatch[3].trim(),
                foreignModel: fieldType.replace(/\[\]$/, ""),
              });
            }
          }
        }
      }
    }
  }

  return relations;
}

function findDuplicateModels(files: SchemaFile[]) {
  const modelToFiles = new Map<string, string[]>();
  const duplicates: { model: string; files: string[] }[] = [];

  files.forEach((file) => {
    file.models.forEach((model) => {
      const existingFiles = modelToFiles.get(model) || [];
      existingFiles.push(file.path);
      modelToFiles.set(model, existingFiles);
    });
  });

  modelToFiles.forEach((files, model) => {
    if (files.length > 1) {
      duplicates.push({
        model,
        files: files.map((f) => path.relative(process.cwd(), f)),
      });
    }
  });

  return duplicates;
}

function findDuplicateEnums(files: SchemaFile[]) {
  const enumToFiles = new Map<string, string[]>();
  const duplicates: { enum: string; files: string[] }[] = [];

  files.forEach((file) => {
    file.enums.forEach((enumName) => {
      const existingFiles = enumToFiles.get(enumName) || [];
      existingFiles.push(file.path);
      enumToFiles.set(enumName, existingFiles);
    });
  });

  enumToFiles.forEach((files, enumName) => {
    if (files.length > 1) {
      duplicates.push({
        enum: enumName,
        files: files.map((f) => path.relative(process.cwd(), f)),
      });
    }
  });

  return duplicates;
}

function validateRelations(files: SchemaFile[], models: Map<string, string>) {
  const invalidRelations: (Relation & { file: string })[] = [];

  files.forEach((file) => {
    file.relations.forEach((relation) => {
      if (!models.has(relation.foreignModel)) {
        invalidRelations.push({
          ...relation,
          file: path.relative(process.cwd(), file.path),
        });
      }
    });
  });

  return invalidRelations;
}

// Exécuter le script
main().catch((err) => {
  console.error(chalk.red("❌ Erreur fatale:"), err);
  process.exit(1);
});
