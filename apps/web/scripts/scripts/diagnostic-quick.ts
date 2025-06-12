#!/usr/bin/env tsx
// scripts/diagnostic-quick.ts

import { execSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

interface QuickCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  time: number;
  message?: string;
  canAutoFix?: boolean;
}

class QuickDiagnostic {
  private projectRoot: string;
  private results: QuickCheckResult[] = [];
  private isFixMode: boolean;

  constructor() {
    this.projectRoot = process.cwd();
    this.isFixMode = process.argv.includes('--fix');
  }

  async run(): Promise<void> {
    console.log(chalk.bold.cyan('⚡ EcoDeli - Diagnostic Rapide\n'));

    if (this.isFixMode) {
      console.log(chalk.blue('🔧 Mode correction automatique activé\n'));
    }

    const startTime = Date.now();

    // Vérifications essentielles
    await this.checkTypeScript();
    await this.checkImports();
    await this.checkLinting();
    await this.checkFormatting();
    await this.checkBuild();

    const totalTime = Date.now() - startTime;
    this.displaySummary(totalTime);

    // Appliquer les corrections si demandé
    if (this.isFixMode) {
      await this.applyAutoFixes();
    }

    // Exit code basé sur les résultats
    const hasErrors = this.results.some(r => r.status === 'fail');
    if (hasErrors) {
      process.exit(1);
    }
  }

