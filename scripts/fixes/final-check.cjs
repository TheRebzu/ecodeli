#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification finale rapide du projet EcoDeli...\n');

// 1. Vérifier les pages principales
const pagesToCheck = [
  'src/app/[locale]/(protected)/admin/page.tsx',
  'src/app/[locale]/(protected)/provider/billing/page.tsx', 
  'src/app/[locale]/(protected)/provider/services/page.tsx',
  'src/app/[locale]/(protected)/deliverer/page.tsx',
  'src/app/[locale]/(protected)/client/page.tsx',
  'src/app/[locale]/(protected)/merchant/catalog/page.tsx'
];

console.log('📄 Vérification des pages principales:');
let pagesOk = 0;
pagesToCheck.forEach(pagePath => {
  if (fs.existsSync(pagePath)) {
    console.log(`  ✅ ${pagePath}`);
    pagesOk++;
  } else {
    console.log(`  ❌ ${pagePath} - MANQUANT`);
  }
});

// 2. Vérifier les composants essentiels
const componentsToCheck = [
  'src/components/admin/dashboard/admin-dashboard.tsx',
  'src/components/provider/billing/earnings-summary.tsx',
  'src/components/provider/billing/monthly-invoice.tsx',
  'src/components/provider/services/service-card.tsx',
  'src/components/deliverer/dashboard/deliverer-dashboard.tsx',
  'src/components/client/dashboard/client-dashboard.tsx',
  'src/components/merchant/catalog/catalog-page.tsx'
];

console.log('\n🧩 Vérification des composants essentiels:');
let componentsOk = 0;
componentsToCheck.forEach(componentPath => {
  if (fs.existsSync(componentPath)) {
    console.log(`  ✅ ${componentPath}`);
    componentsOk++;
  } else {
    console.log(`  ❌ ${componentPath} - MANQUANT`);
  }
});

// 3. Vérifier les hooks
const hooksToCheck = [
  'src/hooks/provider/use-provider-services.ts',
  'src/hooks/provider/use-provider-monthly-billing.ts',
  'src/hooks/client/use-client-contracts.ts',
  'src/hooks/client/use-client-reviews.ts',
  'src/hooks/use-toast.ts'
];

console.log('\n🎣 Vérification des hooks:');
let hooksOk = 0;
hooksToCheck.forEach(hookPath => {
  if (fs.existsSync(hookPath)) {
    console.log(`  ✅ ${hookPath}`);
    hooksOk++;
  } else {
    console.log(`  ❌ ${hookPath} - MANQUANT`);
  }
});

// 4. Vérifier les routeurs API essentiels
const routersToCheck = [
  'src/server/api/routers/admin/admin-analytics.router.ts',
  'src/server/api/routers/admin/admin-system.router.ts',
  'src/server/api/routers/merchant/merchant-dashboard.router.ts'
];

console.log('\n🛣️  Vérification des routeurs API:');
let routersOk = 0;
routersToCheck.forEach(routerPath => {
  if (fs.existsSync(routerPath)) {
    console.log(`  ✅ ${routerPath}`);
    routersOk++;
  } else {
    console.log(`  ❌ ${routerPath} - MANQUANT`);
  }
});

// 5. Résumé final
console.log('\n📊 RÉSUMÉ FINAL:');
console.log(`  📄 Pages principales: ${pagesOk}/${pagesToCheck.length}`);
console.log(`  🧩 Composants essentiels: ${componentsOk}/${componentsToCheck.length}`);
console.log(`  🎣 Hooks: ${hooksOk}/${hooksToCheck.length}`);
console.log(`  🛣️  Routeurs API: ${routersOk}/${routersToCheck.length}`);

const totalChecked = pagesToCheck.length + componentsToCheck.length + hooksToCheck.length + routersToCheck.length;
const totalOk = pagesOk + componentsOk + hooksOk + routersOk;
const percentage = Math.round((totalOk / totalChecked) * 100);

console.log(`\n🎯 SCORE GLOBAL: ${totalOk}/${totalChecked} (${percentage}%)`);

if (percentage >= 95) {
  console.log('\n🎉 EXCELLENT! Le projet est complet et prêt!');
} else if (percentage >= 80) {
  console.log('\n✅ BIEN! Quelques éléments mineurs à compléter.');
} else {
  console.log('\n⚠️  ATTENTION! Plusieurs éléments importants manquent.');
}

console.log('\n✨ Vérification terminée!\n');