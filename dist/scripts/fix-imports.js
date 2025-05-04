"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Script pour corriger les chemins d'importation dans l'ensemble du projet
 * Remplace les imports relatifs par des imports utilisant l'alias @/
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// Obtenir le répertoire actuel (équivalent à __dirname pour ESM)
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Configuration
const ROOT_DIR = path_1.default.join(__dirname, '..');
const SRC_DIR = path_1.default.join(ROOT_DIR, 'src');
const IGNORE_DIRS = ['node_modules', '.next', 'dist', '.git'];
const TYPESCRIPT_EXTS = ['.ts', '.tsx'];
// Statistiques
let totalFiles = 0;
let totalFixedFiles = 0;
let totalImportsFixed = 0;
// Couleurs pour la console
const colors = {
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    dim: (text) => `\x1b[2m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`,
};
// Patterns de remplacement
const replacementPatterns = [
    // Schémas
    {
        pattern: /from\s+['"](\.\.\/)+schemas\/([^'"]+)['"]/g,
        replacement: "from '@/schemas/$2'"
    },
    {
        pattern: /from\s+['"](\.\.\/)+schemas['"]/g,
        replacement: "from '@/schemas'"
    },
    // Services
    {
        pattern: /from\s+['"](\.\.\/)+server\/services\/([^'"]+)['"]/g,
        replacement: "from '@/server/services/$2'"
    },
    {
        pattern: /from\s+['"](\.\.\/)+services\/([^'"]+)['"]/g,
        replacement: "from '@/server/services/$2'"
    },
    // API Routers
    {
        pattern: /from\s+['"](\.\.\/)+server\/api\/routers\/([^'"]+)['"]/g,
        replacement: "from '@/server/api/routers/$2'"
    },
    {
        pattern: /from\s+['"](\.\.\/)+api\/routers\/([^'"]+)['"]/g,
        replacement: "from '@/server/api/routers/$2'"
    },
    // tRPC
    {
        pattern: /from\s+['"](\.\.\/)+trpc['"]/g,
        replacement: "from '@/server/api/trpc'"
    },
    {
        pattern: /from\s+['"](\.\.\/)+server\/api\/trpc['"]/g,
        replacement: "from '@/server/api/trpc'"
    },
    // Components
    {
        pattern: /from\s+['"](\.\.\/)+components\/([^'"]+)['"]/g,
        replacement: "from '@/components/$2'"
    },
    // Context
    {
        pattern: /from\s+['"](\.\.\/)+context\/([^'"]+)['"]/g,
        replacement: "from '@/context/$2'"
    },
    // Hooks
    {
        pattern: /from\s+['"](\.\.\/)+hooks\/([^'"]+)['"]/g,
        replacement: "from '@/hooks/$2'"
    },
    // Types
    {
        pattern: /from\s+['"](\.\.\/)+types\/([^'"]+)['"]/g,
        replacement: "from '@/types/$2'"
    },
    // Utils/Lib
    {
        pattern: /from\s+['"](\.\.\/)+lib\/([^'"]+)['"]/g,
        replacement: "from '@/lib/$2'"
    },
    {
        pattern: /from\s+['"](\.\.\/)+utils\/([^'"]+)['"]/g,
        replacement: "from '@/lib/$2'"
    },
    // Config
    {
        pattern: /from\s+['"](\.\.\/)+config\/([^'"]+)['"]/g,
        replacement: "from '@/config/$2'"
    },
    // Constants
    {
        pattern: /from\s+['"](\.\.\/)+constants\/([^'"]+)['"]/g,
        replacement: "from '@/constants/$2'"
    },
];
/**
 * Vérifie si un chemin doit être ignoré
 */
function shouldIgnore(filePath) {
    return IGNORE_DIRS.some(dir => filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`));
}
/**
 * Corrige les imports dans un fichier
 */
function fixImportsInFile(filePath) {
    totalFiles++;
    // Vérifier si le fichier est un fichier TypeScript/TSX
    if (!TYPESCRIPT_EXTS.some(ext => filePath.endsWith(ext))) {
        return;
    }
    console.log(colors.dim(`Analyse: ${filePath}`));
    try {
        // Lire le contenu du fichier
        let content = fs_1.default.readFileSync(filePath, 'utf8');
        const originalContent = content;
        let fileImportsFixed = 0;
        // Appliquer tous les patterns de remplacement
        for (const { pattern, replacement } of replacementPatterns) {
            // Compter le nombre de remplacements
            const matches = content.match(pattern);
            if (matches) {
                fileImportsFixed += matches.length;
            }
            // Effectuer le remplacement
            content = content.replace(pattern, replacement);
        }
        // S'il y a eu des modifications, enregistrer le fichier
        if (content !== originalContent) {
            fs_1.default.writeFileSync(filePath, content, 'utf8');
            totalFixedFiles++;
            totalImportsFixed += fileImportsFixed;
            console.log(colors.green(`✅ Corrigé: ${filePath} (${fileImportsFixed} imports)`));
        }
    }
    catch (error) {
        console.error(colors.red(`❌ Erreur lors du traitement de ${filePath}:`), error);
    }
}
/**
 * Parcourt récursivement un répertoire pour corriger les imports
 */
function processDirectory(dirPath) {
    if (shouldIgnore(dirPath)) {
        return;
    }
    try {
        // Lire le contenu du répertoire
        const items = fs_1.default.readdirSync(dirPath);
        for (const item of items) {
            const itemPath = path_1.default.join(dirPath, item);
            const stats = fs_1.default.statSync(itemPath);
            if (stats.isDirectory()) {
                // Si c'est un répertoire, traiter son contenu récursivement
                processDirectory(itemPath);
            }
            else if (stats.isFile()) {
                // Si c'est un fichier, corriger les imports
                fixImportsInFile(itemPath);
            }
        }
    }
    catch (error) {
        console.error(colors.red(`❌ Erreur lors du traitement du répertoire ${dirPath}:`), error);
    }
}
/**
 * Fonction principale
 */
function main() {
    console.log(colors.blue('🔍 Recherche et correction des chemins d\'importation relatifs...'));
    console.log(colors.blue(`📁 Répertoire racine: ${SRC_DIR}`));
    const startTime = Date.now();
    // Traiter le répertoire src
    processDirectory(SRC_DIR);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    // Afficher les statistiques
    console.log(colors.blue('📊 Statistiques:'));
    console.log(colors.blue(`  - Fichiers analysés: ${totalFiles}`));
    console.log(colors.green(`  - Fichiers corrigés: ${totalFixedFiles}`));
    console.log(colors.green(`  - Imports corrigés: ${totalImportsFixed}`));
    console.log(colors.blue(`  - Durée: ${duration}s`));
    console.log(colors.green(colors.bold('🎉 Terminé!')));
}
// Exécuter le script
main();
//# sourceMappingURL=fix-imports.js.map