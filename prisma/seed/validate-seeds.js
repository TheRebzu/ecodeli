#!/usr/bin/env node

/**
 * Script de validation des seeds EcoDeli
 * Vérifie que tous les seeds existent et sont référencés correctement
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Validation du système de seeding EcoDeli...\n");

// 1. Vérifier que tous les fichiers seeds existent
const seedsDir = path.join(__dirname, "seeds");
const seedFiles = fs
  .readdirSync(seedsDir)
  .filter((file) => file.endsWith(".seed.ts"))
  .sort();

console.log(`📁 Seeds trouvés dans le dossier: ${seedFiles.length}`);
seedFiles.forEach((file, i) => {
  console.log(`   ${i + 1}. ${file}`);
});

// 2. Vérifier le fichier dependencies.ts
const depsPath = path.join(__dirname, "config", "dependencies.ts");
const depsContent = fs.readFileSync(depsPath, "utf8");

// Extraire les noms de seeds du fichier dependencies
const seedNames = [];
const nameMatches = depsContent.match(/name: '([^']+)'/g);
if (nameMatches) {
  nameMatches.forEach((match) => {
    const name = match.match(/name: '([^']+)'/)[1];
    seedNames.push(name);
  });
}

console.log(`\n📋 Seeds référencés dans dependencies.ts: ${seedNames.length}`);
seedNames.forEach((name, i) => {
  console.log(`   ${i + 1}. ${name}`);
});

// 3. Vérifier la cohérence
console.log("\n🔍 Vérification de la cohérence...");

const expectedSeeds = seedFiles.map((file) => file.replace(".seed.ts", ""));
const missingInDeps = expectedSeeds.filter((seed) => !seedNames.includes(seed));
const missingFiles = seedNames.filter((seed) => !expectedSeeds.includes(seed));

if (missingInDeps.length > 0) {
  console.log(
    `❌ Seeds manquants dans dependencies.ts: ${missingInDeps.join(", ")}`,
  );
} else {
  console.log("✅ Tous les seeds sont référencés dans dependencies.ts");
}

if (missingFiles.length > 0) {
  console.log(
    `❌ Fichiers manquants pour les seeds: ${missingFiles.join(", ")}`,
  );
} else {
  console.log("✅ Tous les seeds référencés ont leur fichier");
}

// 4. Vérifier l'ordre d'exécution
console.log("\n📊 Ordre d'exécution prévu:");

// Seeds de base
const baseSeds = ["00-cleanup", "01-users", "02-auth"];
baseSeds.forEach((seed, i) => {
  if (seedNames.includes(seed)) {
    console.log(`   ${i + 1}. ${seed} ✅`);
  } else {
    console.log(`   ${i + 1}. ${seed} ❌`);
  }
});

// Vérifier quelques seeds critiques
const criticalSeeds = [
  "08-announcement",
  "09-delivery",
  "10-booking",
  "11-payment",
  "15-notification",
  "25-analytics",
];

console.log("\n🔥 Seeds critiques:");
criticalSeeds.forEach((seed) => {
  if (seedNames.includes(seed)) {
    console.log(`   ✅ ${seed}`);
  } else {
    console.log(`   ❌ ${seed} - MANQUANT`);
  }
});

// 5. Résumé final
console.log("\n📋 RÉSUMÉ:");
console.log(`   Fichiers seeds: ${seedFiles.length}`);
console.log(`   Référencés dans deps: ${seedNames.length}`);
console.log(
  `   Cohérence: ${missingInDeps.length === 0 && missingFiles.length === 0 ? "✅ Parfaite" : "❌ Problèmes détectés"}`,
);

if (missingInDeps.length === 0 && missingFiles.length === 0) {
  console.log("\n🎉 Le système de seeding est complet et cohérent !");
  console.log("💡 Vous pouvez maintenant exécuter: pnpm run seed");
} else {
  console.log(
    "\n⚠️  Veuillez corriger les incohérences avant d'exécuter le seeding.",
  );
  process.exit(1);
}
