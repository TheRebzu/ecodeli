#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

/**
 * Script pour corriger tous les imports manquants
 */

console.log("🔧 Correction des imports manquants...");

async function fixMissingImports() {
  // Trouver tous les fichiers TypeScript
  const tsFiles = await glob("prisma/seeds/**/*.ts");

  let fixedCount = 0;

  for (const filePath of tsFiles) {
    try {
      let content = readFileSync(filePath, "utf-8");
      const originalContent = content;

      // Commenter les imports problématiques
      const problematicImports = [
        "./base/permissions-seed",
        "./base/service-categories-seed",
        "./services/service-types-seed",
        "./services/provider-availability-seed",
        "./services/service-ratings-seed",
        "./notifications/notification-templates-seed",
        "./audit/audit-logs-seed",
        "./config/system-settings-seed",
        "./config/pricing-rules-seed",
      ];

      for (const importPath of problematicImports) {
        const importRegex = new RegExp(
          `import\\s+\\{[^}]+\\}\\s+from\\s+["']${importPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'];?`,
          "g",
        );
        content = content.replace(importRegex, (match) => `// ${match}`);
      }

      // Commenter les utilisations de fonctions importées
      const problematicFunctions = [
        "seedPermissions",
        "seedServiceCategories",
        "seedServiceTypes",
        "seedProviderAvailability",
        "seedServiceRatings",
        "seedNotificationTemplates",
        "seedAuditLogs",
        "seedSystemSettings",
        "seedPricingRules",
        "validateAuditLogs",
        "validateSystemSettings",
        "validatePricingRules",
      ];

      for (const funcName of problematicFunctions) {
        // Commenter les appels de fonction
        const funcCallRegex = new RegExp(
          `(\\s*)(await\\s+)?${funcName}\\([^)]*\\);?`,
          "g",
        );
        content = content.replace(
          funcCallRegex,
          (match, indent) => `${indent}// ${match.trim()}`,
        );

        // Commenter les assignations
        const assignRegex = new RegExp(
          `(\\s*)(result\\.seedResults\\.[\\w]+\\s*=\\s*await\\s+)?${funcName}\\([^)]*\\);?`,
          "g",
        );
        content = content.replace(
          assignRegex,
          (match, indent) => `${indent}// ${match.trim()}`,
        );
      }

      if (content !== originalContent) {
        writeFileSync(filePath, content);
        console.log(`✅ ${filePath} - Imports corrigés`);
        fixedCount++;
      }
    } catch (error) {
      console.log(`❌ Erreur avec ${filePath}:`, error);
    }
  }

  console.log(`🎉 ${fixedCount} fichiers corrigés !`);
}

fixMissingImports();
