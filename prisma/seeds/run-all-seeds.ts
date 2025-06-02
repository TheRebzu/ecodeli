#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { SeedLogger } from './utils/seed-logger';
import { SeedResult, SeedOptions } from './utils/seed-helpers';
import { createSeedCleaner, CleanOptions } from './utils/seed-cleaner';
import { createSeedValidator, ValidationOptions } from './utils/seed-validator';
import { defaultSeedConfig } from './seed.config';

// Import des seeds de base
import { seedPermissions } from './base/permissions-seed';
import { seedServiceCategories } from './base/service-categories-seed';
import { seedServiceTypes } from './services/service-types-seed';
import { seedProviderAvailability } from './services/provider-availability-seed';
import { seedServiceRatings } from './services/service-ratings-seed';
// import { seedCompleteUsers } from './users/users-complete-seed'; // Désactivé temporairement à cause des erreurs de linter

// Import des seeds utilisateurs
import { seedAdminUsers } from './users/admin-users-seed';
import { seedClientUsers } from './users/client-users-seed';
import { seedDelivererUsers } from './users/deliverer-users-seed';
import { seedMerchantUsers } from './users/merchant-users-seed';
import { seedProviderUsers } from './users/provider-users-seed';

// Import des seeds de vérification
import { seedDelivererDocuments, validateDelivererDocuments } from './verifications/deliverer-documents-seed';
import { seedProviderDocuments, validateProviderDocuments } from './verifications/provider-documents-seed';
import { seedMerchantDocuments, validateMerchantDocuments } from './verifications/merchant-documents-seed';
import { seedVerificationStates, validateVerificationStates } from './verifications/verification-states-seed';
import { seedVerificationHistory } from './verifications/verification-history-seed';

// Import des seeds stockage
import { seedWarehouses } from './storage/warehouses-seed';

// Import des seeds financiers
import { seedWallets } from './financial/wallets-seed';
import { seedPayments } from './financial/payments-seed';
import { seedInvoices } from './financial/invoices-seed';
import { seedCommissions } from './financial/commissions-seed';
import { seedBillingCycles } from './financial/billing-cycles-seed';

// Import des seeds d'annonces
import { seedClientAnnouncements } from './announcements/client-announcements-seed';
import { seedMerchantAnnouncements } from './announcements/merchant-announcements-seed';

// Import des seeds de notifications  
import { seedNotificationTemplates } from './notifications/notification-templates-seed';

// Import des seeds de services
import { seedProviderServices } from './services/provider-services-seed';
import { seedServiceBookings } from './services/service-bookings-seed';

// Note: Les seeds suivants ont des erreurs TypeScript et sont désactivés:
// - seedContractTemplates, seedProviderContracts, seedMerchantContracts (modèle contractTemplate n'existe pas)
// - seedAuditLogs (enums ActivityType manquants)

/**
 * Interface pour définir un seed avec ses dépendances
 */
interface SeedDefinition {
  name: string;
  category: string;
  dependencies: string[];
  seedFunction: (prisma: PrismaClient, logger: SeedLogger, options: SeedOptions) => Promise<SeedResult>;
  description: string;
  priority: number; // 1 = haute priorité (base), 5 = basse priorité
}

/**
 * Configuration complète des seeds EcoDeli
 */
