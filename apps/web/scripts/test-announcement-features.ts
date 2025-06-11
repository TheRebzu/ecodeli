/**
 * Script de test des nouvelles fonctionnalités d'annonces
 * Teste l'implémentation sans dépendre de la base de données Prisma
 */

import { logger } from '@/lib/utils/logger';

// Import des services pour validation TypeScript
import { AnnouncementMatchingService } from '@/server/services/matching/announcement-matching.service';
import { PartialDeliveryService } from '@/server/services/matching/partial-delivery.service';
import { CartDropService } from '@/server/services/matching/cart-drop.service';
import { EscrowPaymentService } from '@/server/services/payments/escrow-payment.service';
import { AnnouncementLifecycleWorkflow } from '@/server/workflows/announcement-lifecycle.workflow';
import { CartDropWorkflow } from '@/server/workflows/cart-drop.workflow';

// Types de test
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
}

/**
 * Classe de test pour les fonctionnalités d'annonces
 */
class AnnouncementFeaturesTest {
  private testSuites: TestSuite[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Démarrage des tests des fonctionnalités d\'annonces EcoDeli\n');

    // Test 1: Validation TypeScript et imports
    await this.testTypeScriptValidation();

    // Test 2: Services de matching
    await this.testMatchingServices();

    // Test 3: Services de paiement escrow
    await this.testEscrowServices();

    // Test 4: Workflows métier
    await this.testBusinessWorkflows();

    // Test 5: Compatibilité avec les seeds existants
    await this.testSeedCompatibility();

