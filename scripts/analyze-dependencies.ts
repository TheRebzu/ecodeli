import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import parser from '@babel/parser';
import _traverse from '@babel/traverse';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// Compatibilité ESM
const traverse = _traverse.default || _traverse;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ImportInfo {
  source: string;
  type: 'default' | 'named' | 'namespace' | 'type' | 'require';
  specifiers: string[];
  isRelative: boolean;
  isAlias: boolean;
  packageName?: string;
}

interface DependencyStats {
  name: string;
  count: number;
  files: Set<string>;
  imports: ImportInfo[];
  isDevDependency: boolean;
  isDependency: boolean;
  isUsed: boolean;
}

interface AnalysisResult {
  totalFiles: number;
  totalImports: number;
  dependencies: Map<string, DependencyStats>;
  unusedDependencies: string[];
  missingDependencies: string[];
  aliasImports: Map<string, number>;
  relativeImports: number;
  typeImports: number;
}

class DependencyAnalyzer {
  private packageJson: any;
  private dependencies: Set<string>;
  private devDependencies: Set<string>;
  private results: AnalysisResult;
  private aliasPatterns = ['@/', '~/', '#/'];

  constructor() {
    this.results = {
      totalFiles: 0,
      totalImports: 0,
      dependencies: new Map(),
      unusedDependencies: [],
      missingDependencies: [],
      aliasImports: new Map(),
      relativeImports: 0,
      typeImports: 0,
    };
  }

  async analyze(projectPath: string = '.') {
    console.log(chalk.blue('🔍 Analyse des dépendances et imports...\n'));

    // Charger package.json
    await this.loadPackageJson(projectPath);

    // Analyser tous les fichiers
    const files = await this.getSourceFiles(projectPath);
    console.log(chalk.gray(`📁 ${files.length} fichiers trouvés\n`));

    for (const file of files) {
      await this.analyzeFile(file);
    }

    // Analyser les résultats
    this.processResults();

    // Afficher le rapport
    this.displayReport();

    // Générer un fichier de rapport
    await this.generateReportFile(projectPath);
  }

  private async loadPackageJson(projectPath: string) {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    this.packageJson = JSON.parse(content);

    this.dependencies = new Set(Object.keys(this.packageJson.dependencies || {}));
    this.devDependencies = new Set(Object.keys(this.packageJson.devDependencies || {}));
  }

