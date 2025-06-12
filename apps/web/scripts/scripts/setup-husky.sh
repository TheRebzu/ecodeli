#!/bin/bash
# scripts/setup-husky.sh

echo "🚀 Configuration de Husky pour EcoDeli"

# Installer les dépendances nécessaires
echo "📦 Installation des dépendances..."
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional

# Initialiser Husky
echo "🔧 Initialisation de Husky..."
pnpm husky install

# Créer le hook pre-commit
echo "📝 Création du hook pre-commit..."
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Vérification du code avant commit..."

# Exécuter lint-staged
pnpm lint-staged

# Vérifier les types TypeScript
echo "📊 Vérification des types TypeScript..."
pnpm typecheck || {
  echo "❌ Erreurs de type détectées. Tentative de correction automatique..."
  pnpm fix:types
  pnpm typecheck || {
    echo "❌ Impossible de corriger automatiquement. Veuillez corriger manuellement."
    exit 1
  }
}

echo "✅ Pré-commit terminé avec succès!"
EOF

# Créer le hook commit-msg
echo "📝 Création du hook commit-msg..."
cat > .husky/commit-msg << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm commitlint --edit "$1"
EOF

# Créer le hook pre-push
echo "📝 Création du hook pre-push..."
cat > .husky/pre-push << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🚀 Vérification avant push..."

# Construire le projet
echo "🏗️ Test de build..."
pnpm build || {
  echo "❌ Le build a échoué. Tentative de correction automatique..."
  pnpm fix:build
  pnpm build || {
    echo "❌ Impossible de construire le projet. Push annulé."
    exit 1
  }
}

echo "✅ Pré-push terminé avec succès!"
EOF

# Rendre les hooks exécutables
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
chmod +x .husky/pre-push

# Créer la configuration lint-staged
echo "📝 Création de la configuration lint-staged..."
cat > .lintstagedrc.js << 'EOF'
module.exports = {
  // TypeScript et TSX
  '*.{ts,tsx}': [
    // Corriger les imports
    'tsx scripts/fix-imports.ts',
    // Corriger avec ESLint
    'eslint --fix',
    // Formater avec Prettier
    'prettier --write',
    // Vérifier les types (sans bloquer)
    () => 'pnpm typecheck',
  ],
  
  // JavaScript et JSX
  '*.{js,jsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // JSON
  '*.json': [
    'prettier --write',
  ],
  
  // CSS et SCSS
  '*.{css,scss}': [
    'prettier --write',
  ],
  
  // Markdown
  '*.md': [
    'prettier --write',
  ],
  
  // Prisma
  'prisma/schema.prisma': [
    'prisma format',
  ],
};
EOF

# Créer la configuration commitlint
echo "📝 Création de la configuration commitlint..."
cat > commitlint.config.js << 'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nouvelle fonctionnalité
        'fix',      // Correction de bug
        'docs',     // Documentation
        'style',    // Formatage, point-virgule manquant, etc.
        'refactor', // Refactoring du code
        'perf',     // Amélioration des performances
        'test',     // Ajout ou modification de tests
        'build',    // Changements du système de build
        'ci',       // Changements CI/CD
        'chore',    // Autres changements
        'revert',   // Revert d'un commit précédent
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
EOF

# Créer un script de vérification complète
echo "📝 Création du script de vérification complète..."
cat > scripts/check-all.ts << 'EOF'
#!/usr/bin/env tsx
// scripts/check-all.ts

import { execSync } from 'child_process';
import chalk from 'chalk';

const checks = [
  {
    name: 'Format',
    command: 'pnpm format:check',
    fix: 'pnpm format',
  },
  {
    name: 'Lint',
    command: 'pnpm lint',
    fix: 'pnpm lint --fix',
  },
  {
    name: 'Types',
    command: 'pnpm typecheck',
    fix: 'pnpm fix:types',
  },
  {
    name: 'Imports',
    command: 'tsx scripts/fix-imports.ts --dry-run',
    fix: 'tsx scripts/fix-imports.ts',
  },
  {
    name: 'Build',
    command: 'pnpm build',
    fix: 'pnpm fix:build',
  },
];

async function runChecks() {
  console.log(chalk.bold.cyan('🔍 EcoDeli - Vérification complète du projet\n'));
  
  const results = [];
  
  for (const check of checks) {
    console.log(chalk.blue(`Vérification : ${check.name}...`));
    
    try {
      execSync(check.command, { stdio: 'pipe' });
      console.log(chalk.green(`✅ ${check.name} : OK\n`));
      results.push({ name: check.name, status: 'pass' });
    } catch (error) {
      console.log(chalk.red(`❌ ${check.name} : Échec`));
      
      if (process.argv.includes('--fix')) {
        console.log(chalk.yellow(`🔧 Tentative de correction...`));
        try {
          execSync(check.fix, { stdio: 'inherit' });
          console.log(chalk.green(`✅ Corrigé !\n`));
          results.push({ name: check.name, status: 'fixed' });
        } catch {
          console.log(chalk.red(`❌ Correction impossible\n`));
          results.push({ name: check.name, status: 'failed' });
        }
      } else {
        console.log(chalk.gray(`💡 Utilisez --fix pour corriger automatiquement\n`));
        results.push({ name: check.name, status: 'failed' });
      }
    }
  }
  
  // Résumé
  console.log(chalk.bold.cyan('\n📊 Résumé :\n'));
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fixed' ? '🔧' : '❌';
    const color = result.status === 'pass' ? chalk.green : result.status === 'fixed' ? chalk.yellow : chalk.red;
    console.log(color(`${icon} ${result.name}`));
  });
  
  const failed = results.filter(r => r.status === 'failed').length;
  if (failed > 0) {
    console.log(chalk.red(`\n❌ ${failed} vérification(s) échouée(s)`));
    process.exit(1);
  } else {
    console.log(chalk.green('\n✅ Toutes les vérifications sont passées !'));
  }
}

runChecks().catch(console.error);
EOF

chmod +x scripts/check-all.ts

echo "✅ Configuration Husky terminée !"
echo ""
echo "📚 Commandes disponibles :"
echo "  pnpm fix         - Corriger automatiquement tous les problèmes"
echo "  pnpm fix:build   - Corriger les erreurs de build"
echo "  pnpm fix:imports - Corriger les imports"
echo "  pnpm fix:lint    - Corriger les erreurs de lint"
echo "  pnpm fix:format  - Formater le code"
echo ""
echo "🎯 Les corrections automatiques seront appliquées :"
echo "  - Avant chaque commit (pre-commit)"
echo "  - Avant chaque push (pre-push)"
echo "  - Sur demande avec 'pnpm fix'"