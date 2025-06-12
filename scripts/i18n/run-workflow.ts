#!/usr/bin/env node
import { execSync } from 'child_process';
import chalk from 'chalk';
import { program } from 'commander';
import path from 'path';
import { fileURLToPath } from 'url';
import { fixLocalizationIssues } from './utils/fix-localization-issues';

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Options de la ligne de commande
program
  .option('-v, --verbose', 'Afficher des informations détaillées')
  .option('-s, --skip-validation', 'Ignorer la validation des traductions')
  .option('-f, --fix-only', 'Exécuter uniquement la correction des problèmes')
  .option('-e, --extract-only', "Exécuter uniquement l'extraction des clés")
  .option('--no-color', 'Désactiver les couleurs dans la sortie')
  .parse(process.argv);

const options = program.opts();

/**
 * Exécute une commande avec une gestion d'erreurs améliorée
 */
function runCommand(command: string, description: string): boolean {
  try {
    console.log(chalk.blue(`🔄 ${description}...`));
    execSync(command, { stdio: options.verbose ? 'inherit' : 'pipe' });
    console.log(chalk.green(`✅ ${description} terminé avec succès`));
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de ${description.toLowerCase()}: ${error}`));
    return false;
  }
}

/**
 * Processus complet de gestion des traductions
 */
async function runWorkflow() {
  console.log(chalk.blue.bold('🚀 Démarrage du workflow i18n...'));
  let success = true;

  try {
    // 1. Extraction des clés de traduction des fichiers source
    if (!options.fixOnly) {
      success = runCommand(
        'npx tsx scripts/i18n/extract-labels.ts',
        'Extraction des clés de traduction'
      );
      if (!success) {
        console.warn(chalk.yellow("⚠️ L'extraction des clés a échoué mais le workflow continue"));
      }
    }

    // 2. Correction automatique des problèmes courants de localisation
    console.log(chalk.blue('🔧 Correction des problèmes de localisation...'));
    await fixLocalizationIssues();

    // 3. Génération des traductions manquantes (sauf si extract-only est spécifié)
    if (!options.extractOnly) {
      success = runCommand(
        'npx tsx scripts/i18n/run-generation.ts',
        'Génération des traductions manquantes'
      );
      if (!success) {
        console.warn(
          chalk.yellow('⚠️ La génération des traductions a échoué mais le workflow continue')
        );
      }
    }

    // 4. Validation des traductions (sauf si skip-validation est spécifié)
    if (!options.skipValidation && !options.extractOnly) {
      success = runCommand('npx tsx scripts/i18n/run-validation.ts', 'Validation des traductions');
      if (!success) {
        console.warn(
          chalk.yellow('⚠️ La validation des traductions a échoué, des problèmes peuvent subsister')
        );
      }
    }

    console.log(chalk.green.bold('✅ Workflow i18n terminé avec succès'));
    console.log(
      chalk.blue(
        '\nPour utiliser les clés générées dans votre application, redémarrez le serveur de développement si nécessaire'
      )
    );

    return 0;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de l'exécution du workflow i18n: ${error}`));
    return 1;
  }
}

// Exécuter le workflow
runWorkflow()
  .then(exitCode => {
    // Exit code 0 means success
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  })
  .catch(error => {
    console.error(chalk.red(`❌ Erreur non gérée dans le workflow i18n: ${error}`));
    process.exit(1);
  });
