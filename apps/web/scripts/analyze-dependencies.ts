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
const interactive = args.includes('--interactive') || args.includes('-i');
const createMissing = args.includes('--create-missing') || args.includes('-c');
const analyzeAll = args.includes('--all') || args.includes('-a') || true; // Par défaut analyser tout

// Interface pour représenter un import
interface ImportInfo {
  fullLine: string;
  importPath: string;
  isRelative: boolean;
  startPos: number;
  endPos: number;
  importedNames?: string[]; // Les noms importés (pour les named imports)
  importType: 'named' | 'default' | 'namespace' | 'side-effect' | 'mixed';
}

interface FileMapping {
  [key: string]: string; // ancien chemin -> nouveau chemin
}

interface MovedFile {
  oldPath: string;
  newPath: string;
  confidence: number;
  reason: string;
}

// Cache des fichiers existants et leurs exports
const existingFiles = new Map<string, string>(); // nom du fichier -> chemin complet
const fileExports = new Map<string, string[]>(); // chemin du fichier -> liste des exports
const filesByExport = new Map<string, string[]>(); // nom de l'export -> liste des fichiers qui l'exportent
const filesByPath = new Map<string, string>(); // chemin relatif normalisé -> chemin complet
const detectedMappings = new Map<string, MovedFile>(); // ancien chemin -> nouveau fichier

// Mappings manuels pour les cas courants
const MANUAL_MAPPINGS: Record<string, string> = {
  '@/lib/auth-error': '@/lib/auth/errors',
  '@/lib/validation': '@/lib/utils/validation',
  '@/components/ui/rating-stars': '@/components/ui/star-rating',
  './rating-stars': '@/components/ui/star-rating',
  'auth-error': 'auth/errors',
  'validation': 'utils/validation',
};

// Patterns de déplacement connus
const MOVEMENT_PATTERNS = [
  // lib -> lib/[category]
  { from: /^lib\/([^\/]+)$/, to: 'lib/$2/$1', examples: ['lib/auth-error → lib/auth/errors'] },
  // components -> components/[category]
  { from: /^components\/([^\/]+)$/, to: 'components/$2/$1', examples: ['components/button → components/ui/button'] },
  // utils -> lib/utils
  { from: /^utils\/(.+)$/, to: 'lib/utils/$1', examples: ['utils/validation → lib/utils/validation'] },
  // services -> server/services
  { from: /^services\/(.+)$/, to: 'server/services/$1', examples: ['services/auth → server/services/auth'] },
];

// Fonction pour détecter automatiquement les déplacements de fichiers
function detectFileMovements(): void {
  console.log(chalk.blue('🔍 Détection automatique des déplacements de fichiers...'));
  
  // Analyser tous les imports pour identifier les chemins manquants
  const missingPaths = new Set<string>();
  const allFiles = glob.sync(`${SRC_DIR}/**/*{${FILE_EXTENSIONS.join(',')}}`, { ignore: IGNORE_PATTERNS });
  
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const imports = extractImports(content);
      
      for (const imp of imports) {
        if (imp.isRelative && !importExists(imp.importPath, file)) {
          // Normaliser le chemin pour la recherche
          const normalizedPath = normalizePath(imp.importPath, file);
          if (normalizedPath) {
            missingPaths.add(normalizedPath);
          }
        }
      }
    } catch (error) {
      // Ignorer les erreurs de lecture de fichier
    }
  }
  
  console.log(chalk.yellow(`  ⚠️  ${missingPaths.size} chemins d'import potentiellement cassés détectés`));
  
  // Pour chaque chemin manquant, essayer de trouver le nouveau emplacement
  for (const missingPath of missingPaths) {
    const candidates = findMovementCandidates(missingPath);
    
    if (candidates.length > 0) {
      const best = candidates[0];
      if (best.confidence >= 0.7) {
        detectedMappings.set(missingPath, best);
        
        if (verbose) {
          console.log(chalk.green(`  ✅ Déplacement détecté: ${missingPath} → ${best.newPath} (${best.reason})`));
        }
      }
    }
  }
  
  console.log(chalk.green(`✓ ${detectedMappings.size} déplacements automatiques détectés`));
}

