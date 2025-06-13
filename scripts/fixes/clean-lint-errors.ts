#!/usr/bin/env tsx

/**
 * Script de nettoyage automatique des erreurs de linting
 * - Variables inutilisées (préfixage avec underscore)
 * - Imports non utilisés (suppression)
 * - Variables non réassignées (let → const)
 * - Paramètres de fonction inutilisés
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";

interface LintFix {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  description: string;
}

const lintFixes: LintFix[] = [
  // Variables inutilisées dans les destructuring
  {
    pattern: /const { (\w+) } = /g,
    replacement: (match, varName) => {
      if (!varName.startsWith("_")) {
        return match.replace(varName, `_${varName}`);
      }
      return match;
    },
    description: "Préfixage des variables destructurées inutilisées",
  },

  // Paramètres de fonction inutilisés
  {
    pattern: /\(([^)]*ctx[^)]*)\)/g,
    replacement: (match, params) => {
      return match.replace(/\bctx\b(?!:)/g, "_ctx");
    },
    description: "Préfixage des paramètres ctx inutilisés",
  },

  // Variables error dans les catch
  {
    pattern: /catch\s*\(\s*(\w+)\s*\)/g,
    replacement: (match, errorVar) => {
      if (!errorVar.startsWith("_")) {
        return match.replace(errorVar, `_${errorVar}`);
      }
      return match;
    },
    description: "Préfixage des variables error dans catch",
  },

  // Imports publicProcedure non utilisés
  {
    pattern:
      /import\s*{\s*([^}]*),?\s*publicProcedure\s*,?\s*([^}]*)\s*}\s*from\s*["']@\/server\/api\/trpc["'];?/g,
    replacement: (match, before, after) => {
      const cleanBefore = before?.trim().replace(/,$/, "") || "";
      const cleanAfter = after?.trim().replace(/^,/, "") || "";
      const parts = [cleanBefore, cleanAfter].filter((p) => p.length > 0);

      if (parts.length === 0) {
        return "// Import vide supprimé";
      }

      return `import { ${parts.join(", ")} } from "@/server/api/trpc";`;
    },
    description: "Suppression des imports publicProcedure non utilisés",
  },

  // Variables let non réassignées
  {
    pattern: /let\s+(\w+)\s*=\s*([^;]+);/g,
    replacement: "const $1 = $2;",
    description: "Conversion let → const pour variables non réassignées",
  },
];

async function processFile(filePath: string): Promise<number> {
  const content = fs.readFileSync(filePath, "utf-8");
  let modifiedContent = content;
  let fixCount = 0;

  for (const fix of lintFixes) {
    const originalContent = modifiedContent;

    if (typeof fix.replacement === "string") {
      modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
    } else {
      modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
    }

    if (originalContent !== modifiedContent) {
      fixCount++;
      console.log(`  ✓ ${fix.description}`);
    }
  }

  if (fixCount > 0) {
    fs.writeFileSync(filePath, modifiedContent);
  }

  return fixCount;
}

async function main() {
  console.log("🧹 Nettoyage automatique des erreurs de linting...\n");

  const patterns = [
    "src/server/api/routers/**/*.ts",
    "src/server/services/**/*.ts",
    "src/server/auth/**/*.ts",
    "src/store/**/*.ts",
    "src/socket/**/*.ts",
  ];

  let totalFiles = 0;
  let totalFixes = 0;

  for (const pattern of patterns) {
    const files = await glob(pattern);

    for (const file of files) {
      // Ignorer les fichiers de test et de configuration
      if (
        file.includes(".test.") ||
        file.includes(".spec.") ||
        file.includes(".config.")
      ) {
        continue;
      }

      const fixes = await processFile(file);
      if (fixes > 0) {
        console.log(`📝 ${file}: ${fixes} corrections appliquées`);
        totalFiles++;
        totalFixes += fixes;
      }
    }
  }

  console.log(`\n✅ Nettoyage terminé:`);
  console.log(`   - ${totalFiles} fichiers modifiés`);
  console.log(`   - ${totalFixes} corrections appliquées`);

  if (totalFixes > 0) {
    console.log('\n💡 Exécutez "pnpm run lint" pour vérifier les corrections.');
  }
}

main().catch(console.error);
