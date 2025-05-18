#!/usr/bin/env node
/**
 * Script d'exécution de tous les seeds EcoDeli
 * 
 * Ce script exécute tous les scripts de seed individuels
 * dans un ordre logique pour éviter les erreurs de dépendance.
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import chalk from 'chalk';

// Initialisation du client Prisma
const prisma = new PrismaClient();

// Ordre d'exécution des seeds (selon les dépendances)
const SEED_ORDER = [
  'users-seed.ts',            // Base d'utilisateurs 
  'create-client.ts',         // Profils clients
  'contracts-seed.ts',        // Contrats avec les marchands
  'warehouses-seed.ts',       // Entrepôts de stockage
  'verification-seed.ts',     // Vérifications et documents
  'subscriptions-seed.ts',    // Abonnements
  'wallets-seed.ts',          // Portefeuilles et transactions
  'invoices-seed.ts',         // Factures
  'financial-tasks-seed.ts',  // Tâches financières
  'announcements-seed.ts',    // Annonces de livraison
  'deliveries-seed.ts',       // Livraisons
  'ratings-seed.ts',          // Évaluations
  'messages-seed.ts',         // Conversations et messages
  'audit-logs-seed.ts',       // Journaux d'audit
  'i18n-seed.ts',             // Données d'internationalisation
  'geolocation-seed.ts',      // Données de géolocalisation
];

/**
 * Fonction principale d'exécution des seeds
 */
async function runAllSeeds() {
  console.log(chalk.blue('🌱 Exécution de tous les seeds EcoDeli'));
  console.log(chalk.gray('========================================'));
  
  let successCount = 0;
  let errorCount = 0;
  
  // Pour chaque script de seed dans l'ordre spécifié
  for (const seedScript of SEED_ORDER) {
    try {
      console.log(chalk.cyan(`\n📦 Exécution de ${seedScript}...`));
      
      // Exécution du script via npx tsx
      execSync(`npx tsx prisma/seeds/${seedScript}`, { stdio: 'inherit' });
      
      console.log(chalk.green(`✅ ${seedScript} exécuté avec succès.`));
      successCount++;
    } catch (error) {
      console.error(chalk.red(`❌ Erreur lors de l'exécution de ${seedScript}:`));
      console.error(error);
      errorCount++;
    }
  }
  
  // Affichage du résumé
  console.log(chalk.blue('\n📊 Résumé de l\'exécution des seeds:'));
  console.log(chalk.green(`✅ ${successCount} scripts exécutés avec succès`));
  
  if (errorCount > 0) {
    console.log(chalk.red(`❌ ${errorCount} scripts ont échoué`));
  } else {
    console.log(chalk.green('🎉 Tous les scripts ont été exécutés avec succès !'));
  }
}

// Exécution du script
runAllSeeds()
  .catch(error => {
    console.error(chalk.red('❌ Erreur fatale lors de l\'exécution des seeds:'), error);
    process.exit(1);
  })
  .finally(async () => {
    // Déconnexion du client Prisma
    await prisma.$disconnect();
  }); 