// Fonction pour normaliser un chemin d'import relatif vers un chemin absolu
function normalizePath(importPath: string, fromFile: string): string | null {
  try {
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null; // Import npm
    }
    
    const fromDir = path.dirname(fromFile);
    const absolutePath = path.resolve(fromDir, importPath);
    const relativePath = path.relative(SRC_DIR, absolutePath);
    
    return relativePath.replace(/\\/g, '/');
  } catch {
    return null;
  }
}

// Fonction pour trouver des candidats de déplacement pour un fichier manquant
function findMovementCandidates(missingPath: string): MovedFile[] {
  const candidates: MovedFile[] = [];
  const baseName = path.basename(missingPath).replace(/\.(ts|tsx|js|jsx)$/, '');
  const segments = missingPath.split('/').filter(s => s.length > 0);
  
  // 1. Recherche par nom de fichier exact
  for (const [key, fullPath] of existingFiles.entries()) {
    if (key === baseName || key === path.basename(missingPath)) {
      const relativePath = path.relative(SRC_DIR, fullPath).replace(/\\/g, '/');
      candidates.push({
        oldPath: missingPath,
        newPath: relativePath,
        confidence: 0.9,
        reason: 'Nom de fichier identique'
      });
    }
  }
  
  // 2. Recherche par segments de chemin
  for (const [pathKey, fullPath] of filesByPath.entries()) {
    const candidateSegments = pathKey.split('/').filter(s => s.length > 0);
    const commonSegments = segments.filter(seg => candidateSegments.includes(seg));
    
    if (commonSegments.length > 0) {
      const confidence = commonSegments.length / Math.max(segments.length, candidateSegments.length);
      
      if (confidence >= 0.3) {
        candidates.push({
          oldPath: missingPath,
          newPath: pathKey,
          confidence: confidence * 0.8,
          reason: `Segments communs: ${commonSegments.join(', ')}`
        });
      }
    }
  }
  
  // 3. Recherche par patterns de déplacement
  for (const pattern of MOVEMENT_PATTERNS) {
    const match = missingPath.match(pattern.from);
    if (match) {
      // Essayer de construire le nouveau chemin selon le pattern
      let newPath = pattern.to;
      for (let i = 1; i < match.length; i++) {
        newPath = newPath.replace(`$${i}`, match[i]);
      }
      
      // Vérifier si ce nouveau chemin existe
      if (filesByPath.has(newPath)) {
        candidates.push({
          oldPath: missingPath,
          newPath: newPath,
          confidence: 0.85,
          reason: `Pattern de déplacement: ${pattern.examples[0] || 'Pattern détecté'}`
        });
      }
    }
  }
  
  // 4. Recherche floue avancée
  for (const [pathKey, fullPath] of filesByPath.entries()) {
    const similarity = calculatePathSimilarity(missingPath, pathKey);
    
    if (similarity > 0.4) {
      candidates.push({
        oldPath: missingPath,
        newPath: pathKey,
        confidence: similarity * 0.6,
        reason: `Similarité de chemin: ${Math.round(similarity * 100)}%`
      });
    }
  }
  
  // Trier par confiance décroissante et supprimer les doublons
  const uniqueCandidates = candidates.reduce((acc, curr) => {
    const existing = acc.find(c => c.newPath === curr.newPath);
    if (existing) {
      if (curr.confidence > existing.confidence) {
        existing.confidence = curr.confidence;
        existing.reason = curr.reason;
      }
    } else {
      acc.push(curr);
    }
    return acc;
  }, [] as MovedFile[]);
  
  return uniqueCandidates.sort((a, b) => b.confidence - a.confidence);
}

// Fonction pour calculer la similarité entre deux chemins
function calculatePathSimilarity(path1: string, path2: string): number {
  const segments1 = path1.split('/').filter(s => s.length > 0);
  const segments2 = path2.split('/').filter(s => s.length > 0);
  
  // Similarité basée sur les segments communs
  const commonSegments = segments1.filter(seg => segments2.includes(seg));
  const segmentSimilarity = commonSegments.length / Math.max(segments1.length, segments2.length);
  
  // Similarité de chaîne globale
  const stringSimilarity = calculateStringSimilarity(path1, path2);
  
  // Pondération: segments communs plus importants que similarité de chaîne
  return (segmentSimilarity * 0.7) + (stringSimilarity * 0.3);
}

