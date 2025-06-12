#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Script pour corriger les params dans Next.js 15
async function fixParams() {
  // Trouver tous les fichiers page.tsx dans l'arborescence
  const pageFiles = await glob('src/app/**/page.tsx', { cwd: process.cwd() });
  
  console.log(`🔧 Fixing ${pageFiles.length} page files for Next.js 15...`);
  
  for (const filePath of pageFiles) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Pattern pour détecter les interfaces de props avec params non-async
      const paramsPattern = /(\w+Props\s*{\s*params:\s*)({[^}]+})(;\s*})/g;
      const newContent = content.replace(paramsPattern, (match, before, paramsType, after) => {
        if (!paramsType.includes('Promise<')) {
          modified = true;
          return `${before}Promise<${paramsType}>${after}`;
        }
        return match;
      });
      
      if (newContent !== content) {
        content = newContent;
      }
      
      // Pattern pour les fonctions qui utilisent params sans await
      const functionPattern = /export\s+default\s+function\s+(\w+)\s*\(\s*{\s*params\s*}:\s*\w+Props\s*\)\s*{/g;
      const asyncFunctionContent = content.replace(functionPattern, (match, functionName) => {
        modified = true;
        return `export default async function ${functionName}({ params }: ${functionName.replace('Page', '')}PageProps) {`;
      });
      
      if (asyncFunctionContent !== content) {
        content = asyncFunctionContent;
      }
      
      // Pattern pour les destructuring de params sans await
      const destructuringPattern = /const\s+{\s*([^}]+)\s*}\s*=\s*params;/g;
      const awaitDestructuring = content.replace(destructuringPattern, (match, destructuredVars) => {
        if (!match.includes('await')) {
          modified = true;
          return `const { ${destructuredVars} } = await params;`;
        }
        return match;
      });
      
      if (awaitDestructuring !== content) {
        content = awaitDestructuring;
      }
      
      // Corriger les traductions avec paramètres par défaut
      const translationPattern = /t\('([^']+)',\s*'([^']+)'\)/g;
      const fixedTranslations = content.replace(translationPattern, (match, key, defaultValue) => {
        modified = true;
        return `t('${key}') || '${defaultValue}'`;
      });
      
      if (fixedTranslations !== content) {
        content = fixedTranslations;
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed: ${filePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error.message);
    }
  }
  
  console.log('✨ All page files fixed for Next.js 15!');
}

if (require.main === module) {
  fixParams().catch(console.error);
}

module.exports = { fixParams }; 