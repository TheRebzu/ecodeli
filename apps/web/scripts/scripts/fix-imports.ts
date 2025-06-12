#!/usr/bin/env tsx
// scripts/fix-imports.ts

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

interface ImportFix {
  file: string;
  original: string;
  fixed: string;
  reason: string;
  line: number;
}

interface ImportAnalysis {
  file: string;
  imports: {
    line: number;
    original: string;
    module: string;
    isRelative: boolean;
    isAlias: boolean;
    canBeOptimized: boolean;
  }[];
}

class ImportFixer {
  private projectRoot: string;
  private srcPath: string;
  private fixes: ImportFix[] = [];
  private isDryRun: boolean;
  private verbose: boolean;
  private generateReport: boolean;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.srcPath = path.join(projectRoot, 'src');
    this.isDryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
    this.generateReport = process.argv.includes('--report');
  }

  async run(): Promise<void> {
    console.log(chalk.bold.cyan('🔧 EcoDeli - Correcteur automatique d\'imports\n'));

    if (this.isDryRun) {
      console.log(chalk.yellow('🔍 Mode simulation activé (--dry-run)\n'));
    }

    try {
      // 1. Trouver tous les fichiers TS/TSX
      const files = await this.findTypeScriptFiles();
      console.log(chalk.blue(`📁 ${files.length} fichier(s) TypeScript trouvé(s)\n`));

      // 2. Analyser les imports de chaque fichier
      const analyses = await this.analyzeImports(files);
      
      // 3. Identifier les corrections possibles
      await this.identifyFixes(analyses);
      
      // 4. Appliquer les corrections
      if (!this.isDryRun && this.fixes.length > 0) {
        await this.applyFixes();
      }
      
      // 5. Générer le rapport
      await this.generateReportFile();
      
      // 6. Afficher le résumé
      this.displaySummary();

    } catch (error) {
      console.error(chalk.red('❌ Erreur lors de la correction des imports :'), error);
      process.exit(1);
    }
  }

  private async findTypeScriptFiles(): Promise<string[]> {
    const patterns = [
      'src/**/*.ts',
      'src/**/*.tsx',
      '!src/**/*.d.ts',
      '!src/**/*.test.ts',
      '!src/**/*.test.tsx',
      '!node_modules/**'
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { cwd: this.projectRoot });
      files.push(...matches.map(f => path.resolve(this.projectRoot, f)));
    }

    return [...new Set(files)];
  }

  private async analyzeImports(files: string[]): Promise<ImportAnalysis[]> {
    console.log(chalk.blue('🔍 Analyse des imports...'));
    
    const analyses: ImportAnalysis[] = [];
    
    for (const file of files) {
      const analysis = await this.analyzeFileImports(file);
      if (analysis.imports.length > 0) {
        analyses.push(analysis);
      }
    }
    
    return analyses;
  }

  private async analyzeFileImports(filePath: string): Promise<ImportAnalysis> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const imports: ImportAnalysis['imports'] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const importMatch = this.parseImportLine(line);
      
      if (importMatch) {
        imports.push({
          line: i + 1,
          original: line,
          module: importMatch.module,
          isRelative: importMatch.module.startsWith('.'),
          isAlias: importMatch.module.startsWith('@/'),
          canBeOptimized: this.canOptimizeImport(importMatch.module, filePath)
        });
      }
    }
    
    return {
      file: filePath,
      imports
    };
  }

  private parseImportLine(line: string): { module: string; importNames: string[] } | null {
    // Regex pour différents formats d'import
    const patterns = [
      // import { ... } from '...'
      /^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/,
      // import ... from '...'
      /^import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/,
      // import * as ... from '...'
      /^import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/,
      // import '...'
      /^import\s+['"]([^'"]+)['"];?/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const module = match[match.length - 1]; // Le module est toujours le dernier groupe
        const importNames = match[1] ? match[1].split(',').map(s => s.trim()) : [];
        return { module, importNames };
      }
    }

    return null;
  }

  private canOptimizeImport(module: string, filePath: string): boolean {
    // Peut être optimisé si c'est un import relatif vers src/
    if (!module.startsWith('.')) return false;
    
    const absolutePath = path.resolve(path.dirname(filePath), module);
    return absolutePath.startsWith(this.srcPath);
  }

  private async identifyFixes(analyses: ImportAnalysis[]): Promise<void> {
    console.log(chalk.blue('🎯 Identification des corrections possibles...'));
    
    for (const analysis of analyses) {
      for (const importItem of analysis.imports) {
        await this.checkImport(analysis.file, importItem);
      }
    }
    
    console.log(chalk.yellow(`📋 ${this.fixes.length} correction(s) identifiée(s)\n`));
  }

  private async checkImport(filePath: string, importItem: ImportAnalysis['imports'][0]): Promise<void> {
    const fixes: ImportFix[] = [];
    
    // 1. Convertir les imports relatifs en alias @/
    if (importItem.canBeOptimized && !importItem.isAlias) {
      const aliasImport = this.convertToAlias(importItem.module, filePath);
      if (aliasImport && aliasImport !== importItem.module) {
        fixes.push({
          file: filePath,
          original: importItem.original,
          fixed: importItem.original.replace(importItem.module, aliasImport),
          reason: 'Conversion en alias @/',
          line: importItem.line
        });
      }
    }
    
    // 2. Corriger les extensions manquantes
    if (importItem.isRelative || importItem.isAlias) {
      const withExtension = await this.addMissingExtension(importItem.module, filePath);
      if (withExtension && withExtension !== importItem.module) {
        fixes.push({
          file: filePath,
          original: importItem.original,
          fixed: importItem.original.replace(importItem.module, withExtension),
          reason: 'Ajout extension manquante',
          line: importItem.line
        });
      }
    }
    
    // 3. Optimiser les imports barrel
    const barrelOptimized = this.optimizeBarrelImport(importItem.original, importItem.module);
    if (barrelOptimized && barrelOptimized !== importItem.original) {
      fixes.push({
        file: filePath,
        original: importItem.original,
        fixed: barrelOptimized,
        reason: 'Optimisation import barrel',
        line: importItem.line
      });
    }
    
    // 4. Trier les imports destructurés
    const sortedImport = this.sortDestructuredImports(importItem.original);
    if (sortedImport && sortedImport !== importItem.original) {
      fixes.push({
        file: filePath,
        original: importItem.original,
        fixed: sortedImport,
        reason: 'Tri des imports destructurés',
        line: importItem.line
      });
    }
    
    // Ajouter les corrections (prendre la plus pertinente)
    if (fixes.length > 0) {
      // Prioriser : alias > extension > barrel > tri
      const priorityOrder = ['Conversion en alias @/', 'Ajout extension manquante', 'Optimisation import barrel', 'Tri des imports destructurés'];
      const bestFix = fixes.sort((a, b) => 
        priorityOrder.indexOf(a.reason) - priorityOrder.indexOf(b.reason)
      )[0];
      
      this.fixes.push(bestFix);
    }
  }

  private convertToAlias(module: string, filePath: string): string | null {
    if (!module.startsWith('.')) return null;
    
    const absolutePath = path.resolve(path.dirname(filePath), module);
    const relativePath = path.relative(this.srcPath, absolutePath);
    
    if (relativePath.startsWith('..')) return null; // En dehors de src/
    
    return '@/' + relativePath.replace(/\\/g, '/');
  }

  private async addMissingExtension(module: string, filePath: string): Promise<string | null> {
    // Si l'extension existe déjà, ne rien faire
    if (path.extname(module)) return null;
    
    let basePath: string;
    if (module.startsWith('@/')) {
      basePath = path.join(this.srcPath, module.slice(2));
    } else if (module.startsWith('.')) {
      basePath = path.resolve(path.dirname(filePath), module);
    } else {
      return null; // Import externe
    }
    
    // Essayer différentes extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    for (const ext of extensions) {
      const fullPath = basePath + ext;
      try {
        await fs.access(fullPath);
        return module + ext;
      } catch {
        // Fichier n'existe pas, continuer
      }
    }
    
    // Essayer avec index
    for (const ext of extensions) {
      const indexPath = path.join(basePath, 'index' + ext);
      try {
        await fs.access(indexPath);
        return module + '/index' + ext;
      } catch {
        // Fichier n'existe pas, continuer
      }
    }
    
    return null;
  }

  private optimizeBarrelImport(importLine: string, module: string): string | null {
    // Optimiser les imports depuis des barrels (index.ts)
    if (!importLine.includes('{') || !module.includes('/index')) return null;
    
    // Exemple: import { Button } from '@/components/ui/index'
    // Devient: import { Button } from '@/components/ui'
    const optimized = importLine.replace(/\/index(['"])/g, '$1');
    return optimized !== importLine ? optimized : null;
  }

  private sortDestructuredImports(importLine: string): string | null {
    const match = importLine.match(/^(\s*import\s+\{)([^}]+)(\}\s+from\s+.+)$/);
    if (!match) return null;
    
    const [, prefix, imports, suffix] = match;
    const importList = imports.split(',').map(s => s.trim()).filter(Boolean);
    
    if (importList.length <= 1) return null;
    
    const sorted = importList.sort((a, b) => {
      // Mettre les imports avec 'type' en premier
      const aIsType = a.startsWith('type ');
      const bIsType = b.startsWith('type ');
      
      if (aIsType && !bIsType) return -1;
      if (!aIsType && bIsType) return 1;
      
      // Puis tri alphabétique
      return a.localeCompare(b);
    });
    
    if (JSON.stringify(sorted) === JSON.stringify(importList)) return null;
    
    return `${prefix} ${sorted.join(', ')} ${suffix}`;
  }

  private async applyFixes(): Promise<void> {
    console.log(chalk.blue('🔧 Application des corrections...\n'));
    
    // Grouper les corrections par fichier
    const fixesByFile = new Map<string, ImportFix[]>();
    
    for (const fix of this.fixes) {
      const fixes = fixesByFile.get(fix.file) || [];
      fixes.push(fix);
      fixesByFile.set(fix.file, fixes);
    }
    
    // Appliquer les corrections fichier par fichier
    for (const [filePath, fixes] of fixesByFile) {
      try {
        await this.applyFixesToFile(filePath, fixes);
        console.log(chalk.green(`✅ ${path.relative(this.projectRoot, filePath)}: ${fixes.length} correction(s)`));
        
        if (this.verbose) {
          for (const fix of fixes) {
            console.log(chalk.gray(`    L${fix.line}: ${fix.reason}`));
          }
        }
      } catch (error) {
        console.log(chalk.red(`❌ ${path.relative(this.projectRoot, filePath)}: ${(error as Error).message}`));
      }
    }
  }

  private async applyFixesToFile(filePath: string, fixes: ImportFix[]): Promise<void> {
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Trier les corrections par ligne (de la fin vers le début pour éviter les décalages)
    const sortedFixes = fixes.sort((a, b) => b.line - a.line);
    
    for (const fix of sortedFixes) {
      content = content.replace(fix.original, fix.fixed);
    }
    
    await fs.writeFile(filePath, content);
  }

  private async generateReportFile(): Promise<void> {
    if (!this.generateReport && !this.isDryRun) return;
    
    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      isDryRun: this.isDryRun,
      totalFixes: this.fixes.length,
      fixesByReason: this.groupFixesByReason(),
      fixesByFile: this.groupFixesByFile(),
      details: this.fixes
    };
    
    const reportPath = path.join(this.projectRoot, 'import-fixes-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(chalk.blue(`\n📊 Rapport généré: ${reportPath}`));
  }

  private groupFixesByReason(): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const fix of this.fixes) {
      groups[fix.reason] = (groups[fix.reason] || 0) + 1;
    }
    return groups;
  }

  private groupFixesByFile(): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const fix of this.fixes) {
      const relativePath = path.relative(this.projectRoot, fix.file);
      groups[relativePath] = (groups[relativePath] || 0) + 1;
    }
    return groups;
  }

  private displaySummary(): void {
    console.log(chalk.bold.cyan('\n📋 Résumé des corrections d\'imports:'));
    
    if (this.fixes.length === 0) {
      console.log(chalk.green('✅ Aucune correction nécessaire !'));
      return;
    }
    
    const byReason = this.groupFixesByReason();
    for (const [reason, count] of Object.entries(byReason)) {
      console.log(chalk.yellow(`📝 ${reason}: ${count}`));
    }
    
    const totalFiles = new Set(this.fixes.map(f => f.file)).size;
    console.log(chalk.cyan(`\n📁 ${totalFiles} fichier(s) modifié(s)`));
    console.log(chalk.cyan(`🔧 ${this.fixes.length} correction(s) appliquée(s)`));
    
    if (this.isDryRun) {
      console.log(chalk.yellow('\n💡 Utilisez sans --dry-run pour appliquer les corrections'));
    }
  }
}

// Exécution du script
const fixer = new ImportFixer();
fixer.run().catch(console.error);

export { ImportFixer };
