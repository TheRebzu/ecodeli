#!/usr/bin/env tsx
// scripts/check-all.ts

import { execSync } from "child_process";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "fixed" | "skipped";
  duration: number;
  output?: string;
  error?: string;
  details?: string[];
}

interface CheckConfig {
  name: string;
  command: string;
  fixCommand?: string;
  skipOn?: string[];
  critical?: boolean;
  description: string;
}

class ProjectChecker {
  private projectRoot: string;
  private results: CheckResult[] = [];
  private isFixMode: boolean;
  private isVerbose: boolean;
  private isDryRun: boolean;
  private generateReport: boolean;

  public checks: CheckConfig[] = [
    {
      name: "Dépendances",
      description: "Vérifier les dépendances du projet",
      command: "pnpm install --frozen-lockfile",
      critical: true,
    },
    {
      name: "TypeScript",
      description: "Vérification des types TypeScript",
      command: "pnpm typecheck",
      fixCommand: "tsx scripts/scripts/fix-build-errors.ts",
      critical: true,
    },
    {
      name: "Imports",
      description: "Optimisation des imports",
      command: "tsx scripts/fix-imports-auto.ts --dry-run",
      fixCommand: "tsx scripts/fix-imports-auto.ts",
      critical: false,
    },
    {
      name: "Linting",
      description: "Vérification ESLint",
      command: "pnpm lint",
      fixCommand: "pnpm lint --fix",
      critical: false,
    },
    {
      name: "Formatage",
      description: "Vérification du formatage Prettier",
      command: "pnpm format:check",
      fixCommand: "pnpm format",
      critical: false,
    },
    {
      name: "Prisma",
      description: "Génération du client Prisma",
      command: "pnpm db:generate",
      critical: true,
      skipOn: ["SKIP_DB"],
    },
    {
      name: "Build",
      description: "Test de construction du projet",
      command: "pnpm build",
      fixCommand: "tsx scripts/scripts/fix-build-errors.ts && pnpm build",
      critical: true,
    },
  ];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.isFixMode = process.argv.includes("--fix");
    this.isVerbose = process.argv.includes("--verbose");
    this.isDryRun = process.argv.includes("--dry-run");
    this.generateReport = process.argv.includes("--report");
  }

  async run(): Promise<void> {
    console.log(chalk.bold.cyan("🔍 EcoDeli - Diagnostic complet du projet\n"));

    if (this.isDryRun) {
      console.log(chalk.yellow("🔍 Mode simulation activé (--dry-run)\n"));
    }

    if (this.isFixMode && !this.isDryRun) {
      console.log(chalk.blue("🔧 Mode correction automatique activé\n"));
    }

    const startTime = Date.now();

    try {
      // Vérifier l'environnement
      await this.checkEnvironment();

      // Exécuter tous les checks
      for (const check of this.checks) {
        if (this.shouldSkipCheck(check)) {
          this.results.push({
            name: check.name,
            status: "skipped",
            duration: 0,
            details: ["Check ignoré par la configuration"],
          });
          console.log(chalk.gray(`⏭️  ${check.name}: Ignoré`));
          continue;
        }

        await this.runCheck(check);
      }

      // Générer le rapport
      if (this.generateReport) {
        await this.generateReportFile();
      }

      // Afficher le résumé
      const totalTime = Date.now() - startTime;
      this.displaySummary(totalTime);

      // Code de sortie
      const hasCriticalFailures = this.results.some(
        (r) =>
          r.status === "fail" &&
          this.checks.find((c) => c.name === r.name)?.critical,
      );

      if (hasCriticalFailures) {
        console.log(chalk.red("\n❌ Échecs critiques détectés"));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("❌ Erreur lors du diagnostic :"), error);
      process.exit(1);
    }
  }

  private async checkEnvironment(): Promise<void> {
    console.log(chalk.blue("🌍 Vérification de l'environnement...\n"));

    // Vérifier Node.js
    const nodeVersion = process.version;
    console.log(chalk.gray(`📦 Node.js: ${nodeVersion}`));

    // Vérifier pnpm
    try {
      const pnpmVersion = execSync("pnpm --version", {
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();
      console.log(chalk.gray(`📦 pnpm: ${pnpmVersion}`));
    } catch {
      console.log(chalk.yellow("⚠️  pnpm non trouvé"));
    }

    // Vérifier les fichiers essentiels
    const essentialFiles = [
      "package.json",
      "tsconfig.json",
      "next.config.js",
      "src/app",
    ];

    for (const file of essentialFiles) {
      try {
        await fs.access(path.join(this.projectRoot, file));
        console.log(chalk.gray(`✅ ${file}: OK`));
      } catch {
        console.log(chalk.red(`❌ ${file}: Manquant`));
      }
    }

    console.log("");
  }

  private shouldSkipCheck(check: CheckConfig): boolean {
    if (!check.skipOn) return false;

    return check.skipOn.some((condition) => {
      switch (condition) {
        case "SKIP_DB":
          return process.env.SKIP_DB === "true";
        case "SKIP_TESTS":
          return process.env.SKIP_TESTS === "true";
        case "SKIP_ANALYSIS":
          return process.env.SKIP_ANALYSIS === "true";
        default:
          return false;
      }
    });
  }

  private async runCheck(check: CheckConfig): Promise<void> {
    const startTime = Date.now();
    console.log(chalk.blue(`🔍 ${check.name}...`));

    if (this.isVerbose) {
      console.log(chalk.gray(`   ${check.description}`));
      console.log(chalk.gray(`   Commande: ${check.command}`));
    }

    try {
      // Exécuter la commande de vérification
      const output = execSync(check.command, {
        cwd: this.projectRoot,
        encoding: "utf-8",
        stdio: "pipe",
      });

      const duration = Date.now() - startTime;

      this.results.push({
        name: check.name,
        status: "pass",
        duration,
        output: this.isVerbose ? output : undefined,
      });

      console.log(chalk.green(`✅ ${check.name}: OK (${duration}ms)`));
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorOutput =
        error.stdout?.toString() || error.stderr?.toString() || error.message;

      if (this.isVerbose) {
        console.log(chalk.gray(`   Erreur: ${errorOutput.slice(0, 200)}...`));
      }

      // Tentative de correction automatique
      if (this.isFixMode && check.fixCommand && !this.isDryRun) {
        console.log(chalk.yellow(`🔧 Tentative de correction...`));

        try {
          const fixOutput = execSync(check.fixCommand, {
            cwd: this.projectRoot,
            encoding: "utf-8",
            stdio: "pipe",
          });

          // Re-vérifier après correction
          try {
            execSync(check.command, {
              cwd: this.projectRoot,
              encoding: "utf-8",
              stdio: "pipe",
            });

            this.results.push({
              name: check.name,
              status: "fixed",
              duration,
              output: this.isVerbose ? fixOutput : undefined,
              details: ["Corrigé automatiquement"],
            });

            console.log(chalk.green(`🔧 ${check.name}: Corrigé !`));
            return;
          } catch {
            // La correction n'a pas résolu le problème
          }
        } catch (fixError: any) {
          console.log(
            chalk.red(
              `❌ Correction échouée: ${fixError.message.slice(0, 100)}...`,
            ),
          );
        }
      }

      this.results.push({
        name: check.name,
        status: "fail",
        duration,
        error: errorOutput,
        details: this.parseErrorDetails(errorOutput),
      });

      const icon = check.critical ? "❌" : "⚠️";
      const label = check.critical ? "CRITIQUE" : "ATTENTION";
      console.log(chalk.red(`${icon} ${check.name}: ${label}`));

      if (check.fixCommand && !this.isFixMode) {
        console.log(
          chalk.gray(`   💡 Utilisez --fix pour corriger automatiquement`),
        );
      }
    }
  }

  private parseErrorDetails(errorOutput: string): string[] {
    const details: string[] = [];
    const lines = errorOutput.split("\n");

    // Parser les erreurs TypeScript
    for (const line of lines) {
      if (line.includes("error TS")) {
        details.push(`TypeScript: ${line.trim()}`);
      } else if (line.includes("Error:")) {
        details.push(`Erreur: ${line.trim()}`);
      } else if (line.includes("Warning:")) {
        details.push(`Avertissement: ${line.trim()}`);
      }
    }

    return details.slice(0, 5); // Limiter à 5 détails
  }

  private async generateReportFile(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      environment: {
        node: process.version,
        platform: process.platform,
        cwd: process.cwd(),
      },
      configuration: {
        isFixMode: this.isFixMode,
        isDryRun: this.isDryRun,
        isVerbose: this.isVerbose,
      },
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.status === "pass").length,
        failed: this.results.filter((r) => r.status === "fail").length,
        fixed: this.results.filter((r) => r.status === "fixed").length,
        skipped: this.results.filter((r) => r.status === "skipped").length,
        criticalFailures: this.results.filter(
          (r) =>
            r.status === "fail" &&
            this.checks.find((c) => c.name === r.name)?.critical,
        ).length,
      },
      results: this.results,
      checks: this.checks,
    };

    const reportPath = path.join(this.projectRoot, "diagnostic-report.json");
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(chalk.blue(`\n📊 Rapport détaillé généré: ${reportPath}`));
  }

  private displaySummary(totalTime: number): void {
    console.log(chalk.bold.cyan("\n📋 Résumé du diagnostic:"));
    console.log(chalk.gray(`⏱️  Temps total: ${totalTime}ms\n`));

    const passed = this.results.filter((r) => r.status === "pass").length;
    const failed = this.results.filter((r) => r.status === "fail").length;
    const fixed = this.results.filter((r) => r.status === "fixed").length;
    const skipped = this.results.filter((r) => r.status === "skipped").length;

    // Statistiques
    console.log(chalk.green(`✅ Réussi: ${passed}`));
    if (fixed > 0) console.log(chalk.yellow(`🔧 Corrigé: ${fixed}`));
    if (failed > 0) console.log(chalk.red(`❌ Échoué: ${failed}`));
    if (skipped > 0) console.log(chalk.gray(`⏭️  Ignoré: ${skipped}`));

    // Détail des échecs
    const failures = this.results.filter((r) => r.status === "fail");
    if (failures.length > 0) {
      console.log(chalk.red("\n❌ Échecs détectés:"));
      for (const failure of failures) {
        const check = this.checks.find((c) => c.name === failure.name);
        const icon = check?.critical ? "🔥" : "⚠️";
        console.log(chalk.red(`  ${icon} ${failure.name}`));

        if (failure.details && failure.details.length > 0) {
          for (const detail of failure.details.slice(0, 2)) {
            console.log(chalk.gray(`     ${detail}`));
          }
        }
      }
    }

    // Recommandations
    console.log(chalk.bold.cyan("\n💡 Recommandations:"));

    if (failed > 0 && !this.isFixMode) {
      console.log(
        chalk.yellow("🔧 Utilisez --fix pour corriger automatiquement"),
      );
    }

    if (this.results.some((r) => r.status === "fail" && r.name === "Build")) {
      console.log(chalk.blue("🏗️  Corrigez d'abord les erreurs de build"));
    }

    if (
      this.results.some((r) => r.status === "fail" && r.name === "TypeScript")
    ) {
      console.log(chalk.blue("📝 Vérifiez les erreurs de type TypeScript"));
    }

    // Score global
    const score = Math.round(((passed + fixed) / this.results.length) * 100);
    const scoreColor =
      score >= 90 ? chalk.green : score >= 70 ? chalk.yellow : chalk.red;
    console.log(scoreColor(`\n🎯 Score de qualité: ${score}%`));
  }
}

