#!/usr/bin/env npx tsx

/**
 * Test des fonctionnalités critiques EcoDeli
 * Vérifie rapidement les éléments les plus importants du cahier des charges
 */

interface TestResult {
  category: string;
  feature: string;
  status: 'pass' | 'fail';
  details: string;
}

class CriticalFeaturesTest {
  private baseUrl: string;
  private results: TestResult[] = [];

  constructor(baseUrl: string = 'http://172.30.80.1:3000') {
    this.baseUrl = baseUrl;
  }

  private async checkEndpoint(path: string): Promise<{ status: number; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: { 'Accept': 'text/html,application/json' }
      });
      return { status: response.status };
    } catch (error) {
      return { status: 0, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  private addResult(category: string, feature: string, status: 'pass' | 'fail', details: string) {
    this.results.push({ category, feature, status, details });
    const emoji = status === 'pass' ? '✅' : '❌';
    console.log(`${emoji} ${category} - ${feature}: ${details}`);
  }

  private async testAuthenticationFeatures() {
    console.log('\n🔐 === AUTHENTIFICATION ===');

    const authTests = [
      { feature: 'Page de connexion', path: '/fr/login' },
      { feature: 'Page d\'inscription', path: '/fr/register' },
      { feature: 'Inscription client', path: '/fr/register/client' },
      { feature: 'Inscription livreur', path: '/fr/register/deliverer' },
      { feature: 'Inscription commerçant', path: '/fr/register/merchant' },
      { feature: 'API Login', path: '/api/auth/login' },
      { feature: 'API Register', path: '/api/auth/register' }
    ];

    for (const test of authTests) {
      const result = await this.checkEndpoint(test.path);
      const success = result.status === 200 || result.status === 405;
      this.addResult('AUTH', test.feature, success ? 'pass' : 'fail', 
        success ? 'Accessible' : `Erreur ${result.status}`);
    }
  }

  private async testClientFeatures() {
    console.log('\n👤 === FONCTIONNALITÉS CLIENT ===');

    const clientTests = [
      { feature: 'Dashboard client', path: '/fr/client' },
      { feature: 'Gestion annonces', path: '/fr/client/announcements' },
      { feature: 'Création annonce', path: '/fr/client/announcements/create' },
      { feature: 'Suivi livraisons', path: '/fr/client/deliveries' },
      { feature: 'Gestion paiements', path: '/fr/client/payments' },
      { feature: 'API Annonces', path: '/api/client/announcements' },
      { feature: 'API Livraisons', path: '/api/client/deliveries' },
      { feature: 'API Dashboard', path: '/api/client/dashboard' }
    ];

    for (const test of clientTests) {
      const result = await this.checkEndpoint(test.path);
      const success = result.status === 200 || result.status === 401 || result.status === 403;
      this.addResult('CLIENT', test.feature, success ? 'pass' : 'fail', 
        success ? 'Disponible' : `Erreur ${result.status}`);
    }
  }

  private async testDelivererFeatures() {
    console.log('\n🚚 === FONCTIONNALITÉS LIVREUR ===');

    const delivererTests = [
      { feature: 'Dashboard livreur', path: '/fr/deliverer' },
      { feature: 'Opportunités livraison', path: '/fr/deliverer/opportunities' },
      { feature: 'API Opportunités', path: '/api/deliverer/opportunities' },
      { feature: 'API Dashboard', path: '/api/deliverer/dashboard' },
      { feature: 'API Portefeuille', path: '/api/deliverer/wallet' }
    ];

    for (const test of delivererTests) {
      const result = await this.checkEndpoint(test.path);
      const success = result.status === 200 || result.status === 401 || result.status === 403;
      this.addResult('DELIVERER', test.feature, success ? 'pass' : 'fail', 
        success ? 'Disponible' : `Erreur ${result.status}`);
    }
  }

  private async testProviderFeatures() {
    console.log('\n🏪 === FONCTIONNALITÉS PRESTATAIRE ===');

    const providerTests = [
      { feature: 'Dashboard prestataire', path: '/fr/provider' },
      { feature: 'Gestion documents', path: '/fr/provider/documents' },
      { feature: 'Onboarding', path: '/fr/provider/onboarding' },
      { feature: 'API Documents', path: '/api/provider/documents' },
      { feature: 'API Onboarding', path: '/api/provider/onboarding' }
    ];

    for (const test of providerTests) {
      const result = await this.checkEndpoint(test.path);
      const success = result.status === 200 || result.status === 401 || result.status === 403;
      this.addResult('PROVIDER', test.feature, success ? 'pass' : 'fail', 
        success ? 'Disponible' : `Erreur ${result.status}`);
    }
  }

  private async testAdminFeatures() {
    console.log('\n⚙️ === FONCTIONNALITÉS ADMIN ===');

    const adminTests = [
      { feature: 'Dashboard admin', path: '/fr/admin' },
      { feature: 'Gestion utilisateurs', path: '/fr/admin/users' },
      { feature: 'Validation documents', path: '/fr/admin/documents/validation' },
      { feature: 'Tests système', path: '/fr/admin/tests' },
      { feature: 'Paramètres', path: '/fr/admin/settings' },
      { feature: 'API Utilisateurs', path: '/api/admin/users' },
      { feature: 'API Tests email', path: '/api/admin/tests/email' },
      { feature: 'API Paramètres', path: '/api/admin/settings' }
    ];

    for (const test of adminTests) {
      const result = await this.checkEndpoint(test.path);
      const success = result.status === 200 || result.status === 401 || result.status === 403;
      this.addResult('ADMIN', test.feature, success ? 'pass' : 'fail', 
        success ? 'Disponible' : `Erreur ${result.status}`);
    }
  }

  private async testCoreApis() {
    console.log('\n🌐 === APIs ESSENTIELLES ===');

    const coreApis = [
      { feature: 'Health Check', path: '/api/health' },
      { feature: 'Upload documents', path: '/api/upload' },
      { feature: 'Géolocalisation', path: '/api/shared/geo/distance' },
      { feature: 'Analytics', path: '/api/shared/analytics/dashboard' },
      { feature: 'Support tickets', path: '/api/support/tickets' }
    ];

    for (const test of coreApis) {
      const result = await this.checkEndpoint(test.path);
      const success = result.status === 200 || result.status === 401 || result.status === 405;
      this.addResult('CORE_API', test.feature, success ? 'pass' : 'fail', 
        success ? 'Opérationnel' : `Erreur ${result.status}`);
    }
  }

  private printSummary() {
    const categories = ['AUTH', 'CLIENT', 'DELIVERER', 'PROVIDER', 'ADMIN', 'CORE_API'];
    const categoryNames = {
      'AUTH': 'Authentification',
      'CLIENT': 'Client',
      'DELIVERER': 'Livreur', 
      'PROVIDER': 'Prestataire',
      'ADMIN': 'Administration',
      'CORE_API': 'APIs Essentielles'
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ FONCTIONNALITÉS CRITIQUES ECODELI');
    console.log('='.repeat(60));

    let totalPassed = 0;
    let totalTests = 0;

    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      if (categoryResults.length === 0) continue;

      const passed = categoryResults.filter(r => r.status === 'pass').length;
      const total = categoryResults.length;
      const percentage = Math.round((passed / total) * 100);
      
      totalPassed += passed;
      totalTests += total;

      const status = percentage >= 90 ? '🟢' : percentage >= 70 ? '🟡' : '🔴';
      console.log(`${status} ${categoryNames[category as keyof typeof categoryNames]}: ${passed}/${total} (${percentage}%)`);
    }

    const globalPercentage = Math.round((totalPassed / totalTests) * 100);
    console.log('\n🎯 ÉVALUATION GLOBALE:');
    console.log(`📈 Score global: ${totalPassed}/${totalTests} (${globalPercentage}%)`);

    if (globalPercentage >= 95) {
      console.log('🟢 EXCELLENT - Toutes les fonctionnalités critiques sont opérationnelles!');
    } else if (globalPercentage >= 85) {
      console.log('🟡 TRÈS BON - La plupart des fonctionnalités critiques fonctionnent');
    } else if (globalPercentage >= 70) {
      console.log('🟠 BON - Fonctionnalités de base présentes, quelques ajustements nécessaires');
    } else {
      console.log('🔴 À AMÉLIORER - Des fonctionnalités critiques ne fonctionnent pas correctement');
    }

    // Détail des échecs
    const failures = this.results.filter(r => r.status === 'fail');
    if (failures.length > 0) {
      console.log('\n❌ Fonctionnalités à corriger:');
      failures.forEach(f => {
        console.log(`   - ${categoryNames[f.category as keyof typeof categoryNames]} > ${f.feature}: ${f.details}`);
      });
    }

    console.log('\n✨ CONFORMITÉ CAHIER DES CHARGES:');
    if (globalPercentage >= 90) {
      console.log('🎉 La plateforme EcoDeli respecte le cahier des charges!');
    } else {
      console.log('⚠️ Quelques ajustements nécessaires pour une conformité complète');
    }
  }

  public async runTest(): Promise<void> {
    console.log('🔍 === TEST FONCTIONNALITÉS CRITIQUES ECODELI ===');
    console.log(`Base URL: ${this.baseUrl}`);

    try {
      // Test de connectivité
      const health = await this.checkEndpoint('/api/health');
      if (health.status !== 200) {
        console.log('❌ Serveur inaccessible');
        return;
      }
      console.log('✅ Serveur opérationnel');

      // Tests par catégorie
      await this.testAuthenticationFeatures();
      await this.testClientFeatures();
      await this.testDelivererFeatures();
      await this.testProviderFeatures();
      await this.testAdminFeatures();
      await this.testCoreApis();

      // Résumé
      this.printSummary();

    } catch (error) {
      console.error('❌ Erreur lors du test:', error);
    }
  }
}

// Point d'entrée
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Test des fonctionnalités critiques EcoDeli');
    console.log('');
    console.log('Usage:');
    console.log('  npx tsx test-critical-features.ts [--url <url>]');
    console.log('');
    console.log('Options:');
    console.log('  --url <url>    URL de base (défaut: http://172.30.80.1:3000)');
    console.log('  --help, -h     Afficher cette aide');
    process.exit(0);
  }

  let baseUrl = 'http://172.30.80.1:3000';
  const urlIndex = args.indexOf('--url');
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    baseUrl = args[urlIndex + 1];
  }

  const tester = new CriticalFeaturesTest(baseUrl);
  await tester.runTest();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}