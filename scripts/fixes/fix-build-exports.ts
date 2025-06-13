#!/usr/bin/env tsx

import { writeFileSync, existsSync } from "fs";

/**
 * Script pour corriger rapidement les exports manquants du build
 */

const missingComponents = [
  {
    file: "src/components/admin/deliverers/document-review.tsx",
    component: "JsonView",
  },
  {
    file: "src/components/shared/documents/document-preview.tsx",
    component: "DocumentPreview",
  },
  {
    file: "src/components/admin/verification/verification-list.tsx",
    component: "VerificationStatusBanner",
  },
];

function createComponent(componentName: string): string {
  return `import React from 'react';

interface ${componentName}Props {
  [key: string]: any;
}

export function ${componentName}(props: ${componentName}Props) {
  return (
    <div className="p-4 border border-dashed border-gray-300 rounded-lg">
      <p className="text-gray-500 text-center">
        Composant ${componentName} en cours de développement
      </p>
      <pre className="mt-2 text-xs text-gray-400">
        {JSON.stringify(props, null, 2)}
      </pre>
    </div>
  );
}

export default ${componentName};
`;
}

async function main() {
  console.log("🔧 Correction des exports manquants pour le build...\n");

  let fixed = 0;

  for (const { file, component } of missingComponents) {
    if (!existsSync(file)) {
      const content = createComponent(component);
      writeFileSync(file, content, "utf-8");
      console.log(`✅ Créé: ${file} avec ${component}`);
      fixed++;
    } else {
      console.log(`⚠️ Fichier existe déjà: ${file}`);
    }
  }

  console.log(`\n📊 RÉSUMÉ: ${fixed} fichiers créés`);

  if (fixed > 0) {
    console.log(
      '\n💡 Exécutez "pnpm run build" pour vérifier les corrections.',
    );
  }
}

main().catch(console.error);
