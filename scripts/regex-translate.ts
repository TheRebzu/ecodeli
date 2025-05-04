import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { program } from 'commander';

// Types
interface TranslationEntry {
  key: string;
  value: string;
  file: string;
  line: number;
}

interface TranslationMap {
  [key: string]: string | TranslationMap;
}

interface AnalysisReport {
  totalFiles: number;
  totalStrings: number;
  alreadyTranslated: number;
  newTranslations: number;
  topFiles: { file: string; count: number }[];
}

class RegexTranslator {
  private rootDir: string;
  private messagesDir: string;
  private backupDir: string;
  private isDryRun: boolean;
  private translationMap: { [locale: string]: TranslationMap } = {};
  private existingKeys: Set<string> = new Set();
  private report: AnalysisReport = {
    totalFiles: 0,
    totalStrings: 0,
    alreadyTranslated: 0,
    newTranslations: 0,
    topFiles: []
  };
  private fileStringCounts: Map<string, number> = new Map();
  
  // Patterns
  private readonly STRING_PATTERNS = [
    /"([^"\\]*(?:\\.[^"\\]*)*)"/g,         // Double quotes
    /'([^'\\]*(?:\\.[^'\\]*)*)'/g,         // Single quotes
    /`([^`\\]*(?:\\.[^`\\]*)*)`/g,         // Template literals (simple)
    /<[^>]+>([^<]+)<\/[^>]+>/g,            // JSX text content
    /placeholder="([^"]+)"/g,              // Placeholder attributes
    /title="([^"]+)"/g,                    // Title attributes
    /label="([^"]+)"/g,                    // Label attributes
    /aria-label="([^"]+)"/g,               // Aria label attributes
    /alt="([^"]+)"/g                       // Alt text attributes
  ];
  
  // Patterns to ignore
  private readonly IGNORE_PATTERNS = [
    /^[0-9]+$/,                            // Numbers only
    /^[A-Z_]+$/,                           // Constants
    /^https?:\/\//,                        // URLs
    /^[a-f0-9]{8}-/,                       // UUIDs
    /^#[0-9a-f]{3,6}$/i,                   // Color codes
    /^[\d.]+%$/,                           // Percentages
    /^\d+(\.\d+)?px$/,                     // Dimensions in pixels
    /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/  // Emails
  ];

  constructor(options: { dryRun: boolean; backup: boolean; sourceLang: string; targetLangs: string[] }) {
    this.rootDir = process.cwd();
    this.messagesDir = path.join(this.rootDir, 'src', 'messages');
    this.backupDir = path.join(this.rootDir, 'backup', 'messages', new Date().toISOString().replace(/:/g, '-'));
    this.isDryRun = options.dryRun;

    if (options.backup) {
      this.createBackup();
    }

    // Charger les fichiers de traduction existants
    this.loadExistingTranslations(options.sourceLang, options.targetLangs);
  }

  /**
   * Crée une sauvegarde des fichiers de traduction
   */
  private createBackup(): void {
    if (this.isDryRun) {
      console.log(chalk.yellow('Mode dry-run: ignorer la création de sauvegarde'));
      return;
    }

    if (!fs.existsSync(this.messagesDir)) {
      console.error(chalk.red(`Le répertoire des messages n'existe pas: ${this.messagesDir}`));
      return;
    }

    fs.mkdirSync(this.backupDir, { recursive: true });
    const messageFiles = fs.readdirSync(this.messagesDir);

    messageFiles.forEach(file => {
      if (file.endsWith('.json')) {
        const source = path.join(this.messagesDir, file);
        const dest = path.join(this.backupDir, file);
        fs.copyFileSync(source, dest);
      }
    });

    console.log(chalk.green(`Sauvegarde créée dans: ${this.backupDir}`));
  }

  /**
   * Charge les fichiers de traduction existants
   */
  private loadExistingTranslations(sourceLang: string, targetLangs: string[]): void {
    const allLocales = [sourceLang, ...targetLangs];

    allLocales.forEach(locale => {
      const filePath = path.join(this.messagesDir, `${locale}.json`);
      
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          this.translationMap[locale] = JSON.parse(content);
          
          // Collecter toutes les clés existantes
          this.collectExistingKeys(this.translationMap[locale]);
        } catch (error) {
          console.error(chalk.red(`Erreur lors du chargement de ${filePath}:`), error);
          this.translationMap[locale] = {};
        }
      } else {
        console.log(chalk.yellow(`Fichier ${filePath} non trouvé, création d'un nouveau fichier`));
        this.translationMap[locale] = {};
      }
    });
  }

  /**
   * Collecte toutes les clés de traduction existantes
   */
  private collectExistingKeys(obj: TranslationMap, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string') {
        this.existingKeys.add(fullKey);
      } else {
        this.collectExistingKeys(value as TranslationMap, fullKey);
      }
    }
  }

  /**
   * Analyse tous les fichiers du projet pour trouver les chaînes à traduire
   */
  public async analyzeFiles(ignorePaths: string[]): Promise<TranslationEntry[]> {
    const entries: TranslationEntry[] = [];
    
    // Motifs d'exclusion pour glob
    const excludePatterns = ignorePaths.map(p => `!${p}/**/*`);
    
    // Trouver tous les fichiers TypeScript/JavaScript/React
    const files = glob.sync([
      'src/**/*.{ts,tsx,js,jsx}',
      ...excludePatterns
    ], { cwd: this.rootDir });

    this.report.totalFiles = files.length;
    console.log(chalk.blue(`Analyse de ${files.length} fichiers...`));
    
    for (const file of files) {
      const filePath = path.join(this.rootDir, file);
      const result = await this.analyzeFile(filePath);
      
      entries.push(...result.entries);
      this.report.totalStrings += result.totalStrings;
      this.report.alreadyTranslated += result.alreadyTranslated;
      
      if (result.entries.length > 0) {
        this.fileStringCounts.set(file, result.entries.length);
      }
    }
    
    // Trier les fichiers par nombre de chaînes à traduire
    this.report.topFiles = [...this.fileStringCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, count }));
    
    this.report.newTranslations = entries.length;
    
    return entries;
  }

  /**
   * Analyse un fichier pour trouver les chaînes à traduire
   */
  private async analyzeFile(filePath: string): Promise<{ entries: TranslationEntry[], totalStrings: number, alreadyTranslated: number }> {
    const entries: TranslationEntry[] = [];
    let totalStrings = 0;
    let alreadyTranslated = 0;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Vérifier si le fichier utilise déjà les traductions
      const usesTranslation = content.includes('useTranslations') || 
                              content.includes('getTranslations');
      
      // Compter les appels existants de traduction
      if (usesTranslation) {
        const tFunctionCalls = content.match(/t\(['"](.*?)['"](?:,|\))/g) || [];
        alreadyTranslated = tFunctionCalls.length;
        totalStrings += alreadyTranslated;
      }
      
      // Parcourir chaque ligne
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        
        // Si la ligne contient un commentaire, ignorer
        if (line.trim().startsWith('//')) continue;
        
        // Analyser avec les patterns de chaînes
        for (const pattern of this.STRING_PATTERNS) {
          pattern.lastIndex = 0; // Réinitialiser
          let match;
          
          while ((match = pattern.exec(line)) !== null) {
            const text = match[1];
            
            // Ignorer les chaînes vides ou trop courtes ou trop longues
            if (!text || text.length < 2 || text.length > 1000) continue;
            
            // Ignorer les chaînes qui matchent les patterns à ignorer
            if (this.IGNORE_PATTERNS.some(pattern => pattern.test(text))) continue;
            
            // Ignorer les imports, requires, et autres cas spéciaux
            if (line.includes('import ') || line.includes('require(')) continue;
            
            totalStrings++;
            
            // Extraire le contexte
            const fileRelative = path.relative(this.rootDir, filePath);
            const pathParts = fileRelative.split(path.sep);
            const componentName = path.basename(filePath, path.extname(filePath));
            
            // Générer une clé basée sur le chemin et le contenu
            const moduleName = pathParts[1] || 'common';
            const subModule = pathParts[2] || '';
            const featurePrefix = subModule ? `${moduleName}.${subModule}` : moduleName;
            
            // Nettoyer le texte pour la clé
            const cleanedText = text
              .trim()
              .toLowerCase()
              .replace(/[^\w\s]/g, '')
              .replace(/\s+/g, '_')
              .slice(0, 20);
            
            const key = `${featurePrefix}.${componentName}.${cleanedText}`;
            
            // Vérifier si cette clé existe déjà
            if (this.existingKeys.has(key)) {
              alreadyTranslated++;
              continue;
            }
            
            entries.push({
              key,
              value: text,
              file: fileRelative,
              line: lineIndex + 1
            });
          }
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`Erreur lors de l'analyse de ${filePath}:`), error);
    }
    
    return {
      entries,
      totalStrings,
      alreadyTranslated
    };
  }

  /**
   * Met à jour les fichiers de traduction avec les nouvelles entrées
   */
  public async updateTranslationFiles(entries: TranslationEntry[], sourceLang: string, targetLangs: string[]): Promise<void> {
    console.log(chalk.blue(`Mise à jour des fichiers de traduction...`));
    
    // Ajouter les nouvelles entrées au fichier source
    let updatedSourceMap = { ...this.translationMap[sourceLang] };
    
    for (const entry of entries) {
      if (!this.hasNestedValue(updatedSourceMap, entry.key)) {
        this.setNestedValue(updatedSourceMap, entry.key, entry.value);
      }
    }
    
    // Écrire le fichier source mis à jour
    const sourceFilePath = path.join(this.messagesDir, `${sourceLang}.json`);
    if (!this.isDryRun) {
      fs.writeFileSync(sourceFilePath, JSON.stringify(updatedSourceMap, null, 2));
    }
    
    // Mettre à jour les fichiers cibles
    for (const targetLang of targetLangs) {
      let updatedTargetMap = { ...this.translationMap[targetLang] };
      
      // Pour chaque entrée, ajouter la clé si elle n'existe pas
      for (const entry of entries) {
        if (!this.hasNestedValue(updatedTargetMap, entry.key)) {
          // Pour les langues cibles, ajouter la valeur source sans les préfixes [lang]
          const valueForTarget = entry.value;
          
          // Supprimer les préfixes comme [fr] ou [en] si présents
          let cleanValue = valueForTarget;
          if (typeof valueForTarget === 'string') {
            if (valueForTarget.startsWith(`[${targetLang}] `)) {
              cleanValue = valueForTarget.substring(targetLang.length + 3);
            } else if (valueForTarget.startsWith(`[${sourceLang}] `)) {
              cleanValue = valueForTarget.substring(sourceLang.length + 3);
            }
          }
          
          this.setNestedValue(updatedTargetMap, entry.key, cleanValue);
        }
      }
      
      // Écrire le fichier cible mis à jour
      const targetFilePath = path.join(this.messagesDir, `${targetLang}.json`);
      if (!this.isDryRun) {
        fs.writeFileSync(targetFilePath, JSON.stringify(updatedTargetMap, null, 2));
      }
    }
    
    console.log(chalk.green(`Fichiers de traduction mis à jour avec succès.`));
  }

  /**
   * Vérifie si une valeur imbriquée existe dans un objet
   */
  private hasNestedValue(obj: TranslationMap, key: string): boolean {
    const parts = key.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (i === parts.length - 1) {
        return current.hasOwnProperty(part) && typeof current[part] === 'string';
      }
      
      if (!current[part] || typeof current[part] !== 'object') {
        return false;
      }
      
      current = current[part] as TranslationMap;
    }
    
    return false;
  }

  /**
   * Définit une valeur imbriquée dans un objet
   */
  private setNestedValue(obj: TranslationMap, key: string, value: string): void {
    const parts = key.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!current[part]) {
        current[part] = {};
      }
      
      current = current[part] as TranslationMap;
    }
    
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Génère un rapport de l'analyse
   */
  public generateReport(): void {
    console.log(chalk.blue('\n========== Rapport d\'analyse de traduction =========='));
    console.log(chalk.blue(`Fichiers analysés: ${this.report.totalFiles}`));
    console.log(chalk.blue(`Chaînes trouvées: ${this.report.totalStrings}`));
    console.log(chalk.blue(`Déjà traduites: ${this.report.alreadyTranslated}`));
    console.log(chalk.blue(`Nouvelles traductions nécessaires: ${this.report.newTranslations}`));
    
    if (this.report.topFiles.length > 0) {
      console.log(chalk.blue('\nTop fichiers nécessitant des traductions:'));
      this.report.topFiles.forEach(({ file, count }) => {
        console.log(chalk.blue(`- ${file} (${count} chaînes)`));
      });
    }
    
    // Générer un rapport JSON
    const reportPath = path.join(this.rootDir, 'translation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(chalk.green(`\nRapport complet généré: ${reportPath}`));
  }
}

