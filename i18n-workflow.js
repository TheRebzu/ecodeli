#!/usr/bin/env node

/**
 * Script maître pour automatiser le workflow d'internationalisation
 * Usage: node i18n-workflow.js [action]
 * Actions: extract, merge, replace, all
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Configuration
const config = {
  scriptsPath: __dirname,
  outputDir: 'scripts/i18n'
}

/**
 * Exécuter une commande avec gestion des erreurs
 */
function runCommand(command, description) {
  console.log(`\n🔧 ${description}`)
  console.log(`📋 Command: ${command}`)
  
  try {
    const output = execSync(command, { 
      cwd: config.scriptsPath,
      encoding: 'utf-8',
      stdio: 'inherit'
    })
    console.log(`✅ ${description} completed`)
    return true
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    return false
  }
}

/**
 * Vérifier les prérequis
 */
function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...')
  
  const requiredFiles = [
    'extract-labels.js',
    'merge-translations.js', 
    'replace-labels.js'
  ]
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(config.scriptsPath, file))) {
      console.error(`❌ Required file missing: ${file}`)
      return false
    }
  }
  
  // Vérifier Node.js et npm
  try {
    execSync('node --version', { stdio: 'ignore' })
    execSync('npm --version', { stdio: 'ignore' })
  } catch (error) {
    console.error('❌ Node.js or npm not found')
    return false
  }
  
  console.log('✅ All prerequisites met')
  return true
}

/**
 * Créer la structure de dossiers nécessaire
 */
function setupDirectories() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true })
    console.log(`📁 Created directory: ${config.outputDir}`)
  }
}

/**
 * Action: Extraire les labels
 */
function extractLabels() {
  console.log('\n🔍 STEP 1: Extracting hardcoded labels...')
  return runCommand('node extract-labels.js', 'Label extraction')
}

/**
 * Action: Fusionner avec les traductions existantes
 */
function mergeTranslations() {
  console.log('\n🔗 STEP 2: Merging with existing translations...')
  return runCommand('node merge-translations.js', 'Translation merging')
}

/**
 * Action: Remplacer les labels dans le code
 */
function replaceLabels(dryRun = false) {
  const flag = dryRun ? '--dry-run' : ''
  const description = dryRun ? 'Label replacement (dry run)' : 'Label replacement'
  
  console.log(`\n🔄 STEP 3: Replacing labels in source code${dryRun ? ' (DRY RUN)' : ''}...`)
  return runCommand(`node replace-labels.js ${flag}`, description)
}

/**
 * Afficher le statut du projet
 */
function showStatus() {
  console.log('\n📊 I18n Project Status')
  console.log('======================')
  
  const files = [
    { path: 'scripts/i18n/extracted-labels.json', name: 'Extracted Labels' },
    { path: 'scripts/i18n/extraction-report.md', name: 'Extraction Report' },
    { path: 'src/messages/fr.json', name: 'French Messages' },
    { path: 'src/messages/en.json', name: 'English Messages' },
    { path: 'scripts/i18n/merged-fr.json', name: 'Merged French' },
    { path: 'scripts/i18n/merged-en.json', name: 'Merged English' }
  ]
  
  for (const file of files) {
    const exists = fs.existsSync(file.path)
    const size = exists ? fs.statSync(file.path).size : 0
    const status = exists ? `✅ ${(size / 1024).toFixed(1)}KB` : '❌ Missing'
    console.log(`  ${file.name.padEnd(20)}: ${status}`)
  }
  
  // Compter les labels [TO_TRANSLATE]
  try {
    const enMessages = fs.readFileSync('src/messages/en.json', 'utf-8')
    const toTranslateCount = (enMessages.match(/\[TO_TRANSLATE\]/g) || []).length
    if (toTranslateCount > 0) {
      console.log(`\n⚠️  Found ${toTranslateCount} entries needing translation`)
    }
  } catch (error) {
    // Ignore si le fichier n'existe pas
  }
}

/**
 * Afficher l'aide
 */
function showHelp() {
  console.log(`
🌍 EcoDeli I18n Workflow Manager
===============================

Usage: node i18n-workflow.js [action] [options]

Actions:
  extract    Extract hardcoded labels from source code
  merge      Merge extracted labels with existing translations  
  replace    Replace hardcoded labels with translation calls
  all        Run the complete workflow (extract + merge + replace)
  status     Show current project status
  help       Show this help message

Options:
  --dry-run  Simulate replace action without modifying files

Examples:
  node i18n-workflow.js all           # Run complete workflow
  node i18n-workflow.js extract       # Only extract labels
  node i18n-workflow.js replace --dry-run  # Test replacement
  node i18n-workflow.js status        # Check project status

Workflow Steps:
  1. 🔍 Extract hardcoded strings from source code
  2. 🔗 Merge with existing translation files  
  3. 🔄 Replace hardcoded strings with t() calls
  4. ✅ Review and complete translations
`)
}

/**
 * Fonction principale
 */
function main() {
  const args = process.argv.slice(2)
  const action = args[0] || 'help'
  const isDryRun = args.includes('--dry-run')
  
  console.log('🌍 EcoDeli I18n Workflow Manager')
  console.log('================================')
  
  // Vérifier les prérequis
  if (!checkPrerequisites()) {
    process.exit(1)
  }
  
  // Créer les dossiers nécessaires
  setupDirectories()
  
  switch (action) {
    case 'extract':
      if (!extractLabels()) process.exit(1)
      break
      
    case 'merge':
      if (!mergeTranslations()) process.exit(1)
      break
      
    case 'replace':
      if (!replaceLabels(isDryRun)) process.exit(1)
      break
      
    case 'all':
      console.log('\n🚀 Running complete i18n workflow...')
      if (!extractLabels()) process.exit(1)
      if (!mergeTranslations()) process.exit(1)
      if (!replaceLabels(true)) process.exit(1) // Dry run first
      
      console.log('\n⚠️  DRY RUN completed. Review the changes above.')
      console.log('   Run "node i18n-workflow.js replace" to apply changes.')
      break
      
    case 'status':
      showStatus()
      break
      
    case 'help':
    default:
      showHelp()
      break
  }
  
  console.log('\n✨ Workflow completed successfully!')
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error)
  process.exit(1)
})

main()