// Fonction pour extraire les exports d'un fichier
function extractExports(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const exports: string[] = [];
    
    // Regex pour différents types d'exports
    const exportPatterns = [
      // export function/const/class name
      /export\s+(?:function|const|class|interface|type|enum)\s+(\w+)/g,
      // export { name1, name2 }
      /export\s*\{\s*([^}]+)\s*\}/g,
      // export default
      /export\s+default\s+(?:function\s+(\w+)|class\s+(\w+)|(\w+))/g,
      // export const { destructured } = 
      /export\s+const\s+\{([^}]+)\}/g,
    ];
    
    exportPatterns.forEach(regex => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (match[1]) {
          // Si c'est un export { ... }, séparer les noms
          if (match[0].includes('{')) {
            const names = match[1].split(',').map(n => {
              const cleaned = n.trim().split(' as ')[0].trim();
              return cleaned.replace(/[{}]/g, '');
            }).filter(n => n && n.length > 0);
            exports.push(...names);
          } else {
            exports.push(match[1]);
          }
        }
        // Pour les autres groupes de capture
        for (let i = 2; i < match.length; i++) {
          if (match[i]) {
            exports.push(match[i]);
          }
        }
      }
    });
    
    return [...new Set(exports)]; // Supprimer les doublons
  } catch (error) {
    return [];
  }
}

// Fonction pour construire la carte de tous les fichiers existants
function buildFileMap(): void {
  console.log(chalk.blue('🔍 Construction de la carte des fichiers et exports...'));
  
  const patterns = FILE_EXTENSIONS.map(ext => `${SRC_DIR}/**/*${ext}`);
  let fileCount = 0;
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { ignore: IGNORE_PATTERNS });
    files.forEach(filePath => {
      const fileName = path.basename(filePath);
      const fileNameWithoutExt = fileName.replace(/\.(ts|tsx|js|jsx)$/, '');
      const relativePath = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
      
      // Stocker plusieurs variantes pour faciliter la recherche
      existingFiles.set(fileName, filePath);
      existingFiles.set(fileNameWithoutExt, filePath);
      existingFiles.set(relativePath, filePath);
      existingFiles.set(relativePath.replace(/\.(ts|tsx|js|jsx)$/, ''), filePath);
      
      // Stocker le chemin normalisé
      filesByPath.set(relativePath, filePath);
      filesByPath.set(relativePath.replace(/\.(ts|tsx|js|jsx)$/, ''), filePath);
      
      // Si c'est un fichier index, stocker aussi le nom du dossier parent
      if (fileName.match(/^index\.(ts|tsx|js|jsx)$/)) {
        const parentDir = path.basename(path.dirname(filePath));
        existingFiles.set(parentDir, filePath);
        const parentPath = path.dirname(relativePath);
        existingFiles.set(parentPath, filePath);
        filesByPath.set(parentPath, filePath);
      }
      
      // Extraire et stocker les exports
      const exports = extractExports(filePath);
      if (exports.length > 0) {
        fileExports.set(filePath, exports);
        
        // Créer un index inversé : export -> fichiers
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
  
  console.log(chalk.green(`✓ ${fileCount} fichiers trouvés dans le projet`));
  console.log(chalk.green(`✓ ${fileExports.size} fichiers avec exports détectés`));
  console.log(chalk.green(`✓ ${filesByExport.size} exports uniques indexés`));
  
  // Détecter automatiquement les déplacements après avoir construit la carte
  detectFileMovements();
}

// Fonction pour extraire tous les imports d'un fichier
function extractImports(fileContent: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  
  // Regex améliorées pour capturer différents types d'imports
  const importPatterns = [
    // import { name1, name2 } from '...' - avec capture des noms
    {
      regex: /import\s*\{([^}]*)\}\s*from\s+['"]([^'"]+)['"]/g,
      type: 'named' as const
    },
    // import * as name from '...'
    {
      regex: /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
      type: 'namespace' as const
    },
    // import name from '...'
    {
      regex: /import\s+(\w+)(?:\s*,\s*\{[^}]*\})?\s+from\s+['"]([^'"]+)['"]/g,
      type: 'default' as const
    },
    // import name, { others } from '...'
    {
      regex: /import\s+(\w+)\s*,\s*\{([^}]*)\}\s*from\s+['"]([^'"]+)['"]/g,
      type: 'mixed' as const
    },
    // import '...' (side effect)
    {
      regex: /import\s+['"]([^'"]+)['"]/g,
      type: 'side-effect' as const
    },
  ];
  
  importPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(fileContent)) !== null) {
      let importPath: string;
      let importedNames: string[] = [];
      
      if (pattern.type === 'named') {
        importPath = match[2];
        if (match[1]) {
          importedNames = match[1].split(',').map(name => 
            name.trim().split(' as ')[0].trim()
          ).filter(name => name.length > 0);
        }
      } else if (pattern.type === 'mixed') {
        importPath = match[3];
        importedNames = [match[1]]; // default import
        if (match[2]) {
          const namedImports = match[2].split(',').map(name => 
            name.trim().split(' as ')[0].trim()
          ).filter(name => name.length > 0);
          importedNames.push(...namedImports);
        }
      } else if (pattern.type === 'namespace' || pattern.type === 'default') {
        importPath = match[2];
        if (match[1]) {
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
        importType: pattern.type,
        startPos: match.index,
        endPos: match.index + match[0].length
      });
    }
  });
  
  return imports;
}

