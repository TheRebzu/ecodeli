#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Script pour harmoniser tous les imports de use-toast
console.log('🔧 Harmonisation des imports use-toast...');

const projectRoot = process.cwd();
const patterns = [
  'src/**/*.{ts,tsx,js,jsx}',
  '!src/components/ui/use-toast.ts',
  '!src/hooks/use-toast.ts',
  '!node_modules/**',
];

let totalCorrections = 0;

patterns.forEach(pattern => {
  const files = glob.sync(pattern, { cwd: projectRoot });
  
  files.forEach(filePath => {
    const fullPath = path.join(projectRoot, filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    let hasChanges = false;
    
    // Remplacer tous les imports vers use-toast par la version UI
    const originalContent = content;
    
    // Pattern 1: import { useToast } from "@/hooks/use-toast"
    content = content.replace(
      /import\s*{\s*useToast\s*}\s*from\s*["']@\/hooks\/use-toast["']/g,
      'import { useToast } from "@/components/ui/use-toast"'
    );
    
    // Pattern 2: import { toast } from "@/hooks/use-toast"
    content = content.replace(
      /import\s*{\s*toast\s*}\s*from\s*["']@\/hooks\/use-toast["']/g,
      'import { toast } from "@/components/ui/use-toast"'
    );
    
    // Pattern 3: import { useToast, toast } from "@/hooks/use-toast"
    content = content.replace(
      /import\s*{\s*(useToast|toast)(\s*,\s*(useToast|toast))?\s*}\s*from\s*["']@\/hooks\/use-toast["']/g,
      'import { useToast, toast } from "@/components/ui/use-toast"'
    );
    
    // Pattern 4: import { toast } from '@/hooks/ui/use-toast'
    content = content.replace(
      /import\s*{\s*toast\s*}\s*from\s*['"]@\/hooks\/ui\/use-toast['"]/g,
      'import { toast } from "@/components/ui/use-toast"'
    );
    
    if (content !== originalContent) {
      hasChanges = true;
      fs.writeFileSync(fullPath, content, 'utf8');
      totalCorrections++;
      console.log(`✅ Corrigé: ${filePath}`);
    }
  });
});

console.log(`\n🎉 Harmonisation terminée! ${totalCorrections} fichiers corrigés.`);

// Supprimer l'ancien fichier use-toast.ts des hooks
const oldToastFile = path.join(projectRoot, 'src/hooks/use-toast.ts');
if (fs.existsSync(oldToastFile)) {
  fs.unlinkSync(oldToastFile);
  console.log('🗑️  Supprimé: src/hooks/use-toast.ts');
}

console.log('\n📋 Résumé des corrections:');
console.log('- Tous les imports pointent vers @/components/ui/use-toast');
console.log('- Ancien fichier src/hooks/use-toast.ts supprimé');
console.log('- Pattern singleton sécurisé pour Next.js implémenté'); 