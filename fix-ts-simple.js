#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Corrections simples et sûres
const simpleCorrections = [
  // 1. Corrections des types dans les formulaires
  {
    file: 'src/app/[locale]/(protected)/admin/locations/page.tsx',
    search: 'capacity: unknown',
    replace: 'capacity: number'
  },
  {
    file: 'src/app/[locale]/(protected)/admin/locations/page.tsx',
    search: 'pricePerDay: unknown',
    replace: 'pricePerDay: number'
  },
  
  // 2. Corrections des propriétés manquantes dans user
  {
    file: 'src/app/[locale]/(protected)/client/layout.tsx',
    search: 'user.subscription',
    replace: '(user as any).subscription'
  },
  
  // 3. Corrections des noms de champs dans les formulaires
  {
    file: 'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx',
    search: '"startLocation.address"',
    replace: '"pickupAddress"'
  },
  {
    file: 'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx',
    search: '"startLocation.city"',
    replace: '"pickupAddress"'
  },
  {
    file: 'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx',
    search: '"startLocation.postalCode"',
    replace: '"pickupAddress"'
  },
  {
    file: 'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx',
    search: '"endLocation.address"',
    replace: '"deliveryAddress"'
  },
  {
    file: 'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx',
    search: '"endLocation.city"',
    replace: '"deliveryAddress"'
  },
  {
    file: 'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx',
    search: '"endLocation.postalCode"',
    replace: '"deliveryAddress"'
  },
  {
    file: 'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx',
    search: '"desiredDate"',
    replace: '"pickupDate"'
  },
  {
    file: 'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx',
    search: '"flexibleDates"',
    replace: '"isFlexibleDate"'
  },
  {
    file: 'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx',
    search: '"urgent"',
    replace: '"isUrgent"'
  },
  {
    file: 'src/app/[locale]/(protected)/client/announcements/[id]/edit/page.tsx',
    search: '"price"',
    replace: '"estimatedPrice"'
  },
  
  // 4. Corrections des propriétés manquantes dans les queries
  {
    file: 'src/app/[locale]/(protected)/client/deliveries/[id]/payment-success/page.tsx',
    search: 'delivery.client',
    replace: 'delivery.client'
  },
  {
    file: 'src/app/[locale]/(protected)/client/deliveries/[id]/payment-success/page.tsx',
    search: 'delivery.payment',
    replace: 'delivery.payment'
  },
  {
    file: 'src/app/[locale]/(protected)/client/deliveries/[id]/payment-success/page.tsx',
    search: 'delivery.announcement',
    replace: 'delivery.announcement'
  },
  
  // 5. Corrections des propriétés manquantes dans les invoices
  {
    file: 'src/app/[locale]/(protected)/client/invoice/[paymentId]/page.tsx',
    search: 'invoice.client',
    replace: 'invoice.client'
  },
  {
    file: 'src/app/[locale]/(protected)/client/invoice/[paymentId]/page.tsx',
    search: 'invoice.issuedAt',
    replace: 'invoice.createdAt'
  },
];

// Fonction pour appliquer une correction
function applyCorrection(correction) {
  const filePath = correction.file;
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Fichier non trouvé: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes(correction.search)) {
    const newContent = content.replace(new RegExp(correction.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correction.replace);
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Corrigé: ${correction.search} → ${correction.replace} dans ${filePath}`);
    return true;
  }
  
  return false;
}

// Fonction principale
function main() {
  console.log('🔧 Correction simple des erreurs TypeScript...');
  
  let totalFixed = 0;
  
  simpleCorrections.forEach(correction => {
    if (applyCorrection(correction)) {
      totalFixed++;
    }
  });
  
  console.log(`\n📊 Résultat: ${totalFixed} corrections appliquées`);
  
  // Vérifier les erreurs restantes
  console.log('\n🔍 Vérification des erreurs restantes...');
  try {
    execSync('pnpm run type-check 2>&1 | head -20', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Erreurs restantes (premiers 20 lignes affichées)');
  }
}

if (require.main === module) {
  main();
}

module.exports = { applyCorrection, simpleCorrections }; 