#!/usr/bin/env node

/**
 * Script d'exécution pour la génération des traductions
 * 
 * Utilisation:
 * - Génération complète: pnpm generate:translations
 * - Génération pour une langue spécifique: pnpm generate:lang [code]
 */
import { generateAllTranslations } from './generate-translations';
import chalk from 'chalk';

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);

async function main() {
  try {
    // Afficher l'aide si demandé
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
${chalk.bold('Générateur de traductions pour EcoDeli')}

${chalk.cyan('Usage:')}
  ${chalk.green('pnpm generate:translations')}           Génère les traductions pour toutes les langues
  ${chalk.green('pnpm generate:lang [code]')}            Génère les traductions pour une langue spécifique
  
${chalk.cyan('Options:')}
  ${chalk.green('--help, -h')}                         Affiche cette aide
  ${chalk.green('--verbose, -v')}                      Mode verbeux
  
${chalk.cyan('Exemples:')}
  ${chalk.green('pnpm generate:translations')}           Génère fr.json et en.json
  ${chalk.green('pnpm generate:lang es')}                Génère es.json
  `);
      return;
    }

    // Vérifier si le mode verbeux est activé
    const isVerbose = args.includes('--verbose') || args.includes('-v');
    if (isVerbose) {
      console.log(chalk.yellow('Mode verbeux activé'));
    }

    // Filtrer les arguments pour ne garder que les codes de langue
    const locales = args.filter(arg => !arg.startsWith('-'));

    console.log(chalk.blue.bold('🚀 Lancement de la génération des traductions...'));

    // Exécuter la génération
    await generateAllTranslations();
    
    console.log(chalk.green.bold('✅ Génération des traductions terminée avec succès!'));
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la génération des traductions: ${error}`));
    if (error instanceof Error) {
      console.error(chalk.red(`Stack: ${error.stack}`));
    }
    throw error;
  }
}

// Exécution du script
main().catch(error => {
  console.error(chalk.red(`Erreur fatale: ${error}`));
  // Nous n'utilisons pas process.exit ici pour être compatible avec les modules ES
}); 