// Fonction pour vérifier si un chemin d'import existe
function importExists(importPath: string, fromFile: string): boolean {
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return true; // Import de module npm
  }
  
  const fromDir = path.dirname(fromFile);
  const absolutePath = path.resolve(fromDir, importPath);
  
  // Extensions à essayer
  const extensionsToTry = [
    '', '.ts', '.tsx', '.js', '.jsx',
    '/index.ts', '/index.tsx', '/index.js', '/index.jsx'
  ];
  
  return extensionsToTry.some(ext => fs.existsSync(absolutePath + ext));
}

// Fonction pour calculer la similarité entre deux chaînes
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Fonction pour calculer la distance de Levenshtein
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

// Fonction améliorée pour trouver le nouveau chemin d'un fichier
function findNewPath(oldImportPath: string, fromFile: string, importedNames?: string[]): string | null {
  // 1. Vérifier les mappings manuels d'abord
  if (MANUAL_MAPPINGS[oldImportPath]) {
    return MANUAL_MAPPINGS[oldImportPath];
  }
  
  // 2. Vérifier les mappings détectés automatiquement
  const normalizedOldPath = normalizePath(oldImportPath, fromFile);
  if (normalizedOldPath && detectedMappings.has(normalizedOldPath)) {
    const mapping = detectedMappings.get(normalizedOldPath)!;
    const fromDir = path.dirname(fromFile);
    const targetFile = filesByPath.get(mapping.newPath);
    
    if (targetFile) {
      const newRelativePath = path.relative(fromDir, targetFile);
      let finalPath = newRelativePath.replace(/\\/g, '/');
      
      // Enlever l'extension si elle n'était pas dans l'import original
      if (!oldImportPath.match(/\.(ts|tsx|js|jsx)$/)) {
        finalPath = finalPath.replace(/\.(ts|tsx|js|jsx)$/, '');
      }
      
      // S'assurer que le chemin commence par ./ pour les imports relatifs
      if (!finalPath.startsWith('.') && !finalPath.startsWith('/')) {
        finalPath = './' + finalPath;
      }
      
      if (verbose) {
        console.log(chalk.gray(`    └─ Mapping détecté: ${mapping.reason}`));
      }
      
      return finalPath;
    }
  }
  
  // 3. Si c'est un import avec @/, chercher dans les mappings manuels partiels
  for (const [oldPath, newPath] of Object.entries(MANUAL_MAPPINGS)) {
    if (oldImportPath.includes(oldPath.replace('@/', ''))) {
      return newPath;
    }
  }
  
  // Extraire le nom du fichier/module de l'ancien import
  let searchName = path.basename(oldImportPath);
  searchName = searchName.replace(/\.(ts|tsx|js|jsx)$/, '');
  
  // Chercher dans notre carte
  let candidates: Array<{path: string, score: number, reason: string}> = [];
  
  // 4. Recherche par noms d'exports (priorité la plus haute)
  if (importedNames && importedNames.length > 0) {
    importedNames.forEach(exportName => {
      if (filesByExport.has(exportName)) {
        const files = filesByExport.get(exportName)!;
        files.forEach(filePath => {
          const score = 20; // Score très élevé pour les matches d'exports
          candidates.push({
            path: filePath, 
            score, 
            reason: `Export "${exportName}" trouvé`
          });
        });
      }
    });
  }
  
  // 5. Recherche exacte par nom de fichier
  if (existingFiles.has(searchName)) {
    candidates.push({
      path: existingFiles.get(searchName)!, 
      score: 15,
      reason: 'Nom de fichier exact'
    });
  }
  
  // 6. Recherche par segments de chemin
  if (oldImportPath.includes('/')) {
    const segments = oldImportPath.split('/').filter(s => s !== '.' && s !== '..');
    
    // Essayer différentes combinaisons de segments
    for (let i = 1; i <= segments.length; i++) {
      const pathPart = segments.slice(-i).join('/');
      for (const [key, value] of existingFiles.entries()) {
        if (key.includes(pathPart) || value.includes(pathPart)) {
          candidates.push({
            path: value,
            score: 10 + i,
            reason: `Segments de chemin "${pathPart}"`
          });
        }
      }
    }
  }
  
  // 7. Recherche partielle/floue
  for (const [key, value] of existingFiles.entries()) {
    const similarity = calculateStringSimilarity(searchName.toLowerCase(), key.toLowerCase());
    if (similarity > 0.6) {
      candidates.push({
        path: value,
        score: similarity * 8,
        reason: `Similarité ${Math.round(similarity * 100)}%`
      });
    }
  }
  
  // Supprimer les doublons et trier par score
  const uniqueCandidates = candidates.reduce((acc, curr) => {
    const existing = acc.find(c => c.path === curr.path);
    if (existing) {
      if (curr.score > existing.score) {
        existing.score = curr.score;
        existing.reason = curr.reason;
      }
    } else {
      acc.push(curr);
    }
    return acc;
  }, [] as Array<{path: string, score: number, reason: string}>);
  
  uniqueCandidates.sort((a, b) => b.score - a.score);
  
  if (uniqueCandidates.length > 0 && uniqueCandidates[0].score >= 8) {
    const fromDir = path.dirname(fromFile);
    const bestCandidate = uniqueCandidates[0];
    
    if (verbose) {
      console.log(chalk.gray(`    └─ Trouvé: ${bestCandidate.reason} (score: ${bestCandidate.score.toFixed(1)})`));
    }
    
    // Calculer le nouveau chemin relatif
    const newRelativePath = path.relative(fromDir, bestCandidate.path);
    let finalPath = newRelativePath.replace(/\\/g, '/');
    
    // Enlever l'extension si elle n'était pas dans l'import original
    if (!oldImportPath.match(/\.(ts|tsx|js|jsx)$/)) {
      finalPath = finalPath.replace(/\.(ts|tsx|js|jsx)$/, '');
    }
    
    // Si c'est un fichier index et que l'import original ne le mentionnait pas
    if (finalPath.endsWith('/index') && !oldImportPath.includes('index')) {
      finalPath = finalPath.replace(/\/index$/, '');
    }
    
    // S'assurer que le chemin commence par ./ pour les imports relatifs
    if (!finalPath.startsWith('.') && !finalPath.startsWith('/')) {
      finalPath = './' + finalPath;
    }
    
    return finalPath;
  }
  
  return null;
}

