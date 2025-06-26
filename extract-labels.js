#!/usr/bin/env node

/**
 * Script simplifié pour extraire les labels de traduction hardcodés
 * Usage: node extract-labels.js
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
  minLength: 3
}

// Patterns pour extraire les chaînes
const extractPatterns = [
  // Chaînes entre guillemets doubles
  /"([^"\\]|\\.){3,}"/g,
  // Chaînes entre guillemets simples  
  /'([^'\\]|\\.){3,}'/g,
  // Texte dans les balises JSX
  />([^<\n]{3,})</g,
  // Attributs placeholder, title, alt
  /(?:placeholder|title|alt|aria-label)=["']([^"'\n]{3,})["']/g
]

// Patterns à ignorer
const ignorePatterns = [
  /^[A-Z_]+$/, // Constantes
  /^[a-z]+([A-Z][a-z]*)*$/, // Variables camelCase
  /^\/|https?:\/\//, // URLs et chemins
  /^\d+$/, // Nombres
  /^[a-f0-9]{6,}$/, // Hash/IDs
  /className|style|src|href|console/, // Attributs techniques
  /^\s*$/, // Espaces vides
  /^[^a-zA-Z]*$/, // Pas de lettres
  /\{.*\}/, // Variables React/template
  /^t\(/, // Déjà traduit avec t()
  /useTranslations/, // Code de traduction
]

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

  return [...new Set(files)] // Supprimer les doublons
}

/**
 * Nettoyer le texte extrait
 */
