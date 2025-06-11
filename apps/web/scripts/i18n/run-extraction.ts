#!/usr/bin/env node
import { execSync } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractAllTranslations, generateTranslationFiles } from './extract-labels';
import { program } from 'commander';

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Options de la ligne de commande
program
  .option('-c, --check', 'Exécuter en mode vérification (sans modification des fichiers)')
  .option('-v, --verbose', 'Afficher des informations détaillées')
  .option('-f, --force', "Forcer l'extraction même en cas d'erreur")
  .option('-o, --output <dir>', 'Répertoire de sortie pour les traductions', 'src/messages')
  .parse(process.argv);

const options = program.opts();

/**
 * Exécute l'extraction des clés de traduction
 */
async function runExtraction() {
  console.log(chalk.blue("🚀 Démarrage de l'extraction des clés de traduction..."));

  try {
    // Afficher le mode d'exécution
    if (options.check) {
      console.log(chalk.blue('ℹ️ Mode vérification activé, aucune modification ne sera effectuée'));
    }

    if (options.verbose) {
      console.log(chalk.blue('ℹ️ Mode verbeux activé'));
    }

    // Extraire les clés de traduction
    console.log(chalk.blue('🔍 Extraction des clés de traduction...'));
    const translationMap = await extractAllTranslations();

    if (Object.keys(translationMap).length === 0) {
      console.warn(chalk.yellow('⚠️ Aucune clé de traduction trouvée'));
      if (!options.force) {
        console.error(
          chalk.red("❌ Arrêt de l'extraction. Utilisez --force pour continuer même sans clés")
        );
        process.exit(1);
      }
    }

    // Générer les fichiers de traduction seulement si pas en mode check
    if (!options.check) {
      console.log(chalk.blue('📝 Génération des fichiers de traduction...'));
      await generateTranslationFiles(translationMap);
    } else {
      // En mode check, juste afficher les statistiques
      const totalKeys = Object.keys(translationMap).length;

      console.log(chalk.blue("📊 Statistiques d'extraction:"));
      console.log(`   Total des clés: ${totalKeys}`);

      if (options.verbose && totalKeys > 0) {
        // Afficher quelques exemples de clés
        const keyExamples = Object.keys(translationMap).slice(0, 10);
        console.log(chalk.blue('📝 Exemples de clés:'));
        keyExamples.forEach(key => {
          const occurrences = translationMap[key].occurrences.length;
          console.log(`   - ${key} (${occurrences} occurrence${occurrences > 1 ? 's' : ''})`);
        });
      }
    }

    console.log(chalk.green('✅ Extraction des clés de traduction terminée avec succès'));

    // Générer automatiquement les traductions si demandé
    if (!options.check && options.generate) {
      console.log(chalk.blue('🔄 Démarrage de la génération des traductions...'));
      try {
        execSync('npx tsx scripts/i18n/run-generation.ts', { stdio: 'inherit' });
        console.log(chalk.green('✅ Génération des traductions terminée avec succès'));
      } catch (error) {
        console.error(chalk.red(`❌ Erreur lors de la génération des traductions: ${error}`));
        // Ne pas quitter pour ne pas perdre le travail d'extraction
      }
    }

    // Valider les traductions si demandé
    if (options.validate) {
      console.log(chalk.blue('🔍 Démarrage de la validation des traductions...'));
      try {
        execSync('npx tsx scripts/i18n/run-validation.ts', { stdio: 'inherit' });
        console.log(chalk.green('✅ Validation des traductions terminée avec succès'));
      } catch (error) {
        console.error(chalk.red(`❌ Erreur lors de la validation des traductions: ${error}`));
        // Ne pas quitter pour ne pas perdre le travail précédent
      }
    }
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de l'extraction: ${error}`));
    process.exit(1);
  }
}

// Exécuter le script
runExtraction().catch(error => {
  console.error(chalk.red(`❌ Erreur non gérée: ${error}`));
  process.exit(1);
});
