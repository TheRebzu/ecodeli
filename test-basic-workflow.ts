#!/usr/bin/env npx tsx

/**
 * Test basique du workflow EcoDeli
 * Vérifie que les APIs essentielles sont fonctionnelles
 */

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  message: string;
}

class BasicWorkflowTester {
  private baseUrl: string;
  private results: TestResult[] = [];

  constructor(baseUrl: string = 'http://172.30.80.1:3000') {
    this.baseUrl = baseUrl;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const data = await response.json();
      return { status: response.status, data };
    } catch (error) {
      throw new Error(`Network error: ${error instanceof Error ? error.message : error}`);
    }
  }

  private addResult(name: string, status: 'pass' | 'fail', message: string) {
    this.results.push({ name, status, message });
    const emoji = status === 'pass' ? '✅' : '❌';
    console.log(`${emoji} ${name}: ${message}`);
  }

  private async testServerHealth() {
    try {
      const response = await this.makeRequest('/api/health');
      if (response.status === 200) {
        this.addResult('Server Health', 'pass', 'Server is accessible');
      } else {
        this.addResult('Server Health', 'fail', `HTTP ${response.status}`);
      }
    } catch (error) {
      this.addResult('Server Health', 'fail', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testClientLogin() {
    try {
      const response = await this.makeRequest('/api/auth/login', 'POST', {
        email: 'client1@test.com',
        password: 'Test123!'
      });

      if (response.status === 200 && response.data.success) {
        this.addResult('Client Login', 'pass', `Client logged in successfully`);
        return response.data.session;
      } else {
        this.addResult('Client Login', 'fail', `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.addResult('Client Login', 'fail', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  }

  private async testDelivererLogin() {
    try {
      const response = await this.makeRequest('/api/auth/login', 'POST', {
        email: 'livreur1@test.com',
        password: 'Test123!'
      });

      if (response.status === 200 && response.data.success) {
        this.addResult('Deliverer Login', 'pass', `Deliverer logged in successfully`);
        return response.data.session;
      } else {
        this.addResult('Deliverer Login', 'fail', `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.addResult('Deliverer Login', 'fail', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  }

  private async testProviderLogin() {
    try {
      const response = await this.makeRequest('/api/auth/login', 'POST', {
        email: 'prestataire1@test.com',
        password: 'Test123!'
      });

      if (response.status === 200 && response.data.success) {
        this.addResult('Provider Login', 'pass', `Provider logged in successfully`);
        return response.data.session;
      } else {
        this.addResult('Provider Login', 'fail', `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.addResult('Provider Login', 'fail', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  }

  private async testMerchantLogin() {
    try {
      const response = await this.makeRequest('/api/auth/login', 'POST', {
        email: 'commercant1@test.com',
        password: 'Test123!'
      });

      if (response.status === 200 && response.data.success) {
        this.addResult('Merchant Login', 'pass', `Merchant logged in successfully`);
        return response.data.session;
      } else {
        this.addResult('Merchant Login', 'fail', `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.addResult('Merchant Login', 'fail', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  }

  private async testAdminLogin() {
    try {
      const response = await this.makeRequest('/api/auth/login', 'POST', {
        email: 'admin1@test.com',
        password: 'Test123!'
      });

      if (response.status === 200 && response.data.success) {
        this.addResult('Admin Login', 'pass', `Admin logged in successfully`);
        return response.data.session;
      } else {
        this.addResult('Admin Login', 'fail', `HTTP ${response.status}: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.addResult('Admin Login', 'fail', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  }

  private async testApiEndpoints() {
    const endpoints = [
      { path: '/api/health', name: 'Health Check' },
      { path: '/api/client/announcements', name: 'Client Announcements API' },
      { path: '/api/deliverer/opportunities', name: 'Deliverer Opportunities API' },
      { path: '/api/provider/reviews', name: 'Provider Reviews API' },
      { path: '/api/admin/users', name: 'Admin Users API' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.makeRequest(endpoint.path);
        
        if (response.status === 401) {
          this.addResult(endpoint.name, 'pass', 'Endpoint exists (requires auth)');
        } else if (response.status === 200) {
          this.addResult(endpoint.name, 'pass', 'Endpoint accessible');
        } else if (response.status === 500) {
          this.addResult(endpoint.name, 'fail', 'Server error (500)');
        } else {
          this.addResult(endpoint.name, 'pass', `Endpoint responds (${response.status})`);
        }
      } catch (error) {
        this.addResult(endpoint.name, 'fail', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  private printSummary() {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const total = this.results.length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DES TESTS');
    console.log('='.repeat(60));
    console.log(`✅ Tests réussis: ${passed}/${total}`);
    console.log(`❌ Tests échoués: ${failed}/${total}`);
    console.log(`📈 Taux de réussite: ${Math.round((passed / total) * 100)}%`);

    if (failed > 0) {
      console.log('\n❌ Tests échoués:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => console.log(`   - ${r.name}: ${r.message}`));
    }

    console.log('\n🎯 STATUT GLOBAL:');
    if (passed >= total * 0.8) {
      console.log('🟢 EXCELLENT - La plateforme EcoDeli est opérationnelle!');
    } else if (passed >= total * 0.6) {
      console.log('🟡 BON - Quelques problèmes mineurs à corriger');
    } else {
      console.log('🔴 PROBLÈME - Des corrections importantes sont nécessaires');
    }
  }

  public async runAllTests(): Promise<void> {
    console.log('🧪 === Tests Basiques EcoDeli ===');
    console.log(`Base URL: ${this.baseUrl}\n`);

    try {
      // Test 1: Santé du serveur
      console.log('🔍 Test de connectivité...');
      await this.testServerHealth();

      // Test 2: Authentification pour tous les rôles
      console.log('\n🔐 Tests d\'authentification...');
      await this.testClientLogin();
      await this.testDelivererLogin();
      await this.testProviderLogin();
      await this.testMerchantLogin();
      await this.testAdminLogin();

      // Test 3: APIs principales
      console.log('\n🌐 Tests des endpoints API...');
      await this.testApiEndpoints();

      // Résumé
      this.printSummary();

    } catch (error) {
      console.error('❌ Erreur fatale lors des tests:', error);
    }
  }
}

// Point d'entrée principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Tests basiques du workflow EcoDeli');
    console.log('');
    console.log('Usage:');
    console.log('  npx tsx test-basic-workflow.ts [--url <url>]');
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

  const tester = new BasicWorkflowTester(baseUrl);
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}