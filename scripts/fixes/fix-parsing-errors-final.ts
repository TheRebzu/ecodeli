#!/usr/bin/env tsx

/**
 * Script final pour corriger les erreurs de parsing restantes
 * Basé sur les erreurs spécifiques identifiées dans le linting
 */

import fs from "fs";
import path from "path";

const fixParsingErrorsInFile = (filePath: string): number => {
  if (!fs.existsSync(filePath)) {
    return 0;
  }

  let content = fs.readFileSync(filePath, "utf8");
  const originalContent = content;
  let fixesApplied = 0;

  // Correction des erreurs spécifiques de parsing

  // Corriger les erreurs de virgule manquante dans les expressions
  content = content.replace(/(\w+):\s*_(\w+),\s*,/g, "$1: _$2,");
  content = content.replace(/(\w+):\s*(_\w+),\s*,/g, "$1: $2,");

  // Corriger les erreurs d'expression attendue
  content = content.replace(
    /getAll:\s*protectedProcedure\.query\(async\s*\(\{\s*,\s*([^}]*)\s*\}\)/g,
    "getAll: protectedProcedure.query(async ({ _ctx })",
  );

  // Corriger les erreurs dans les appels de fonction
  content = content.replace(/\(\s*,\s*([^)]+)\)/g, "($1)");

  // Corriger les erreurs de destructuring
  content = content.replace(/const\s*\{\s*,\s*([^}]+)\s*\}/g, "const { $1 }");

  // Corriger les erreurs de virgule dans les paramètres
  content = content.replace(/\(\s*\{\s*,\s*([^}]+)\s*\}\s*\)/g, "({ $1 })");

  // Corrections spécifiques basées sur les erreurs observées
  if (filePath.includes("admin-commission.router.ts")) {
    content = content.replace(/(\w+):\s*_(\w+),\s*,/g, "$1: _$2,");
    content = content.replace(/265:41.*?',' expected/, ""); // Ligne spécifique
  }

  if (filePath.includes("admin-contracts.router.ts")) {
    content = content.replace(/334:33.*?',' expected/, ""); // Ligne spécifique
  }

  if (filePath.includes("admin-users.router.ts")) {
    content = content.replace(/762:44.*?',' expected/, ""); // Ligne spécifique
  }

  if (filePath.includes("client-announcements.router.ts")) {
    content = content.replace(/592:41.*?',' expected/, ""); // Ligne spécifique
  }

  if (filePath.includes("merchant-services.router.ts")) {
    content = content.replace(/15:21.*?Expression expected/, ""); // Ligne spécifique
    content = content.replace(
      /getAll:\s*protectedProcedure\.query\(async\s*\(\{\s*,/g,
      "getAll: protectedProcedure.query(async ({ _ctx",
    );
  }

  // Corrections générales pour les autres fichiers
  const fileSpecificFixes = [
    "client-personal-services.router.ts",
    "client-subscription.router.ts",
    "client.router.ts",
    "deliverer-planned-routes.router.ts",
    "deliverer-routes.router.ts",
    "cart-drop.router.ts",
    "merchant-announcements.router.ts",
    "merchant-catalog.router.ts",
    "merchant-contracts.router.ts",
    "merchant-invoices.router.ts",
    "merchant.router.ts",
    "provider-calendar.router.ts",
    "provider-skills.router.ts",
    "provider.router.ts",
    "personal-services.router.ts",
    "announcement.router.ts",
    "invoice.router.ts",
  ];

  for (const filename of fileSpecificFixes) {
    if (filePath.includes(filename)) {
      // Correction générale des erreurs de virgule
      content = content.replace(/(\w+):\s*_(\w+),\s*,/g, "$1: _$2,");
      content = content.replace(/\(\s*,\s*([^)]+)\)/g, "($1)");
      break;
    }
  }

  // Corrections pour les services
  if (filePath.includes(".service.ts")) {
    content = content.replace(/(\w+):\s*_(\w+),\s*,/g, "$1: _$2,");
    content = content.replace(/\(\s*,\s*([^)]+)\)/g, "($1)");
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, "utf8");
    fixesApplied = 1;
    console.log(`📝 Corrigé: ${path.basename(filePath)}`);
  }

  return fixesApplied;
};

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

console.log("🔧 Correction finale des erreurs de parsing...\n");

for (const filePath of problematicFiles) {
  const fixes = fixParsingErrorsInFile(filePath);
  if (fixes > 0) {
    totalFiles++;
    totalFixed += fixes;
  }
}

console.log(`\n✅ Correction finale terminée:`);
console.log(`   - ${totalFiles} fichiers corrigés`);
console.log(`   - ${totalFixed} corrections appliquées`);
console.log(`\n💡 Exécutez "pnpm run lint" pour vérifier les corrections.`);
