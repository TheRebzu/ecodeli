#!/usr/bin/env node

/**
 * Script pour fusionner les labels extraits avec les fichiers de messages existants
 * Usage: node merge-translations.js
 */

const fs = require('fs')
const path = require('path')

// Configuration
const config = {
  extractedLabelsFile: 'scripts/i18n/extracted-labels.json',
  frMessagesFile: 'src/messages/fr.json',
  enMessagesFile: 'src/messages/en.json',
  outputDir: 'scripts/i18n',
  backupExisting: true
}

/**
 * Charger un fichier JSON
 */
function loadJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`)
    return {}
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message)
    return {}
  }
}

/**
 * Sauvegarder un fichier JSON avec formatage
 */
function saveJsonFile(filePath, data) {
  const jsonContent = JSON.stringify(data, null, 2)
  fs.writeFileSync(filePath, jsonContent)
}

/**
 * Créer une sauvegarde d'un fichier
 */
function createBackup(filePath) {
  if (fs.existsSync(filePath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `${filePath}.backup-${timestamp}`
    fs.copyFileSync(filePath, backupPath)
    console.log(`📋 Backup created: ${backupPath}`)
    return backupPath
  }
  return null
}

/**
 * Fusionner les objets de traduction de manière récursive
 */
function mergeTranslations(existing, newTranslations, conflictStrategy = 'keep-existing') {
  const merged = { ...existing }
  
  for (const [key, value] of Object.entries(newTranslations)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Fusion récursive pour les objets
      merged[key] = mergeTranslations(merged[key] || {}, value, conflictStrategy)
    } else {
      // Fusion des valeurs simples
      if (merged[key] === undefined) {
        // Nouvelle clé
        merged[key] = value
      } else if (conflictStrategy === 'overwrite') {
        // Écraser la valeur existante
        merged[key] = value
      }
      // Sinon, garder la valeur existante (keep-existing)
    }
  }
  
  return merged
}

/**
 * Organiser les labels extraits par namespace
 */
function organizeExtractedLabels(labels) {
  const organized = {}
  
  for (const label of labels) {
    const namespace = label.namespace || 'common'
    if (!organized[namespace]) {
      organized[namespace] = {}
    }
    organized[namespace][label.key] = label.text
  }
  
  return organized
}

/**
 * Créer les traductions anglaises automatiques
 */
function createEnglishTranslations(frTranslations) {
  const enTranslations = {}
  
  function translateValue(value) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const translated = {}
      for (const [k, v] of Object.entries(value)) {
        translated[k] = translateValue(v)
      }
      return translated
    } else if (typeof value === 'string') {
      // Traductions automatiques simples
      const translations = {
        // Navigation
        'Tableau de bord': 'Dashboard',
        'Tableau de Bord': 'Dashboard',
        'Accueil': 'Home',
        'Profil': 'Profile',
        'Paramètres': 'Settings',
        'Déconnexion': 'Logout',
        
        // Actions
        'Créer': 'Create',
        'Modifier': 'Edit',
        'Supprimer': 'Delete',
        'Enregistrer': 'Save',
        'Annuler': 'Cancel',
        'Confirmer': 'Confirm',
        'Valider': 'Validate',
        'Rechercher': 'Search',
        'Filtrer': 'Filter',
        
        // Status
        'En attente': 'Pending',
        'En cours': 'In Progress',
        'Terminé': 'Completed',
        'Annulé': 'Cancelled',
        'Actif': 'Active',
        'Inactif': 'Inactive',
        
        // Roles
        'Client': 'Client',
        'Livreur': 'Deliverer',
        'Prestataire': 'Provider',
        'Commerçant': 'Merchant',
        'Administrateur': 'Administrator',
        
        // Services
        'Livraison': 'Delivery',
        'Transport': 'Transport',
        'Services': 'Services',
        'Réservation': 'Booking',
        'Paiement': 'Payment',
        'Annonce': 'Announcement',
        
        // Common
        'Oui': 'Yes',
        'Non': 'No',
        'Erreur': 'Error',
        'Succès': 'Success',
        'Chargement': 'Loading',
        'Aucun résultat': 'No results',
      }
      
      // Chercher une traduction exacte
      if (translations[value]) {
        return translations[value]
      }
      
      // Traductions partielles
      let translated = value
      for (const [fr, en] of Object.entries(translations)) {
        translated = translated.replace(new RegExp(fr, 'gi'), en)
      }
      
      // Si pas de traduction trouvée, marquer comme à traduire
      if (translated === value) {
        return `[TO_TRANSLATE] ${value}`
      }
      
      return translated
    }
    
    return value
  }
  
  return translateValue(frTranslations)
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔗 EcoDeli Translation Merger')
  console.log('=============================')
  
  const startTime = Date.now()
  
  try {
    // Charger les labels extraits
    console.log('📋 Loading extracted labels...')
    const extractedLabels = loadJsonFile(config.extractedLabelsFile)
    if (!Array.isArray(extractedLabels)) {
      throw new Error('Invalid extracted labels format')
    }
    console.log(`Found ${extractedLabels.length} extracted labels`)

    // Organiser les labels par namespace
    const organizedLabels = organizeExtractedLabels(extractedLabels)
    console.log(`Organized into ${Object.keys(organizedLabels).length} namespaces`)

    // Charger les fichiers de messages existants
    console.log('📖 Loading existing translation files...')
    const existingFr = loadJsonFile(config.frMessagesFile)
    const existingEn = loadJsonFile(config.enMessagesFile)

    // Créer des sauvegardes
    if (config.backupExisting) {
      console.log('💾 Creating backups...')
      createBackup(config.frMessagesFile)
      createBackup(config.enMessagesFile)
    }

    // Fusionner les traductions françaises
    console.log('🇫🇷 Merging French translations...')
    const mergedFr = mergeTranslations(existingFr, organizedLabels, 'keep-existing')

    // Créer les traductions anglaises automatiques
    console.log('🇬🇧 Generating English translations...')
    const autoEnglish = createEnglishTranslations(organizedLabels)
    const mergedEn = mergeTranslations(existingEn, autoEnglish, 'keep-existing')

    // Sauvegarder les fichiers fusionnés
    console.log('💾 Saving merged translations...')
    
    // Sauvegarder dans les fichiers originaux
    saveJsonFile(config.frMessagesFile, mergedFr)
    saveJsonFile(config.enMessagesFile, mergedEn)
    
    // Sauvegarder des copies dans le dossier de sortie
    const outputFrPath = path.join(config.outputDir, 'merged-fr.json')
    const outputEnPath = path.join(config.outputDir, 'merged-en.json')
    
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true })
    }
    
    saveJsonFile(outputFrPath, mergedFr)
    saveJsonFile(outputEnPath, mergedEn)

    // Statistiques
    const duration = Date.now() - startTime
    
    console.log('')
    console.log('📊 Merge Results:')
    console.log(`  📝 Extracted labels: ${extractedLabels.length}`)
    console.log(`  🏷️  Namespaces: ${Object.keys(organizedLabels).length}`)
    console.log(`  🇫🇷 FR keys total: ${JSON.stringify(mergedFr).split('"').length / 4}`)
    console.log(`  🇬🇧 EN keys total: ${JSON.stringify(mergedEn).split('"').length / 4}`)
    console.log(`  ⏱️  Time: ${duration}ms`)

    console.log('')
    console.log('💾 Files updated:')
    console.log(`  📄 ${config.frMessagesFile}`)
    console.log(`  📄 ${config.enMessagesFile}`)
    console.log(`  📄 ${outputFrPath}`)
    console.log(`  📄 ${outputEnPath}`)

    console.log('')
    console.log('🎯 Next steps:')
    console.log('  1. Review the merged translation files')
    console.log('  2. Complete [TO_TRANSLATE] entries in English file')
    console.log('  3. Test the application with new translations')
    console.log('  4. Run replace-labels.js to update source code')

    // Analyser les clés manquantes en anglais
    const toTranslateCount = JSON.stringify(mergedEn).split('[TO_TRANSLATE]').length - 1
    if (toTranslateCount > 0) {
      console.log('')
      console.log(`⚠️  Found ${toTranslateCount} entries marked [TO_TRANSLATE] in English`)
      console.log('   These need manual translation')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
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