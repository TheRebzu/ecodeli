#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Corrections automatiques simples
const corrections = [
  // 1. Ajout de propriétés manquantes dans les types
  {
    file: 'src/types/entities.ts',
    search: 'export type UserForUI = {',
    replace: `export type UserForUI = {
  id: string;
  email: string;
  name?: string | null;
  image?: string;
  role: UserRole;
  isActive: boolean;
  validationStatus: string;
  profileData?: any;
  // Propriétés dérivées ajoutées automatiquement
  subscription?: "FREE" | "STARTER" | "PREMIUM";
  avatar?: string;
}

export type UserForUIOriginal = {`
  },
  
  // 2. Corrections des formulaires React Hook Form
  {
    pattern: /useForm<TFieldValues>/g,
    replacement: (content, fileName) => {
      if (fileName.includes('locations/page.tsx')) {
        return content.replace(/useForm<TFieldValues>/g, 'useForm<WarehouseForm>');
      }
      if (fileName.includes('announcements') && fileName.includes('edit')) {
        return content.replace(/useForm<TFieldValues>/g, 'useForm<AnnouncementUpdateForm>');
      }
      if (fileName.includes('announcements') && fileName.includes('create')) {
        return content.replace(/useForm<TFieldValues>/g, 'useForm<AnnouncementCreateForm>');
      }
      return content;
    }
  },
  
  // 3. Corrections des noms de propriétés
  {
    pattern: /"startLocation\.address"/g,
    replacement: '"pickupAddress"'
  },
  {
    pattern: /"startLocation\.city"/g,
    replacement: '"pickupAddress"'
  },
  {
    pattern: /"startLocation\.postalCode"/g,
    replacement: '"pickupAddress"'
  },
  {
    pattern: /"endLocation\.address"/g,
    replacement: '"deliveryAddress"'
  },
  {
    pattern: /"endLocation\.city"/g,
    replacement: '"deliveryAddress"'
  },
  {
    pattern: /"endLocation\.postalCode"/g,
    replacement: '"deliveryAddress"'
  },
  {
    pattern: /"desiredDate"/g,
    replacement: '"pickupDate"'
  },
  {
    pattern: /"flexibleDates"/g,
    replacement: '"isFlexibleDate"'
  },
  {
    pattern: /"urgent"/g,
    replacement: '"isUrgent"'
  },
  {
    pattern: /"price"/g,
    replacement: '"estimatedPrice"'
  },
  
  // 4. Corrections des types unknown vers number
  {
    pattern: /capacity: unknown/g,
    replacement: 'capacity: number'
  },
  {
    pattern: /pricePerDay: unknown/g,
    replacement: 'pricePerDay: number'
  },
  
  // 5. Corrections des includes manquants
  {
    pattern: /include: {\s*announcement:/g,
    replacement: 'include: {\n    announcement: true,'
  },
  {
    pattern: /include: {\s*payment:/g,
    replacement: 'include: {\n    payment: true,'
  },
  {
    pattern: /include: {\s*client:/g,
    replacement: 'include: {\n    client: true,'
  }
];

// Fonction pour corriger un fichier
function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Fichier non trouvé: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  corrections.forEach(correction => {
    if (correction.file && !filePath.endsWith(correction.file)) {
      return;
    }
    
    if (correction.pattern && correction.replacement) {
      if (typeof correction.replacement === 'function') {
        const newContent = correction.replacement(content, filePath);
        if (newContent !== content) {
          content = newContent;
          hasChanges = true;
        }
      } else {
        const newContent = content.replace(correction.pattern, correction.replacement);
        if (newContent !== content) {
          content = newContent;
          hasChanges = true;
        }
      }
    }
    
    if (correction.search && correction.replace) {
      const newContent = content.replace(correction.search, correction.replace);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
      }
    }
  });
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corrigé: ${filePath}`);
    return true;
  }
  
  return false;
}

// Fonction principale
function main() {
  console.log('🔧 Correction automatique des erreurs TypeScript...');
  
  const filesToFix = [
    'src/types/entities.ts',
    'src/app/[locale]/(protected)/admin/locations/page.tsx',
    'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx',
    'src/app/[locale]/(protected)/client/announcements/create/page.tsx',
    'src/app/[locale]/(protected)/client/deliveries/[id]/payment-success/page.tsx',
    'src/app/[locale]/(protected)/client/invoice/[paymentId]/page.tsx',
    'src/app/[locale]/(protected)/client/layout.tsx'
  ];
  
  let totalFixed = 0;
  
  filesToFix.forEach(file => {
    if (fixFile(file)) {
      totalFixed++;
    }
  });
  
  console.log(`\n📊 Résultat: ${totalFixed} fichiers corrigés`);
  
  // Relancer le type-check pour voir les erreurs restantes
  console.log('\n🔍 Vérification des erreurs restantes...');
  const { execSync } = require('child_process');
  try {
    execSync('pnpm run type-check', { stdio: 'inherit' });
    console.log('✅ Aucune erreur TypeScript !');
  } catch (error) {
    console.log('⚠️  Erreurs restantes à corriger manuellement');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, corrections }; 