#!/usr/bin/env node
import { execSync } from "child_process";
import chalk from "chalk";
import path from "path";

/**
 * Exécute un script avec une gestion des erreurs stricte pour CI
 */
function runScript(
  scriptPath: string,
  description: string,
  options: string[] = [],
): void {
  console.log(chalk.blue(`\n🚀 ${description}...\n`));

  try {
    execSync(`ts-node ${scriptPath} ${options.join(" ")}`, {
      stdio: "inherit",
    });
    console.log(chalk.green(`\n✅ ${description} terminé avec succès!`));
  } catch (error) {
    console.error(
      chalk.red(`\n❌ Erreur lors de ${description.toLowerCase()}: ${error}`),
    );
    process.exit(1);
  }
}

/**
 * Script principal pour CI
 */
function main() {
  try {
    console.log(
      chalk.blue("🔄 Démarrage de la vérification des traductions pour CI"),
    );

    // Chemins des scripts
    const extractScript = path.join(__dirname, "extract-labels.ts");
    const validateScript = path.join(__dirname, "validate-translations.ts");

    // Étape 1: Extraction des labels
    console.log(chalk.blue("\n📋 Vérification de l'extraction des labels..."));
    runScript(extractScript, "Extraction des chaînes de traduction");

    // Étape 2: Validation stricte des traductions
    console.log(chalk.blue("\n🔍 Validation stricte des traductions..."));
    runScript(validateScript, "Validation des traductions", ["--strict"]);

    console.log(
      chalk.green(
        "\n🎉 Vérification des traductions pour CI terminée avec succès!",
      ),
    );
  } catch (error) {
    console.error(
      chalk.red(
        `\n❌ Erreur lors de la vérification des traductions pour CI: ${error}`,
      ),
    );
    process.exit(1);
  }
}

// Exécuter le script principal
main();
