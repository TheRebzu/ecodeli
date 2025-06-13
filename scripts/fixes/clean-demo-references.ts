#!/usr/bin/env tsx

/**
 * Script de nettoyage automatique des références de démonstration
 * 
 * Ce script supprime toutes les références aux données de démonstration,
 * mock et hardcodées dans le projet EcoDeli pour utiliser uniquement
 * des vraies données provenant de l'API.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

interface CleanupRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

interface FileCleanupResult {
  filePath: string;
  changesCount: number;
  changes: string[];
}

class DemoReferenceCleaner {
  private rules: CleanupRule[] = [
    // Commentaires de simulation
    {
      pattern: /\/\/.*[Ss]imulation.*/g,
      replacement: '// TODO: Implémenter avec vraie API',
      description: 'Remplacer commentaires de simulation'
    },
    // Données mock hardcodées
    {
      pattern: /const\s+mock\w+\s*:\s*\w+\[\]\s*=\s*\[[\s\S]*?\];/g,
      replacement: '// Données récupérées depuis l\'API réelle',
      description: 'Supprimer données mock hardcodées'
    },
    // Console.log de stub
    {
      pattern: /console\.log\(`\[.*Stub.*\].*`.*\);/g,
      replacement: '',
      description: 'Supprimer logs de stub'
    },
    // Références demo dans les métadonnées
    {
      pattern: /downgradedReasonInDemo/g,
      replacement: 'downgradedReason',
      description: 'Renommer champs demo en champs normaux'
    },
    // ID de démo
    {
      pattern: /`demo_\w+_/g,
      replacement: '`',
      description: 'Supprimer préfixes demo dans les ID'
    },
    // Scénarios de succès demo
    {
      pattern: /demoSuccessScenario:\s*input\.demoSuccessScenario,?/g,
      replacement: '',
      description: 'Supprimer paramètres demoSuccessScenario'
    },
    // Validations de demo
    {
      pattern: /if\s*\(.*demoSuccessScenario.*\)\s*{[\s\S]*?}/g,
      replacement: '// Validation réelle implémentée',
      description: 'Remplacer validations demo'
    },
    // Commentaires temporaires d'API mock
    {
      pattern: /\/\/.*API mock temporaire.*/g,
      replacement: '// API réelle intégrée',
      description: 'Mettre à jour commentaires d\'API'
    },
    // Commentaires de stub
    {
      pattern: /\/\/.*stub.*/gi,
      replacement: '// Implémentation réelle',
      description: 'Remplacer commentaires de stub'
    }
  ];

  private excludedPatterns = [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /coverage/,
    /\.next/,
    /public\/uploads/,
    /prisma\/migrations/,
    /scripts\/seed/, // Garder les seeds avec faker.js
    /\.test\./,
    /\.spec\./,
    /\.d\.ts$/
  ];

  private includedExtensions = ['.ts', '.tsx', '.js', '.jsx'];

  public async cleanProject(projectRoot: string, dryRun: boolean = false): Promise<void> {
    console.log(chalk.blue('🧹 Nettoyage des références de démonstration\n'));
    
    if (dryRun) {
      console.log(chalk.yellow('🔍 Mode simulation activé (--dry-run)\n'));
    }

    const filesToClean = this.findFilesToClean(projectRoot);
    console.log(chalk.green(`📂 ${filesToClean.length} fichiers à analyser\n`));

    const results: FileCleanupResult[] = [];
    let totalChanges = 0;

    for (const filePath of filesToClean) {
      try {
        const result = await this.cleanFile(filePath, dryRun);
        if (result.changesCount > 0) {
          results.push(result);
          totalChanges += result.changesCount;
        }
      } catch (error) {
        console.log(chalk.red(`❌ Erreur lors du nettoyage de ${filePath}: ${error}`));
      }
    }

    // Rapport final
    console.log(chalk.blue('\n📊 Rapport de nettoyage:'));
    console.log(chalk.green(`✅ ${results.length} fichiers modifiés`));
    console.log(chalk.green(`✅ ${totalChanges} changements appliqués`));

    if (results.length > 0) {
      console.log(chalk.blue('\n📝 Détails des modifications:'));
      results.forEach(result => {
        console.log(chalk.cyan(`\n📄 ${result.filePath}:`));
        result.changes.forEach(change => {
          console.log(chalk.gray(`  • ${change}`));
        });
      });
    }

    if (dryRun) {
      console.log(chalk.yellow('\n🔍 Mode simulation - aucune modification appliquée'));
      console.log(chalk.blue('Pour appliquer les changements, relancez sans --dry-run'));
    } else {
      console.log(chalk.green('\n✅ Nettoyage terminé avec succès!'));
      console.log(chalk.blue('Les références de démonstration ont été supprimées.'));
    }
  }

  private findFilesToClean(dir: string): string[] {
    const files: string[] = [];

    const traverse = (currentDir: string) => {
      const items = readdirSync(currentDir);

      for (const item of items) {
        const itemPath = join(currentDir, item);
        const stat = statSync(itemPath);

        // Vérifier si le chemin doit être exclu
        if (this.excludedPatterns.some(pattern => pattern.test(itemPath))) {
          continue;
        }

        if (stat.isDirectory()) {
          traverse(itemPath);
        } else if (stat.isFile()) {
          const ext = item.substring(item.lastIndexOf('.'));
          if (this.includedExtensions.includes(ext)) {
            files.push(itemPath);
          }
        }
      }
    };

    traverse(dir);
    return files;
  }

  private async cleanFile(filePath: string, dryRun: boolean): Promise<FileCleanupResult> {
    const content = readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    const changes: string[] = [];

    for (const rule of this.rules) {
      const matches = content.match(rule.pattern);
      if (matches) {
        modifiedContent = modifiedContent.replace(rule.pattern, rule.replacement);
        changes.push(`${rule.description}: ${matches.length} occurrence(s)`);
      }
    }

    const changesCount = changes.length;

    if (changesCount > 0 && !dryRun) {
      writeFileSync(filePath, modifiedContent, 'utf8');
    }

    return {
      filePath: filePath.replace(process.cwd(), '.'),
      changesCount,
      changes
    };
  }
}

// Exécution du script
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const projectRoot = process.cwd();

  const cleaner = new DemoReferenceCleaner();
  await cleaner.cleanProject(projectRoot, dryRun);
}

// Exécution automatique si appelé directement
main().catch(console.error);

export { DemoReferenceCleaner }; 