#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Script pour corriger les erreurs de destructuration avec syntaxe incorrecte
 * Corrige les patterns comme: ...updateData: _...updateData
 * En: ...updateData
 */

interface FixResult {
  file: string;
  fixes: number;
  errors: string[];
}

function fixDestructuringInFile(filePath: string): FixResult {
  const result: FixResult = {
    file: filePath,
    fixes: 0,
    errors: [],
  };

  try {
    let content = readFileSync(filePath, "utf-8");
    const originalContent = content;

    // Pattern pour détecter les destructurations incorrectes
    // Exemple: ...updateData: _...updateData
    const destructuringPattern = /(\.\.\.\w+):\s*_\.\.\.\w+/g;

    // Remplacer par la version correcte
    content = content.replace(destructuringPattern, (match, capture) => {
      result.fixes++;
      console.log(`  ✓ Corrigé: ${match} → ${capture}`);
      return capture;
    });

    // Sauvegarder seulement si des changements ont été faits
    if (content !== originalContent) {
      writeFileSync(filePath, content, "utf-8");
      console.log(`📝 ${result.fixes} corrections appliquées dans ${filePath}`);
    }
  } catch (error) {
    result.errors.push(`Erreur lors du traitement de ${filePath}: ${error}`);
    console.error(`❌ Erreur dans ${filePath}:`, error);
  }

  return result;
}

async function main() {
  console.log("🔧 Correction des erreurs de destructuration...\n");

  // Fichiers à traiter (routeurs tRPC principalement)
  const patterns = [
    "src/server/api/routers/**/*.ts",
    "src/server/services/**/*.ts",
  ];

  const allResults: FixResult[] = [];
  let totalFixes = 0;

  for (const pattern of patterns) {
    console.log(`🔍 Recherche des fichiers: ${pattern}`);
    const files = await glob(pattern, { cwd: process.cwd() });

    for (const file of files) {
      const result = fixDestructuringInFile(file);
      allResults.push(result);
      totalFixes += result.fixes;
    }
  }

  // Résumé
  console.log("\n📊 RÉSUMÉ DES CORRECTIONS:");
  console.log(`✅ Total des corrections: ${totalFixes}`);
  console.log(`📁 Fichiers traités: ${allResults.length}`);

  const filesWithFixes = allResults.filter((r) => r.fixes > 0);
  console.log(`🔧 Fichiers modifiés: ${filesWithFixes.length}`);

  if (filesWithFixes.length > 0) {
    console.log("\n📝 Fichiers modifiés:");
    filesWithFixes.forEach((result) => {
      console.log(`  • ${result.file}: ${result.fixes} corrections`);
    });
  }

  const errors = allResults.flatMap((r) => r.errors);
  if (errors.length > 0) {
    console.log("\n❌ Erreurs rencontrées:");
    errors.forEach((error) => console.log(`  • ${error}`));
  }

  console.log("\n✨ Correction des erreurs de destructuration terminée!");
}

// Vérifier si le script est exécuté directement
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main().catch(console.error);
}

export { fixDestructuringInFile };
