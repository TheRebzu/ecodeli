import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import chalk from 'chalk';

// Configuration
const SRC_DIR = path.join(process.cwd(), 'src');
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const IGNORE_PATTERNS = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts'];

// Options de ligne de commande
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');
const verbose = args.includes('--verbose') || args.includes('-v');
const createMissing = args.includes('--create-missing') || args.includes('-c');

interface ImportInfo {
  fullLine: string;
  importPath: string;
  isRelative: boolean;
  startPos: number;
  endPos: number;
  importedNames?: string[];
}

interface MovementMapping {
  oldPath: string;
  newPath: string;
  confidence: number;
  reason: string;
}

// Cache global
const existingFiles = new Map<string, string>();
const fileExports = new Map<string, string[]>();
const filesByExport = new Map<string, string[]>();
const pathMappings = new Map<string, string>();
const detectedMovements = new Map<string, MovementMapping>();

// Mappings manuels étendus
const KNOWN_MAPPINGS: Record<string, string> = {
  '@/lib/auth-error': '@/lib/auth/errors',
  'auth-error': 'auth/errors',
  '@/lib/validation': '@/lib/utils/validation',
  'validation': 'utils/validation',
  '@/components/ui/rating-stars': '@/components/ui/star-rating',
  './rating-stars': '@/components/ui/star-rating',
  '@/utils/': '@/lib/utils/',
  '@/services/': '@/server/services/',
  '@/hooks/use-': '@/hooks/shared/use-',
};

// Patterns de restructuration courrants
const RESTRUCTURE_PATTERNS = [
  // lib/[file] → lib/[category]/[file]
  { 
    pattern: /^lib\/([^\/]+)$/,
    transform: (match: RegExpMatchArray) => `lib/auth/${match[1]}` // Exemple pour auth
  },
  // components/[file] → components/[category]/[file] 
  {
    pattern: /^components\/([^\/]+)$/,
    transform: (match: RegExpMatchArray) => `components/ui/${match[1]}`
  },
  // utils → lib/utils
  {
    pattern: /^utils\/(.+)$/,
    transform: (match: RegExpMatchArray) => `lib/utils/${match[1]}`
  },
  // services → server/services
  {
    pattern: /^services\/(.+)$/,
    transform: (match: RegExpMatchArray) => `server/services/${match[1]}`
  }
];

function extractExports(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const exports: string[] = [];
    
    const exportPatterns = [
      /export\s+(?:function|const|class|interface|type|enum)\s+(\w+)/g,
      /export\s*\{\s*([^}]+)\s*\}/g,
      /export\s+default\s+(?:function\s+(\w+)|class\s+(\w+)|(\w+))/g,
      /export\s+const\s+\{([^}]+)\}/g,
    ];
    
    exportPatterns.forEach(regex => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (match[1]) {
          if (match[0].includes('{')) {
            const names = match[1].split(',').map(n => 
              n.trim().split(' as ')[0].trim().replace(/[{}]/g, '')
            ).filter(n => n && n.length > 0);
            exports.push(...names);
          } else {
            exports.push(match[1]);
          }
        }
        for (let i = 2; i < match.length; i++) {
          if (match[i]) exports.push(match[i]);
        }
      }
    });
    
    return [...new Set(exports)];
  } catch {
    return [];
  }
}

function buildFileIndex(): void {
  console.log(chalk.blue('🔍 Construction de l\'index des fichiers...'));
  
  const patterns = FILE_EXTENSIONS.map(ext => `${SRC_DIR}/**/*${ext}`);
  let fileCount = 0;
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { ignore: IGNORE_PATTERNS });
    files.forEach(filePath => {
      const fileName = path.basename(filePath);
      const fileNameWithoutExt = fileName.replace(/\.(ts|tsx|js|jsx)$/, '');
      const relativePath = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
      
      // Index multiple pour recherche rapide
      existingFiles.set(fileName, filePath);
      existingFiles.set(fileNameWithoutExt, filePath);
      existingFiles.set(relativePath, filePath);
      existingFiles.set(relativePath.replace(/\.(ts|tsx|js|jsx)$/, ''), filePath);
      
      // Index des chemins
      pathMappings.set(relativePath, filePath);
      
      // Index index files
      if (fileName.match(/^index\.(ts|tsx|js|jsx)$/)) {
        const parentDir = path.basename(path.dirname(filePath));
        const parentPath = path.dirname(relativePath);
        existingFiles.set(parentDir, filePath);
        pathMappings.set(parentPath, filePath);
      }
      
      // Index des exports
      const exports = extractExports(filePath);
      if (exports.length > 0) {
        fileExports.set(filePath, exports);
        exports.forEach(exportName => {
          if (!filesByExport.has(exportName)) {
            filesByExport.set(exportName, []);
          }
          filesByExport.get(exportName)!.push(filePath);
        });
      }
      
      fileCount++;
    });
  });
  
  console.log(chalk.green(`✓ ${fileCount} fichiers indexés`));
  console.log(chalk.green(`✓ ${fileExports.size} fichiers avec exports`));
  console.log(chalk.green(`✓ ${filesByExport.size} exports uniques`));
}