  private async getSourceFiles(projectPath: string): Promise<string[]> {
    const patterns = [
      '**/*.{ts,tsx,js,jsx}',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/build/**',
      '!**/.next/**',
      '!**/coverage/**',
    ];

    return glob(patterns[0], {
      cwd: projectPath,
      ignore: patterns.slice(1).map(p => p.substring(1)),
    });
  }

  private async analyzeFile(filePath: string) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.results.totalFiles++;

      // Parser le fichier avec Babel
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          ['decorators', { legacy: true }],
          'dynamicImport',
          'importMeta',
        ],
      });

      // Parcourir l'AST pour trouver les imports
      traverse(ast, {
        ImportDeclaration: path => {
          this.processImport(path.node, filePath);
        },
        CallExpression: path => {
          // Détecter require()
          if (
            path.node.callee.type === 'Identifier' &&
            path.node.callee.name === 'require' &&
            path.node.arguments.length > 0 &&
            path.node.arguments[0].type === 'StringLiteral'
          ) {
            this.processRequire(path.node.arguments[0].value, filePath);
          }
        },
      });
    } catch (error) {
      console.error(chalk.red(`❌ Erreur lors de l'analyse de ${filePath}:`), error.message);
    }
  }

  private processImport(node: any, filePath: string) {
    const source = node.source.value;
    const isRelative = source.startsWith('.') || source.startsWith('/');
    const isAlias = this.aliasPatterns.some(pattern => source.startsWith(pattern));
    const isType = node.importKind === 'type';

    this.results.totalImports++;

    if (isRelative) {
      this.results.relativeImports++;
      return;
    }

    if (isType) {
      this.results.typeImports++;
    }

    if (isAlias) {
      const aliasPrefix = this.aliasPatterns.find(pattern => source.startsWith(pattern)) || '@/';
      this.results.aliasImports.set(
        aliasPrefix,
        (this.results.aliasImports.get(aliasPrefix) || 0) + 1
      );
      return;
    }

    // Extraire le nom du package
    const packageName = this.extractPackageName(source);

    // Récupérer les spécificateurs
    const specifiers = node.specifiers.map((spec: any) => {
      if (spec.type === 'ImportDefaultSpecifier') return 'default';
      if (spec.type === 'ImportNamespaceSpecifier') return '*';
      return spec.imported.name;
    });

    // Ajouter aux statistiques
    this.addToDependencyStats(packageName, filePath, {
      source,
      type: isType ? 'type' : this.getImportType(node),
      specifiers,
      isRelative,
      isAlias,
      packageName,
    });
  }

  private processRequire(source: string, filePath: string) {
    const isRelative = source.startsWith('.') || source.startsWith('/');

    if (isRelative) {
      this.results.relativeImports++;
      return;
    }

    const packageName = this.extractPackageName(source);

    this.addToDependencyStats(packageName, filePath, {
      source,
      type: 'require',
      specifiers: ['require'],
      isRelative: false,
      isAlias: false,
      packageName,
    });
  }

  private extractPackageName(importPath: string): string {
    // Gérer les packages scoped (@org/package)
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return parts.slice(0, 2).join('/');
    }

    // Package normal
    return importPath.split('/')[0];
  }

  private getImportType(node: any): ImportInfo['type'] {
    if (node.specifiers.length === 0) return 'named';

    const firstSpecifier = node.specifiers[0];
    if (firstSpecifier.type === 'ImportDefaultSpecifier') return 'default';
    if (firstSpecifier.type === 'ImportNamespaceSpecifier') return 'namespace';

    return 'named';
  }

  private addToDependencyStats(packageName: string, filePath: string, importInfo: ImportInfo) {
    if (!this.results.dependencies.has(packageName)) {
      this.results.dependencies.set(packageName, {
        name: packageName,
        count: 0,
        files: new Set(),
        imports: [],
        isDependency: this.dependencies.has(packageName),
        isDevDependency: this.devDependencies.has(packageName),
        isUsed: true,
      });
    }

    const stats = this.results.dependencies.get(packageName)!;
    stats.count++;
    stats.files.add(filePath);
    stats.imports.push(importInfo);
  }

  private processResults() {
    // Identifier les dépendances non utilisées
    const allDeps = [...this.dependencies, ...this.devDependencies];
    const usedDeps = new Set(this.results.dependencies.keys());

    this.results.unusedDependencies = allDeps.filter(dep => !usedDeps.has(dep));

    // Identifier les dépendances manquantes
    this.results.missingDependencies = Array.from(this.results.dependencies.keys())
      .filter(dep => !this.dependencies.has(dep) && !this.devDependencies.has(dep))
      .filter(dep => !this.isBuiltinModule(dep));
  }

  private isBuiltinModule(name: string): boolean {
    const builtins = [
      'fs',
      'path',
      'http',
      'https',
      'crypto',
      'os',
      'util',
      'stream',
      'events',
      'child_process',
      'cluster',
      'buffer',
      'process',
      'assert',
      'url',
      'querystring',
      'string_decoder',
      'fs/promises',
      'stream/promises',
      'timers/promises',
    ];
    return builtins.includes(name);
  }

  private displayReport() {
    console.log(chalk.bold.green("\n📊 RAPPORT D'ANALYSE DES DÉPENDANCES\n"));

    // Statistiques générales
    console.log(chalk.cyan('📈 Statistiques générales:'));
    console.log(`  • Fichiers analysés: ${chalk.yellow(this.results.totalFiles)}`);
    console.log(`  • Total des imports: ${chalk.yellow(this.results.totalImports)}`);
    console.log(`  • Imports relatifs: ${chalk.yellow(this.results.relativeImports)}`);
    console.log(`  • Imports de type: ${chalk.yellow(this.results.typeImports)}`);
    console.log(`  • Dépendances utilisées: ${chalk.yellow(this.results.dependencies.size)}`);

    // Imports avec alias
    if (this.results.aliasImports.size > 0) {
      console.log(chalk.cyan('\n🔗 Imports avec alias:'));
      this.results.aliasImports.forEach((count, alias) => {
        console.log(`  • ${alias}: ${chalk.yellow(count)} utilisations`);
      });
    }

    // Top 10 des dépendances les plus utilisées
    console.log(chalk.cyan('\n🏆 Top 10 des dépendances les plus utilisées:'));
    const sortedDeps = Array.from(this.results.dependencies.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    sortedDeps.forEach((dep, index) => {
      const badge = dep.isDependency
        ? chalk.green('[DEP]')
        : dep.isDevDependency
          ? chalk.blue('[DEV]')
          : chalk.red('[MISSING]');
      console.log(
        `  ${index + 1}. ${chalk.white(dep.name)} ${badge}: ` +
          `${chalk.yellow(dep.count)} imports dans ${chalk.gray(dep.files.size)} fichiers`
      );
    });

    // Dépendances non utilisées
    if (this.results.unusedDependencies.length > 0) {
      console.log(chalk.cyan('\n⚠️  Dépendances non utilisées:'));
      this.results.unusedDependencies.forEach(dep => {
        const badge = this.dependencies.has(dep) ? chalk.green('[DEP]') : chalk.blue('[DEV]');
        console.log(`  • ${chalk.red(dep)} ${badge}`);
      });
    }

    // Dépendances manquantes
    if (this.results.missingDependencies.length > 0) {
      console.log(chalk.cyan('\n❌ Dépendances manquantes dans package.json:'));
      this.results.missingDependencies.forEach(dep => {
        console.log(`  • ${chalk.red(dep)}`);
      });
    }

    console.log(chalk.gray('\n✅ Analyse terminée!'));
  }

  private async generateReportFile(projectPath: string) {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalFiles: this.results.totalFiles,
        totalImports: this.results.totalImports,
        relativeImports: this.results.relativeImports,
        typeImports: this.results.typeImports,
        uniqueDependencies: this.results.dependencies.size,
        unusedDependencies: this.results.unusedDependencies.length,
        missingDependencies: this.results.missingDependencies.length,
      },
      dependencies: Array.from(this.results.dependencies.values())
        .map(dep => ({
          name: dep.name,
          count: dep.count,
          filesCount: dep.files.size,
          isDependency: dep.isDependency,
          isDevDependency: dep.isDevDependency,
          importTypes: this.summarizeImportTypes(dep.imports),
        }))
        .sort((a, b) => b.count - a.count),
      unusedDependencies: this.results.unusedDependencies,
      missingDependencies: this.results.missingDependencies,
      aliasImports: Object.fromEntries(this.results.aliasImports),
    };

    const reportPath = path.join(projectPath, 'dependency-analysis-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.green(`\n📄 Rapport détaillé généré: ${reportPath}`));
  }

  private summarizeImportTypes(imports: ImportInfo[]): Record<string, number> {
    const types: Record<string, number> = {};
    imports.forEach(imp => {
      types[imp.type] = (types[imp.type] || 0) + 1;
    });
    return types;
  }
}

// Fonction principale
async function main() {
  const analyzer = new DependencyAnalyzer();
  const projectPath = process.argv[2] || '.';

  try {
    await analyzer.analyze(projectPath);
  } catch (error) {
    console.error(chalk.red('❌ Erreur fatale:'), error);
    process.exit(1);
  }
}

// Exécuter la fonction principale - Modules ES
main().catch(error => {
  console.error("Erreur lors de l'exécution:", error);
  process.exit(1);
});

export { DependencyAnalyzer };
