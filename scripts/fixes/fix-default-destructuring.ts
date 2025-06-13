#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import { fileURLToPath } from "url";

/**
 * Script pour corriger les erreurs de destructuration avec valeurs par défaut incorrectes
 * Corrige les patterns comme: page = 1: _page = 1
 * En: page = 1
 */

interface FixResult {
  file: string;
  fixes: number;
  errors: string[];
}

function fixDefaultDestructuringInFile(filePath: string): FixResult {
  const result: FixResult = {
    file: filePath,
    fixes: 0,
    errors: [],
  };

  try {
    let content = readFileSync(filePath, "utf-8");
    const originalContent = content;

    // Pattern pour détecter les destructurations avec valeurs par défaut incorrectes
    // Exemple: page = 1: _page = 1
    const defaultPattern = /(\w+\s*=\s*[^:,}]+):\s*_\w+\s*=\s*[^,}]+/g;

    // Remplacer par la version correcte
    content = content.replace(defaultPattern, (match, capture) => {
      result.fixes++;
      console.log(`  ✓ Corrigé: ${match} → ${capture}`);
      return capture;
    });

    // Pattern plus spécifique pour les cas complexes
    // Exemple: notifyUser = true: _notifyUser = true
    const complexPattern = /(\w+\s*=\s*\w+):\s*_\w+\s*=\s*\w+/g;
    content = content.replace(complexPattern, (match, capture) => {
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
  console.log(
    "🔧 Correction des erreurs de destructuration avec valeurs par défaut...\n",
  );

  // Fichiers à traiter
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
      const result = fixDefaultDestructuringInFile(file);
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

  console.log(
    "\n✨ Correction des erreurs de destructuration avec valeurs par défaut terminée!",
  );
}

// Vérifier si le script est exécuté directement
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main().catch(console.error);
}

export { fixDefaultDestructuringInFile };
