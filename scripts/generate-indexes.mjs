#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script pour générer automatiquement les fichiers index.ts
 * dans tous les dossiers du projet avec les exports appropriés
 */

// Configuration du script
const CONFIG = {
  // Dossiers à traiter
  targetDirectories: [
    'src/components',
    'src/hooks',
    'src/lib',
    'src/schemas',
    'src/server/api/routers',
    'src/server/services',
    'src/types',
    'src/utils',
    'src/store'
  ],
  
  // Extensions de fichiers à inclure
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  
  // Fichiers à exclure
  excludeFiles: [
    'index.ts',
    'index.tsx',
    'index.js',
    'index.jsx',
    '.test.ts',
    '.test.tsx',
    '.spec.ts',
    '.spec.tsx',
    '.stories.ts',
    '.stories.tsx'
  ],
  
  // Dossiers à exclure
  excludeDirectories: [
    'node_modules',
    '.next',
    '.git',
    'dist',
    'build'
  ]
};

/**
 * Vérifie si un fichier doit être exclu
 */
function shouldExcludeFile(fileName) {
  return CONFIG.excludeFiles.some(exclude => 
    fileName.includes(exclude) || fileName.endsWith(exclude)
  );
}

/**
 * Vérifie si un dossier doit être exclu
 */
function shouldExcludeDirectory(dirName) {
  return CONFIG.excludeDirectories.includes(dirName) || dirName.startsWith('.');
}

/**
 * Obtient tous les fichiers TypeScript/JavaScript d'un dossier
 */
function getFilesInDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    const files = [];
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isFile()) {
        const ext = path.extname(item);
        if (CONFIG.fileExtensions.includes(ext) && !shouldExcludeFile(item)) {
          files.push({
            name: item,
            nameWithoutExt: path.basename(item, ext),
            path: itemPath,
            ext
          });
        }
      }
    }
    
    return files;
  } catch (error) {
    console.warn(`⚠️  Impossible de lire le dossier ${dirPath}:`, error.message);
    return [];
  }
}

/**
 * Obtient tous les sous-dossiers d'un répertoire
 */
function getSubDirectories(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    const subDirs = [];
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !shouldExcludeDirectory(item)) {
        subDirs.push({
          name: item,
          path: itemPath
        });
      }
    }
    
    return subDirs;
  } catch (error) {
    console.warn(`⚠️  Impossible de lire le dossier ${dirPath}:`, error.message);
    return [];
  }
}

/**
 * Génère le contenu d'un fichier index.ts
 */
function generateIndexContent(files, subDirs, currentPath) {
  let content = '';
  
  // En-tête du fichier
  content += `/**\n`;
  content += ` * Index automatiquement généré pour ${currentPath}\n`;
  content += ` * Généré le: ${new Date().toLocaleString('fr-FR')}\n`;
  content += ` */\n\n`;
  
  // Exports des fichiers du dossier courant
  if (files.length > 0) {
    content += `// Exports des fichiers locaux\n`;
    for (const file of files) {
      // Déterminer le type d'export en fonction du nom du fichier
      if (file.nameWithoutExt.startsWith('use-')) {
        // Hook React
        content += `export * from './${file.nameWithoutExt}';\n`;
      } else if (file.nameWithoutExt.endsWith('.schema')) {
        // Schéma Zod
        content += `export * from './${file.nameWithoutExt}';\n`;
      } else if (file.nameWithoutExt.endsWith('.service')) {
        // Service
        content += `export * from './${file.nameWithoutExt}';\n`;
      } else if (file.nameWithoutExt.endsWith('.router')) {
        // Router tRPC
        content += `export * from './${file.nameWithoutExt}';\n`;
      } else if (file.nameWithoutExt.endsWith('.types')) {
        // Types TypeScript
        content += `export * from './${file.nameWithoutExt}';\n`;
      } else if (file.ext === '.tsx') {
        // Composant React
        content += `export { default as ${toPascalCase(file.nameWithoutExt)} } from './${file.nameWithoutExt}';\n`;
        content += `export * from './${file.nameWithoutExt}';\n`;
      } else {
        // Export générique
        content += `export * from './${file.nameWithoutExt}';\n`;
      }
    }
    content += '\n';
  }
  
  // Exports des sous-dossiers
  if (subDirs.length > 0) {
    content += `// Exports des sous-dossiers\n`;
    for (const subDir of subDirs) {
      // Vérifier si le sous-dossier a un index
      const subIndexPath = path.join(subDir.path, 'index.ts');
      if (fs.existsSync(subIndexPath) || files.length > 0) {
        content += `export * from './${subDir.name}';\n`;
      }
    }
  }
  
  return content;
}

