#!/usr/bin/env tsx

/**
 * Script pour corriger les erreurs de parsing causées par les scripts de nettoyage automatique
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";

interface ParsingFix {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  description: string;
}

const parsingFixes: ParsingFix[] = [
  // Corriger les erreurs de virgule manquante dans les destructuring
  {
    pattern: /const \{ ([^}]+) \} = ([^;]+);/g,
    replacement: (match: string, vars: string, assignment: string) => {
      // Nettoyer les variables destructurées malformées
      const cleanVars = vars
        .replace(/\s*,\s*,\s*/g, ", ") // Supprimer les virgules doubles
        .replace(/^\s*,\s*/, "") // Supprimer virgule au début
        .replace(/\s*,\s*$/, "") // Supprimer virgule à la fin
        .trim();

      return `const { ${cleanVars} } = ${assignment};`;
    },
    description: "Correction des destructuring malformés",
  },

  // Corriger les erreurs d'expression attendue
  {
    pattern: /getAll: protectedProcedure\.query\(async \(\{ ([^}]*) \}\) =>/g,
    replacement: "getAll: protectedProcedure.query(async ({ _ctx }) =>",
    description: "Correction des paramètres de query malformés",
  },

  // Corriger les erreurs de virgule dans les appels de fonction
  {
    pattern: /(\w+)\(\s*,\s*([^)]+)\)/g,
    replacement: "$1($2)",
    description:
      "Suppression des virgules de début dans les appels de fonction",
  },

  // Corriger les imports malformés
  {
    pattern: /import \{ ([^}]*),\s*\} from/g,
    replacement: (match: string, imports: string) => {
      const cleanImports = imports.replace(/,\s*$/, "").trim();
      return `import { ${cleanImports} } from`;
    },
    description: "Correction des imports avec virgule trailing",
  },

  // Corriger les erreurs dans les expressions de type
  {
    pattern: /: _(\w+),\s*,/g,
    replacement: ": _$1,",
    description: "Suppression des virgules doubles dans les types",
  },
];

async function fixParsingErrors(filePath: string): Promise<number> {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let fixesApplied = 0;
    const originalContent = content;

    for (const fix of parsingFixes) {
      if (typeof fix.replacement === "function") {
        content = content.replace(fix.pattern, fix.replacement);
      } else {
        content = content.replace(fix.pattern, fix.replacement);
      }

      if (content !== originalContent) {
        fixesApplied++;
        console.log(`  ✓ ${fix.description}`);
      }
    }

    // Corrections spécifiques basées sur les erreurs observées
    if (filePath.includes("admin-commission.router.ts")) {
      content = content.replace(/(\w+): _(\w+),\s*,/g, "$1: _$2,");
    }

    if (filePath.includes("merchant-services.router.ts")) {
      content = content.replace(
        /getAll: protectedProcedure\.query\(async \(\{\s*,\s*([^}]*)\s*\}\)/g,
        "getAll: protectedProcedure.query(async ({ _ctx })",
      );
    }

    if (fixesApplied > 0 || content !== originalContent) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`📝 Corrigé: ${path.basename(filePath)}`);
      return fixesApplied;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Erreur lors de la correction de ${filePath}:`, error);
    return 0;
  }
}

async function main() {
  console.log("🔧 Correction des erreurs de parsing...\n");

  // Fichiers spécifiquement mentionnés dans les erreurs de linting
  const problematicFiles = [
    "src/server/api/routers/admin/admin-commission.router.ts",
    "src/server/api/routers/admin/admin-contracts.router.ts",
    "src/server/api/routers/admin/admin-users.router.ts",
    "src/server/api/routers/client/client-announcements.router.ts",
    "src/server/api/routers/client/client-personal-services.router.ts",
    "src/server/api/routers/client/client-subscription.router.ts",
    "src/server/api/routers/client/client.router.ts",
    "src/server/api/routers/deliverer/deliverer-planned-routes.router.ts",
    "src/server/api/routers/deliverer/deliverer-routes.router.ts",
    "src/server/api/routers/merchant/cart-drop.router.ts",
    "src/server/api/routers/merchant/merchant-announcements.router.ts",
    "src/server/api/routers/merchant/merchant-catalog.router.ts",
    "src/server/api/routers/merchant/merchant-contracts.router.ts",
    "src/server/api/routers/merchant/merchant-invoices.router.ts",
    "src/server/api/routers/merchant/merchant-services.router.ts",
    "src/server/api/routers/merchant/merchant.router.ts",
    "src/server/api/routers/provider/provider-calendar.router.ts",
    "src/server/api/routers/provider/provider-skills.router.ts",
    "src/server/api/routers/provider/provider.router.ts",
    "src/server/api/routers/services/personal-services.router.ts",
    "src/server/api/routers/shared/announcement.router.ts",
    "src/server/api/routers/shared/invoice.router.ts",
    "src/server/services/admin/admin.service.ts",
    "src/server/services/common/notification.service.ts",
    "src/server/services/common/profile.service.ts",
    "src/server/services/merchant/merchant.service.ts",
    "src/server/services/provider/provider-service.service.ts",
    "src/server/services/shared/announcement.service.ts",
    "src/server/services/shared/contract.service.ts",
    "src/server/services/shared/invoice.service.ts",
    "src/server/services/shared/payment.service.ts",
    "src/server/services/shared/stripe.service.ts",
    "src/server/services/shared/warehouse.service.ts",
    "src/server/services/shared/withdrawal.service.ts",
  ];

  let totalFixed = 0;
  let totalFiles = 0;

  for (const file of problematicFiles) {
    if (fs.existsSync(file)) {
      const fixes = await fixParsingErrors(file);
      if (fixes > 0) {
        totalFiles++;
        totalFixed += fixes;
      }
    }
  }

  console.log(`\n✅ Correction des erreurs de parsing terminée:`);
  console.log(`   - ${totalFiles} fichiers corrigés`);
  console.log(`   - ${totalFixed} corrections appliquées`);
  console.log(`\n💡 Exécutez "pnpm run lint" pour vérifier les corrections.`);
}

main().catch(console.error);
