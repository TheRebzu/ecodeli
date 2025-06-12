#!/usr/bin/env tsx
import { Project, SourceFile, ImportDeclaration, ExportDeclaration, Node } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

interface ImportFix {
  file: string;
  line: number;
  oldPath: string;
  newPath: string;
  type: 'import' | 'export' | 'dynamic';
}

interface TSConfigPaths {
  [alias: string]: string[];
}

class ImportFixer {
  private project: Project;
  private tsConfigPaths: TSConfigPaths = {};
  private projectRoot: string;
  private fileIndex: Map<string, string[]> = new Map();
  private fixes: ImportFix[] = [];
  private errors: string[] = [];
  private aggressiveOptimization: boolean = false;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.project = new Project({
      tsConfigFilePath: path.join(projectRoot, 'tsconfig.json'),
      skipAddingFilesFromTsConfig: false,
    });

    // Charger les alias de chemins depuis tsconfig.json
    this.loadTSConfigPaths();

    // Indexer tous les fichiers du projet
    this.indexProjectFiles();
  }

  public setAggressiveOptimization(aggressive: boolean): void {
    this.aggressiveOptimization = aggressive;
  }

  private shouldOptimizeImport(currentPath: string, optimalPath: string): boolean {
    // Ne pas optimiser si les chemins sont identiques
    if (currentPath === optimalPath) return false;

    // Ne pas optimiser si le chemin actuel utilise déjà un alias
    if (currentPath.includes('@/')) return false;

    // Ne pas optimiser si le chemin optimal n'utilise pas d'alias
    if (!optimalPath.startsWith('@/')) return false;

    // Mode agressif : optimiser tous les imports relatifs qui peuvent utiliser un alias
    if (this.aggressiveOptimization) {
      return currentPath.startsWith('../') || currentPath.startsWith('./');
    }

    // Mode standard : optimiser seulement les imports relatifs longs (2+ niveaux)
    return currentPath.startsWith('../') && (currentPath.match(/\.\.\//g) || []).length >= 2;
  }

  private loadTSConfigPaths(): void {
    const tsConfigPath = path.join(this.projectRoot, 'tsconfig.json');

    if (fs.existsSync(tsConfigPath)) {
      try {
        const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));
        const paths = tsConfig.compilerOptions?.paths || {};

        // Convertir les alias en chemins absolus
        Object.entries(paths).forEach(([alias, aliasPaths]) => {
          this.tsConfigPaths[alias.replace('/*', '')] = (aliasPaths as string[]).map(p =>
            path.join(this.projectRoot, p.replace('/*', ''))
          );
        });

        console.log(chalk.cyan('📖 Alias de chemins chargés depuis tsconfig.json:'));
        Object.entries(this.tsConfigPaths).forEach(([alias, paths]) => {
          console.log(chalk.gray(`   ${alias} → ${paths.join(', ')}`));
        });
      } catch (error) {
        console.error(chalk.red('❌ Erreur lors du chargement de tsconfig.json:'), error);
      }
    }
  }

  private indexProjectFiles(): void {
    console.log(chalk.cyan('🔍 Indexation des fichiers du projet...'));

    const patterns = [
      'src/**/*.{ts,tsx,js,jsx}',
      'app/**/*.{ts,tsx,js,jsx}',
      'pages/**/*.{ts,tsx,js,jsx}',
      'components/**/*.{ts,tsx,js,jsx}',
      'lib/**/*.{ts,tsx,js,jsx}',
      'utils/**/*.{ts,tsx,js,jsx}',
      'hooks/**/*.{ts,tsx,js,jsx}',
      'server/**/*.{ts,tsx,js,jsx}',
      'types/**/*.{ts,tsx,js,jsx}',
      'schemas/**/*.{ts,tsx,js,jsx}',
      'store/**/*.{ts,tsx,js,jsx}',
    ];

    let totalFiles = 0;
    patterns.forEach(pattern => {
      const files = glob.sync(pattern, {
        cwd: this.projectRoot,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**'],
      });

      files.forEach(file => {
        const fullPath = path.join(this.projectRoot, file);
        const fileName = path.basename(file);
        const fileNameWithoutExt = fileName.replace(/\.(ts|tsx|js|jsx)$/, '');
        const relativePath = file.replace(/\.(ts|tsx|js|jsx)$/, '');

        // 1. Indexer par nom de fichier (avec et sans extension)
        this.addToIndex(fileName, fullPath);
        this.addToIndex(fileNameWithoutExt, fullPath);

        // 2. Indexer par chemin relatif complet
        this.addToIndex(relativePath, fullPath);

        // 3. Indexer par segments de chemin (toutes les combinaisons possibles)
        const pathParts = relativePath.split('/');
        for (let i = 0; i < pathParts.length; i++) {
          for (let j = i + 1; j <= pathParts.length; j++) {
            const segment = pathParts.slice(i, j).join('/');
            if (segment && segment !== fileNameWithoutExt) {
              this.addToIndex(segment, fullPath);
            }
          }
        }

        // 4. Indexer par variations du nom de fichier
        const variations = this.generateFileNameVariations(fileNameWithoutExt);
        variations.forEach(variation => {
          if (variation !== fileNameWithoutExt) {
            this.addToIndex(variation, fullPath);
          }
        });

        // 5. Indexer par mots-clés extraits du chemin
        const keywords = this.extractKeywords(relativePath);
        keywords.forEach(keyword => {
          this.addToIndex(keyword, fullPath);
        });

        totalFiles++;
      });
    });

    console.log(
      chalk.green(`✅ ${totalFiles} fichiers indexés avec ${this.fileIndex.size} clés d'index`)
    );
  }

  private generateFileNameVariations(fileName: string): string[] {
    const variations: string[] = [];

    // Variations de base
    variations.push(
      fileName,
      fileName.replace(/^use-/, ''),
      fileName.replace(/-/g, ''),
      fileName.replace(/_/g, ''),
      fileName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
      fileName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
    );

    // Ajouter/retirer des préfixes et suffixes courants
    const prefixes = ['use-', 'with-', 'create-', 'update-', 'delete-', 'get-', 'fetch-'];
    const suffixes = [
      '-hook',
      '-service',
      '-router',
      '-component',
      '-form',
      '-modal',
      '-dialog',
      '-card',
      '-list',
      '-item',
      '-details',
      '-dashboard',
      '-page',
    ];

    for (const prefix of prefixes) {
      if (fileName.startsWith(prefix)) {
        variations.push(fileName.replace(prefix, ''));
      } else {
        variations.push(prefix + fileName);
      }
    }

    for (const suffix of suffixes) {
      if (fileName.endsWith(suffix)) {
        variations.push(fileName.replace(suffix, ''));
      } else {
        variations.push(fileName + suffix);
      }
    }

    // Variations camelCase/kebab-case
    if (fileName.includes('-')) {
      const camelCase = fileName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      variations.push(camelCase);
    }

    if (/[A-Z]/.test(fileName)) {
      const kebabCase = fileName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      variations.push(kebabCase);
    }

    return [...new Set(variations)].filter(v => v && v.length > 0);
  }

  private extractKeywords(filePath: string): string[] {
    const keywords: string[] = [];
    const parts = filePath.split('/');

    for (const part of parts) {
      if (!part) continue;

      // Mots-clés de base
      keywords.push(part);

      // Si le part contient des tirets ou underscores, extraire les mots
      if (part.includes('-') || part.includes('_')) {
        const subParts = part.split(/[-_]/);
        keywords.push(...subParts.filter(sp => sp && sp.length > 2));
      }

      // Si le part est en camelCase, extraire les mots
      if (/[a-z][A-Z]/.test(part)) {
        const camelWords = part.split(/(?=[A-Z])/).map(w => w.toLowerCase());
        keywords.push(...camelWords.filter(w => w && w.length > 2));
      }
    }

    return [...new Set(keywords)].filter(k => k && k.length > 1);
  }

  private addToIndex(key: string, value: string): void {
    if (!this.fileIndex.has(key)) {
      this.fileIndex.set(key, []);
    }
    const existingValues = this.fileIndex.get(key)!;
    if (!existingValues.includes(value)) {
      existingValues.push(value);
    }
  }

  private resolveImportPath(importPath: string, fromFile: string): string | null {
    const fromDir = path.dirname(fromFile);

    // 1. Imports relatifs
    if (importPath.startsWith('.')) {
      const absolutePath = path.resolve(fromDir, importPath);

      // Tester avec différentes extensions
      const extensions = [
        '',
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '/index.ts',
        '/index.tsx',
        '/index.js',
        '/index.jsx',
      ];

      for (const ext of extensions) {
        const testPath = absolutePath + ext;
        if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
          return testPath;
        }
      }
      return null;
    }

    // 2. Imports avec alias (ex: @/components/...)
    for (const [alias, aliasPaths] of Object.entries(this.tsConfigPaths)) {
      if (importPath.startsWith(alias + '/') || importPath === alias) {
        const relativePath = importPath.slice(alias.length + 1);

        for (const aliasPath of aliasPaths) {
          const absolutePath = path.join(aliasPath, relativePath);
          const extensions = [
            '',
            '.ts',
            '.tsx',
            '.js',
            '.jsx',
            '/index.ts',
            '/index.tsx',
            '/index.js',
            '/index.jsx',
          ];

          for (const ext of extensions) {
            const testPath = absolutePath + ext;
            if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
              return testPath;
            }
          }
        }
      }
    }

    // 3. Imports absolus depuis la racine du projet
    const absoluteFromRoot = path.join(this.projectRoot, 'src', importPath);
    const extensions = [
      '',
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '/index.ts',
      '/index.tsx',
      '/index.js',
      '/index.jsx',
    ];

    for (const ext of extensions) {
      const testPath = absoluteFromRoot + ext;
      if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
        return testPath;
      }
    }

    // 4. Modules node_modules (on ne les modifie pas)
    if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.includes('@/')) {
      return 'node_module';
    }

    return null;
  }

  private findCorrectPath(brokenPath: string, fromFile: string): string | null {
    console.log(chalk.gray(`   🔍 Recherche de: ${brokenPath}`));

    // Stratégies de recherche multiples
    const strategies = [
      () => this.findByExactName(brokenPath),
      () => this.findByPartialPath(brokenPath),
      () => this.findByFileName(brokenPath),
      () => this.findByFileNameVariations(brokenPath),
      () => this.findBySemanticSearch(brokenPath),
      () => this.findByContentAnalysis(brokenPath, fromFile),
    ];

    for (const strategy of strategies) {
      const candidates = strategy();
      if (candidates.length > 0) {
        const bestMatch = this.selectBestCandidate(candidates, brokenPath, fromFile);
        if (bestMatch) {
          console.log(chalk.green(`   ✅ Trouvé: ${path.relative(this.projectRoot, bestMatch)}`));
          return this.calculateRelativePath(fromFile, bestMatch);
        }
      }
    }

    console.log(chalk.red(`   ❌ Non trouvé: ${brokenPath}`));
    return null;
  }

  private findByExactName(brokenPath: string): string[] {
    const searchKey = brokenPath.replace(/\.(ts|tsx|js|jsx)$/, '');
    return this.fileIndex.get(searchKey) || [];
  }

  private findByPartialPath(brokenPath: string): string[] {
    const parts = brokenPath.split('/');
    const results: string[] = [];

    // Essayer avec les dernières parties du chemin
    for (let i = 0; i < parts.length; i++) {
      const partialPath = parts
        .slice(i)
        .join('/')
        .replace(/\.(ts|tsx|js|jsx)$/, '');
      const matches = this.fileIndex.get(partialPath) || [];
      results.push(...matches);
    }

    return [...new Set(results)];
  }

  private findByFileName(brokenPath: string): string[] {
    const parts = brokenPath.split('/');
    const fileName = parts[parts.length - 1].replace(/\.(ts|tsx|js|jsx)$/, '');
    return this.fileIndex.get(fileName) || [];
  }

  private findByFileNameVariations(brokenPath: string): string[] {
    const parts = brokenPath.split('/');
    const fileName = parts[parts.length - 1].replace(/\.(ts|tsx|js|jsx)$/, '');
    const results: string[] = [];

    // Variations possibles du nom de fichier
    const variations = [
      fileName,
      fileName.replace(/^use-/, ''),
      fileName.replace(/-/g, ''),
      fileName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
      `use-${fileName}`,
      `${fileName}.service`,
      `${fileName}.router`,
      `${fileName}.component`,
      `${fileName}-component`,
      `${fileName}-form`,
      `${fileName}-dashboard`,
      fileName.split('-').pop() || fileName,
    ];

    for (const variation of variations) {
      const matches = this.fileIndex.get(variation) || [];
      results.push(...matches);
    }

    return [...new Set(results)];
  }

  private findBySemanticSearch(brokenPath: string): string[] {
    const results: Array<{ filePath: string; score: number }> = [];
    const searchTerms = brokenPath.toLowerCase().split(/[\/\-_]/);

    // Chercher dans tous les fichiers indexés
    for (const [indexKey, filePaths] of this.fileIndex.entries()) {
      const keyLower = indexKey.toLowerCase();

      // Vérifier si les termes de recherche sont dans la clé
      const matchScore = searchTerms.reduce((score, term) => {
        if (keyLower.includes(term)) {
          return score + term.length;
        }
        return score;
      }, 0);

      if (matchScore > 0) {
        results.push(...filePaths.map(filePath => ({ filePath, score: matchScore })));
      }
    }

    // Trier par score et retourner les chemins
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(result => result.filePath);
  }

  private findByContentAnalysis(brokenPath: string, fromFile: string): string[] {
    const results: string[] = [];
    const pathParts = brokenPath.split('/');
    const fromDir = path.dirname(fromFile);

    // Analyser la structure du répertoire source
    const fromDirParts = fromDir
      .replace(this.projectRoot, '')
      .split(path.sep)
      .filter(p => p);

    // Stratégies basées sur la structure
    if (fromDirParts.includes('components')) {
      // Si on est dans components, chercher dans components/
      results.push(...this.searchInDirectory('components', brokenPath));
    }

    if (fromDirParts.includes('hooks')) {
      // Si on est dans hooks, chercher dans hooks/
      results.push(...this.searchInDirectory('hooks', brokenPath));
    }

    if (fromDirParts.includes('server')) {
      // Si on est dans server, chercher dans server/
      results.push(...this.searchInDirectory('server', brokenPath));
    }

    // Chercher par contexte (admin, client, deliverer, etc.)
    const contextualDirs = [
      'admin',
      'client',
      'deliverer',
      'merchant',
      'provider',
      'shared',
      'common',
    ];
    for (const context of contextualDirs) {
      if (fromDir.includes(context)) {
        results.push(...this.searchInDirectory(context, brokenPath));
      }
    }

    return [...new Set(results)];
  }

  private searchInDirectory(directory: string, searchTerm: string): string[] {
    const results: string[] = [];
    const searchLower = searchTerm.toLowerCase();

    for (const [indexKey, filePaths] of this.fileIndex.entries()) {
      for (const filePath of filePaths) {
        if (
          filePath.includes(directory) &&
          (indexKey.toLowerCase().includes(searchLower) ||
            filePath.toLowerCase().includes(searchLower))
        ) {
          results.push(filePath);
        }
      }
    }

    return results;
  }

  private selectBestCandidate(
    candidates: string[],
    brokenPath: string,
    fromFile: string
  ): string | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const fromDir = path.dirname(fromFile);

    // Calculer le score pour chaque candidat
    const scoredCandidates = candidates.map(candidate => {
      const relativePath = path.relative(fromDir, candidate);
      const distance = relativePath.split(path.sep).length;
      const commonParts = this.getCommonPathParts(brokenPath, candidate);
      const nameMatch = this.getNameMatchScore(brokenPath, candidate);
      const contextMatch = this.getContextMatchScore(fromFile, candidate);

      // Score composé
      const totalScore = commonParts * 10 + nameMatch * 5 + contextMatch * 3 - distance;

      return {
        path: candidate,
        score: totalScore,
        distance,
        commonParts,
        nameMatch,
        contextMatch,
      };
    });

    // Trier par score et retourner le meilleur
    scoredCandidates.sort((a, b) => b.score - a.score);

    console.log(chalk.yellow(`   📊 Candidats pour ${brokenPath}:`));
    scoredCandidates.slice(0, 3).forEach((candidate, i) => {
      console.log(
        chalk.gray(
          `     ${i + 1}. ${path.relative(this.projectRoot, candidate.path)} (score: ${candidate.score})`
        )
      );
    });

    return scoredCandidates[0].path;
  }

  private getNameMatchScore(brokenPath: string, candidatePath: string): number {
    const brokenName = path.basename(brokenPath).replace(/\.(ts|tsx|js|jsx)$/, '');
    const candidateName = path.basename(candidatePath).replace(/\.(ts|tsx|js|jsx)$/, '');

    if (brokenName === candidateName) return 10;
    if (candidateName.includes(brokenName)) return 5;
    if (brokenName.includes(candidateName)) return 3;

    // Score de similarité Levenshtein simple
    const similarity = this.getStringSimilarity(brokenName, candidateName);
    return Math.floor(similarity * 10);
  }

  private getContextMatchScore(fromFile: string, candidatePath: string): number {
    const fromParts = fromFile.split(path.sep);
    const candidateParts = candidatePath.split(path.sep);

    let score = 0;

    // Bonus si même type de composant (admin, client, etc.)
    const contexts = ['admin', 'client', 'deliverer', 'merchant', 'provider', 'shared', 'common'];
    for (const context of contexts) {
      if (fromParts.includes(context) && candidateParts.includes(context)) {
        score += 5;
      }
    }

    // Bonus si même catégorie (components, hooks, services, etc.)
    const categories = ['components', 'hooks', 'services', 'types', 'schemas'];
    for (const category of categories) {
      if (fromParts.includes(category) && candidateParts.includes(category)) {
        score += 3;
      }
    }

    return score;
  }

  private getStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const longerLength = longer.length;

    if (longerLength === 0) return 1.0;

    const editDistance = this.getLevenshteinDistance(longer, shorter);
    return (longerLength - editDistance) / longerLength;
  }

  private getLevenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private getCommonPathParts(path1: string, path2: string): number {
    const parts1 = path1.split('/').filter(p => p && p !== '.' && p !== '..');
    const parts2 = path2.split('/').filter(p => p && p !== '.' && p !== '..');

    let common = 0;
    for (const part1 of parts1) {
      if (parts2.includes(part1)) {
        common++;
      }
    }

    return common;
  }

  private calculateRelativePath(fromFile: string, toFile: string): string {
    // D'abord, essayer de créer un chemin avec alias @/
    const aliasPath = this.tryCreateAliasPath(toFile);
    if (aliasPath) {
      console.log(chalk.blue(`   📎 Utilisation d'alias: ${aliasPath}`));
      return aliasPath;
    }

    // Sinon, utiliser le chemin relatif classique
    const fromDir = path.dirname(fromFile);
    let relativePath = path.relative(fromDir, toFile);

    // Convertir les backslashes en slashes pour Windows
    relativePath = relativePath.replace(/\\/g, '/');

    // Supprimer l'extension si elle est présente
    relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Ajouter ./ si le chemin ne commence pas par . ou ..
    if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
      relativePath = './' + relativePath;
    }

    console.log(chalk.gray(`   📁 Chemin relatif: ${relativePath}`));
    return relativePath;
  }

  private tryCreateAliasPath(absolutePath: string): string | null {
    // Vérifier si le fichier est dans le répertoire src/
    const srcPath = path.join(this.projectRoot, 'src');

    if (!absolutePath.startsWith(srcPath)) {
      return null;
    }

    // Créer le chemin avec alias @/
    const relativePart = path.relative(srcPath, absolutePath);
    let aliasPath = '@/' + relativePart.replace(/\\/g, '/');

    // Retirer l'extension
    aliasPath = aliasPath.replace(/\.(ts|tsx|js|jsx)$/, '');

    // Vérifier si cet alias est configuré dans tsconfig
    for (const [alias, aliasPaths] of Object.entries(this.tsConfigPaths)) {
      if (alias === '@/*' || alias === '@') {
        return aliasPath;
      }
    }

    // Si pas d'alias configuré mais que c'est dans src/, utiliser quand même @/
    return aliasPath;
  }

  private processFile(sourceFile: SourceFile): void {
    const filePath = sourceFile.getFilePath();
    console.log(chalk.gray(`📄 Traitement de ${path.relative(this.projectRoot, filePath)}`));

    // Traiter les imports
    sourceFile.getImportDeclarations().forEach(importDecl => {
      this.processImportOrExport(importDecl, filePath, 'import');
    });

    // Traiter les exports
    sourceFile.getExportDeclarations().forEach(exportDecl => {
      if (exportDecl.getModuleSpecifierValue()) {
        this.processImportOrExport(exportDecl, filePath, 'export');
      }
    });

    // Traiter les imports dynamiques
    sourceFile.forEachDescendant(node => {
      if (
        Node.isCallExpression(node) &&
        node.getExpression().getText() === 'import' &&
        node.getArguments().length > 0
      ) {
        const arg = node.getArguments()[0];
        if (Node.isStringLiteral(arg)) {
          const importPath = arg.getLiteralValue();
          const line = arg.getStartLineNumber();

          const resolvedPath = this.resolveImportPath(importPath, filePath);

          if (resolvedPath === null) {
            const newPath = this.findCorrectPath(importPath, filePath);
            if (newPath) {
              this.fixes.push({
                file: filePath,
                line,
                oldPath: importPath,
                newPath,
                type: 'dynamic',
              });

              arg.setLiteralValue(newPath);
            } else {
              this.errors.push(`${filePath}:${line} - Import dynamique introuvable: ${importPath}`);
            }
          }
        }
      }
    });
  }

  private processImportOrExport(
    declaration: ImportDeclaration | ExportDeclaration,
    filePath: string,
    type: 'import' | 'export'
  ): void {
    const moduleSpecifier = declaration.getModuleSpecifierValue();
    if (!moduleSpecifier) return;

    const line = declaration.getStartLineNumber();
    const resolvedPath = this.resolveImportPath(moduleSpecifier, filePath);

    if (resolvedPath === null) {
      // Le chemin n'existe pas, essayer de trouver le bon chemin
      const newPath = this.findCorrectPath(moduleSpecifier, filePath);

      if (newPath) {
        this.fixes.push({
          file: filePath,
          line,
          oldPath: moduleSpecifier,
          newPath,
          type,
        });

        // Appliquer la correction
        declaration.setModuleSpecifier(newPath);
      } else {
        this.errors.push(`${filePath}:${line} - ${type} introuvable: ${moduleSpecifier}`);
      }
    } else if (resolvedPath === 'node_module') {
      // Module npm, on ne fait rien
    } else {
      // Le chemin existe, vérifier s'il peut être optimisé avec un alias
      const currentPath = moduleSpecifier;
      const optimalPath = this.calculateRelativePath(filePath, resolvedPath);

      // Déterminer si on doit optimiser cet import
      const shouldOptimize = this.shouldOptimizeImport(currentPath, optimalPath);

      if (shouldOptimize) {
        console.log(chalk.yellow(`   ⚡ Optimisation avec alias: ${currentPath} → ${optimalPath}`));

        // Appliquer l'optimisation
        this.fixes.push({
          file: filePath,
          line,
          oldPath: currentPath,
          newPath: optimalPath,
          type,
        });

        // Modifier l'import dans le fichier
        declaration.setModuleSpecifier(optimalPath);

        console.log(chalk.green(`   ✅ Import optimisé: ${currentPath} → ${optimalPath}`));
      } else if (currentPath !== optimalPath && !currentPath.includes('@/')) {
        console.log(chalk.gray(`   ℹ️  Optimisation possible: ${currentPath} → ${optimalPath}`));
      }
    }
  }

  public async fixImports(): Promise<void> {
    console.log(chalk.bold.cyan('\n🔧 Démarrage de la correction automatique des imports...\n'));

    // Obtenir tous les fichiers source
    const sourceFiles = this.project.getSourceFiles();
    console.log(chalk.cyan(`📁 ${sourceFiles.length} fichiers à analyser\n`));

    // Traiter chaque fichier
    for (const sourceFile of sourceFiles) {
      this.processFile(sourceFile);
    }

    // Afficher le résumé
    console.log(chalk.bold.cyan('\n📊 Résumé des corrections:\n'));

    if (this.fixes.length > 0) {
      console.log(chalk.green(`✅ ${this.fixes.length} imports corrigés:`));

      // Grouper les corrections par fichier
      const fixesByFile = new Map<string, ImportFix[]>();
      this.fixes.forEach(fix => {
        if (!fixesByFile.has(fix.file)) {
          fixesByFile.set(fix.file, []);
        }
        fixesByFile.get(fix.file)!.push(fix);
      });

      // Afficher les corrections par fichier
      fixesByFile.forEach((fixes, file) => {
        console.log(chalk.white(`\n📄 ${path.relative(this.projectRoot, file)}:`));
        fixes.forEach(fix => {
          console.log(
            chalk.gray(`   L${fix.line}: `) +
              chalk.red(fix.oldPath) +
              chalk.gray(' → ') +
              chalk.green(fix.newPath)
          );
        });
      });

      // Sauvegarder les modifications
      console.log(chalk.cyan('\n💾 Sauvegarde des modifications...'));
      await this.project.save();
      console.log(chalk.green('✅ Modifications sauvegardées avec succès!'));
    } else {
      console.log(chalk.green('✅ Aucune correction nécessaire, tous les imports sont valides!'));
    }

    // Afficher les erreurs
    if (this.errors.length > 0) {
      console.log(chalk.red(`\n❌ ${this.errors.length} imports n'ont pas pu être corrigés:`));
      this.errors.forEach(error => {
        console.log(chalk.red(`   ${error}`));
      });
    }

    // Générer un rapport
    await this.generateReport();
  }

  private async generateReport(): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'import-fixes-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFixes: this.fixes.length,
        totalErrors: this.errors.length,
        filesModified: new Set(this.fixes.map(f => f.file)).size,
      },
      fixes: this.fixes,
      errors: this.errors,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.cyan(`\n📋 Rapport détaillé généré: ${reportPath}`));
  }
}

// Fonction principale
async function main() {
  const args = process.argv.slice(2);
  const aggressiveOptimization = args.includes('--aggressive') || args.includes('-a');

  // Filtrer les options pour ne garder que le chemin du projet
  const projectArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  const projectRoot = projectArgs[0] || process.cwd();

  console.log(chalk.bold.blue('🚀 EcoDeli - Correction automatique des imports TypeScript\n'));
  console.log(chalk.gray(`📂 Répertoire du projet: ${projectRoot}`));
  console.log(
    chalk.gray(`🎯 Mode optimisation: ${aggressiveOptimization ? 'Agressif' : 'Standard'}\n`)
  );

  try {
    const fixer = new ImportFixer(projectRoot);
    fixer.setAggressiveOptimization(aggressiveOptimization);
    await fixer.fixImports();

    console.log(chalk.bold.green('\n✨ Correction des imports terminée avec succès!'));
  } catch (error) {
    console.error(chalk.bold.red('\n❌ Erreur lors de la correction des imports:'), error);
    process.exit(1);
  }
}

// Exécuter le script
const __filename = fileURLToPath(import.meta.url);

// Exécuter le script directement
main().catch(console.error);

export { ImportFixer };