// Fonction pour créer un fichier stub si nécessaire
function createMissingFile(importPath: string, fromFile: string, importedNames?: string[]): boolean {
  if (!createMissing) return false;
  
  const fromDir = path.dirname(fromFile);
  const absolutePath = path.resolve(fromDir, importPath);
  
  // Déterminer l'extension appropriée
  let filePath = absolutePath;
  if (!path.extname(filePath)) {
    filePath += '.ts'; // Par défaut TypeScript
  }
  
  // Créer le répertoire si nécessaire
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Générer le contenu du stub
  let content = '// Fichier généré automatiquement\n\n';
  
  if (importedNames && importedNames.length > 0) {
    importedNames.forEach(name => {
      // Deviner le type d'export basé sur le nom
      if (name.toLowerCase().includes('component') || name.match(/^[A-Z]/)) {
        content += `export const ${name} = () => {\n  return <div>TODO: Implémenter ${name}</div>;\n};\n\n`;
      } else if (name.toLowerCase().includes('service') || name.toLowerCase().includes('util')) {
        content += `export const ${name} = {\n  // TODO: Implémenter ${name}\n};\n\n`;
      } else {
        content += `export const ${name} = 'TODO: Implémenter ${name}';\n\n`;
      }
    });
  } else {
    content += 'export default {};\n';
  }
  
  try {
    fs.writeFileSync(filePath, content);
    console.log(chalk.yellow(`  📝 Fichier stub créé: ${path.relative(process.cwd(), filePath)}`));
    return true;
  } catch (error) {
    console.log(chalk.red(`  ❌ Erreur création fichier: ${error}`));
    return false;
  }
}