function analyzeMovements(): void {
  console.log(chalk.blue('🔍 Analyse des déplacements de fichiers...'));
  
  // Collecter tous les imports cassés
  const brokenImports = new Map<string, string[]>(); // chemin manquant -> fichiers qui l'utilisent
  const allFiles = glob.sync(`${SRC_DIR}/**/*{${FILE_EXTENSIONS.join(',')}}`, { ignore: IGNORE_PATTERNS });
  
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const imports = extractImports(content);
      
      for (const imp of imports) {
        if (imp.isRelative && !importExists(imp.importPath, file)) {
          const normalizedPath = normalizePath(imp.importPath, file);
          if (normalizedPath) {
            if (!brokenImports.has(normalizedPath)) {
              brokenImports.set(normalizedPath, []);
            }
            brokenImports.get(normalizedPath)!.push(file);
          }
        }
      }
    } catch (error) {
      // Ignorer les erreurs
    }
  }
  
  console.log(chalk.yellow(`  ⚠️  ${brokenImports.size} imports cassés détectés`));
  
  // Analyser chaque import cassé
  for (const [missingPath, files] of brokenImports.entries()) {
    const movement = findBestMovement(missingPath, files);
    if (movement && movement.confidence >= 0.6) {
      detectedMovements.set(missingPath, movement);
      if (verbose) {
        console.log(chalk.green(`  ✅ ${missingPath} → ${movement.newPath} (${movement.reason})`));
      }
    }
  }
  
  console.log(chalk.green(`✓ ${detectedMovements.size} déplacements détectés`));
}

function findBestMovement(missingPath: string, usingFiles: string[]): MovementMapping | null {
  const candidates: MovementMapping[] = [];
  const baseName = path.basename(missingPath).replace(/\.(ts|tsx|js|jsx)$/, '');
  
  // 1. Recherche par mappings manuels
  for (const [pattern, replacement] of Object.entries(KNOWN_MAPPINGS)) {
    if (missingPath.includes(pattern.replace('@/', '')) || missingPath === pattern) {
      const targetPath = findTargetPath(replacement);
      if (targetPath) {
        candidates.push({
          oldPath: missingPath,
          newPath: targetPath,
          confidence: 0.95,
          reason: 'Mapping manuel'
        });
      }
    }
  }
  
  // 2. Recherche par exports si on a des noms importés
  const importedNames = getImportedNamesForPath(missingPath, usingFiles);
  if (importedNames.length > 0) {
    for (const exportName of importedNames) {
      if (filesByExport.has(exportName)) {
        const files = filesByExport.get(exportName)!;
        for (const file of files) {
          const relativePath = path.relative(SRC_DIR, file).replace(/\\/g, '/');
          candidates.push({
            oldPath: missingPath,
            newPath: relativePath,
            confidence: 0.9,
            reason: `Export "${exportName}" trouvé`
          });
        }
      }
    }
  }
  
  // 3. Recherche par nom de fichier
  if (existingFiles.has(baseName)) {
    const file = existingFiles.get(baseName)!;
    const relativePath = path.relative(SRC_DIR, file).replace(/\\/g, '/');
    candidates.push({
      oldPath: missingPath,
      newPath: relativePath,
      confidence: 0.8,
      reason: 'Nom de fichier identique'
    });
  }
  
  // 4. Recherche par patterns de restructuration
  for (const pattern of RESTRUCTURE_PATTERNS) {
    const match = missingPath.match(pattern.pattern);
    if (match) {
      const newPath = pattern.transform(match);
      if (pathMappings.has(newPath)) {
        candidates.push({
          oldPath: missingPath,
          newPath,
          confidence: 0.75,
          reason: 'Pattern de restructuration'
        });
      }
    }
  }
  
  // 5. Recherche floue
  for (const [pathKey] of pathMappings.entries()) {
    const similarity = calculatePathSimilarity(missingPath, pathKey);
    if (similarity > 0.5) {
      candidates.push({
        oldPath: missingPath,
        newPath: pathKey,
        confidence: similarity * 0.7,
        reason: `Similarité ${Math.round(similarity * 100)}%`
      });
    }
  }
  
  // Retourner le meilleur candidat
  if (candidates.length > 0) {
    return candidates.sort((a, b) => b.confidence - a.confidence)[0];
  }
  
  return null;
}