/**
 * Convertit un nom en PascalCase
 */
function toPascalCase(str) {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Génère un fichier index.ts pour un dossier
 */
function generateIndexForDirectory(dirPath) {
  const files = getFilesInDirectory(dirPath);
  const subDirs = getSubDirectories(dirPath);
  
  // Générer récursivement les index des sous-dossiers d'abord
  for (const subDir of subDirs) {
    generateIndexForDirectory(subDir.path);
  }
  
  // Ne générer un index que s'il y a des fichiers ou des sous-dossiers avec des index
  if (files.length > 0 || subDirs.some(subDir => 
    fs.existsSync(path.join(subDir.path, 'index.ts'))
  )) {
    const indexPath = path.join(dirPath, 'index.ts');
    const content = generateIndexContent(files, subDirs, dirPath);
    
    try {
      fs.writeFileSync(indexPath, content, 'utf8');
      console.log(`✅ Généré: ${indexPath}`);
      console.log(`   📁 ${files.length} fichiers, ${subDirs.length} sous-dossiers`);
    } catch (error) {
      console.error(`❌ Erreur lors de la génération de ${indexPath}:`, error.message);
    }
  }
}

/**
 * Génère tous les fichiers index pour les dossiers configurés
 */
function generateAllIndexes() {
  console.log('🚀 Génération des fichiers index.ts...\n');
  
  for (const targetDir of CONFIG.targetDirectories) {
    const fullPath = path.resolve(targetDir);
    
    if (fs.existsSync(fullPath)) {
      console.log(`📂 Traitement du dossier: ${targetDir}`);
      generateIndexForDirectory(fullPath);
      console.log('');
    } else {
      console.warn(`⚠️  Dossier introuvable: ${targetDir}`);
    }
  }
  
  console.log('✨ Génération terminée !');
  console.log('\n📋 Résumé:');
  console.log('   - Utilisez ces imports simplifiés dans vos fichiers');
  console.log('   - Ex: import { usePayments } from "@/hooks/payment"');
  console.log('   - Ex: import { Button } from "@/components/ui"');
}

/**
 * Nettoie tous les fichiers index existants
 */
function cleanExistingIndexes() {
  console.log('🧹 Nettoyage des fichiers index existants...\n');
  
  function cleanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isFile() && item === 'index.ts') {
          fs.unlinkSync(itemPath);
          console.log(`🗑️  Supprimé: ${itemPath}`);
        } else if (stat.isDirectory() && !shouldExcludeDirectory(item)) {
          cleanDirectory(itemPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Erreur lors du nettoyage de ${dirPath}:`, error.message);
    }
  }
  
  for (const targetDir of CONFIG.targetDirectories) {
    const fullPath = path.resolve(targetDir);
    if (fs.existsSync(fullPath)) {
      cleanDirectory(fullPath);
    }
  }
  
  console.log('');
}

// Exécution du script
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--clean')) {
    cleanExistingIndexes();
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔧 Générateur d'index automatique

Usage:
  node scripts/generate-indexes.mjs [options]

Options:
  --clean    Nettoie tous les fichiers index existants avant la génération
  --help     Affiche cette aide

Exemple:
  node scripts/generate-indexes.mjs --clean
    `);
    return;
  }
  
  generateAllIndexes();
}

// Lancer le script
main();

export {
  generateAllIndexes,
  cleanExistingIndexes,
  CONFIG
}; 