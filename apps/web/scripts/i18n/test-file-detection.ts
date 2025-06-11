#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

// Pour remplacer __dirname dans les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

async function testFileDetection() {
  console.log(chalk.blue('🔍 Test de détection des fichiers...'));
  console.log(chalk.blue(`📁 Répertoire racine du projet: ${projectRoot}`));

  // Répertoires à analyser
  const directories = ['src/app', 'src/components', 'src/hooks', 'src/lib', 'src/server'];

  // Extensions à rechercher
  const extensions = ['ts', 'tsx', 'js', 'jsx'];

  // Résultats par extension
  const resultsByExt: Record<string, string[]> = {};

  // Pour chaque répertoire et extension
  for (const directory of directories) {
    const fullDirPath = path.resolve(projectRoot, directory);
    console.log(chalk.blue(`📁 Test du répertoire: ${fullDirPath}`));

    // Vérifier si le répertoire existe
    try {
      await fs.access(fullDirPath);
    } catch (error) {
      console.log(
        chalk.yellow(`⚠️ Le répertoire ${fullDirPath} n'existe pas ou n'est pas accessible`)
      );
      continue;
    }

    for (const ext of extensions) {
      // Test avec différentes méthodes de pattern
      const patterns = [
        `${fullDirPath}/**/*.${ext}`, // Méthode 1: chemin absolu + pattern glob
        path.join(fullDirPath, '**', `*.${ext}`), // Méthode 2: path.join
        `${directory}/**/*.${ext}`, // Méthode 3: chemin relatif (à partir de la racine)
      ];

      console.log(chalk.blue(`🔍 Test de l'extension .${ext}:`));

      for (const [index, pattern] of patterns.entries()) {
        try {
          console.log(chalk.blue(`  [${index + 1}] Pattern: ${pattern}`));

          // Méthode 1: utiliser glob directement
          const files = await glob(pattern, {
            ignore: ['**/node_modules/**'],
            cwd: index === 2 ? projectRoot : undefined, // Utiliser cwd uniquement pour le pattern relatif
          });

          console.log(
            chalk.green(`  ✅ ${files.length} fichiers trouvés avec la méthode ${index + 1}`)
          );

          // Stocker les résultats
          if (!resultsByExt[ext]) {
            resultsByExt[ext] = [];
          }

          // Afficher quelques fichiers trouvés
          if (files.length > 0) {
            console.log(chalk.green(`  📄 Exemples de fichiers trouvés:`));
            files.slice(0, 3).forEach(file => {
              console.log(chalk.green(`    - ${file}`));
              resultsByExt[ext].push(file);
            });
          }

          // Recherche spécifique de todo
          const todoFiles = files.filter(file => file.includes('todo') || file.includes('Todo'));
          if (todoFiles.length > 0) {
            console.log(chalk.green(`  🎯 Fichiers Todo trouvés (${todoFiles.length}):`));
            todoFiles.forEach(file => {
              console.log(chalk.green(`    - ${file}`));
            });
          } else if (files.length > 0) {
            console.log(chalk.yellow(`  ⚠️ Aucun fichier Todo trouvé avec ce pattern`));
          }
        } catch (error) {
          console.error(chalk.red(`  ❌ Erreur avec le pattern ${pattern}: ${error}`));
        }
      }
    }
  }

  // Résumé
  console.log(chalk.blue('\n📊 Résumé des fichiers trouvés:'));
  for (const ext of extensions) {
    const files = resultsByExt[ext] || [];
    console.log(chalk.blue(`  .${ext}: ${files.length} fichiers uniques`));
  }
}

// Exécuter le test
testFileDetection().catch(error => {
  console.error(chalk.red(`❌ Erreur d'exécution: ${error}`));
});
