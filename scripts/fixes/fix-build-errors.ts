#!/usr/bin/env tsx
// scripts/fix-build-errors.ts

import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

interface BuildError {
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  message: string;
  severity: "error" | "warning";
  category: "import" | "type" | "syntax" | "other";
}

interface FixResult {
  file: string;
  fixes: string[];
  success: boolean;
  error?: string;
}

class BuildErrorFixer {
  private errors: BuildError[] = [];
  private fixResults: FixResult[] = [];
  private projectRoot: string;
  private isDryRun: boolean;
  private verbose: boolean;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.isDryRun = process.argv.includes("--dry-run");
    this.verbose = process.argv.includes("--verbose");
  }

  async run(): Promise<void> {
    console.log(
      chalk.bold.cyan(
        "🔧 EcoDeli - Correcteur automatique d'erreurs de build\n",
      ),
    );

    if (this.isDryRun) {
      console.log(chalk.yellow("🔍 Mode simulation activé (--dry-run)\n"));
    }

    try {
      // 1. Analyser les erreurs de build
      await this.analyzeBuildErrors();

      // 2. Catégoriser les erreurs
      this.categorizeErrors();

      // 3. Appliquer les corrections automatiques
      if (!this.isDryRun) {
        await this.applyAutomaticFixes();
      }

      // 4. Générer le rapport
      await this.generateReport();

      // 5. Vérifier si le build passe maintenant
      if (!this.isDryRun) {
        await this.verifyBuild();
      }
    } catch (error) {
      console.error(chalk.red("❌ Erreur lors de la correction :"), error);
      process.exit(1);
    }
  }

  private async analyzeBuildErrors(): Promise<void> {
    console.log(chalk.blue("📊 Analyse des erreurs de build..."));

    try {
      // Essayons de build et récupérons les erreurs
      execSync("pnpm typecheck", { stdio: "pipe", cwd: this.projectRoot });
      console.log(chalk.green("✅ Aucune erreur de type détectée !"));
      return;
    } catch (error: any) {
      const output = error.stdout?.toString() || error.stderr?.toString() || "";
      this.parseTypeScriptErrors(output);
    }

    // Aussi checker les erreurs de Next.js build
    try {
      execSync("pnpm build", { stdio: "pipe", cwd: this.projectRoot });
    } catch (error: any) {
      const output = error.stdout?.toString() || error.stderr?.toString() || "";
      this.parseNextJSErrors(output);
    }

    console.log(
      chalk.yellow(`📋 ${this.errors.length} erreur(s) détectée(s)\n`),
    );
  }

  private parseTypeScriptErrors(output: string): void {
    const lines = output.split("\n");

    for (const line of lines) {
      // Format TypeScript: file(line,column): error TS####: message
      const tsMatch = line.match(
        /^(.+)\((\d+),(\d+)\):\s*(error|warning)\s*TS(\d+):\s*(.+)$/,
      );
      if (tsMatch) {
        const [, file, line, column, severity, code, message] = tsMatch;
        this.errors.push({
          file: file.trim(),
          line: parseInt(line),
          column: parseInt(column),
          code: `TS${code}`,
          message: message.trim(),
          severity: severity as "error" | "warning",
          category: this.categorizeError(message, code),
        });
        continue;
      }

      // Format simple: error message
      if (line.includes("error") || line.includes("Error")) {
        this.errors.push({
          message: line.trim(),
          severity: "error",
          category: this.categorizeError(line),
        });
      }
    }
  }

  private parseNextJSErrors(output: string): void {
    const lines = output.split("\n");

    for (const line of lines) {
      if (line.includes("Error:") || line.includes("TypeError:")) {
        this.errors.push({
          message: line.trim(),
          severity: "error",
          category: this.categorizeError(line),
        });
      }
    }
  }

  private categorizeError(
    message: string,
    code?: string,
  ): BuildError["category"] {
    const msg = message.toLowerCase();

    if (
      msg.includes("cannot find module") ||
      msg.includes("module not found") ||
      code === "2307"
    ) {
      return "import";
    }

    if (
      msg.includes("type") ||
      msg.includes("property") ||
      msg.includes("argument") ||
      ["2339", "2345", "2322", "2344"].includes(code || "")
    ) {
      return "type";
    }

    if (msg.includes("syntax") || msg.includes("unexpected token")) {
      return "syntax";
    }

    return "other";
  }

  private categorizeErrors(): void {
    const categories = {
      import: this.errors.filter((e) => e.category === "import"),
      type: this.errors.filter((e) => e.category === "type"),
      syntax: this.errors.filter((e) => e.category === "syntax"),
      other: this.errors.filter((e) => e.category === "other"),
    };

    console.log(chalk.blue("📋 Répartition des erreurs :"));
    console.log(chalk.cyan(`  🔗 Imports: ${categories.import.length}`));
    console.log(chalk.cyan(`  📝 Types: ${categories.type.length}`));
    console.log(chalk.cyan(`  🔤 Syntaxe: ${categories.syntax.length}`));
    console.log(chalk.cyan(`  ❓ Autres: ${categories.other.length}\n`));
  }

  private async applyAutomaticFixes(): Promise<void> {
    console.log(chalk.blue("🔧 Application des corrections automatiques...\n"));

    // 1. Corriger les imports manquants
    await this.fixMissingImports();

    // 2. Installer les dépendances manquantes
    await this.installMissingDependencies();

    // 3. Corriger les erreurs de type simples
    await this.fixSimpleTypeErrors();

    // 4. Nettoyer les imports non utilisés
    await this.cleanUnusedImports();
  }

  private async fixMissingImports(): Promise<void> {
    const importErrors = this.errors.filter((e) => e.category === "import");
    if (importErrors.length === 0) return;

    console.log(
      chalk.yellow(
        `🔗 Correction de ${importErrors.length} erreur(s) d'import...`,
      ),
    );

    for (const error of importErrors) {
      if (!error.file) continue;

      try {
        const filePath = path.resolve(this.projectRoot, error.file);
        const content = await fs.readFile(filePath, "utf-8");

        // Tentatives de correction d'import
        let fixedContent = content;
        const fixes: string[] = [];

        // Ajouter les imports React si manquants
        if (
          error.message.includes("React") &&
          !content.includes("import React")
        ) {
          fixedContent = `import React from 'react';\n${fixedContent}`;
          fixes.push("Ajout import React");
        }

        // Ajouter les imports Next.js communs
        if (error.message.includes("next/")) {
          const nextImports = this.getCommonNextImports(error.message);
          if (nextImports) {
            fixedContent = `${nextImports}\n${fixedContent}`;
            fixes.push(`Ajout import Next.js: ${nextImports}`);
          }
        }

        if (fixes.length > 0) {
          await fs.writeFile(filePath, fixedContent);
          this.fixResults.push({
            file: error.file,
            fixes,
            success: true,
          });
          console.log(chalk.green(`  ✅ ${error.file}: ${fixes.join(", ")}`));
        }
      } catch (err) {
        this.fixResults.push({
          file: error.file,
          fixes: [],
          success: false,
          error: (err as Error).message,
        });
        console.log(chalk.red(`  ❌ ${error.file}: ${(err as Error).message}`));
      }
    }
  }

  private async installMissingDependencies(): Promise<void> {
    console.log(chalk.yellow("📦 Vérification des dépendances manquantes..."));

    const missingDeps: string[] = [];
    const missingTypes: string[] = [];

    for (const error of this.errors) {
      if (error.message.includes("Cannot find module")) {
        const moduleMatch = error.message.match(
          /Cannot find module ['"]([^'"]+)['"]/,
        );
        if (moduleMatch) {
          const moduleName = moduleMatch[1];

          // Ignorer les imports locaux
          if (moduleName.startsWith(".") || moduleName.startsWith("@/"))
            continue;

          if (moduleName.startsWith("@types/")) {
            missingTypes.push(moduleName);
          } else {
            missingDeps.push(moduleName);
            // Ajouter aussi les types si c'est une lib populaire
            if (this.needsTypes(moduleName)) {
              missingTypes.push(`@types/${moduleName}`);
            }
          }
        }
      }
    }

    // Installer les dépendances manquantes
    if (missingDeps.length > 0) {
      console.log(
        chalk.blue(`📦 Installation de ${missingDeps.length} dépendance(s)...`),
      );
      try {
        execSync(`pnpm add ${missingDeps.join(" ")}`, {
          stdio: "inherit",
          cwd: this.projectRoot,
        });
        this.fixResults.push({
          file: "package.json",
          fixes: [`Ajout dépendances: ${missingDeps.join(", ")}`],
          success: true,
        });
      } catch (err) {
        console.log(
          chalk.red(
            `❌ Erreur installation dépendances: ${(err as Error).message}`,
          ),
        );
      }
    }

    // Installer les types manquants
    if (missingTypes.length > 0) {
      console.log(
        chalk.blue(`📦 Installation de ${missingTypes.length} type(s)...`),
      );
      try {
        execSync(`pnpm add -D ${missingTypes.join(" ")}`, {
          stdio: "inherit",
          cwd: this.projectRoot,
        });
        this.fixResults.push({
          file: "package.json",
          fixes: [`Ajout types: ${missingTypes.join(", ")}`],
          success: true,
        });
      } catch (err) {
        console.log(
          chalk.red(`❌ Erreur installation types: ${(err as Error).message}`),
        );
      }
    }
  }

  private async fixSimpleTypeErrors(): Promise<void> {
    const typeErrors = this.errors.filter(
      (e) => e.category === "type" && e.file,
    );
    if (typeErrors.length === 0) return;

    console.log(
      chalk.yellow(
        `📝 Correction de ${typeErrors.length} erreur(s) de type simples...`,
      ),
    );

    for (const error of typeErrors) {
      if (!error.file) continue;

      try {
        const filePath = path.resolve(this.projectRoot, error.file);
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n");

        if (error.line && error.line <= lines.length) {
          const lineIndex = error.line - 1;
          const line = lines[lineIndex];
          let fixedLine = line;
          const fixes: string[] = [];

          // Ajouter des types manquants simples
          if (error.message.includes("implicitly has an 'any' type")) {
            fixedLine = this.addSimpleTypes(fixedLine);
            if (fixedLine !== line) {
              fixes.push("Ajout de types explicites");
            }
          }

          if (fixes.length > 0) {
            lines[lineIndex] = fixedLine;
            await fs.writeFile(filePath, lines.join("\n"));
            this.fixResults.push({
              file: error.file,
              fixes,
              success: true,
            });
            console.log(
              chalk.green(
                `  ✅ ${error.file}:${error.line}: ${fixes.join(", ")}`,
              ),
            );
          }
        }
      } catch (err) {
        this.fixResults.push({
          file: error.file,
          fixes: [],
          success: false,
          error: (err as Error).message,
        });
        console.log(chalk.red(`  ❌ ${error.file}: ${(err as Error).message}`));
      }
    }
  }

  private async cleanUnusedImports(): Promise<void> {
    console.log(chalk.yellow("🧹 Nettoyage des imports non utilisés..."));

    try {
      execSync("pnpm lint --fix", { stdio: "inherit", cwd: this.projectRoot });
      console.log(chalk.green("  ✅ Imports non utilisés supprimés"));
    } catch (err) {
      console.log(
        chalk.yellow("  ⚠️ Impossible de nettoyer automatiquement les imports"),
      );
    }
  }

  private getCommonNextImports(message: string): string | null {
    if (message.includes("next/link")) return "import Link from 'next/link';";
    if (message.includes("next/image"))
      return "import Image from 'next/image';";
    if (message.includes("next/router"))
      return "import { useRouter } from 'next/router';";
    if (message.includes("next/navigation"))
      return "import { useRouter } from 'next/navigation';";
    return null;
  }

  private addSimpleTypes(line: string): string {
    // Ajouter : any aux paramètres sans type
    if (line.includes("(") && line.includes(")")) {
      return line.replace(/(\w+)(\s*[,)])/g, (match, param, rest) => {
        if (!match.includes(":")) {
          return `${param}: any${rest}`;
        }
        return match;
      });
    }
    return line;
  }

  private needsTypes(moduleName: string): boolean {
    const popularLibsWithTypes = [
      "lodash",
      "moment",
      "uuid",
      "bcrypt",
      "jsonwebtoken",
      "multer",
      "cors",
      "express",
      "node",
      "jest",
    ];
    return popularLibsWithTypes.includes(moduleName);
  }

  private async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      errorsFound: this.errors.length,
      errorsByCategory: {
        import: this.errors.filter((e) => e.category === "import").length,
        type: this.errors.filter((e) => e.category === "type").length,
        syntax: this.errors.filter((e) => e.category === "syntax").length,
        other: this.errors.filter((e) => e.category === "other").length,
      },
      fixesApplied: this.fixResults.length,
      successfulFixes: this.fixResults.filter((f) => f.success).length,
      failedFixes: this.fixResults.filter((f) => !f.success).length,
      errors: this.errors,
      fixes: this.fixResults,
    };

    const reportPath = path.join(this.projectRoot, "build-errors-report.json");
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(chalk.blue(`\n📊 Rapport généré: ${reportPath}`));

    // Afficher le résumé
    console.log(chalk.bold.cyan("\n📋 Résumé des corrections:"));
    console.log(
      chalk.green(`✅ Corrections réussies: ${report.successfulFixes}`),
    );
    console.log(chalk.red(`❌ Corrections échouées: ${report.failedFixes}`));
    console.log(
      chalk.yellow(
        `⚠️ Erreurs restantes: ${this.errors.length - report.successfulFixes}`,
      ),
    );
  }

  private async verifyBuild(): Promise<void> {
    console.log(chalk.blue("\n🔍 Vérification du build après corrections..."));

    try {
      execSync("pnpm typecheck", { stdio: "pipe", cwd: this.projectRoot });
      console.log(chalk.green("✅ Vérification des types: OK"));
    } catch {
      console.log(chalk.yellow("⚠️ Des erreurs de type subsistent"));
    }

    try {
      execSync("pnpm build", { stdio: "pipe", cwd: this.projectRoot });
      console.log(chalk.green("✅ Build: OK"));
    } catch {
      console.log(chalk.yellow("⚠️ Le build échoue encore"));
    }
  }
}

// Exécution du script
const fixer = new BuildErrorFixer();
fixer.run().catch(console.error);

export { BuildErrorFixer };