function getImportedNamesForPath(missingPath: string, usingFiles: string[]): string[] {
  const names = new Set<string>();
  
  for (const file of usingFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const imports = extractImports(content);
      
      for (const imp of imports) {
        const normalizedPath = normalizePath(imp.importPath, file);
        if (normalizedPath === missingPath && imp.importedNames) {
          imp.importedNames.forEach(name => names.add(name));
        }
      }
    } catch (error) {
      // Ignorer
    }
  }
  
  return Array.from(names);
}

function findTargetPath(targetPattern: string): string | null {
  // Supprimer le préfixe @/ et chercher le fichier
  const cleanPath = targetPattern.replace('@/', '');
  
  if (pathMappings.has(cleanPath)) {
    return cleanPath;
  }
  
  // Essayer avec différentes extensions
  for (const ext of FILE_EXTENSIONS) {
    if (pathMappings.has(cleanPath + ext)) {
      return cleanPath + ext;
    }
  }
  
  return null;
}

function calculatePathSimilarity(path1: string, path2: string): number {
  const segments1 = path1.split('/').filter(s => s.length > 0);
  const segments2 = path2.split('/').filter(s => s.length > 0);
  
  const commonSegments = segments1.filter(seg => segments2.includes(seg));
  const segmentSimilarity = commonSegments.length / Math.max(segments1.length, segments2.length);
  
  const stringSimilarity = calculateStringSimilarity(path1, path2);
  
  return (segmentSimilarity * 0.7) + (stringSimilarity * 0.3);
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
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

function extractImports(fileContent: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  
  const patterns = [
    { regex: /import\s*\{([^}]*)\}\s*from\s+['"]([^'"]+)['"]/g, hasNames: true },
    { regex: /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, hasNames: true },
    { regex: /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, hasNames: true },
    { regex: /import\s+['"]([^'"]+)['"]/g, hasNames: false },
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(fileContent)) !== null) {
      let importPath: string;
      let importedNames: string[] = [];
      
      if (pattern.hasNames && match.length > 2) {
        importPath = match[2];
        if (match[1] && match[0].includes('{')) {
          importedNames = match[1].split(',').map(name => 
            name.trim().split(' as ')[0].trim()
          ).filter(name => name.length > 0);
        } else if (match[1]) {
          importedNames = [match[1]];
        }
      } else {
        importPath = match[1];
      }
      
      const isRelative = importPath.startsWith('.') || importPath.startsWith('/');
      
      imports.push({
        fullLine: match[0],
        importPath,
        isRelative,
        importedNames: importedNames.length > 0 ? importedNames : undefined,
        startPos: match.index,
        endPos: match.index + match[0].length
      });
    }
  });
  
  return imports;
}

function importExists(importPath: string, fromFile: string): boolean {
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return true; // Import npm
  }
  
  const fromDir = path.dirname(fromFile);
  const absolutePath = path.resolve(fromDir, importPath);
  
  const extensionsToTry = [
    '', '.ts', '.tsx', '.js', '.jsx',
    '/index.ts', '/index.tsx', '/index.js', '/index.jsx'
  ];
  
  return extensionsToTry.some(ext => fs.existsSync(absolutePath + ext));
}

function normalizePath(importPath: string, fromFile: string): string | null {
  try {
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }
    
    const fromDir = path.dirname(fromFile);
    const absolutePath = path.resolve(fromDir, importPath);
    const relativePath = path.relative(SRC_DIR, absolutePath);
    
    return relativePath.replace(/\\/g, '/');
  } catch {
    return null;
  }
}