  private async checkTypeScript(): Promise<void> {
    const startTime = Date.now();
    console.log(chalk.blue('🔍 Vérification TypeScript...'));

    try {
      execSync('pnpm typecheck', { 
        stdio: 'pipe', 
        cwd: this.projectRoot 
      });

      this.results.push({
        name: 'TypeScript',
        status: 'pass',
        time: Date.now() - startTime
      });

      console.log(chalk.green('✅ TypeScript: OK'));

    } catch (error: any) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const errorCount = (output.match(/error TS/g) || []).length;

      this.results.push({
        name: 'TypeScript',
        status: 'fail',
        time: Date.now() - startTime,
        message: `${errorCount} erreur(s) de type détectée(s)`,
        canAutoFix: true
      });

      console.log(chalk.red(`❌ TypeScript: ${errorCount} erreur(s)`));
    }
  }

  private async checkImports(): Promise<void> {
    const startTime = Date.now();
    console.log(chalk.blue('🔍 Vérification des imports...'));

    try {
      // Utiliser le script existant en mode dry-run
      execSync('tsx scripts/fix-imports-auto.ts --dry-run', { 
        stdio: 'pipe', 
        cwd: this.projectRoot 
      });

      this.results.push({
        name: 'Imports',
        status: 'pass',
        time: Date.now() - startTime
      });

      console.log(chalk.green('✅ Imports: OK'));

    } catch (error: any) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const hasIssues = output.includes('Fix') || output.includes('corrections');

      if (hasIssues) {
        this.results.push({
          name: 'Imports',
          status: 'warning',
          time: Date.now() - startTime,
          message: 'Optimisations possibles détectées',
          canAutoFix: true
        });

        console.log(chalk.yellow('⚠️  Imports: Optimisations possibles'));
      } else {
        this.results.push({
          name: 'Imports',
          status: 'pass',
          time: Date.now() - startTime
        });

        console.log(chalk.green('✅ Imports: OK'));
      }
    }
  }

  private async checkLinting(): Promise<void> {
    const startTime = Date.now();
    console.log(chalk.blue('🔍 Vérification ESLint...'));

    try {
      execSync('pnpm lint', { 
        stdio: 'pipe', 
        cwd: this.projectRoot 
      });

      this.results.push({
        name: 'Linting',
        status: 'pass',
        time: Date.now() - startTime
      });

      console.log(chalk.green('✅ Linting: OK'));

    } catch (error: any) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const errorCount = (output.match(/✖/g) || []).length;

      this.results.push({
        name: 'Linting',
        status: 'fail',
        time: Date.now() - startTime,
        message: `${errorCount} problème(s) ESLint détecté(s)`,
        canAutoFix: true
      });

      console.log(chalk.red(`❌ Linting: ${errorCount} problème(s)`));
    }
  }

  private async checkFormatting(): Promise<void> {
    const startTime = Date.now();
    console.log(chalk.blue('🔍 Vérification du formatage...'));

    try {
      execSync('pnpm format:check', { 
        stdio: 'pipe', 
        cwd: this.projectRoot 
      });

      this.results.push({
        name: 'Formatage',
        status: 'pass',
        time: Date.now() - startTime
      });

      console.log(chalk.green('✅ Formatage: OK'));

    } catch {
      this.results.push({
        name: 'Formatage',
        status: 'warning',
        time: Date.now() - startTime,
        message: 'Fichiers non formatés détectés',
        canAutoFix: true
      });

      console.log(chalk.yellow('⚠️  Formatage: Corrections nécessaires'));
    }
  }

  private async checkBuild(): Promise<void> {
    const startTime = Date.now();
    console.log(chalk.blue('🔍 Test de build...'));

    try {
      execSync('pnpm build', { 
        stdio: 'pipe', 
        cwd: this.projectRoot 
      });

      this.results.push({
        name: 'Build',
        status: 'pass',
        time: Date.now() - startTime
      });

      console.log(chalk.green('✅ Build: OK'));

    } catch (error: any) {
      this.results.push({
        name: 'Build',
        status: 'fail',
        time: Date.now() - startTime,
        message: 'Échec du build',
        canAutoFix: false
      });

      console.log(chalk.red('❌ Build: Échec'));
    }
  }

  private async applyAutoFixes(): Promise<void> {
    console.log(chalk.bold.blue('\n🔧 Application des corrections automatiques...\n'));

    const fixableResults = this.results.filter(r => r.canAutoFix && r.status !== 'pass');

    for (const result of fixableResults) {
      console.log(chalk.yellow(`🔧 Correction: ${result.name}...`));

      try {
        switch (result.name) {
          case 'TypeScript':
            execSync('tsx scripts/scripts/fix-build-errors.ts', { 
              stdio: 'inherit', 
              cwd: this.projectRoot 
            });
            break;

          case 'Imports':
            execSync('tsx scripts/fix-imports-auto.ts', { 
              stdio: 'inherit', 
              cwd: this.projectRoot 
            });
            break;

          case 'Linting':
            execSync('pnpm lint --fix', { 
              stdio: 'inherit', 
              cwd: this.projectRoot 
            });
            break;

          case 'Formatage':
            execSync('pnpm format', { 
              stdio: 'inherit', 
              cwd: this.projectRoot 
            });
            break;
        }

        console.log(chalk.green(`✅ ${result.name}: Corrigé`));

      } catch (error) {
        console.log(chalk.red(`❌ ${result.name}: Correction échouée`));
      }
    }

    // Re-vérifier après corrections
    console.log(chalk.blue('\n🔄 Re-vérification après corrections...\n'));
    
    // Reset et re-run
    this.results = [];
    await this.checkTypeScript();
    await this.checkImports();
    await this.checkLinting();
    await this.checkFormatting();
  }

  private displaySummary(totalTime: number): void {
    console.log(chalk.bold.cyan('\n📊 Résumé du diagnostic:'));
    console.log(chalk.gray(`⏱️  Durée: ${totalTime}ms\n`));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    console.log(chalk.green(`✅ Réussi: ${passed}`));
    if (warnings > 0) console.log(chalk.yellow(`⚠️  Avertissements: ${warnings}`));
    if (failed > 0) console.log(chalk.red(`❌ Échecs: ${failed}`));

    // Détails des problèmes
    const issues = this.results.filter(r => r.status !== 'pass');
    if (issues.length > 0) {
      console.log(chalk.bold.yellow('\n🔍 Problèmes détectés:'));
      for (const issue of issues) {
        const icon = issue.status === 'fail' ? '❌' : '⚠️';
        console.log(chalk.gray(`  ${icon} ${issue.name}: ${issue.message || 'Problème détecté'}`));
        
        if (issue.canAutoFix && !this.isFixMode) {
          console.log(chalk.gray(`     💡 Utilisez --fix pour corriger automatiquement`));
        }
      }
    }

    // Score de qualité
    const score = Math.round((passed / this.results.length) * 100);
    const scoreColor = score >= 90 ? chalk.green : score >= 70 ? chalk.yellow : chalk.red;
    console.log(scoreColor(`\n🎯 Score de qualité: ${score}%`));

    // Recommandations
    if (issues.length > 0 && !this.isFixMode) {
      console.log(chalk.bold.cyan('\n💡 Actions recommandées:'));
      console.log(chalk.yellow('🔧 Exécutez `pnpm fix` pour corriger automatiquement'));
      console.log(chalk.blue('📊 Exécutez `pnpm check:full` pour un diagnostic complet'));
    }
  }
}

// Exécution du script
const diagnostic = new QuickDiagnostic();
diagnostic.run().catch(console.error); 