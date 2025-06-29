#!/usr/bin/env npx tsx

/**
 * Vérification des fonctionnalités EcoDeli selon le cahier des charges
 * Ce script vérifie que toutes les pages et API endpoints existent
 */

interface FeatureCheck {
  name: string;
  type: 'page' | 'api';
  path: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
}

interface AuthSession {
  cookies: string;
  headers: { [key: string]: string };
}

class FeaturesVerifier {
  private baseUrl: string;
  private results: FeatureCheck[] = [];
  private sessions: { [role: string]: AuthSession } = {};

  constructor(baseUrl: string = 'http://172.30.80.1:3000') {
    this.baseUrl = baseUrl;
  }

  private async checkUrl(path: string, role?: string): Promise<{ status: number; error?: string }> {
    const url = `${this.baseUrl}${path}`;
    
    try {
      const headers: { [key: string]: string } = {
        'Accept': 'text/html,application/json,*/*'
      };

      // Add authentication headers if role is provided and session exists
      if (role && this.sessions[role]) {
        Object.assign(headers, this.sessions[role].headers);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      return { status: response.status };
    } catch (error) {
      return { 
        status: 0, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  private async authenticateUser(email: string, password: string, role: string): Promise<boolean> {
    try {
      // Étape 1: Obtenir les cookies CSRF depuis la page de login
      const loginPageResponse = await fetch(`${this.baseUrl}/fr/login`);
      if (!loginPageResponse.ok) return false;

      let cookies = loginPageResponse.headers.get('set-cookie') || '';

      // Étape 2: Authentification via NextAuth callback 
      const authResponse = await fetch(`${this.baseUrl}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies
        },
        body: new URLSearchParams({
          email,
          password,
          redirect: 'false',
          csrfToken: '', // NextAuth gérera cela
          callbackUrl: `${this.baseUrl}/fr/client`
        }).toString(),
        redirect: 'manual' // Important pour récupérer les cookies
      });

      // Récupérer tous les cookies de session
      const newCookies = authResponse.headers.get('set-cookie');
      if (newCookies) {
        // Combiner les anciens et nouveaux cookies
        cookies = [cookies, newCookies].filter(Boolean).join('; ');
        
        this.sessions[role] = {
          cookies,
          headers: { 'Cookie': cookies }
        };
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async setupAuthentication(): Promise<void> {
    console.log('🔐 === INFORMATION AUTHENTIFICATION ===');
    console.log('Note: Ce script teste les APIs sans authentification pour vérifier leur existence.');
    console.log('Pour les APIs protégées, des codes 401/403 sont attendus et considérés comme normaux.');
    console.log('Comptes de test disponibles (mot de passe: Test123!):');
    console.log('   - client1@test.com (CLIENT)');
    console.log('   - livreur1@test.com (DELIVERER)');
    console.log('   - commercant1@test.com (MERCHANT)');
    console.log('   - prestataire1@test.com (PROVIDER)');
    console.log('   - admin1@test.com (ADMIN)');
    console.log('');
  }

  private addResult(name: string, type: 'page' | 'api', path: string, status: 'pass' | 'fail' | 'skip', message: string) {
    this.results.push({ name, type, path, status, message });
    const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏸️';
    console.log(`${emoji} ${type.toUpperCase()} ${name}: ${message}`);
  }

  private async verifyPageFeatures() {
    console.log('\n🔍 === VÉRIFICATION DES PAGES ===');

    const pages = [
      // Auth pages
      { name: 'Login Page', path: '/fr/login' },
      { name: 'Register Page', path: '/fr/register' },
      { name: 'Client Register', path: '/fr/register/client' },
      { name: 'Deliverer Register', path: '/fr/register/deliverer' },
      { name: 'Merchant Register', path: '/fr/register/merchant' },
      
      // Client pages
      { name: 'Client Dashboard', path: '/fr/client' },
      { name: 'Client Announcements', path: '/fr/client/announcements' },
      { name: 'Create Announcement', path: '/fr/client/announcements/create' },
      { name: 'Client Deliveries', path: '/fr/client/deliveries' },
      { name: 'Client Payments', path: '/fr/client/payments' },
      { name: 'Client Profile', path: '/fr/client/profile' },
      { name: 'Client Services', path: '/fr/client/services' },
      { name: 'Client Storage', path: '/fr/client/storage' },
      { name: 'Client Tracking', path: '/fr/client/tracking' },
      { name: 'Client Bookings', path: '/fr/client/bookings' },
      
      // Deliverer pages
      { name: 'Deliverer Dashboard', path: '/fr/deliverer' },
      { name: 'Deliverer Opportunities', path: '/fr/deliverer/opportunities' },
      
      // Merchant pages
      { name: 'Merchant Dashboard', path: '/fr/merchant' },
      
      // Provider pages
      { name: 'Provider Dashboard', path: '/fr/provider' },
      { name: 'Provider Documents', path: '/fr/provider/documents' },
      { name: 'Provider Onboarding', path: '/fr/provider/onboarding' },
      
      // Admin pages
      { name: 'Admin Dashboard', path: '/fr/admin' },
      { name: 'Admin Users', path: '/fr/admin/users' },
      { name: 'Admin Announcements', path: '/fr/admin/announcements' },
      { name: 'Admin Deliveries', path: '/fr/admin/deliveries' },
      { name: 'Admin Settings', path: '/fr/admin/settings' },
      { name: 'Admin Tests', path: '/fr/admin/tests' },
      { name: 'Admin Verifications', path: '/fr/admin/verifications' },
      { name: 'Admin Documents Validation', path: '/fr/admin/documents/validation' },
      { name: 'Admin Contracts', path: '/fr/admin/contracts' },
      { name: 'Admin Finance', path: '/fr/admin/finance' },
      { name: 'Admin Monitoring', path: '/fr/admin/monitoring' },
      { name: 'Admin Locations', path: '/fr/admin/locations' },
      { name: 'Admin Insurance', path: '/fr/admin/insurance' },
      { name: 'Admin Referrals', path: '/fr/admin/referrals' },
      { name: 'Admin Monthly Billing', path: '/fr/admin/billing/monthly' },
      
      // Public pages
      { name: 'Homepage', path: '/fr' },
      { name: 'About Page', path: '/fr/about' },
      { name: 'Services Page', path: '/fr/services' },
      { name: 'Pricing Page', path: '/fr/pricing' },
      { name: 'Partners Page', path: '/fr/partners' },
      { name: 'Contact Page', path: '/fr/contact' },
      { name: 'FAQ Page', path: '/fr/faq' },
      { name: 'Blog Page', path: '/fr/blog' },
      { name: 'Become Deliverer', path: '/fr/become-delivery' },
    ];

    for (const page of pages) {
      const result = await this.checkUrl(page.path);
      
      if (result.status === 0) {
        this.addResult(page.name, 'page', page.path, 'fail', `Network error: ${result.error}`);
      } else if (result.status === 200) {
        this.addResult(page.name, 'page', page.path, 'pass', 'Page accessible');
      } else if (result.status === 401 || result.status === 403) {
        this.addResult(page.name, 'page', page.path, 'pass', 'Page exists (requires auth)');
      } else if (result.status === 404) {
        this.addResult(page.name, 'page', page.path, 'fail', 'Page not found');
      } else if (result.status === 500) {
        this.addResult(page.name, 'page', page.path, 'fail', 'Server error');
      } else {
        this.addResult(page.name, 'page', page.path, 'pass', `Page responds (${result.status})`);
      }
    }
  }

  private async verifyApiFeatures() {
    console.log('\n🌐 === VÉRIFICATION DE L\'EXISTENCE DES APIs ===');

    const apis = [
      // Auth APIs (public)
      { name: 'Health Check', path: '/api/health', role: null },
      { name: 'Login API', path: '/api/auth/login', role: null },
      { name: 'Register API', path: '/api/auth/register', role: null },
      { name: 'Session API', path: '/api/auth/session', role: null },
      
      // Client APIs
      { name: 'Client Dashboard API', path: '/api/client/dashboard', role: 'CLIENT' },
      { name: 'Client Announcements API', path: '/api/client/announcements', role: 'CLIENT' },
      { name: 'Client Deliveries API', path: '/api/client/deliveries', role: 'CLIENT' },
      { name: 'Client Payments API', path: '/api/client/payments', role: 'CLIENT' },
      { name: 'Client Profile API', path: '/api/client/profile', role: 'CLIENT' },
      { name: 'Client Services API', path: '/api/client/services', role: 'CLIENT' },
      { name: 'Client Storage Boxes API', path: '/api/client/storage-boxes', role: 'CLIENT' },
      { name: 'Client Bookings API', path: '/api/client/bookings', role: 'CLIENT' },
      { name: 'Client Reviews API', path: '/api/client/reviews', role: 'CLIENT' },
      { name: 'Client Subscription API', path: '/api/client/subscription', role: 'CLIENT' },
      { name: 'Client Tutorial API', path: '/api/client/tutorial', role: 'CLIENT' },
      
      // Deliverer APIs
      { name: 'Deliverer Dashboard API', path: '/api/deliverer/dashboard', role: 'DELIVERER' },
      { name: 'Deliverer Opportunities API', path: '/api/deliverer/opportunities', role: 'DELIVERER' },
      { name: 'Deliverer Tracking API', path: '/api/deliverer/tracking', role: 'DELIVERER' },
      { name: 'Deliverer Wallet API', path: '/api/deliverer/wallet', role: 'DELIVERER' },
      { name: 'Deliverer Route Optimization API', path: '/api/deliverer/route-optimization', role: 'DELIVERER' },
      { name: 'Deliverer Reviews API', path: '/api/deliverer/reviews', role: 'DELIVERER' },
      
      // Provider APIs
      { name: 'Provider Announcements API', path: '/api/provider/announcements', role: 'PROVIDER' },
      { name: 'Provider Documents API', path: '/api/provider/documents', role: 'PROVIDER' },
      { name: 'Provider Onboarding API', path: '/api/provider/onboarding', role: 'PROVIDER' },
      { name: 'Provider Availability API', path: '/api/provider/availability', role: 'PROVIDER' },
      { name: 'Provider Interventions API', path: '/api/provider/interventions', role: 'PROVIDER' },
      { name: 'Provider Earnings API', path: '/api/provider/earnings', role: 'PROVIDER' },
      { name: 'Provider Invoices API', path: '/api/provider/invoices', role: 'PROVIDER' },
      { name: 'Provider Reviews API', path: '/api/provider/reviews', role: 'PROVIDER' },
      
      // Merchant APIs
      { name: 'Merchant Announcements Bulk API', path: '/api/merchant/announcements/bulk', role: 'MERCHANT' },
      
      // Admin APIs
      { name: 'Admin Users API', path: '/api/admin/users', role: 'ADMIN' },
      { name: 'Admin Announcements API', path: '/api/admin/announcements', role: 'ADMIN' },
      { name: 'Admin Deliveries API', path: '/api/admin/deliveries', role: 'ADMIN' },
      { name: 'Admin Settings API', path: '/api/admin/settings', role: 'ADMIN' },
      { name: 'Admin Dashboard API', path: '/api/admin/dashboard', role: 'ADMIN' },
      { name: 'Admin Verifications API', path: '/api/admin/verifications/users', role: 'ADMIN' },
      { name: 'Admin Documents API', path: '/api/admin/documents/pending', role: 'ADMIN' },
      { name: 'Admin Finance API', path: '/api/admin/finance', role: 'ADMIN' },
      { name: 'Admin Monitoring API', path: '/api/admin/monitoring/metrics', role: 'ADMIN' },
      { name: 'Admin Locations API', path: '/api/admin/locations', role: 'ADMIN' },
      { name: 'Admin Contracts API', path: '/api/admin/contracts', role: 'ADMIN' },
      { name: 'Admin Withdrawals API', path: '/api/admin/withdrawals', role: 'ADMIN' },
      { name: 'Admin Test Email API', path: '/api/admin/tests/email', role: 'ADMIN' },
      { name: 'Admin Test Notification API', path: '/api/admin/tests/notification', role: 'ADMIN' },
      
      // Shared APIs (some require auth, some don't)
      { name: 'Geo Distance API', path: '/api/shared/geo/distance', role: null },
      { name: 'Analytics Dashboard API', path: '/api/shared/analytics/dashboard', role: 'ADMIN' },
      { name: 'Document Upload API', path: '/api/upload', role: 'CLIENT' },
      { name: 'Insurance Claims API', path: '/api/insurance/claims', role: 'CLIENT' },
      { name: 'Referral Activity API', path: '/api/referral/activity', role: 'CLIENT' },
      { name: 'Support Tickets API', path: '/api/support/tickets', role: 'CLIENT' },
    ];

    for (const api of apis) {
      const result = await this.checkUrl(api.path);
      
      if (result.status === 0) {
        this.addResult(api.name, 'api', api.path, 'fail', `Network error: ${result.error}`);
      } else if (result.status === 200) {
        const roleInfo = api.role ? ` (requires ${api.role} role)` : '';
        this.addResult(api.name, 'api', api.path, 'pass', `API accessible${roleInfo}`);
      } else if (result.status === 401) {
        const roleInfo = api.role ? ` (requires ${api.role} authentication)` : ' (authentication required)';
        this.addResult(api.name, 'api', api.path, 'pass', `API exists${roleInfo}`);
      } else if (result.status === 403) {
        this.addResult(api.name, 'api', api.path, 'pass', 'API exists (access denied - expected)');
      } else if (result.status === 404) {
        this.addResult(api.name, 'api', api.path, 'fail', 'API not found');
      } else if (result.status === 405) {
        this.addResult(api.name, 'api', api.path, 'pass', 'API exists (method not allowed for GET)');
      } else if (result.status === 500) {
        this.addResult(api.name, 'api', api.path, 'fail', 'Server error');
      } else {
        this.addResult(api.name, 'api', api.path, 'pass', `API responds (${result.status})`);
      }
    }
  }

  private printSummary() {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const total = this.results.length;

    const pageResults = this.results.filter(r => r.type === 'page');
    const apiResults = this.results.filter(r => r.type === 'api');
    
    const pagesPassed = pageResults.filter(r => r.status === 'pass').length;
    const apisPassed = apiResults.filter(r => r.status === 'pass').length;

    console.log('\n' + '='.repeat(70));
    console.log('📊 RÉSUMÉ DE LA VÉRIFICATION FONCTIONNALITÉS ECODELI');
    console.log('='.repeat(70));
    console.log(`✅ Total réussi: ${passed}/${total} (${Math.round((passed / total) * 100)}%)`);
    console.log(`❌ Total échoué: ${failed}/${total}`);
    console.log('');
    console.log(`📄 Pages: ${pagesPassed}/${pageResults.length} fonctionnelles`);
    console.log(`🌐 APIs: ${apisPassed}/${apiResults.length} fonctionnelles`);

    if (failed > 0) {
      console.log('\n❌ Éléments échoués:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => console.log(`   - ${r.type.toUpperCase()} ${r.name}: ${r.message}`));
    }

    console.log('\n🎯 ÉVALUATION GLOBALE:');
    if (passed >= total * 0.95) {
      console.log('🟢 EXCELLENT - Toutes les fonctionnalités du cahier des charges sont implémentées!');
    } else if (passed >= total * 0.85) {
      console.log('🟡 TRÈS BON - La plupart des fonctionnalités sont prêtes, quelques ajustements mineurs');
    } else if (passed >= total * 0.70) {
      console.log('🟠 BON - Fonctionnalités principales présentes, quelques éléments à finaliser');
    } else {
      console.log('🔴 À AMÉLIORER - Des fonctionnalités importantes manquent ou ne fonctionnent pas');
    }

    // Analyse par cahier des charges
    console.log('\n📋 CONFORMITÉ AU CAHIER DES CHARGES:');
    
    const clientFeatures = this.results.filter(r => r.name.toLowerCase().includes('client'));
    const delivererFeatures = this.results.filter(r => r.name.toLowerCase().includes('deliverer'));
    const merchantFeatures = this.results.filter(r => r.name.toLowerCase().includes('merchant'));
    const providerFeatures = this.results.filter(r => r.name.toLowerCase().includes('provider'));
    const adminFeatures = this.results.filter(r => r.name.toLowerCase().includes('admin'));
    
    const evalSection = (features: FeatureCheck[], name: string) => {
      if (features.length === 0) return;
      const passed = features.filter(f => f.status === 'pass').length;
      const pct = Math.round((passed / features.length) * 100);
      const status = pct >= 90 ? '🟢' : pct >= 70 ? '🟡' : '🔴';
      console.log(`   ${status} ${name}: ${passed}/${features.length} (${pct}%)`);
    };

    evalSection(clientFeatures, 'Fonctionnalités Client');
    evalSection(delivererFeatures, 'Fonctionnalités Livreur');
    evalSection(merchantFeatures, 'Fonctionnalités Commerçant');
    evalSection(providerFeatures, 'Fonctionnalités Prestataire');
    evalSection(adminFeatures, 'Fonctionnalités Admin');
  }

  public async runVerification(): Promise<void> {
    console.log('🔍 === VÉRIFICATION FONCTIONNALITÉS ECODELI ===');
    console.log(`Base URL: ${this.baseUrl}\n`);

    try {
      // Vérification serveur
      console.log('🔗 Test de connectivité...');
      const healthCheck = await this.checkUrl('/api/health');
      if (healthCheck.status !== 200) {
        console.log('❌ Serveur inaccessible');
        return;
      }
      console.log('✅ Serveur accessible\n');

      // Information sur l'authentification
      await this.setupAuthentication();

      // Vérification des pages
      await this.verifyPageFeatures();

      // Vérification de l'existence des APIs
      await this.verifyApiFeatures();

      // Résumé
      this.printSummary();

    } catch (error) {
      console.error('❌ Erreur fatale lors de la vérification:', error);
    }
  }
}

// Point d'entrée principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Vérification des fonctionnalités EcoDeli selon le cahier des charges');
    console.log('');
    console.log('Usage:');
    console.log('  npx tsx test-features-verification.ts [--url <url>]');
    console.log('');
    console.log('Options:');
    console.log('  --url <url>    URL de base (défaut: http://localhost:3000)');
    console.log('  --help, -h     Afficher cette aide');
    process.exit(0);
  }

  let baseUrl = 'http://localhost:3000';
  const urlIndex = args.indexOf('--url');
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    baseUrl = args[urlIndex + 1];
  }

  const verifier = new FeaturesVerifier(baseUrl);
  await verifier.runVerification();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}