function fixImportsInFile(filePath: string): { fixed: number; errors: string[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  let modifiedContent = content;
  const imports = extractImports(content);
  let fixed = 0;
  const errors: string[] = [];
  
  // Trier par position décroissante
  imports.sort((a, b) => b.startPos - a.startPos);
  
  for (const imp of imports) {
    if (!imp.isRelative || importExists(imp.importPath, filePath)) {
      continue;
    }
    
    // Chercher un mapping
    const normalizedPath = normalizePath(imp.importPath, filePath);
    let newPath: string | null = null;
    
    if (normalizedPath && detectedMovements.has(normalizedPath)) {
      const movement = detectedMovements.get(normalizedPath)!;
      newPath = calculateRelativePath(movement.newPath, filePath);
    }
    
    if (newPath) {
      const newImportLine = imp.fullLine.replace(imp.importPath, newPath);
      modifiedContent = 
        modifiedContent.substring(0, imp.startPos) +
        newImportLine +
        modifiedContent.substring(imp.endPos);
      
      console.log(chalk.green(`    ✅ ${imp.importPath} → ${newPath}`));
      fixed++;
    } else {
      errors.push(imp.importPath);
      console.log(chalk.red(`    ❌ ${imp.importPath}`));
    }
  }
  
  if (fixed > 0 && !isDryRun) {
    fs.writeFileSync(filePath, modifiedContent, 'utf-8');
  }
  
  return { fixed, errors };
}

function calculateRelativePath(targetPath: string, fromFile: string): string {
  const targetFile = pathMappings.get(targetPath);
  if (!targetFile) return targetPath;
  
  const fromDir = path.dirname(fromFile);
  const relativePath = path.relative(fromDir, targetFile);
  let finalPath = relativePath.replace(/\\/g, '/');
  
  // Enlever l'extension si ce n'est pas nécessaire
  finalPath = finalPath.replace(/\.(ts|tsx|js|jsx)$/, '');
  
  // Gérer les fichiers index
  if (finalPath.endsWith('/index')) {
    finalPath = finalPath.replace(/\/index$/, '');
  }
  
  // S'assurer que ça commence par ./
  if (!finalPath.startsWith('.') && !finalPath.startsWith('/')) {
    finalPath = './' + finalPath;
  }
  
  return finalPath;
}

async function main(): Promise<void> {
  console.log(chalk.bold.blue('\n🛠️  Script Enhanced de correction des imports EcoDeli\n'));
  
  if (isDryRun) {
    console.log(chalk.yellow('🔍 Mode DRY-RUN activé\n'));
  }
  
  // 1. Construire l'index
  buildFileIndex();
  
  // 2. Analyser les déplacements
  analyzeMovements();
  
  // 3. Corriger tous les fichiers
  console.log(chalk.blue('\n📁 Correction des imports...\n'));
  
  const allFiles = glob.sync(`${SRC_DIR}/**/*{${FILE_EXTENSIONS.join(',')}}`, { ignore: IGNORE_PATTERNS });
  let totalFixed = 0;
  let totalErrors = 0;
  let filesModified = 0;
  
  for (const file of allFiles) {
    const relativePath = path.relative(process.cwd(), file);
    const imports = extractImports(fs.readFileSync(file, 'utf-8'));
    const brokenImports = imports.filter(imp => imp.isRelative && !importExists(imp.importPath, file));
    
    if (brokenImports.length > 0) {
      console.log(chalk.cyan(`\n📄 ${relativePath}`));
      const { fixed, errors } = fixImportsInFile(file);
      
      if (fixed > 0) {
        filesModified++;
        totalFixed += fixed;
      }
      
      totalErrors += errors.length;
    }
  }
  
  // 4. Résumé
  console.log(chalk.bold.blue('\n\n📊 Résumé:\n'));
  console.log(chalk.white(`  Fichiers ${isDryRun ? 'à modifier' : 'modifiés'}: ${filesModified}`));
  console.log(chalk.green(`  Imports ${isDryRun ? 'à corriger' : 'corrigés'}: ${totalFixed}`));
  console.log(chalk.red(`  Imports non résolus: ${totalErrors}`));
  
  if (isDryRun && totalFixed > 0) {
    console.log(chalk.yellow('\n💡 Exécutez sans --dry-run pour appliquer les corrections.'));
  } else if (totalFixed > 0) {
    console.log(chalk.green('\n✅ Corrections appliquées avec succès!'));
  }
  
  if (totalErrors > 0) {
    console.log(chalk.yellow('\n⚠️  Certains imports n\'ont pas pu être résolus automatiquement.'));
  }
}

// Help
if (args.includes('--help') || args.includes('-h')) {
  console.log(chalk.bold('\n🛠️  Script Enhanced de correction des imports\n'));
  console.log('Usage: npx tsx scripts/fix-imports-enhanced.ts [options]');
  console.log('\nOptions:');
  console.log('  -d, --dry-run       Prévisualiser sans modifier');
  console.log('  -v, --verbose       Mode détaillé');
  console.log('  -c, --create-missing Créer fichiers manquants');
  console.log('  -h, --help          Afficher cette aide');
  process.exit(0);
}

// Gestion d'erreurs
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Erreur:'), error);
  process.exit(1);
});

// Lancer
main().catch(error => {
  console.error(chalk.red('\n❌ Erreur:'), error);
  process.exit(1);
}); 