// Configuration des commandes CLI
program
  .version('1.0.0')
  .description('Outil d\'automatisation des traductions pour Next.js')
  .option('--analyze', 'Analyser uniquement sans modifier les fichiers')
  .option('--extract', 'Extraire les chaînes et mettre à jour les fichiers de traduction')
  .option('--all', 'Exécuter tout le processus')
  .option('--check', 'Vérifier l\'état des traductions sans modifier les fichiers')
  .option('--report', 'Générer un rapport détaillé')
  .option('--backup', 'Créer une sauvegarde avant toute modification')
  .option('--dry-run', 'Exécuter sans modifier les fichiers (simulation)')
  .option('--source-lang <lang>', 'Langue source', 'en')
  .option('--target-langs <langs>', 'Langues cibles (séparées par des virgules)', val => val.split(','), ['fr']);

program.parse(process.argv);

const options = program.opts();

// Mode dry-run par défaut si aucune option de modification spécifiée
const dryRun = options.dryRun || (!options.extract && !options.all);

// Chemins à ignorer lors de l'analyse
const ignorePaths = [
  'node_modules',
  'dist',
  'build',
  '.next',
  'public/static',
  'tests'
];

// Fonction principale
async function main() {
  console.log(chalk.blue('Initialisation du traducteur automatique...'));
  
  const translator = new RegexTranslator({
    dryRun,
    backup: options.backup || false,
    sourceLang: options.sourceLang,
    targetLangs: options.targetLangs
  });
  
  // Analyse des fichiers
  console.log(chalk.blue('Analyse des fichiers...'));
  const entries = await translator.analyzeFiles(ignorePaths);
  
  if (options.analyze || options.check || options.report) {
    translator.generateReport();
  }
  
  // Extraction et mise à jour des fichiers de traduction
  if (options.extract || options.all) {
    console.log(chalk.blue('Mise à jour des fichiers de traduction...'));
    await translator.updateTranslationFiles(entries, options.sourceLang, options.targetLangs);
  }
  
  console.log(chalk.green('\nTraitement terminé!'));
  
  if (dryRun) {
    console.log(chalk.yellow('Mode dry-run: aucun fichier n\'a été modifié.'));
    console.log(chalk.yellow('Pour appliquer les modifications, exécutez à nouveau sans l\'option --dry-run.'));
  }
}

main().catch(error => {
  console.error(chalk.red('Erreur fatale:'), error);
  process.exit(1);
}); 