const SEED_DEFINITIONS: SeedDefinition[] = [
  // 1. Seeds de base (priorité 1)
  {
    name: 'permissions',
    category: 'base',
    dependencies: [],
    seedFunction: seedPermissions,
    description: 'Permissions système par rôle',
    priority: 1
  },
  {
    name: 'service-categories',
    category: 'base', 
    dependencies: [],
    seedFunction: seedServiceCategories,
    description: 'Catégories de services disponibles',
    priority: 1
  },

  // 2. Seeds utilisateurs (priorité 2)
  {
    name: 'admin-users',
    category: 'users',
    dependencies: ['permissions'],
    seedFunction: seedAdminUsers,
    description: 'Utilisateurs administrateurs',
    priority: 2
  },
  {
    name: 'client-users',
    category: 'users',
    dependencies: ['permissions'],
    seedFunction: seedClientUsers,
    description: 'Utilisateurs clients',
    priority: 2
  },
  {
    name: 'deliverer-users',
    category: 'users',
    dependencies: ['permissions'],
    seedFunction: seedDelivererUsers,
    description: 'Utilisateurs livreurs',
    priority: 2
  },
  {
    name: 'merchant-users',
    category: 'users',
    dependencies: ['permissions'],
    seedFunction: seedMerchantUsers,
    description: 'Utilisateurs commerçants',
    priority: 2
  },
  {
    name: 'provider-users',
    category: 'users',
    dependencies: ['permissions'],
    seedFunction: seedProviderUsers,
    description: 'Utilisateurs prestataires',
    priority: 2
  },

  // 3. Seeds vérifications (priorité 3)
  {
    name: 'deliverer-documents',
    category: 'verifications',
    dependencies: ['deliverer-users'],
    seedFunction: seedDelivererDocuments,
    description: 'Documents des livreurs',
    priority: 3
  },
  {
    name: 'provider-documents',
    category: 'verifications',
    dependencies: ['provider-users'],
    seedFunction: seedProviderDocuments,
    description: 'Documents des prestataires',
    priority: 3
  },
  {
    name: 'merchant-documents',
    category: 'verifications',
    dependencies: ['merchant-users'],
    seedFunction: seedMerchantDocuments,
    description: 'Documents des commerçants',
    priority: 3
  },
  {
    name: 'verification-states',
    category: 'verifications',
    dependencies: ['deliverer-documents', 'provider-documents', 'merchant-documents'],
    seedFunction: seedVerificationStates,
    description: 'États des vérifications',
    priority: 3
  },
  {
    name: 'verification-history',
    category: 'verifications',
    dependencies: ['verification-states'],
    seedFunction: seedVerificationHistory,
    description: 'Historique des vérifications',
    priority: 3
  },

  // 4. Seeds infrastructure (priorité 4)
  {
    name: 'warehouses',
    category: 'storage',
    dependencies: [],
    seedFunction: seedWarehouses,
    description: 'Entrepôts de stockage',
    priority: 4
  },

  // 5. Seeds financiers (priorité 5)
  {
    name: 'wallets',
    category: 'financial',
    dependencies: ['deliverer-users', 'provider-users', 'merchant-users'],
    seedFunction: seedWallets,
    description: 'Portefeuilles utilisateurs et transactions',
    priority: 5
  },
  {
    name: 'commissions',
    category: 'financial',
    dependencies: [],
    seedFunction: seedCommissions,
    description: 'Taux de commission et promotions',
    priority: 5
  },
  {
    name: 'payments',
    category: 'financial',
    dependencies: ['client-users', 'commissions'],
    seedFunction: seedPayments,
    description: 'Paiements Stripe et méthodes',
    priority: 5
  },
  {
    name: 'invoices',
    category: 'financial',
    dependencies: ['deliverer-users', 'provider-users', 'merchant-users', 'client-users'],
    seedFunction: seedInvoices,
    description: 'Factures et lignes de détail',
    priority: 5
  },
  {
    name: 'billing-cycles',
    category: 'financial',
    dependencies: ['wallets', 'payments', 'invoices'],
    seedFunction: seedBillingCycles,
    description: 'Cycles de facturation et rappels',
    priority: 5
  },

  // 6. Seeds spécifiques
  {
    name: 'service-types',
    category: 'services',
    dependencies: ['service-categories'],
    seedFunction: seedServiceTypes,
    description: 'Types de services détaillés',
    priority: 6
  },
  {
    name: 'provider-availability',
    category: 'services',
    dependencies: ['service-types'],
    seedFunction: seedProviderAvailability,
    description: 'Disponibilités des prestataires',
    priority: 6
  },
  {
    name: 'service-ratings',
    category: 'services',
    dependencies: ['provider-availability'],
    seedFunction: seedServiceRatings,
    description: 'Évaluations de services',
    priority: 6
  },
  {
    name: 'provider-services',
    category: 'services',
    dependencies: ['provider-users', 'service-categories'],
    seedFunction: seedProviderServices,
    description: 'Services proposés par les prestataires',
    priority: 6
  },
  {
    name: 'service-bookings',
    category: 'services',
    dependencies: ['provider-services', 'client-users'],
    seedFunction: seedServiceBookings,
    description: 'Réservations de services',
    priority: 7
  },

  // 7. Seeds d'annonces (priorité 7)
  {
    name: 'client-announcements',
    category: 'announcements',
    dependencies: ['client-users'],
    seedFunction: seedClientAnnouncements,
    description: 'Annonces des clients',
    priority: 7
  },
  {
    name: 'merchant-announcements',
    category: 'announcements',
    dependencies: ['merchant-users'],
    seedFunction: seedMerchantAnnouncements,
    description: 'Annonces des commerçants',
    priority: 7
  },

  // 8. Seeds de notifications (priorité 8)
  {
    name: 'notification-templates',
    category: 'notifications',
    dependencies: [],
    seedFunction: seedNotificationTemplates,
    description: 'Modèles de notifications',
    priority: 8
  }
];