function cleanText(text) {
  return text
    .replace(/^["']|["']$/g, '') // Supprimer les guillemets
    .replace(/\\n/g, ' ') // Remplacer \n par des espaces
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim()
}

/**
 * Vérifier si le texte doit être extrait
 */
function shouldExtractText(text) {
  if (text.length < config.minLength) return false
  return !ignorePatterns.some(pattern => pattern.test(text))
}

/**
 * Inférer le namespace basé sur le chemin
 */
function inferNamespace(filePath) {
  if (filePath.includes('/auth/')) return 'auth'
  if (filePath.includes('/dashboard/')) return 'dashboard'
  if (filePath.includes('/announcements/')) return 'announcements'
  if (filePath.includes('/deliveries/')) return 'deliveries'
  if (filePath.includes('/payments/')) return 'payments'
  if (filePath.includes('/admin/')) return 'admin'
  if (filePath.includes('/client/')) return 'client'
  if (filePath.includes('/deliverer/')) return 'deliverer'
  if (filePath.includes('/provider/')) return 'provider'
  if (filePath.includes('/merchant/')) return 'merchant'
  if (filePath.includes('/storage/')) return 'storage'
  if (filePath.includes('/booking/')) return 'bookings'
  if (filePath.includes('/tutorial/')) return 'tutorial'
  if (filePath.includes('/components/ui/')) return 'ui'
  if (filePath.includes('/components/')) return 'components'
  return 'common'
}

/**
 * Générer une clé de traduction
 */
function generateKey(text, existingKeys) {
  const cleanText = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Supprimer la ponctuation
    .replace(/\s+/g, '_')
    .split('_')
    .slice(0, 4) // Limiter à 4 mots
    .join('_')

  let key = cleanText
  let counter = 1
  
  while (existingKeys.has(key)) {
    key = `${cleanText}_${counter}`
    counter++
  }

  existingKeys.add(key)
  return key
}

/**
 * Extraire les labels d'un fichier
 */
function extractFromFile(filePath, existingKeys) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const labels = []

  for (const pattern of extractPatterns) {
    let match
    const globalPattern = new RegExp(pattern.source, pattern.flags)
    
    while ((match = globalPattern.exec(content)) !== null) {
      const rawText = match[1] || match[0]
      const text = cleanText(rawText)
      
      if (shouldExtractText(text)) {
        const namespace = inferNamespace(filePath)
        const key = generateKey(text, existingKeys)
        
        labels.push({
          key,
          text,
          namespace,
          file: filePath.replace(process.cwd(), ''),
          original: rawText
        })
      }
    }
  }

  return labels
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 EcoDeli Label Extractor')
  console.log('==========================')
  
  const startTime = Date.now()
  
  try {
    // Scanner les fichiers
    console.log('🔍 Scanning files...')
    const files = await scanFiles()
    console.log(`📁 Found ${files.length} files`)

    // Extraire les labels
    const allLabels = []
    const existingKeys = new Set()

    for (const file of files) {
      try {
        const labels = extractFromFile(file, existingKeys)
        allLabels.push(...labels)
      } catch (error) {
        console.error(`❌ Error in ${file}:`, error.message)
      }
    }

    // Supprimer les doublons par texte
    const uniqueLabels = []
    const seenTexts = new Set()

    for (const label of allLabels) {
      const key = `${label.text}:${label.namespace}`
      if (!seenTexts.has(key)) {
        seenTexts.add(key)
        uniqueLabels.push(label)
      }
    }

    console.log(`✅ Extracted ${uniqueLabels.length} unique labels`)

    // Grouper par namespace
    const byNamespace = uniqueLabels.reduce((acc, label) => {
      if (!acc[label.namespace]) acc[label.namespace] = []
      acc[label.namespace].push(label)
      return acc
    }, {})

    // Afficher les statistiques
    console.log('')
    console.log('📊 Labels by namespace:')
    Object.entries(byNamespace)
      .sort(([,a], [,b]) => b.length - a.length)
      .forEach(([namespace, labels]) => {
        console.log(`  ${namespace}: ${labels.length}`)
      })

    // Sauvegarder les résultats
    const outputDir = 'scripts/i18n'
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Fichier JSON avec tous les labels
    const jsonPath = path.join(outputDir, 'extracted-labels.json')
    fs.writeFileSync(jsonPath, JSON.stringify(uniqueLabels, null, 2))

    // Fichier de traduction FR/EN
    const translations = {
      fr: {},
      en: {}
    }

    for (const [namespace, labels] of Object.entries(byNamespace)) {
      translations.fr[namespace] = {}
      translations.en[namespace] = {}
      
      for (const label of labels) {
        translations.fr[namespace][label.key] = label.text
        translations.en[namespace][label.key] = `[TO_TRANSLATE] ${label.text}`
      }
    }

    const frPath = path.join(outputDir, 'translations-fr.json')
    const enPath = path.join(outputDir, 'translations-en.json')
    
    fs.writeFileSync(frPath, JSON.stringify(translations.fr, null, 2))
    fs.writeFileSync(enPath, JSON.stringify(translations.en, null, 2))

    // Rapport détaillé
    const reportLines = [
      '# Rapport d\'extraction de labels',
      `Date: ${new Date().toLocaleString('fr-FR')}`,
      `Total labels: ${uniqueLabels.length}`,
      '',
      '## Répartition par namespace:',
      ...Object.entries(byNamespace).map(([ns, labels]) => `- **${ns}**: ${labels.length} labels`),
      '',
      '## Exemples de labels extraits:',
      ''
    ]

    // Ajouter quelques exemples pour chaque namespace
    for (const [namespace, labels] of Object.entries(byNamespace)) {
      reportLines.push(`### ${namespace}`)
      labels.slice(0, 5).forEach(label => {
        reportLines.push(`- \`${label.key}\`: "${label.text}" (${label.file})`)
      })
      reportLines.push('')
    }

    const reportPath = path.join(outputDir, 'extraction-report.md')
    fs.writeFileSync(reportPath, reportLines.join('\n'))

    const duration = Date.now() - startTime

    console.log('')
    console.log('💾 Files generated:')
    console.log(`  📄 ${jsonPath}`)
    console.log(`  🇫🇷 ${frPath}`)
    console.log(`  🇬🇧 ${enPath}`)
    console.log(`  📝 ${reportPath}`)
    console.log('')
    console.log(`⏱️  Completed in ${duration}ms`)
    console.log('')
    console.log('🎯 Next steps:')
    console.log('  1. Review extracted labels in extraction-report.md')
    console.log('  2. Complete English translations in translations-en.json')
    console.log('  3. Use replace-labels.js to update source code')

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