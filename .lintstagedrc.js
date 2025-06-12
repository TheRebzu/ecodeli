module.exports = {
  // === FICHIERS TYPESCRIPT ET TSX ===
  '*.{ts,tsx}': [
    // 1. Corriger les imports
    'tsx scripts/scripts/fix-imports.ts',
    
    // 2. Corriger avec ESLint
    'eslint --fix',
    
    // 3. Formater avec Prettier
    'prettier --write',
    
    // 4. Vérifier les types (sans bloquer)
    () => 'pnpm typecheck',
  ],
  
  // === FICHIERS JAVASCRIPT ET JSX ===
  '*.{js,jsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // === FICHIERS JSON ===
  '*.json': [
    'prettier --write',
  ],
  
  // === FICHIERS CSS ET SCSS ===
  '*.{css,scss,sass}': [
    'prettier --write',
  ],
  
  // === FICHIERS MARKDOWN ===
  '*.md': [
    'prettier --write',
  ],
  
  // === PRISMA SCHEMA ===
  'prisma/schema.prisma': [
    'prisma format',
  ],
  
  // === SCRIPTS PERSONNALISÉS ===
  'scripts/**/*.{ts,js}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // === FICHIERS DE CONFIGURATION ===
  '*.config.{js,ts}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // === TRADUCTIONS I18N ===
  'src/messages/*.json': [
    'prettier --write',
    // Vérifier la structure des traductions
    'node scripts/i18n/validate-translations.js',
  ],
  
  // === SCHÉMAS ZOD ===
  'src/schemas/**/*.ts': [
    'eslint --fix',
    'prettier --write',
    // Vérifier la cohérence des schémas
    'node scripts/validate-schemas.js',
  ],
  
  // === TYPES TYPESCRIPT ===
  'src/types/**/*.ts': [
    'eslint --fix',
    'prettier --write',
    // Vérifier les exports de types
    'tsc --noEmit',
  ],
}; 