/**
 * Options de ligne de commande
 */
interface CLIOptions {
  categories?: string[];
  seeds?: string[];
  clean?: boolean;
  force?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  validate?: boolean;
}

/**
 * Orchestrateur principal des seeds EcoDeli
 */
class SeedOrchestrator {
  private prisma: PrismaClient;
  private logger: SeedLogger;
  private options: CLIOptions;

  constructor(options: CLIOptions = {}) {
    this.prisma = new PrismaClient();
    this.logger = new SeedLogger(options.verbose || false);
    this.options = options;
  }

  /**
   * Point d'entrée principal
   */
  async run(): Promise<void> {
    try {
      this.logger.info('ORCHESTRATOR', '🚀 Démarrage du système de seeds EcoDeli');
      this.logger.info('ORCHESTRATOR', `📊 Configuration: ${JSON.stringify(defaultSeedConfig.quantities, null, 2)}`);

      if (this.options.dryRun) {
        await this.dryRun();
        return;
      }

      if (this.options.validate) {
        await this.validateOnly();
        return;
      }

      // Nettoyer la base si demandé
      if (this.options.clean) {
        await this.cleanDatabase();
      }

      // Résoudre les dépendances et exécuter les seeds
      const seedsToRun = this.resolveDependencies();
      await this.executeSeedsInOrder(seedsToRun);

      // Validation finale
      await this.finalValidation();

      this.logger.success('ORCHESTRATOR', '✅ Tous les seeds ont été exécutés avec succès');

    } catch (error: any) {
      this.logger.error('ORCHESTRATOR', `❌ Erreur fatale: ${error.message}`);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Mode dry-run : affiche ce qui serait exécuté sans rien faire
   */
  private async dryRun(): Promise<void> {
    this.logger.info('DRY_RUN', '🔍 Mode simulation - aucune modification ne sera effectuée');
    
    const seedsToRun = this.resolveDependencies();
    
    this.logger.info('DRY_RUN', `📋 ${seedsToRun.length} seeds seraient exécutés dans cet ordre:`);
    
    seedsToRun.forEach((seed, index) => {
      this.logger.info('DRY_RUN', `${index + 1}. [${seed.category}] ${seed.name} - ${seed.description}`);
      if (seed.dependencies.length > 0) {
        this.logger.info('DRY_RUN', `   Dépendances: ${seed.dependencies.join(', ')}`);
      }
    });

    this.logger.success('DRY_RUN', '✅ Simulation terminée');
  }

  /**
   * Mode validation uniquement
   */
  private async validateOnly(): Promise<void> {
    this.logger.info('VALIDATION', '🔍 Mode validation uniquement');
    
    const validator = createSeedValidator(this.prisma, this.logger);
    
    const validationOptions: ValidationOptions = {
      categories: this.options.categories,
      verbose: true,
      strict: true
    };

    const stats = await validator.validate(validationOptions);
    
    if (stats.failedRules > 0) {
      throw new Error(`Validation échouée: ${stats.failedRules} règles non respectées`);
    }
    
    this.logger.success('VALIDATION', '✅ Toutes les validations sont passées');
  }

  /**
   * Résout les dépendances et retourne l'ordre d'exécution
   */
  private resolveDependencies(): SeedDefinition[] {
    let availableSeeds = [...SEED_DEFINITIONS];

    // Filtrer par catégories si spécifié
    if (this.options.categories && this.options.categories.length > 0) {
      availableSeeds = availableSeeds.filter(seed => 
        this.options.categories!.includes(seed.category)
      );
    }

    // Filtrer par seeds spécifiques si spécifié
    if (this.options.seeds && this.options.seeds.length > 0) {
      availableSeeds = availableSeeds.filter(seed => 
        this.options.seeds!.includes(seed.name)
      );
    }

    // Tri topologique pour résoudre les dépendances
    const resolved: SeedDefinition[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (seedName: string) => {
      if (visited.has(seedName)) return;
      if (visiting.has(seedName)) {
        throw new Error(`Dépendance circulaire détectée impliquant: ${seedName}`);
      }

      const seed = availableSeeds.find(s => s.name === seedName);
      if (!seed) {
        throw new Error(`Seed non trouvé: ${seedName}`);
      }

      visiting.add(seedName);

      // Visiter les dépendances d'abord
      for (const dep of seed.dependencies) {
        visit(dep);
      }

      visiting.delete(seedName);
      visited.add(seedName);
      resolved.push(seed);
    };

    // Visiter tous les seeds disponibles
    for (const seed of availableSeeds) {
      visit(seed.name);
    }

    // Trier par priorité en cas d'égalité de dépendances
    return resolved.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Exécute les seeds dans l'ordre résolu
   */
  private async executeSeedsInOrder(seeds: SeedDefinition[]): Promise<void> {
    this.logger.info('EXECUTION', `📋 Exécution de ${seeds.length} seeds dans l'ordre des dépendances`);

    const results: { [key: string]: SeedResult } = {};
    let totalCreated = 0;
    let totalErrors = 0;

    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      
      this.logger.info('EXECUTION', `[${i + 1}/${seeds.length}] Exécution: ${seed.name}`);
      
      try {
        const result = await seed.seedFunction(
          this.prisma, 
          this.logger, 
          {
            clean: this.options.clean,
            force: this.options.force,
            verbose: this.options.verbose
          }
        );

        results[seed.name] = result;
        totalCreated += result.created;
        totalErrors += result.errors;

        if (result.errors > 0) {
          this.logger.warning('EXECUTION', 
            `⚠️ ${seed.name} terminé avec ${result.errors} erreurs`);
        } else {
          this.logger.success('EXECUTION', 
            `✅ ${seed.name} terminé: ${result.created} créés, ${result.skipped} ignorés`);
        }

      } catch (error: any) {
        this.logger.error('EXECUTION', `❌ Échec du seed ${seed.name}: ${error.message}`);
        totalErrors++;
        
        // Continuer avec les autres seeds ou s'arrêter selon la configuration
        if (!this.options.force) {
          throw new Error(`Arrêt suite à l'échec du seed: ${seed.name}`);
        }
      }
    }

    // Résumé final
    this.logger.info('EXECUTION', '📊 Résumé de l\'exécution:');
    this.logger.info('EXECUTION', `   • Total créé: ${totalCreated} entités`);
    this.logger.info('EXECUTION', `   • Total erreurs: ${totalErrors}`);
    
    Object.entries(results).forEach(([name, result]) => {
      this.logger.info('EXECUTION', 
        `   • ${name}: ${result.created} créés, ${result.skipped} ignorés, ${result.errors} erreurs`);
    });
  }

  /**
   * Nettoie la base de données
   */
  private async cleanDatabase(): Promise<void> {
    this.logger.warning('CLEAN', '🧹 Nettoyage de la base de données...');
    
    if (!this.options.force) {
      throw new Error('Le nettoyage nécessite l\'option --force pour éviter les suppressions accidentelles');
    }

    const cleaner = createSeedCleaner(this.prisma, this.logger);
    
    const cleanOptions: CleanOptions = {
      categories: this.options.categories,
      force: this.options.force,
      dryRun: this.options.dryRun,
      preserveUsers: false
    };

    try {
      const stats = await cleaner.clean(cleanOptions);
      this.logger.success('CLEAN', 
        `✅ Nettoyage terminé: ${stats.recordsDeleted} enregistrements supprimés de ${stats.tablesProcessed} tables`
      );
    } catch (error: any) {
      this.logger.error('CLEAN', `❌ Erreur lors du nettoyage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validation finale du système
   */
  private async finalValidation(): Promise<void> {
    this.logger.info('VALIDATION', '🔍 Validation finale du système...');
    
    const validator = createSeedValidator(this.prisma, this.logger);
    
    const validationOptions: ValidationOptions = {
      categories: this.options.categories,
      verbose: this.options.verbose,
      strict: false
    };

    try {
      const stats = await validator.validate(validationOptions);
      
      if (stats.failedRules === 0) {
        this.logger.success('VALIDATION', 
          `✅ Validation réussie: ${stats.passedRules}/${stats.totalRules} règles passées`
        );
      } else {
        this.logger.warning('VALIDATION', 
          `⚠️ Validation partielle: ${stats.failedRules} règles échouées sur ${stats.totalRules}`
        );
      }
    } catch (error: any) {
      this.logger.error('VALIDATION', `❌ Erreur lors de la validation: ${error.message}`);
    }
  }
}

/**
 * Interface CLI
 */
async function main() {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  // Parser les arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--categories':
        options.categories = args[++i]?.split(',') || [];
        break;
      case '--seeds':
        options.seeds = args[++i]?.split(',') || [];
        break;
      case '--clean':
        options.clean = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--validate':
        options.validate = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  const orchestrator = new SeedOrchestrator(options);
  await orchestrator.run();
}

/**
 * Affiche l'aide
 */
function printHelp() {
  console.log(`
🌱 EcoDeli Seeds Orchestrator

Usage: pnpm seed:all [options]

Options:
  --categories <list>   Exécuter seulement certaines catégories (base,users,storage,etc.)
  --seeds <list>        Exécuter seulement certains seeds spécifiques
  --clean              Nettoyer la base avant d'exécuter les seeds
  --force              Forcer la recréation même si les données existent
  --verbose            Affichage détaillé
  --dry-run            Simulation sans modification
  --validate           Validation uniquement
  --help               Afficher cette aide

Exemples:
  pnpm seed:all                           # Exécuter tous les seeds
  pnpm seed:all --categories base,users   # Seulement base et utilisateurs
  pnpm seed:all --seeds permissions       # Seulement les permissions
  pnpm seed:all --clean --force           # Nettoyer et forcer la recréation
  pnpm seed:all --dry-run                 # Voir ce qui serait exécuté
  pnpm seed:all --validate                # Valider l'état actuel
`);
}

// Exécuter automatiquement
console.log('🚀 Démarrage du script seeds...');
main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  console.error(error.stack);
  process.exit(1);
});

export { SeedOrchestrator, SEED_DEFINITIONS }; 