// Fonctions utilitaires pour être utilisées séparément
export async function quickCheck(): Promise<boolean> {
  const checker = new ProjectChecker();
  const essentialChecks = ["TypeScript", "Linting", "Build"];

  for (const checkName of essentialChecks) {
    const check = checker.checks.find((c) => c.name === checkName);
    if (check) {
      try {
        execSync(check.command, {
          cwd: process.cwd(),
          stdio: "pipe",
        });
      } catch {
        return false;
      }
    }
  }

  return true;
}

export async function fixCommonIssues(): Promise<void> {
  console.log(
    chalk.blue("🔧 Correction automatique des problèmes courants...\n"),
  );

  const commonFixes = [
    "tsx scripts/scripts/fix-imports.ts",
    "pnpm lint --fix",
    "pnpm format",
  ];

  for (const fix of commonFixes) {
    try {
      console.log(chalk.gray(`Exécution: ${fix}`));
      execSync(fix, { cwd: process.cwd(), stdio: "inherit" });
    } catch (error) {
      console.log(chalk.yellow(`⚠️  ${fix}: Partiellement réussi`));
    }
  }

  console.log(chalk.green("\n✅ Corrections automatiques terminées"));
}

// Exécution du script
const checker = new ProjectChecker();
checker.run().catch(console.error);

export { ProjectChecker };