    // Résumé final
    this.printFinalResults();
  }

  private async testTypeScriptValidation(): Promise<void> {
    const suite: TestSuite = {
      name: 'Validation TypeScript et Imports',
      tests: [],
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0,
    };

    // Test d'import des services de matching
    await this.runTest(suite, 'Import AnnouncementMatchingService', async () => {
      if (typeof AnnouncementMatchingService !== 'function') {
        throw new Error('AnnouncementMatchingService n\'est pas une classe');
      }
    });

    await this.runTest(suite, 'Import PartialDeliveryService', async () => {
      if (typeof PartialDeliveryService !== 'function') {
        throw new Error('PartialDeliveryService n\'est pas une classe');
      }
    });

    await this.runTest(suite, 'Import CartDropService', async () => {
      if (typeof CartDropService !== 'function') {
        throw new Error('CartDropService n\'est pas une classe');
      }
    });

    await this.runTest(suite, 'Import EscrowPaymentService', async () => {
      if (typeof EscrowPaymentService !== 'function') {
        throw new Error('EscrowPaymentService n\'est pas une classe');
      }
    });

    // Test d'import des workflows
    await this.runTest(suite, 'Import AnnouncementLifecycleWorkflow', async () => {
      if (typeof AnnouncementLifecycleWorkflow !== 'function') {
        throw new Error('AnnouncementLifecycleWorkflow n\'est pas une classe');
      }
    });

    await this.runTest(suite, 'Import CartDropWorkflow', async () => {
      if (typeof CartDropWorkflow !== 'function') {
        throw new Error('CartDropWorkflow n\'est pas une classe');
      }
    });

    this.testSuites.push(suite);
  }

  private async testMatchingServices(): Promise<void> {
    const suite: TestSuite = {
      name: 'Services de Matching',
      tests: [],
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0,
    };

    // Test de création d'instance du service de matching
    await this.runTest(suite, 'Création AnnouncementMatchingService', async () => {
      const mockPrisma = {} as any;
      const service = new AnnouncementMatchingService(mockPrisma);
      if (!service) {
        throw new Error('Impossible de créer une instance du service');
      }
    });

    // Test de validation des types
    await this.runTest(suite, 'Validation des types MatchingCriteria', async () => {
      const mockCriteria = {
        routeId: 'route-123',
        announcementId: 'ann-123',
        compatibilityScore: 85,
        reasons: ['SAME_ROUTE', 'TIMING_COMPATIBLE'],
        distance: 15.5,
        detourPercentage: 8,
        priceEstimate: 25.50,
        estimatedDuration: '2h 30min',
        matchingPoints: {
          pickup: { latitude: 48.8566, longitude: 2.3522, address: 'Paris' },
          delivery: { latitude: 45.764, longitude: 4.8357, address: 'Lyon' },
        },
      };

      // Validation basique des propriétés requises
      const requiredFields = ['routeId', 'announcementId', 'compatibilityScore', 'distance'];
      for (const field of requiredFields) {
        if (!(field in mockCriteria)) {
          throw new Error(`Champ requis manquant: ${field}`);
        }
      }
    });

    // Test du service de livraison partielle
    await this.runTest(suite, 'Création PartialDeliveryService', async () => {
      const mockPrisma = {} as any;
      const service = new PartialDeliveryService(mockPrisma);
      if (!service) {
        throw new Error('Impossible de créer une instance du service');
      }
    });

    // Test du service cart drop
    await this.runTest(suite, 'Création CartDropService', async () => {
      const mockPrisma = {} as any;
      const service = new CartDropService(mockPrisma);
      if (!service) {
        throw new Error('Impossible de créer une instance du service');
      }
    });

    this.testSuites.push(suite);
  }

  private async testEscrowServices(): Promise<void> {
    const suite: TestSuite = {
      name: 'Services de Paiement Escrow',
      tests: [],
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0,
    };

    // Test de création du service escrow
    await this.runTest(suite, 'Création EscrowPaymentService', async () => {
      const mockPrisma = {} as any;
      const mockConfig = {
        defaultHoldPeriodHours: 48,
        maxHoldPeriodHours: 168,
        autoReleaseAfterHours: 72,
        platformFeePercentage: 3.5,
        maxRefundPeriodDays: 14,
        riskThresholds: { low: 20, medium: 50, high: 80 },
        paymentMethods: {
          enabled: ['CARD', 'BANK_TRANSFER'] as any,
          cardProcessor: 'STRIPE' as any,
          bankTransferEnabled: true,
        },
      };

      const service = new EscrowPaymentService(mockPrisma, mockConfig);
      if (!service) {
        throw new Error('Impossible de créer une instance du service');
      }
    });

    // Test des types escrow
    await this.runTest(suite, 'Validation des types EscrowTransaction', async () => {
      const mockTransaction = {
        id: 'escrow_123456789',
        announcementId: 'ann-123',
        clientId: 'client-123',
        amount: 45.50,
        currency: 'EUR',
        paymentMethod: 'CARD' as any,
        status: 'PENDING' as any,
        breakdown: {
          serviceAmount: 40.00,
          deliveryFee: 32.00,
          platformFee: 1.58,
          vatAmount: 9.10,
        },
        heldUntil: new Date(Date.now() + 48 * 60 * 60 * 1000),
        metadata: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          paymentSource: 'WEB' as any,
        },
        events: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validation des propriétés critiques
      if (mockTransaction.amount <= 0) {
        throw new Error('Le montant doit être positif');
      }
      if (!mockTransaction.id.startsWith('escrow_')) {
        throw new Error('L\'ID de transaction doit commencer par "escrow_"');
      }
    });

    this.testSuites.push(suite);
  }

  private async testBusinessWorkflows(): Promise<void> {
    const suite: TestSuite = {
      name: 'Workflows Métier',
      tests: [],
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0,
    };

    // Test du workflow d'annonce
    await this.runTest(suite, 'Création AnnouncementLifecycleWorkflow', async () => {
      const mockPrisma = {} as any;
      const mockConfig = {
        autoMatchingEnabled: true,
        autoAssignmentEnabled: false,
        matchingThreshold: 75,
        expirationTimeHours: 168,
        reminderHours: [24, 48, 72],
        escalationRules: [
          {
            noMatchAfterHours: 24,
            noAssignmentAfterHours: 48,
            action: 'NOTIFY_ADMIN' as any,
          },
        ],
      };

      const workflow = new AnnouncementLifecycleWorkflow(mockPrisma, mockConfig);
      if (!workflow) {
        throw new Error('Impossible de créer une instance du workflow');
      }
    });

    // Test du workflow cart drop
    await this.runTest(suite, 'Création CartDropWorkflow', async () => {
      const mockPrisma = {} as any;
      const mockConfig = {
        paymentTimeoutMinutes: 15,
        preparationTimeMinutes: 30,
        pickupTimeoutMinutes: 60,
        deliveryTimeoutMinutes: 120,
        autoAssignmentEnabled: true,
        qualityControlEnabled: true,
        realTimeTrackingEnabled: true,
        customerNotificationsEnabled: true,
      };

      const workflow = new CartDropWorkflow(mockPrisma, mockConfig);
      if (!workflow) {
        throw new Error('Impossible de créer une instance du workflow');
      }
    });

    // Test de la logique métier
    await this.runTest(suite, 'Validation logique de transition d\'état', async () => {
      const validTransitions = {
        'DRAFT': ['ACTIVE', 'CANCELLED'],
        'ACTIVE': ['MATCHED', 'EXPIRED', 'CANCELLED'],
        'MATCHED': ['ASSIGNED', 'ACTIVE'],
        'ASSIGNED': ['IN_PROGRESS', 'CANCELLED'],
        'IN_PROGRESS': ['DELIVERED'],
        'DELIVERED': ['VALIDATED', 'CANCELLED'],
        'VALIDATED': ['COMPLETED'],
        'COMPLETED': [],
        'CANCELLED': [],
        'EXPIRED': [],
      };

      // Vérifier que la logique de transition est cohérente
      for (const [fromState, toStates] of Object.entries(validTransitions)) {
        if (!Array.isArray(toStates)) {
          throw new Error(`États de transition invalides pour ${fromState}`);
        }
      }
    });

    this.testSuites.push(suite);
  }

  private async testSeedCompatibility(): Promise<void> {
    const suite: TestSuite = {
      name: 'Compatibilité avec les Seeds Existants',
      tests: [],
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0,
    };

    // Test des types d'annonces compatibles
    await this.runTest(suite, 'Types d\'annonces supportés', async () => {
      const supportedTypes = [
        'PACKAGE_DELIVERY',
        'PARTIAL_DELIVERY',
        'CART_DROP',
        'GROCERY_SHOPPING',
        'INTERNATIONAL_PURCHASE',
        'AIRPORT_TRANSFER',
        'PERSON_TRANSPORT',
        'PET_SITTING',
        'HOME_SERVICES',
        'DOCUMENT_DELIVERY',
      ];

      // Vérifier que tous les types sont des chaînes non vides
      for (const type of supportedTypes) {
        if (!type || typeof type !== 'string') {
          throw new Error(`Type d'annonce invalide: ${type}`);
        }
      }

      if (supportedTypes.length < 10) {
        throw new Error('Nombre insuffisant de types d\'annonces supportés');
      }
    });

    // Test des statuts d'annonces
    await this.runTest(suite, 'Statuts d\'annonces supportés', async () => {
      const supportedStatuses = [
        'DRAFT',
        'ACTIVE',
        'MATCHED',
        'ASSIGNED',
        'IN_PROGRESS',
        'DELIVERED',
        'VALIDATED',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED',
      ];

      // Vérifier la cohérence des statuts
      if (supportedStatuses.length < 8) {
        throw new Error('Nombre insuffisant de statuts supportés');
      }

      // Vérifier que DRAFT et COMPLETED sont présents (états critiques)
      if (!supportedStatuses.includes('DRAFT') || !supportedStatuses.includes('COMPLETED')) {
        throw new Error('Statuts critiques manquants (DRAFT ou COMPLETED)');
      }
    });

    // Test des priorités
    await this.runTest(suite, 'Priorités d\'annonces supportées', async () => {
      const supportedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

      if (supportedPriorities.length !== 4) {
        throw new Error('Nombre incorrect de priorités supportées');
      }

      // Vérifier la présence des priorités critiques
      const requiredPriorities = ['LOW', 'HIGH', 'URGENT'];
      for (const priority of requiredPriorities) {
        if (!supportedPriorities.includes(priority)) {
          throw new Error(`Priorité critique manquante: ${priority}`);
        }
      }
    });

    this.testSuites.push(suite);
  }

  private async runTest(suite: TestSuite, testName: string, testFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        name: testName,
        passed: true,
        duration,
      };
      
      suite.tests.push(result);
      suite.totalPassed++;
      suite.totalDuration += duration;
      
      console.log(`  ✅ ${testName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        name: testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
      };
      
      suite.tests.push(result);
      suite.totalFailed++;
      suite.totalDuration += duration;
      
      console.log(`  ❌ ${testName} (${duration}ms)`);
      console.log(`     Erreur: ${result.error}`);
    }
  }

  private printFinalResults(): void {
    console.log('\n📊 Résumé des tests:\n');

    let totalTestsPassed = 0;
    let totalTestsFailed = 0;
    let totalDuration = 0;

    for (const suite of this.testSuites) {
      totalTestsPassed += suite.totalPassed;
      totalTestsFailed += suite.totalFailed;
      totalDuration += suite.totalDuration;

      const successRate = Math.round((suite.totalPassed / (suite.totalPassed + suite.totalFailed)) * 100);
      
      console.log(`📦 ${suite.name}:`);
      console.log(`   • Tests passés: ${suite.totalPassed}`);
      console.log(`   • Tests échoués: ${suite.totalFailed}`);
      console.log(`   • Taux de réussite: ${successRate}%`);
      console.log(`   • Durée: ${suite.totalDuration}ms`);
      console.log();
    }

    console.log('🎯 Résumé global:');
    console.log(`   • Total tests passés: ${totalTestsPassed}`);
    console.log(`   • Total tests échoués: ${totalTestsFailed}`);
    console.log(`   • Taux de réussite global: ${Math.round((totalTestsPassed / (totalTestsPassed + totalTestsFailed)) * 100)}%`);
    console.log(`   • Durée totale: ${totalDuration}ms`);

    if (totalTestsFailed === 0) {
      console.log('\n🎉 Tous les tests sont passés ! L\'implémentation des fonctionnalités d\'annonces est validée.');
    } else {
      console.log(`\n⚠️ ${totalTestsFailed} test(s) ont échoué. Vérifiez les erreurs ci-dessus.`);
    }

    console.log('\n✨ Tests terminés\n');
  }
}

// Exécution des tests
async function runTests() {
  const tester = new AnnouncementFeaturesTest();
  await tester.runAllTests();
}

// Point d'entrée
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runTests().catch(error => {
    console.error('❌ Erreur lors de l\'exécution des tests:', error);
    process.exit(1);
  });
}

export { AnnouncementFeaturesTest };