// Fonction pour corriger les imports d'un fichier
function fixFileImports(filePath: string): { fixed: number; notFound: string[]; created: number } {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  let modifiedContent = fileContent;
  const imports = extractImports(fileContent);
  let fixed = 0;
  let created = 0;
  const notFound: string[] = [];
  
  // Trier les imports par position décroissante pour éviter les problèmes d'index
  imports.sort((a, b) => b.startPos - a.startPos);
  
  for (const importInfo of imports) {
    // Ignorer les imports non relatifs (modules npm)
    if (!importInfo.isRelative) {
      continue;
    }
    
    // Vérifier si l'import existe déjà
    if (importExists(importInfo.importPath, filePath)) {
      if (verbose) {
        console.log(chalk.gray(`  ✓ Import déjà valide: ${importInfo.importPath}`));
      }
      continue;
    }
    
    // Chercher le nouveau chemin
    const newPath = findNewPath(importInfo.importPath, filePath, importInfo.importedNames);
    
    if (newPath) {
      // Remplacer l'ancien chemin par le nouveau
      const newImportLine = importInfo.fullLine.replace(importInfo.importPath, newPath);
      
      modifiedContent = 
        modifiedContent.substring(0, importInfo.startPos) +
        newImportLine +
        modifiedContent.substring(importInfo.endPos);
      
      let displayInfo = `${importInfo.importPath} → ${newPath}`;
      if (importInfo.importedNames) {
        displayInfo += ` (${importInfo.importedNames.join(', ')})`;
      }
      console.log(chalk.green(`  ✅ ${displayInfo}`));
      fixed++;
    } else {
      // Essayer de créer le fichier manquant
      if (createMissingFile(importInfo.importPath, filePath, importInfo.importedNames)) {
        created++;
      } else {
        notFound.push(importInfo.importPath);
        let displayInfo = importInfo.importPath;
        if (importInfo.importedNames) {
          displayInfo += ` (${importInfo.importedNames.join(', ')})`;
        }
        console.log(chalk.red(`  ❌ Introuvable: ${displayInfo}`));
      }
    }
  }
  
  // Écrire le fichier si des changements ont été effectués
  if (fixed > 0 && !isDryRun) {
    fs.writeFileSync(filePath, modifiedContent, 'utf-8');
  }
  
  return { fixed, notFound, created };
}

