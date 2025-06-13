#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

/**
 * Script pour corriger les paramètres de pages pour Next.js 15
 */

console.log("🔧 Correction des paramètres de pages pour Next.js 15...");

async function fixPageParams() {
  // Trouver tous les fichiers page.tsx
  const pageFiles = await glob("src/app/**/page.tsx");

  let fixedCount = 0;

  for (const filePath of pageFiles) {
    try {
      let content = readFileSync(filePath, "utf-8");
      const originalContent = content;

      // Pattern pour détecter les paramètres de page
      const paramPattern =
        /export default (?:async )?function \w+\(\{\s*params,?\s*\}:\s*\{\s*params:\s*\{[^}]+\}[^}]*\}\)/g;

      // Remplacer les paramètres pour Next.js 15
      content = content.replace(
        /export default function (\w+)\(\{\s*params,?\s*\}:\s*\{\s*params:\s*(\{[^}]+\})[^}]*\}\)/g,
        "export default async function $1({ params }: { params: Promise<$2> })",
      );

      // Ajouter await params si nécessaire
      if (content !== originalContent && !content.includes("await params")) {
        // Trouver la première ligne après la déclaration de fonction
        const functionMatch = content.match(
          /export default async function \w+\([^)]+\) \{/,
        );
        if (functionMatch) {
          const insertPos = content.indexOf("{", functionMatch.index!) + 1;
          const paramType = content.match(/params: Promise<(\{[^}]+\})>/)?.[1];
          if (paramType) {
            const paramNames =
              paramType.match(/(\w+):/g)?.map((p) => p.replace(":", "")) || [];
            const destructuring =
              paramNames.length > 0
                ? `{ ${paramNames.join(", ")} }`
                : "resolvedParams";
            const awaitLine = `\n  const ${destructuring} = await params;`;
            content =
              content.slice(0, insertPos) +
              awaitLine +
              content.slice(insertPos);
          }
        }
      }

      if (content !== originalContent) {
        writeFileSync(filePath, content);
        console.log(`✅ ${filePath} - Paramètres corrigés`);
        fixedCount++;
      }
    } catch (error) {
      console.log(`❌ Erreur avec ${filePath}:`, error);
    }
  }

  console.log(`🎉 ${fixedCount} fichiers corrigés !`);
}

fixPageParams();
