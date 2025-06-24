import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

/**
 * Configuration pour l'extraction de labels
 */
export interface ExtractConfig {
  // Répertoires à scanner
  scanDirs: string[]
  // Extensions de fichiers à inclure
  extensions: string[]
  // Patterns à ignorer
  excludePatterns: string[]
  // Taille minimale des chaînes à extraire
  minLength: number
  // Patterns de chaînes à extraire
  extractPatterns: RegExp[]
  // Fichiers de sortie
  outputDir: string
}

/**
 * Structure d'un label extrait
 */
export interface ExtractedLabel {
  text: string
  file: string
  line: number
  column: number
  context: string
  suggestedKey: string
  namespace?: string
}

/**
 * Configuration par défaut
 */
const defaultConfig: ExtractConfig = {
  scanDirs: ['src/app', 'src/components', 'src/features'],
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/messages/**'
  ],
  minLength: 3,
  extractPatterns: [
    // Chaînes entre guillemets simples et doubles
    /"([^"\\]|\\.){3,}"/g,
    /'([^'\\]|\\.){3,}'/g,
    // Chaînes dans les composants JSX
    />([^<]{3,})</g,
    // Attributs placeholder, title, alt
    /(?:placeholder|title|alt|aria-label)=["']([^"']{3,})["']/g,
    // Texte dans les boutons et liens
    /<(?:button|a)[^>]*>([^<]{3,})</gi
  ],
  outputDir: 'scripts/i18n'
}

/**
 * Classe principale pour l'extraction de labels
 */
export class LabelExtractor {
  private config: ExtractConfig
  private extractedLabels: ExtractedLabel[] = []
  private existingKeys: Set<string> = new Set()

  constructor(config: Partial<ExtractConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.loadExistingKeys()
  }

  /**
   * Charger les clés existantes depuis les fichiers de traduction
   */
  private async loadExistingKeys() {
    try {
      const frMessages = await import('@/messages/fr.json')
      this.collectKeys(frMessages.default, '')
    } catch (error) {
      console.warn('Impossible de charger les clés existantes:', error)
    }
  }

  /**
   * Collecter toutes les clés depuis un objet de traduction
   */
  private collectKeys(obj: any, prefix: string) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      
      if (typeof value === 'string') {
        this.existingKeys.add(fullKey)
      } else if (typeof value === 'object' && value !== null) {
        this.collectKeys(value, fullKey)
      }
    }
  }

  /**
   * Scanner tous les fichiers selon la configuration
   */
  async scanFiles(): Promise<string[]> {
    const patterns = this.config.scanDirs.map(dir => 
      `${dir}/**/*{${this.config.extensions.join(',')}}`
    )

    const files: string[] = []
    
    for (const pattern of patterns) {
      const matchedFiles = await glob(pattern, {
        ignore: this.config.excludePatterns
      })
      files.push(...matchedFiles)
    }

    return [...new Set(files)] // Supprimer les doublons
  }

  /**
   * Extraire les labels d'un fichier
   */
  async extractFromFile(filePath: string): Promise<ExtractedLabel[]> {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const labels: ExtractedLabel[] = []

    for (const pattern of this.config.extractPatterns) {
      let match
      const globalPattern = new RegExp(pattern.source, pattern.flags)
      
      while ((match = globalPattern.exec(content)) !== null) {
        const text = this.cleanExtractedText(match[1] || match[0])
        
        if (this.shouldExtractText(text)) {
          const position = this.getLinePosition(content, match.index)
          const context = this.getContext(lines, position.line)
          
          labels.push({
            text,
            file: filePath,
            line: position.line + 1,
            column: position.column + 1,
            context,
            suggestedKey: this.generateKey(text, filePath),
            namespace: this.inferNamespace(filePath, context)
          })
        }
      }
    }

    return labels
  }

  /**
   * Nettoyer le texte extrait
   */
  private cleanExtractedText(text: string): string {
    return text
      .replace(/^["']|["']$/g, '') // Supprimer les guillemets
      .replace(/\\n/g, ' ') // Remplacer les \n par des espaces
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim()
  }

  /**
   * Vérifier si le texte doit être extrait
   */
  private shouldExtractText(text: string): boolean {
    if (text.length < this.config.minLength) return false
    
    // Ignorer les variables, chemins, URLs, etc.
    const ignorePatterns = [
      /^[A-Z_]+$/, // Constantes
      /^[a-z]+([A-Z][a-z]*)*$/, // camelCase variables
      /^\/|https?:\/\//, // Chemins et URLs
      /^\d+$/, // Nombres uniquement
      /^[a-f0-9]{6,}$/, // Hash/IDs
      /console\.|console$/, // Console
      /className|style|src|href/, // Attributs techniques
    ]

    return !ignorePatterns.some(pattern => pattern.test(text))
  }

  /**
   * Obtenir la position ligne/colonne dans le fichier
   */
  private getLinePosition(content: string, index: number): { line: number; column: number } {
    const beforeMatch = content.substring(0, index)
    const lines = beforeMatch.split('\n')
    
    return {
      line: lines.length - 1,
      column: lines[lines.length - 1].length
    }
  }

  /**
   * Obtenir le contexte autour d'une ligne
   */
  private getContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 2)
    const end = Math.min(lines.length, lineIndex + 3)
    
    return lines.slice(start, end).join('\n')
  }

  /**
   * Générer une clé de traduction
   */
  private generateKey(text: string, filePath: string): string {
    // Nettoyer le texte pour créer une clé
    const cleanText = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Supprimer la ponctuation
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 4) // Limiter à 4 mots
      .join('_')

    // Ajouter un suffixe si la clé existe déjà
    let key = cleanText
    let counter = 1
    
    while (this.existingKeys.has(key)) {
      key = `${cleanText}_${counter}`
      counter++
    }

    this.existingKeys.add(key)
    return key
  }

  /**
   * Inférer le namespace basé sur le chemin du fichier
   */
  private inferNamespace(filePath: string, context: string): string {
    // Analyser le chemin du fichier
    if (filePath.includes('/auth/')) return 'auth'
    if (filePath.includes('/dashboard/')) return 'dashboard'
    if (filePath.includes('/announcements/')) return 'announcements'
    if (filePath.includes('/deliveries/')) return 'deliveries'
    if (filePath.includes('/payments/')) return 'payments'
    if (filePath.includes('/admin/')) return 'admin'
    
    // Analyser le contexte
    if (context.includes('error') || context.includes('Error')) return 'errors'
    if (context.includes('button') || context.includes('Button')) return 'common'
    if (context.includes('form') || context.includes('Form')) return 'forms'
    
    return 'common'
  }

  /**
   * Lancer l'extraction complète
   */
  async extract(): Promise<ExtractedLabel[]> {
    console.log('🔍 Scanning files for hardcoded labels...')
    
    const files = await this.scanFiles()
    console.log(`📁 Found ${files.length} files to scan`)

    this.extractedLabels = []
    
    for (const file of files) {
      try {
        const labels = await this.extractFromFile(file)
        this.extractedLabels.push(...labels)
      } catch (error) {
        console.error(`❌ Error scanning ${file}:`, error)
      }
    }

    // Supprimer les doublons
    this.extractedLabels = this.deduplicateLabels(this.extractedLabels)
    
    console.log(`✅ Extracted ${this.extractedLabels.length} unique labels`)
    return this.extractedLabels
  }

  /**
   * Supprimer les labels dupliqués
   */
  private deduplicateLabels(labels: ExtractedLabel[]): ExtractedLabel[] {
    const seen = new Map<string, ExtractedLabel>()
    
    for (const label of labels) {
      const key = `${label.text}:${label.namespace}`
      if (!seen.has(key)) {
        seen.set(key, label)
      }
    }
    
    return Array.from(seen.values())
  }

  /**
   * Générer le rapport d'extraction
   */
  generateReport(): string {
    const reportLines = [
      '# Rapport d\'extraction de labels',
      `Date: ${new Date().toISOString()}`,
      `Total labels: ${this.extractedLabels.length}`,
      '',
      '## Labels par namespace:',
    ]

    // Grouper par namespace
    const byNamespace = this.extractedLabels.reduce((acc, label) => {
      const ns = label.namespace || 'unknown'
      if (!acc[ns]) acc[ns] = []
      acc[ns].push(label)
      return acc
    }, {} as Record<string, ExtractedLabel[]>)

    for (const [namespace, labels] of Object.entries(byNamespace)) {
      reportLines.push(`- ${namespace}: ${labels.length}`)
    }

    reportLines.push('', '## Labels détaillés:', '')

    for (const label of this.extractedLabels) {
      reportLines.push(
        `### ${label.suggestedKey}`,
        `**Texte:** "${label.text}"`,
        `**Fichier:** ${label.file}:${label.line}:${label.column}`,
        `**Namespace:** ${label.namespace}`,
        '```typescript',
        label.context,
        '```',
        ''
      )
    }

    return reportLines.join('\n')
  }

  /**
   * Sauvegarder les résultats
   */
  async saveResults(): Promise<void> {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true })
    }

    // Sauvegarder le JSON
    const jsonPath = path.join(this.config.outputDir, 'extracted-labels.json')
    fs.writeFileSync(jsonPath, JSON.stringify(this.extractedLabels, null, 2))

    // Sauvegarder le rapport Markdown
    const reportPath = path.join(this.config.outputDir, 'extraction-report.md')
    fs.writeFileSync(reportPath, this.generateReport())

    console.log(`💾 Results saved to:`)
    console.log(`   - ${jsonPath}`)
    console.log(`   - ${reportPath}`)
  }
}

/**
 * Fonction utilitaire pour lancer l'extraction
 */
export async function extractLabels(config?: Partial<ExtractConfig>): Promise<ExtractedLabel[]> {
  const extractor = new LabelExtractor(config)
  const labels = await extractor.extract()
  await extractor.saveResults()
  return labels
} 