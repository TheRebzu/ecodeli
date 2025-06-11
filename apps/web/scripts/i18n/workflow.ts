#!/usr/bin/env node
import { execSync } from 'child_process';
import chalk from 'chalk';
import { program } from 'commander';

// Configuration du programme CLI
program
  .name('i18n-workflow')
  .description('Workflow complet pour la gestion des traductions EcoDeli')
  .version('1.0.0')
  .option('-q, --quick', 'Mode rapide : validation et correction seulement')
  .option('-e, --extract', 'Extraire les clés du code source')
  .option('-v, --validate', 'Valider les traductions existantes')
  .option('-f, --fix', 'Corriger automatiquement les erreurs')
  .option('-a, --all', 'Exécuter tout le workflow (extraction + validation + correction)')
  .option('--verbose', 'Affichage détaillé')
  .option('-l, --locale <locale>', 'Langue spécifique à traiter')
  .parse(process.argv);

const options = program.opts();

/**
 * Exécuter une commande et afficher le résultat
 */
function runCommand(command: string, description: string): boolean {
  try {
    console.log(chalk.blue(`🔄 ${description}...`));
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: options.verbose ? 'inherit' : 'pipe',
    });

    if (!options.verbose && output) {
      console.log(output);
    }

    console.log(chalk.green(`✅ ${description} terminé avec succès`));
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de ${description.toLowerCase()}`));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    return false;
  }
}

/**
 * Workflow d'extraction des clés
 */
async function extractWorkflow(): Promise<boolean> {
  console.log(chalk.yellow('\n📝 === EXTRACTION DES CLÉS ==='));

  const extractCommand = `npx tsx scripts/i18n/run-extraction.ts${options.verbose ? ' --verbose' : ''}`;
  return runCommand(extractCommand, 'Extraction des clés de traduction');
}

/**
 * Workflow de validation des traductions
 */
async function validateWorkflow(): Promise<boolean> {
  console.log(chalk.yellow('\n🔍 === VALIDATION DES TRADUCTIONS ==='));

  const validateCommand = [
    'npx tsx scripts/i18n/validate-missing-keys.ts',
    options.verbose ? '--verbose' : '',
    options.locale ? `--locale ${options.locale}` : '',
    options.fix ? '--fix' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return runCommand(validateCommand, 'Validation des traductions');
}

/**
 * Workflow de correction automatique
 */
async function fixWorkflow(): Promise<boolean> {
  console.log(chalk.yellow('\n🔧 === CORRECTION AUTOMATIQUE ==='));

  const fixCommand = [
    'npx tsx scripts/i18n/validate-missing-keys.ts',
    '--fix',
    options.verbose ? '--verbose' : '',
    options.locale ? `--locale ${options.locale}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return runCommand(fixCommand, 'Correction automatique des erreurs');
}

/**
 * Workflow de vérification de la qualité
 */
async function qualityCheckWorkflow(): Promise<boolean> {
  console.log(chalk.yellow('\n📊 === VÉRIFICATION QUALITÉ ==='));

  const qualityCommand = [
    'npx tsx scripts/i18n/validate-missing-keys.ts',
    '--verbose',
    options.locale ? `--locale ${options.locale}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return runCommand(qualityCommand, 'Vérification de la qualité des traductions');
}

/**
 * Afficher le statut du projet
 */
async function showStatus(): Promise<void> {
  console.log(chalk.blue('\n📈 === STATUT DU PROJET ==='));

  try {
    // Compter les fichiers de traduction
    const locales = ['fr', 'en', 'es', 'de', 'it'];
    for (const locale of locales) {
      try {
        const checkCommand = `npx tsx scripts/i18n/validate-missing-keys.ts --locale ${locale}`;
        execSync(checkCommand, { stdio: 'pipe' });
        console.log(chalk.green(`✅ ${locale.toUpperCase()}: Traductions valides`));
      } catch (error) {
        console.log(chalk.yellow(`⚠️ ${locale.toUpperCase()}: Problèmes détectés`));
      }
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️ Impossible de vérifier le statut complet'));
  }
}

/**
 * Menu interactif
 */
async function interactiveMenu(): Promise<void> {
  console.log(chalk.blue('\n🎯 === WORKFLOW TRADUCTIONS ECODELI ==='));
  console.log(chalk.white('Choisissez une option:'));
  console.log(chalk.cyan('1. 🚀 Workflow complet (extraction + validation + correction)'));
  console.log(chalk.cyan('2. 📝 Extraction des clés seulement'));
  console.log(chalk.cyan('3. 🔍 Validation seulement'));
  console.log(chalk.cyan('4. 🔧 Correction automatique seulement'));
  console.log(chalk.cyan('5. 📊 Vérification qualité'));
  console.log(chalk.cyan('6. 📈 Afficher le statut'));
  console.log(chalk.cyan('0. ❌ Quitter'));

  // Pour cette démo, nous exécutons le workflow complet automatiquement
  return await fullWorkflow();
}

/**
 * Workflow complet
 */
async function fullWorkflow(): Promise<void> {
  console.log(chalk.blue('\n🚀 === DÉMARRAGE DU WORKFLOW COMPLET ==='));

  let success = true;

  // 1. Extraction des clés
  if (!options.quick) {
    success = (await extractWorkflow()) && success;
    if (!success) {
      console.error(chalk.red("\n❌ Échec de l'extraction. Arrêt du workflow."));
      process.exit(1);
    }
  }

  // 2. Validation et correction
  success = (await validateWorkflow()) && success;

  // 3. Vérification finale de la qualité
  if (success) {
    await qualityCheckWorkflow();
  }

  // 4. Afficher le statut final
  await showStatus();

  if (success) {
    console.log(chalk.green('\n🎉 === WORKFLOW TERMINÉ AVEC SUCCÈS ==='));
    console.log(chalk.white('Les traductions ont été mises à jour et validées.'));
    console.log(
      chalk.blue(
        "💡 N'oubliez pas de réviser les traductions marquées [À TRADUIRE] et [TO_TRANSLATE]"
      )
    );
  } else {
    console.log(chalk.yellow('\n⚠️ === WORKFLOW TERMINÉ AVEC DES AVERTISSEMENTS ==='));
    console.log(
      chalk.white('Certaines étapes ont rencontré des problèmes. Vérifiez les logs ci-dessus.')
    );
  }
}

/**
 * Fonction principale
 */
async function main(): Promise<void> {
  try {
    // Si aucune option spécifiée, afficher le menu interactif
    if (!options.extract && !options.validate && !options.fix && !options.all && !options.quick) {
      await interactiveMenu();
      return;
    }

    // Exécuter les actions spécifiées
    if (options.all) {
      await fullWorkflow();
    } else if (options.quick) {
      await validateWorkflow();
    } else {
      if (options.extract) {
        await extractWorkflow();
      }

      if (options.validate) {
        await validateWorkflow();
      }

      if (options.fix) {
        await fixWorkflow();
      }
    }
  } catch (error) {
    console.error(chalk.red("\n❌ Erreur lors de l'exécution du workflow:"));
    console.error(error);
    process.exit(1);
  }
}

// Gestion des signaux pour une sortie propre
process.on('SIGINT', () => {
  console.log(chalk.yellow("\n\n⚠️ Workflow interrompu par l'utilisateur"));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\n⚠️ Workflow terminé par le système'));
  process.exit(0);
});

// Exécuter le script
main().catch(error => {
  console.error(chalk.red('\n❌ Erreur non gérée:'), error);
  process.exit(1);
});