// Fonction principale
async function main(): Promise<void> {
  console.log(chalk.bold.blue('\n🛠️  Script intelligent de correction des imports EcoDeli\n'));
  
  if (isDryRun) {
    console.log(chalk.yellow('🔍 Mode DRY-RUN: aucun fichier ne sera modifié\n'));
  }
  
  if (createMissing) {
    console.log(chalk.blue('📝 Mode création automatique de fichiers activé\n'));
  }
  
  // Construire la carte des fichiers
  buildFileMap();
  
  // Trouver tous les fichiers à analyser
  const patterns = FILE_EXTENSIONS.map(ext => `${SRC_DIR}/**/*${ext}`);
  const allFiles: string[] = [];
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { ignore: IGNORE_PATTERNS });
    allFiles.push(...files);
  });
  
  console.log(chalk.blue(`\n📁 Analyse de ${allFiles.length} fichiers...\n`));
  
  // Statistiques
  let totalFiles = 0;
  let filesModified = 0;
  let totalImportsFixed = 0;
  let totalImportsNotFound = 0;
  let totalFilesCreated = 0;
  
  // Traiter chaque fichier
  for (const file of allFiles) {
    const relativePath = path.relative(process.cwd(), file);
    const imports = extractImports(fs.readFileSync(file, 'utf-8'));
    const relativeImports = imports.filter(i => i.isRelative);
    
    if (relativeImports.length === 0) {
      continue;
    }
    
    totalFiles++;
    
    // Vérifier s'il y a des imports cassés
    const brokenImports = relativeImports.filter(imp => !importExists(imp.importPath, file));
    
    if (brokenImports.length > 0) {
      console.log(chalk.cyan(`\n📄 ${relativePath}`));
      const { fixed, notFound, created } = fixFileImports(file);
      
      if (fixed > 0) {
        filesModified++;
        totalImportsFixed += fixed;
      }
      
      if (created > 0) {
        totalFilesCreated += created;
      }
      
      if (notFound.length > 0) {
        totalImportsNotFound += notFound.length;
      }
    } else if (verbose) {
      console.log(chalk.gray(`\n📄 ${relativePath} - Tous les imports sont valides`));
    }
  }
  
  // Afficher le résumé
  console.log(chalk.bold.blue('\n\n📊 Résumé:\n'));
  console.log(chalk.white(`  Fichiers analysés: ${totalFiles}`));
  console.log(chalk.white(`  Fichiers ${isDryRun ? 'à modifier' : 'modifiés'}: ${filesModified}`));
  console.log(chalk.green(`  Imports ${isDryRun ? 'à corriger' : 'corrigés'}: ${totalImportsFixed}`));
  
  if (createMissing) {
    console.log(chalk.yellow(`  Fichiers ${isDryRun ? 'à créer' : 'créés'}: ${totalFilesCreated}`));
  }
  
  console.log(chalk.red(`  Imports introuvables: ${totalImportsNotFound}`));
  
  if (isDryRun && (totalImportsFixed > 0 || totalFilesCreated > 0)) {
    console.log(chalk.yellow('\n💡 Exécutez sans --dry-run pour appliquer les corrections.'));
  } else if (totalImportsNotFound > 0) {
    console.log(chalk.yellow('\n⚠️  Certains fichiers semblent avoir été supprimés.'));
    console.log(chalk.yellow('   Utilisez --create-missing pour créer des fichiers stub.'));
  } else if (totalImportsFixed > 0 || totalFilesCreated > 0) {
    console.log(chalk.green('\n✅ Tous les imports ont été corrigés avec succès!'));
    if (totalFilesCreated > 0) {
      console.log(chalk.yellow('⚠️  Vérifiez les fichiers créés et implémentez-les correctement.'));
    }
  } else {
    console.log(chalk.green('\n✅ Aucun import cassé trouvé. Tout est en ordre!'));
  }
}

// Afficher l'aide
if (args.includes('--help') || args.includes('-h')) {
  console.log(chalk.bold('\n🛠️  Script intelligent de correction des imports\n'));
  console.log('Usage: pnpm fix:imports [options]');
  console.log('\nOptions:');
  console.log('  -d, --dry-run     Afficher les changements sans modifier les fichiers');
  console.log('  -v, --verbose     Afficher plus d\'informations');
  console.log('  -i, --interactive Mode interactif (affiche les candidats multiples)');
  console.log('  -c, --create-missing Créer des fichiers stub manquants');
  console.log('  -h, --help        Afficher cette aide');
  console.log('\nExemples:');
  console.log('  pnpm fix:imports                    # Corriger tous les imports');
  console.log('  pnpm fix:imports --dry-run          # Prévisualiser les changements');
  console.log('  pnpm fix:imports --verbose          # Mode détaillé');
  console.log('  pnpm fix:imports --create-missing   # Créer des fichiers manquants');
  console.log('  pnpm fix:imports --dry-run --verbose # Mode complet de prévisualisation');
  process.exit(0);
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Erreur non gérée:'), error);
  process.exit(1);
});

// Lancer le script
main().catch(error => {
  console.error(chalk.red('\n❌ Erreur:'), error);
  process.exit(1);
});