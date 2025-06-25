#!/usr/bin/env node

/**
 * Script CLI pour détecter et corriger automatiquement les labels manquants
 * Usage: node scripts/i18n/auto-fix-missing.js [options]
 */

const { Command } = require('commander')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const program = new Command()

program
  .name('auto-fix-missing')
  .description('Détecter et corriger automatiquement les labels de traduction manquants')
  .version('1.0.0')

program
  .option('-w, --watch', 'Mode surveillance continue des erreurs')
  .option('-f, --fix', 'Corriger automatiquement les erreurs détectées')
  .option('-l, --log-file <file>', 'Fichier de log à analyser')
  .option('--dry-run', 'Mode simulation (pas de modifications)')
  .option('--verbose', 'Mode verbeux')

program.parse()

const options = program.opts()

/**
 * Messages français par défaut pour les labels manquants
 */
const defaultTranslations = {
  'auth.login.emailPlaceholder': 'Entrez votre adresse email',
  'auth.login.passwordPlaceholder': 'Entrez votre mot de passe',
  'auth.register.chooseType': 'Choisissez votre type de compte',
  'auth.register.firstName': 'Prénom',
  'auth.register.lastName': 'Nom',
  'auth.register.address': 'Adresse',
  'auth.register.city': 'Ville',
  'auth.register.postalCode': 'Code postal',
  'auth.register.termsAccepted': 'J\'accepte les conditions d\'utilisation'
}

/**
 * Messages anglais par défaut
 */
const defaultTranslationsEn = {
  'auth.login.emailPlaceholder': 'Enter your email address',
  'auth.login.passwordPlaceholder': 'Enter your password',
  'auth.register.chooseType': 'Choose your account type',
  'auth.register.firstName': 'First name',
  'auth.register.lastName': 'Last name',
  'auth.register.address': 'Address',
  'auth.register.city': 'City',
  'auth.register.postalCode': 'Postal code',
  'auth.register.termsAccepted': 'I accept the terms of service'
}

/**
 * Détecter les labels manquants à partir des logs Next.js
 */
function detectMissingLabels(logContent) {
  const missingLabels = []
  const missingMessageRegex = /MISSING_MESSAGE: Could not resolve `([^`]+)` in messages for locale `([^`]+)`/g
  
  let match
  while ((match = missingMessageRegex.exec(logContent)) !== null) {
    const [, labelKey, locale] = match
    missingLabels.push({ key: labelKey, locale })
  }
  
  return missingLabels
}

/**
 * Lire le fichier de traduction
 */
function readTranslationFile(locale) {
  const filePath = path.join(process.cwd(), 'src/messages', `${locale}.json`)
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.warn(`⚠️  Impossible de lire ${filePath}:`, error.message)
    return {}
  }
}

/**
 * Écrire le fichier de traduction
 */
function writeTranslationFile(locale, translations) {
  const filePath = path.join(process.cwd(), 'src/messages', `${locale}.json`)
  try {
    const content = JSON.stringify(translations, null, 2)
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  } catch (error) {
    console.error(`❌ Impossible d'écrire ${filePath}:`, error.message)
    return false
  }
}

/**
 * Définir une valeur dans un objet imbriqué à partir d'une clé pointée
 */
function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
}

/**
 * Obtenir une valeur dans un objet imbriqué à partir d'une clé pointée
 */
function getNestedValue(obj, keyPath) {
  const keys = keyPath.split('.')
  let current = obj
  
  for (const key of keys) {
    if (!(key in current)) {
      return undefined
    }
    current = current[key]
  }
  
  return current
}

/**
 * Corriger les labels manquants
 */
function fixMissingLabels(missingLabels) {
  const fixes = { fr: 0, en: 0 }
  
  // Grouper par locale
  const byLocale = missingLabels.reduce((acc, label) => {
    if (!acc[label.locale]) acc[label.locale] = []
    acc[label.locale].push(label.key)
    return acc
  }, {})
  
  for (const [locale, keys] of Object.entries(byLocale)) {
    const translations = readTranslationFile(locale)
    let hasChanges = false
    
    for (const key of keys) {
      // Vérifier si la clé existe déjà
      if (getNestedValue(translations, key)) {
        if (options.verbose) {
          console.log(`ℹ️  Clé déjà présente: ${key} (${locale})`)
        }
        continue
      }
      
      // Obtenir la traduction par défaut
      let defaultValue
      if (locale === 'fr' && defaultTranslations[key]) {
        defaultValue = defaultTranslations[key]
      } else if (locale === 'en' && defaultTranslationsEn[key]) {
        defaultValue = defaultTranslationsEn[key]
      } else {
        // Générer une traduction basique à partir de la clé
        const lastPart = key.split('.').pop()
        defaultValue = `[TO_TRANSLATE] ${lastPart.replace(/([A-Z])/g, ' $1').toLowerCase()}`
      }
      
      // Ajouter la traduction
      setNestedValue(translations, key, defaultValue)
      hasChanges = true
      fixes[locale]++
      
      if (options.verbose) {
        console.log(`✅ Ajouté: ${key} = "${defaultValue}" (${locale})`)
      }
    }
    
    // Sauvegarder si il y a des changements
    if (hasChanges && !options.dryRun) {
      if (writeTranslationFile(locale, translations)) {
        console.log(`💾 Fichier ${locale}.json mis à jour`)
      }
    }
  }
  
  return fixes
}

/**
 * Surveiller les logs de l'application en continu
 */
