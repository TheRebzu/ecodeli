#!/usr/bin/env node

/**
 * Script CLI pour remplacer automatiquement les labels hardcodés
 * Usage: node scripts/i18n/replace-labels.js [options]
 */

const { replaceLabels } = require('../../src/lib/utils/replace-labels')
const { Command } = require('commander')
const path = require('path')
const fs = require('fs')

const program = new Command()

program
  .name('replace-labels')
  .description('Remplacer automatiquement les labels hardcodés par des appels de traduction')
  .version('1.0.0')

program
  .option('-i, --input <file>', 'Fichier JSON des labels extraits', 'scripts/i18n/extracted-labels.json')
  .option('-f, --function <name>', 'Nom de la fonction de traduction', 't')
  .option('-n, --namespace <name>', 'Namespace par défaut', 'common')
  .option('--no-backup', 'Ne pas créer de backups')
  .option('--dry-run', 'Mode simulation (aucun fichier modifié)')
  .option('--verbose', 'Mode verbeux')

program.parse()

const options = program.opts()

async function main() {
  try {
    console.log('🔄 EcoDeli Label Replacer')
    console.log('=========================')
    
    // Vérifier que le fichier d'entrée existe
    if (!fs.existsSync(options.input)) {
      throw new Error(`Le fichier d'entrée n'existe pas: ${options.input}`)
    }

    if (options.verbose) {
      console.log('Configuration:')
      console.log(`  Fichier d'entrée: ${options.input}`)
      console.log(`  Fonction de traduction: ${options.function}`)
      console.log(`  Namespace par défaut: ${options.namespace}`)
      console.log(`  Créer des backups: ${options.backup}`)
      console.log(`  Mode dry-run: ${options.dryRun || false}`)
      console.log('')
    }

    // Prévisualiser les labels à remplacer
    const labelsContent = fs.readFileSync(options.input, 'utf-8')
    const labels = JSON.parse(labelsContent)
    
    console.log(`📋 Chargement de ${labels.length} labels à remplacer`)
    
    // Grouper par fichier pour un aperçu
    const fileGroups = labels.reduce((acc, label) => {
      if (!acc[label.file]) acc[label.file] = 0
      acc[label.file]++
      return acc
    }, {})

    console.log('')
    console.log('📁 Fichiers à modifier:')
    Object.entries(fileGroups)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Limiter l'affichage
      .forEach(([file, count]) => {
        console.log(`  ${file}: ${count} labels`)
      })
    
    if (Object.keys(fileGroups).length > 10) {
      console.log(`  ... et ${Object.keys(fileGroups).length - 10} autres fichiers`)
    }

    if (options.dryRun) {
      console.log('')
      console.log('🧪 MODE DRY RUN - Aucun fichier ne sera modifié')
    } else {
      console.log('')
      console.log('⚠️  ATTENTION: Cette opération va modifier vos fichiers source!')
      console.log('   Des backups seront créés si --no-backup n\'est pas spécifié.')
      
      // Demander confirmation si ce n'est pas un dry run
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const answer = await new Promise(resolve => {
        rl.question('Continuer ? (y/N): ', resolve)
      })
      rl.close()

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ Opération annulée')
        process.exit(0)
      }
    }

    const config = {
      labelsFile: options.input,
      translationFunction: options.function,
      defaultNamespace: options.namespace,
      createBackups: options.backup,
      dryRun: options.dryRun
    }

    console.log('')
    console.log('🚀 Démarrage du remplacement...')
    
    const startTime = Date.now()
    const replacements = await replaceLabels(config)
    const duration = Date.now() - startTime

    console.log('')
    console.log('📊 Résultats:')
    console.log(`  ✅ ${replacements.length} remplacements effectués`)
    console.log(`  ⏱️  Temps d'exécution: ${duration}ms`)
    
    // Statistiques par fichier
    const replacementsByFile = replacements.reduce((acc, replacement) => {
      acc[replacement.file] = (acc[replacement.file] || 0) + 1
      return acc
    }, {})

    console.log('')
    console.log('📂 Remplacements par fichier:')
    Object.entries(replacementsByFile)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([file, count]) => {
        console.log(`  ${file}: ${count}`)
      })

    if (!options.dryRun) {
      console.log('')
      console.log('📝 Fichiers de traduction mis à jour:')
      console.log('  src/messages/fr.json')
      console.log('  src/messages/en.json')
      
      console.log('')
      console.log('📊 Rapport généré:')
      console.log(`  ${path.join(path.dirname(options.input), 'replacement-report.md')}`)
    }

    console.log('')
    console.log('✨ Remplacement terminé avec succès!')
    console.log('')
    console.log('📌 Prochaines étapes:')
    console.log('  1. Vérifier les fichiers modifiés')
    console.log('  2. Tester que l\'application compile et fonctionne')
    console.log('  3. Compléter les traductions EN marquées [TO_TRANSLATE]')
    console.log('  4. Commit les changements')

    if (options.dryRun) {
      console.log('')
      console.log('💡 Pour appliquer réellement les changements:')
      console.log(`   node scripts/i18n/replace-labels.js ${process.argv.slice(2).filter(arg => arg !== '--dry-run').join(' ')}`)
    }

  } catch (error) {
    console.error('❌ Erreur lors du remplacement:', error.message)
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