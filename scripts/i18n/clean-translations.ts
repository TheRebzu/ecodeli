#!/usr/bin/env node

/**
 * Script de nettoyage des traductions orphelines
 * Ce script supprime les clés qui n'existent pas dans la langue de base
 */
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { validateTranslations } from "./validate-translations";

async function cleanTranslations(baseLocale: string = "fr"): Promise<void> {
  console.log(chalk.blue.bold("🧹 Nettoyage des traductions orphelines..."));

  try {
    // Utiliser le validateur avec l'option de nettoyage
    const options = {
      baseLocale,
      outputFormat: "console",
      fix: false,
      clean: true,
      strict: false,
      ignorePrefixes: [
        "[NEEDS_TRANSLATION]",
        "TO_TRANSLATE:",
        "(à traduire)",
        "TRANSLATE:",
      ],
    };

    const report = await validateTranslations(options);

    if (report.summary.orphanedKeys === 0) {
      console.log(chalk.green("✅ Aucune clé orpheline à supprimer."));
    } else {
      console.log(
        chalk.green(
          `✅ ${report.summary.orphanedKeys} clés orphelines ont été supprimées.`,
        ),
      );
    }

    // Vérifier s'il reste d'autres problèmes
    const hasOtherIssues =
      report.summary.missingTranslations > 0 ||
      report.summary.malformedKeys > 0 ||
      report.summary.emptyValues > 0;

    if (hasOtherIssues) {
      console.log(
        chalk.yellow.bold(
          "\n⚠️ D'autres problèmes ont été détectés dans les traductions:",
        ),
      );

      if (report.summary.missingTranslations > 0) {
        console.log(
          chalk.yellow(
            `  - ${report.summary.missingTranslations} traductions manquantes`,
          ),
        );
        console.log(
          chalk.blue(
            '    Utiliser "pnpm i18n:generate --fix" pour les ajouter automatiquement.',
          ),
        );
      }

      if (report.summary.malformedKeys > 0) {
        console.log(
          chalk.yellow(`  - ${report.summary.malformedKeys} clés malformées`),
        );
        console.log(chalk.blue("    Vérification manuelle requise."));
      }

      if (report.summary.emptyValues > 0) {
        console.log(
          chalk.yellow(`  - ${report.summary.emptyValues} valeurs vides`),
        );
      }
    }

    console.log(chalk.green.bold("✅ Nettoyage terminé avec succès!"));
  } catch (error) {
    console.error(
      chalk.red(`❌ Erreur lors du nettoyage des traductions: ${error}`),
    );
    if (error instanceof Error) {
      console.error(chalk.red(`Stack: ${error.stack}`));
    }
    process.exit(1);
  }
}

// Fonction principale pour l'exécution en ligne de commande
export async function runCleaning(args: string[]): Promise<void> {
  let baseLocale = "fr";

  // Analyser les arguments de la ligne de commande
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (
      (arg === "--base-locale" || arg === "--locale") &&
      i + 1 < args.length
    ) {
      baseLocale = args[++i];
    }
  }

  await cleanTranslations(baseLocale);
}

// Si le script est exécuté directement
if (typeof require !== "undefined") {
  if (process.argv[1] === __filename) {
    runCleaning(process.argv.slice(2)).catch((error) => {
      console.error(chalk.red(`❌ Erreur fatale: ${error}`));
      process.exit(1);
    });
  }
}
