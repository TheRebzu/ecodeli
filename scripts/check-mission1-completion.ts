#!/usr/bin/env tsx

/**
 * Script de vérification de conformité Mission 1 - EcoDeli
 * Vérifie que la refactorisation respecte l'architecture Next.js App Router
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Couleurs pour la console
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m"
};

interface CheckResult {
  category: string;
  check: string;
  status: "✅" | "❌" | "⚠️";
  details?: string;
}

class Mission1Checker {
  private results: CheckResult[] = [];
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = process.cwd();
  }

  private log(message: string, color?: keyof typeof colors) {
    const colorCode = color ? colors[color] : "";
    const resetCode = color ? colors.reset : "";
    console.log(`${colorCode}${message}${resetCode}`);
  }

  private addResult(category: string, check: string, status: "✅" | "❌" | "⚠️", details?: string) {
    this.results.push({ category, check, status, details });
  }

  /**
   * Vérifie l'architecture des pages Next.js
   */
  async checkPagesArchitecture() {
    this.log("\n📋 Vérification de l'architecture des pages...", "blue");

    const pagesDir = path.join(this.workspaceRoot, "src/app/[locale]/(protected)");
    
    try {
      await this.checkPageStructure(pagesDir);
    } catch (error) {
      this.addResult("Architecture", "Structure des pages", "❌", `Erreur: ${error}`);
    }
  }

  /**
   * Vérifie qu'une page respecte la structure recommandée
   */
  private async checkPageStructure(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        await this.checkPageStructure(path.join(dir, entry.name));
      } else if (entry.name === "page.tsx") {
        const pagePath = path.join(dir, entry.name);
        await this.analyzePage(pagePath);
      }
    }
  }

  /**
   * Analyse le contenu d'une page
   */
  private async analyzePage(pagePath: string) {
    const content = await fs.readFile(pagePath, "utf-8");
    const relativePath = path.relative(this.workspaceRoot, pagePath);

    // Vérifier que la page n'a pas de logique métier
    const hasBusinessLogic = this.detectBusinessLogic(content);
    
    if (hasBusinessLogic.detected) {
      this.addResult(
        "Architecture", 
        `Page ${relativePath}`, 
        "❌",
        `Contient de la logique métier: ${hasBusinessLogic.details}`
      );
    } else {
      this.addResult(
        "Architecture", 
        `Page ${relativePath}`, 
        "✅",
        "Respecte l'architecture (composant unique importé)"
      );
    }

    // Vérifier l'import de composants
    const componentImports = this.detectComponentImports(content);
    if (componentImports.length === 0) {
      this.addResult(
        "Architecture", 
        `Imports ${relativePath}`, 
        "⚠️",
        "Aucun composant métier importé"
      );
    } else if (componentImports.length === 1) {
      this.addResult(
        "Architecture", 
        `Imports ${relativePath}`, 
        "✅",
        `Importe un composant principal: ${componentImports[0]}`
      );
    } else {
      this.addResult(
        "Architecture", 
        `Imports ${relativePath}`, 
        "⚠️",
        `Plusieurs composants importés: ${componentImports.join(", ")}`
      );
    }
  }

  /**
   * Détecte la logique métier dans une page
   */
  private detectBusinessLogic(content: string): { detected: boolean; details: string } {
    const businessLogicPatterns = [
      /function\s+\w+\s*\([^)]*\)\s*:\s*\w+\s*{/, // Fonctions utilitaires
      /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{/, // Arrow functions
      /switch\s*\([^)]+\)\s*{/, // Switch statements
      /useState\s*\(/, // React state
      /useEffect\s*\(/, // React effects
      /api\.\w+\.\w+\.use/, // Appels tRPC directs
    ];

    for (const pattern of businessLogicPatterns) {
      if (pattern.test(content)) {
        return { 
          detected: true, 
          details: pattern.source 
        };
      }
    }

    return { detected: false, details: "" };
  }

  /**
   * Détecte les imports de composants
   */
  private detectComponentImports(content: string): string[] {
    const importRegex = /import\s+(?:{[^}]+}|\w+)\s+from\s+["']@\/components\/([^"']+)["']/g;
    const matches = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }

  /**
   * Vérifie l'absence de données simulées
   */
  async checkNoMockData() {
    this.log("\n🚫 Vérification de l'absence de données simulées...", "blue");

    const patterns = [
      "mock",
      "simulation", 
      "setTimeout",
      "hardcoded",
      "DEMO_MODE"
    ];

    for (const pattern of patterns) {
      try {
        const result = await this.searchInFiles(pattern);
        if (result.count === 0) {
          this.addResult(
            "Données réelles", 
            `Absence de "${pattern}"`, 
            "✅",
            "Aucune référence trouvée"
          );
        } else {
          this.addResult(
            "Données réelles", 
            `Références à "${pattern}"`, 
            "⚠️",
            `${result.count} occurrences trouvées`
          );
        }
      } catch (error) {
        this.addResult(
          "Données réelles", 
          `Recherche "${pattern}"`, 
          "❌",
          `Erreur: ${error}`
        );
      }
    }
  }

  /**
   * Recherche des patterns dans les fichiers
   */
  private async searchInFiles(pattern: string): Promise<{ count: number; files: string[] }> {
    const searchDirs = [
      "src/components",
      "src/app",
      "src/server/services"
    ];

    let totalCount = 0;
    const affectedFiles: string[] = [];

    for (const dir of searchDirs) {
      const dirPath = path.join(this.workspaceRoot, dir);
      try {
        const { count, files } = await this.searchInDirectory(dirPath, pattern);
        totalCount += count;
        affectedFiles.push(...files);
      } catch (error) {
        // Répertoire n'existe pas
      }
    }

    return { count: totalCount, files: affectedFiles };
  }

  /**
   * Recherche dans un répertoire
   */
  private async searchInDirectory(dir: string, pattern: string): Promise<{ count: number; files: string[] }> {
    let count = 0;
    const files: string[] = [];

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        const subResult = await this.searchInDirectory(path.join(dir, entry.name), pattern);
        count += subResult.count;
        files.push(...subResult.files);
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        const filePath = path.join(dir, entry.name);
        const content = await fs.readFile(filePath, "utf-8");
        
        const regex = new RegExp(pattern, "gi");
        const matches = content.match(regex);
        
        if (matches) {
          count += matches.length;
          files.push(path.relative(this.workspaceRoot, filePath));
        }
      }
    }

    return { count, files };
  }

  /**
   * Vérifie l'utilisation de tRPC
   */
  async checkTRPCUsage() {
    this.log("\n🔌 Vérification de l'utilisation de tRPC...", "blue");

    try {
      const { count: queryCount } = await this.searchInFiles("api\\.[\\w]+\\.[\\w]+\\.useQuery");
      const { count: mutationCount } = await this.searchInFiles("api\\.[\\w]+\\.[\\w]+\\.useMutation");

      if (queryCount > 0) {
        this.addResult(
          "tRPC", 
          "Utilisation useQuery", 
          "✅",
          `${queryCount} requêtes trouvées`
        );
      } else {
        this.addResult(
          "tRPC", 
          "Utilisation useQuery", 
          "⚠️",
          "Aucune requête tRPC trouvée"
        );
      }

      if (mutationCount > 0) {
        this.addResult(
          "tRPC", 
          "Utilisation useMutation", 
          "✅",
          `${mutationCount} mutations trouvées`
        );
      } else {
        this.addResult(
          "tRPC", 
          "Utilisation useMutation", 
          "⚠️",
          "Aucune mutation tRPC trouvée"
        );
      }
    } catch (error) {
      this.addResult(
        "tRPC", 
        "Vérification générale", 
        "❌",
        `Erreur: ${error}`
      );
    }
  }

  /**
   * Vérifie l'organisation des composants
   */
  async checkComponentsOrganization() {
    this.log("\n📁 Vérification de l'organisation des composants...", "blue");

    const componentsDir = path.join(this.workspaceRoot, "src/components");
    
    try {
      await fs.access(componentsDir);
      
      const stats = await this.getComponentsStats(componentsDir);
      
      this.addResult(
        "Organisation", 
        "Structure components/", 
        "✅",
        `${stats.total} composants organisés en ${stats.categories} catégories`
      );

      if (stats.categories >= 5) {
        this.addResult(
          "Organisation", 
          "Séparation par feature", 
          "✅",
          "Bonne organisation par fonctionnalité"
        );
      } else {
        this.addResult(
          "Organisation", 
          "Séparation par feature", 
          "⚠️",
          "Organisation limitée"
        );
      }
    } catch (error) {
      this.addResult(
        "Organisation", 
        "Structure components/", 
        "❌",
        `Répertoire components non trouvé`
      );
    }
  }

  /**
   * Calcule les statistiques des composants
   */
  private async getComponentsStats(dir: string): Promise<{ total: number; categories: number }> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    let totalComponents = 0;
    let categories = 0;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        categories++;
        const subDir = path.join(dir, entry.name);
        const subStats = await this.getComponentsStats(subDir);
        totalComponents += subStats.total;
      } else if (entry.name.endsWith(".tsx")) {
        totalComponents++;
      }
    }

    return { total: totalComponents, categories };
  }

  /**
   * Affiche le rapport final
   */
  displayReport() {
    this.log("\n" + "=".repeat(60), "bold");
    this.log("📊 RAPPORT MISSION 1 - REFACTORISATION ECODELI", "bold");
    this.log("=".repeat(60), "bold");

    const categories = [...new Set(this.results.map(r => r.category))];
    
    for (const category of categories) {
      this.log(`\n📂 ${category}`, "blue");
      this.log("-".repeat(40));

      const categoryResults = this.results.filter(r => r.category === category);
      
      for (const result of categoryResults) {
        const status = result.status === "✅" ? "green" : 
                      result.status === "❌" ? "red" : "yellow";
        
        this.log(`${result.status} ${result.check}`, status);
        if (result.details) {
          this.log(`   ${result.details}`, "reset");
        }
      }
    }

    // Statistiques finales
    const totals = {
      success: this.results.filter(r => r.status === "✅").length,
      warning: this.results.filter(r => r.status === "⚠️").length,
      error: this.results.filter(r => r.status === "❌").length
    };

    this.log("\n" + "=".repeat(60), "bold");
    this.log("📈 RÉSUMÉ", "bold");
    this.log("=".repeat(60), "bold");
    this.log(`✅ Succès: ${totals.success}`, "green");
    this.log(`⚠️  Avertissements: ${totals.warning}`, "yellow");
    this.log(`❌ Erreurs: ${totals.error}`, "red");

    const score = Math.round((totals.success / this.results.length) * 100);
    this.log(`\n🎯 Score de conformité: ${score}%`, score >= 80 ? "green" : score >= 60 ? "yellow" : "red");

    if (score >= 90) {
      this.log("\n🎉 Mission 1 RÉUSSIE ! Architecture parfaitement conforme.", "green");
    } else if (score >= 70) {
      this.log("\n✅ Mission 1 majoritairement réussie. Quelques améliorations possibles.", "yellow");
    } else {
      this.log("\n⚠️  Mission 1 partiellement réussie. Améliorations nécessaires.", "red");
    }

    return score;
  }

  /**
   * Lance toutes les vérifications
   */
  async runAllChecks() {
    this.log("🚀 Démarrage de la vérification Mission 1...", "blue");
    
    await this.checkPagesArchitecture();
    await this.checkNoMockData();
    await this.checkTRPCUsage();
    await this.checkComponentsOrganization();
    
    return this.displayReport();
  }
}

// Exécution du script
async function main() {
  const checker = new Mission1Checker();
  
  try {
    const score = await checker.runAllChecks();
    process.exit(score >= 70 ? 0 : 1);
  } catch (error) {
    console.error("❌ Erreur lors de l'exécution:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 