function watchLogs() {
  console.log('👀 Mode surveillance activé - Démarrage du serveur Next.js...')
  
  const nextProcess = spawn('pnpm', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
  })
  
  let logBuffer = ''
  
  nextProcess.stdout.on('data', (data) => {
    const output = data.toString()
    logBuffer += output
    
    if (options.verbose) {
      process.stdout.write(output)
    }
    
    // Détecter les erreurs de labels manquants
    const missingLabels = detectMissingLabels(output)
    if (missingLabels.length > 0) {
      console.log(`\n🔍 Détecté ${missingLabels.length} label(s) manquant(s)`)
      
      if (options.fix) {
        const fixes = fixMissingLabels(missingLabels)
        console.log(`🔧 Corrigé: ${fixes.fr} FR, ${fixes.en} EN`)
      } else {
        missingLabels.forEach(label => {
          console.log(`  ❌ ${label.key} (${label.locale})`)
        })
        console.log('\n💡 Utilisez --fix pour corriger automatiquement')
      }
    }
  })
  
  nextProcess.stderr.on('data', (data) => {
    const output = data.toString()
    logBuffer += output
    
    if (options.verbose) {
      process.stderr.write(output)
    }
    
    // Détecter les erreurs de labels manquants dans stderr aussi
    const missingLabels = detectMissingLabels(output)
    if (missingLabels.length > 0) {
      console.log(`\n🔍 Détecté ${missingLabels.length} label(s) manquant(s) dans stderr`)
      
      if (options.fix) {
        const fixes = fixMissingLabels(missingLabels)
        console.log(`🔧 Corrigé: ${fixes.fr} FR, ${fixes.en} EN`)
      }
    }
  })
  
  nextProcess.on('close', (code) => {
    console.log(`\n📊 Serveur Next.js terminé avec le code ${code}`)
    
    // Analyser tout le buffer à la fin
    const allMissingLabels = detectMissingLabels(logBuffer)
    if (allMissingLabels.length > 0) {
      console.log(`\n📋 Résumé: ${allMissingLabels.length} label(s) manquant(s) total`)
      
      if (options.fix) {
        const fixes = fixMissingLabels(allMissingLabels)
        console.log(`✅ Total corrigé: ${fixes.fr} FR, ${fixes.en} EN`)
      }
    }
  })
  
  // Gérer l'arrêt propre
  process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du mode surveillance...')
    nextProcess.kill('SIGINT')
    process.exit(0)
  })
}

/**
 * Analyser un fichier de log existant
 */
function analyzeLogFile(logFile) {
  try {
    const logContent = fs.readFileSync(logFile, 'utf-8')
    const missingLabels = detectMissingLabels(logContent)
    
    console.log(`📄 Analyse du fichier: ${logFile}`)
    console.log(`🔍 Détecté ${missingLabels.length} label(s) manquant(s)`)
    
    if (missingLabels.length === 0) {
      console.log('✅ Aucun label manquant détecté')
      return
    }
    
    // Afficher les labels manquants
    const byLocale = missingLabels.reduce((acc, label) => {
      if (!acc[label.locale]) acc[label.locale] = []
      acc[label.locale].push(label.key)
      return acc
    }, {})
    
    for (const [locale, keys] of Object.entries(byLocale)) {
      console.log(`\n📋 Labels manquants (${locale}):`)
      keys.forEach(key => console.log(`  ❌ ${key}`))
    }
    
    if (options.fix) {
      console.log('\n🔧 Correction des labels manquants...')
      const fixes = fixMissingLabels(missingLabels)
      console.log(`✅ Corrigé: ${fixes.fr} FR, ${fixes.en} EN`)
    } else {
      console.log('\n💡 Utilisez --fix pour corriger automatiquement')
    }
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse du fichier ${logFile}:`, error.message)
  }
}

async function main() {
  try {
    console.log('🔧 EcoDeli Auto-Fix Missing Labels')
    console.log('===================================')
    
    if (options.verbose) {
      console.log('Configuration:')
      console.log(`  Mode surveillance: ${options.watch || false}`)
      console.log(`  Correction auto: ${options.fix || false}`)
      console.log(`  Fichier de log: ${options.logFile || 'N/A'}`)
      console.log(`  Mode dry-run: ${options.dryRun || false}`)
      console.log('')
    }
    
    if (options.dryRun) {
      console.log('🧪 MODE DRY RUN - Aucun fichier ne sera modifié')
      console.log('')
    }
    
    if (options.logFile) {
      // Analyser un fichier de log existant
      analyzeLogFile(options.logFile)
    } else if (options.watch) {
      // Mode surveillance continue
      watchLogs()
    } else {
      // Mode par défaut : corriger les labels connus manquants
      console.log('🔧 Correction des labels manquants connus...')
      const knownMissing = [
        { key: 'auth.login.emailPlaceholder', locale: 'fr' },
        { key: 'auth.login.passwordPlaceholder', locale: 'fr' },
        { key: 'auth.register.chooseType', locale: 'fr' },
        { key: 'auth.login.emailPlaceholder', locale: 'en' },
        { key: 'auth.login.passwordPlaceholder', locale: 'en' },
        { key: 'auth.register.chooseType', locale: 'en' }
      ]
      
      const fixes = fixMissingLabels(knownMissing)
      console.log(`✅ Corrigé: ${fixes.fr} FR, ${fixes.en} EN`)
    }
    
    console.log('')
    console.log('✨ Opération terminée avec succès!')
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
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