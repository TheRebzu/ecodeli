#!/usr/bin/env node

/**
 * Script CLI pour extraire automatiquement les labels hardcodés
 * Usage: node scripts/i18n/extract-labels.js [options]
 */

const { extractLabels } = require('../../src/lib/utils/extract-labels')
const { Command } = require('commander')
const path = require('path')

const program = new Command()

program
  .name('extract-labels')
  .description('Extraire automatiquement les labels hardcodés du code source')
  .version('1.0.0')

program
  .option('-d, --dirs <dirs...>', 'Répertoires à scanner', ['src/app', 'src/components', 'src/features'])
  .option('-e, --extensions <extensions...>', 'Extensions de fichiers', ['.tsx', '.ts', '.jsx', '.js'])
  .option('-m, --min-length <number>', 'Taille minimale des chaînes', '3')
  .option('-o, --output <dir>', 'Répertoire de sortie', 'scripts/i18n')
  .option('--exclude <patterns...>', 'Patterns à exclure', ['**/node_modules/**', '**/dist/**', '**/*.test.*'])
  .option('--dry-run', 'Mode simulation (pas de fichiers générés)')
  .option('--verbose', 'Mode verbeux')

program.parse()

const options = program.opts()

async function main() {
  try {
    console.log('🚀 EcoDeli Label Extractor')
    console.log('==========================')
    
    if (options.verbose) {
      console.log('Configuration:')
      console.log(`  Répertoires: ${options.dirs.join(', ')}`)
      console.log(`  Extensions: ${options.extensions.join(', ')}`)
      console.log(`  Taille min: ${options.minLength}`)
      console.log(`  Sortie: ${options.output}`)
      console.log(`  Mode dry-run: ${options.dryRun || false}`)
      console.log('')
    }

    const config = {
      scanDirs: options.dirs,
      extensions: options.extensions,
      excludePatterns: options.exclude,
      minLength: parseInt(options.minLength),
      outputDir: options.output
    }

    const startTime = Date.now()
    const labels = await extractLabels(config)
    const duration = Date.now() - startTime

    console.log('')
    console.log('📊 Résultats:')
    console.log(`  ✅ ${labels.length} labels extraits`)
    console.log(`  ⏱️  Temps d'exécution: ${duration}ms`)
    
    // Statistiques par namespace
    const byNamespace = labels.reduce((acc, label) => {
      const ns = label.namespace || 'unknown'
      acc[ns] = (acc[ns] || 0) + 1
      return acc
    }, {})

    console.log('')
    console.log('📋 Répartition par namespace:')
    Object.entries(byNamespace)
      .sort(([,a], [,b]) => b - a)
      .forEach(([namespace, count]) => {
        console.log(`  ${namespace}: ${count}`)
      })

    if (!options.dryRun) {
      console.log('')
      console.log('💾 Fichiers générés:')
      console.log(`  📄 ${path.join(options.output, 'extracted-labels.json')}`)
      console.log(`  📝 ${path.join(options.output, 'extraction-report.md')}`)
    }

    console.log('')
    console.log('✨ Extraction terminée avec succès!')
    console.log('')
    console.log('📌 Prochaines étapes:')
    console.log('  1. Réviser les labels extraits dans extraction-report.md')
    console.log('  2. Lancer le remplacement: node scripts/i18n/replace-labels.js')
    console.log('  3. Vérifier les traductions générées')
    console.log('  4. Compléter les traductions marquées [TO_TRANSLATE]')

  } catch (error) {
    console.error('❌ Erreur lors de l\'extraction:', error.message)
    if (options.verbose) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error)
  process.exit(1)
})

main() 