#!/usr/bin/env node

/**
 * Script pour remplacer les labels hardcodés par des appels de traduction
 * Usage: node replace-labels.js
 */

const fs = require('fs')
const path = require('path')
const fg = require('fast-glob')

// Configuration
const config = {
  scanDirs: [
    'src/app',
    'src/components', 
    'src/features'
  ],
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.test.*',
    '**/messages/**'
  ],
  labelsFile: 'scripts/i18n/extracted-labels.json',
  dryRun: false // Mettre à true pour simuler
}

/**
 * Charger les labels extraits
 */
function loadExtractedLabels() {
  if (!fs.existsSync(config.labelsFile)) {
    throw new Error(`Fichier de labels non trouvé: ${config.labelsFile}`)
  }
  
  const content = fs.readFileSync(config.labelsFile, 'utf-8')
  return JSON.parse(content)
}

/**
 * Scanner les fichiers selon la configuration
 */
async function scanFiles() {
  const patterns = config.scanDirs.map(dir => 
    `${dir}/**/*{${config.extensions.join(',')}}`
  )

  const files = await fg(patterns, {
    ignore: config.excludePatterns,
    onlyFiles: true
  })

  return [...new Set(files)]
}

/**
 * Déterminer le type de fichier et le hook de traduction approprié
 */
function getTranslationHook(filePath, isComponent = false) {
  // Pour les pages et composants React
  if (filePath.includes('.tsx') || filePath.includes('.jsx')) {
    return isComponent ? 'useTranslations' : 'useTranslations'
  }
  
  // Pour les fichiers TypeScript/JavaScript purs
  return 'getTranslations'
}

/**
 * Générer l'import de traduction approprié
 */
function generateTranslationImport(filePath, namespace = 'common') {
  if (filePath.includes('.tsx') || filePath.includes('.jsx')) {
    return `import { useTranslations } from 'next-intl'`
  }
  return `import { getTranslations } from 'next-intl/server'`
}

/**
 * Remplacer les labels dans un fichier
 */
function replaceLabelsInFile(filePath, labels) {
  let content = fs.readFileSync(filePath, 'utf-8')
  let modified = false
  let addedImport = false
  let usedNamespaces = new Set()

  // Grouper les labels par namespace pour ce fichier
  const fileLabels = labels.filter(label => 
    label.file === filePath.replace(process.cwd(), '') || 
    label.file === filePath
  )

  if (fileLabels.length === 0) {
    return { modified: false, content }
  }

  console.log(`  📝 Processing ${filePath} (${fileLabels.length} labels)`)

  // Remplacer chaque label
  for (const label of fileLabels) {
    // Construire le pattern de recherche
    const patterns = [
      `"${label.text}"`,
      `'${label.text}'`,
      `>${label.text}<`
    ]

    for (const pattern of patterns) {
      if (content.includes(pattern)) {
        // Déterminer le namespace
        usedNamespaces.add(label.namespace)
        
        // Construire le remplacement
        let replacement
        if (pattern.startsWith('>') && pattern.endsWith('<')) {
          // Texte JSX
          replacement = `>{t('${label.namespace}.${label.key}')}<`
        } else {
          // Chaîne normale
          replacement = `t('${label.namespace}.${label.key}')`
        }

        content = content.replace(pattern, replacement)
        modified = true
      }
    }
  }

  // Ajouter les imports et hooks si nécessaire
  if (modified && !addedImport) {
    // Vérifier si l'import existe déjà
    if (!content.includes('useTranslations') && !content.includes('getTranslations')) {
      // Ajouter l'import
      const importLine = generateTranslationImport(filePath)
      
      // Trouver la position après les autres imports
      const lines = content.split('\n')
      let importIndex = 0
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ') || lines[i].startsWith('const ') || lines[i].startsWith('let ')) {
          importIndex = i + 1
        } else if (lines[i].trim() === '') {
          continue
        } else {
          break
        }
      }
      
      lines.splice(importIndex, 0, importLine)
      content = lines.join('\n')
    }

    // Ajouter les hooks de traduction pour React
    if (filePath.includes('.tsx') || filePath.includes('.jsx')) {
      // Chercher la fonction/composant principal
      const componentMatch = content.match(/^(export\s+)?(default\s+)?function\s+(\w+)/m)
      if (componentMatch) {
        const componentName = componentMatch[3]
        
        // Ajouter les hooks de traduction
        for (const namespace of usedNamespaces) {
          const hookLine = `  const t = useTranslations('${namespace}')`
          
          // Trouver la position après l'ouverture de la fonction
          const functionStart = content.indexOf(`function ${componentName}`)
          if (functionStart !== -1) {
            const openBraceIndex = content.indexOf('{', functionStart)
            if (openBraceIndex !== -1) {
              const beforeBrace = content.substring(0, openBraceIndex + 1)
              const afterBrace = content.substring(openBraceIndex + 1)
              content = beforeBrace + '\n' + hookLine + '\n' + afterBrace
              break // Un seul hook pour le premier namespace trouvé
            }
          }
        }
      }
    }
  }

  return { modified, content }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔄 EcoDeli Label Replacer')
  console.log('=========================')
  
  const startTime = Date.now()
  
  try {
    // Charger les labels extraits
    console.log('📋 Loading extracted labels...')
    const labels = loadExtractedLabels()
    console.log(`Found ${labels.length} labels to replace`)

    // Scanner les fichiers
    console.log('🔍 Scanning files...')
    const files = await scanFiles()
    console.log(`📁 Found ${files.length} files to process`)

    let modifiedFiles = 0
    let totalReplacements = 0

    // Traiter chaque fichier
    for (const file of files) {
      try {
        const result = replaceLabelsInFile(file, labels)
        
        if (result.modified) {
          modifiedFiles++
          
          if (!config.dryRun) {
            fs.writeFileSync(file, result.content)
          }
          
          console.log(`  ✅ Modified ${file}`)
        }
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message)
      }
    }

    const duration = Date.now() - startTime

    console.log('')
    console.log('📊 Results:')
    console.log(`  📝 Files modified: ${modifiedFiles}`)
    console.log(`  🔄 Total replacements: ${totalReplacements}`)
    console.log(`  ⏱️  Time: ${duration}ms`)
    
    if (config.dryRun) {
      console.log('')
      console.log('🧪 DRY RUN: No files were actually modified')
      console.log('   Remove dryRun flag to apply changes')
    }

    console.log('')
    console.log('🎯 Next steps:')
    console.log('  1. Test your application to ensure translations work')
    console.log('  2. Update translation files in src/messages/')
    console.log('  3. Complete missing English translations')

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

// Vérifier les arguments de ligne de commande
if (process.argv.includes('--dry-run')) {
  config.dryRun = true
  console.log('🧪 Running in DRY RUN mode')
}

main()