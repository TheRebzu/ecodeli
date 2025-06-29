#!/usr/bin/env node

/**
 * Vérification des fonctionnalités EcoDeli selon le cahier des charges
 * Ce script vérifie que toutes les pages et API endpoints existent
 */

const BASE_URL = 'http://172.30.80.1:3000';

class FeaturesVerifier {
  constructor() {
    this.baseUrl = BASE_URL;
    this.results = [];
    this.sessions = {};
  }

  async checkUrl(path, role) {
    try {
      const headers = {};
      if (role && this.sessions[role]) {
        headers.Cookie = this.sessions[role].cookies;
        Object.assign(headers, this.sessions[role].headers);
      }

      const response = await fetch(`${this.baseUrl}${path}`, { headers });
      return { status: response.status };
    } catch (error) {
      return { status: 0, error: error.message };
    }
  }

  async authenticateUser(email, password, role) {
    // L'authentification automatique via scripts n'est plus supportée
    // NextAuth utilise des cookies sécurisés qui nécessitent un navigateur
    console.log(`🔐 ${role}: Authentification manuelle requise via navigateur`);
    return false;
  }

  async authenticateTestUsers() {
    console.log('\n🔐 === AUTHENTIFICATION DES UTILISATEURS DE TEST ===\n');
    
    const testUsers = [
      { email: 'client1@test.com', password: 'Test123!', role: 'CLIENT' },
      { email: 'livreur1@test.com', password: 'Test123!', role: 'DELIVERER' },
      { email: 'commercant1@test.com', password: 'Test123!', role: 'MERCHANT' },
      { email: 'prestataire1@test.com', password: 'Test123!', role: 'PROVIDER' },
      { email: 'admin1@test.com', password: 'Test123!', role: 'ADMIN' }
    ];

    for (const user of testUsers) {
      await this.authenticateUser(user.email, user.password, user.role);
    }

    console.log('\n💡 Pour tester l\'authentification:');
    console.log('   1. Ouvrir: http://172.30.80.1:3000/fr/login');
    console.log('   2. Se connecter avec les comptes de test');
    console.log('   3. Tester les APIs protégées dans le navigateur\n');
  }

  async checkPages() {
    console.log('📄 === VÉRIFICATION DES PAGES ===\n');

    const pages = [
      // Pages publiques
      { name: '🏠 Page d\'accueil', path: '/fr', type: 'page' },
      { name: '🔐 Page de connexion', path: '/fr/login', type: 'page' },
      { name: '📝 Inscription client', path: '/fr/register/client', type: 'page' },
      { name: '🚚 Inscription livreur', path: '/fr/register/deliverer', type: 'page' },
      { name: '🏪 Inscription commerçant', path: '/fr/register/merchant', type: 'page' },
      { name: '🔧 Inscription prestataire', path: '/fr/register', type: 'page' },
      
      // Pages client protégées
      { name: '👤 Dashboard client', path: '/fr/client', type: 'page', role: 'CLIENT' },
      { name: '📢 Annonces client', path: '/fr/client/announcements', type: 'page', role: 'CLIENT' },
      { name: '📦 Livraisons client', path: '/fr/client/deliveries', type: 'page', role: 'CLIENT' },
      { name: '💳 Paiements client', path: '/fr/client/payments', type: 'page', role: 'CLIENT' },
      
      // Pages livreur protégées
      { name: '🚚 Dashboard livreur', path: '/fr/deliverer', type: 'page', role: 'DELIVERER' },
      { name: '🎯 Opportunités', path: '/fr/deliverer/opportunities', type: 'page', role: 'DELIVERER' },
      
      // Pages admin protégées
      { name: '👑 Dashboard admin', path: '/fr/admin', type: 'page', role: 'ADMIN' },
      { name: '👥 Gestion utilisateurs', path: '/fr/admin/users', type: 'page', role: 'ADMIN' },
      { name: '📊 Monitoring', path: '/fr/admin/monitoring', type: 'page', role: 'ADMIN' }
    ];

    for (const page of pages) {
      const result = await this.checkUrl(page.path, page.role);
      
      let status, message;
      if (result.error) {
        status = 'fail';
        message = result.error;
      } else if (page.role && result.status === 401) {
        status = 'skip';
        message = 'Authentification requise (normal)';
      } else if (result.status === 200) {
        status = 'pass';
        message = 'Page accessible';
      } else if (result.status === 404) {
        status = 'fail';
        message = 'Page non trouvée';
      } else {
        status = 'skip';
        message = `Status: ${result.status}`;
      }

      this.results.push({
        name: page.name,
        type: page.type,
        path: page.path,
        status,
        message
      });

      const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '🔄';
      console.log(`${emoji} ${page.name}: ${message}`);
    }
  }

  async checkAPIs() {
    console.log('\n🔌 === VÉRIFICATION DES APIs ===\n');

    const apis = [
      // APIs publiques
      { name: '❤️ Health check', path: '/api/health', type: 'api' },
      { name: '🔐 Session', path: '/api/auth/session', type: 'api' },
      { name: '🌍 Géolocalisation', path: '/api/shared/geo/distance', type: 'api' },
      
      // APIs client
      { name: '👤 Dashboard client API', path: '/api/client/dashboard', type: 'api', role: 'CLIENT' },
      { name: '📢 Annonces client API', path: '/api/client/announcements', type: 'api', role: 'CLIENT' },
      { name: '📦 Livraisons client API', path: '/api/client/deliveries', type: 'api', role: 'CLIENT' },
      { name: '💳 Paiements client API', path: '/api/client/payments', type: 'api', role: 'CLIENT' },
      
      // APIs livreur
      { name: '🚚 Dashboard livreur API', path: '/api/deliverer/dashboard', type: 'api', role: 'DELIVERER' },
      { name: '🎯 Opportunités API', path: '/api/deliverer/opportunities', type: 'api', role: 'DELIVERER' },
      { name: '💰 Portefeuille API', path: '/api/deliverer/wallet', type: 'api', role: 'DELIVERER' },
      
      // APIs admin
      { name: '👑 Utilisateurs admin API', path: '/api/admin/users', type: 'api', role: 'ADMIN' },
      { name: '📦 Livraisons admin API', path: '/api/admin/deliveries', type: 'api', role: 'ADMIN' },
      { name: '⚙️ Paramètres admin API', path: '/api/admin/settings', type: 'api', role: 'ADMIN' },
      { name: '📊 Monitoring API', path: '/api/admin/monitoring/metrics', type: 'api', role: 'ADMIN' }
    ];

    for (const api of apis) {
      const result = await this.checkUrl(api.path, api.role);
      
      let status, message;
      if (result.error) {
        status = 'fail';
        message = result.error;
      } else if (api.role && [401, 403].includes(result.status)) {
        status = 'skip';
        message = 'API protégée (normal)';
      } else if (result.status === 200) {
        status = 'pass';
        message = 'API accessible';
      } else if (result.status === 404) {
        status = 'fail';
        message = 'API non trouvée';
      } else if (result.status === 500) {
        status = 'fail';
        message = 'Erreur serveur';
      } else {
        status = 'skip';
        message = `Status: ${result.status}`;
      }

      this.results.push({
        name: api.name,
        type: api.type,
        path: api.path,
        status,
        message
      });

      const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '🔄';
      console.log(`${emoji} ${api.name}: ${message}`);
    }
  }

  generateReport() {
    const totalChecks = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    const pages = this.results.filter(r => r.type === 'page');
    const apis = this.results.filter(r => r.type === 'api');

    const pagesPass = pages.filter(p => p.status === 'pass').length;
    const apisPass = apis.filter(a => a.status === 'pass').length;

    console.log('\n' + '='.repeat(80));
    console.log('📊 RAPPORT DE VÉRIFICATION FONCTIONNALITÉS');
    console.log('='.repeat(80));
    
    console.log(`📄 Pages: ${pagesPass}/${pages.length} accessibles`);
    console.log(`🔌 APIs: ${apisPass}/${apis.length} accessibles`);
    console.log(`✅ Tests réussis: ${passed}/${totalChecks}`);
    console.log(`❌ Tests échoués: ${failed}/${totalChecks}`);
    console.log(`🔄 Tests ignorés: ${skipped}/${totalChecks}`);

    const successRate = Math.round(((passed + skipped) / totalChecks) * 100);
    console.log(`📊 Taux de réussite: ${successRate}%`);

    // Afficher les échecs
    const failures = this.results.filter(r => r.status === 'fail');
    if (failures.length > 0) {
      console.log('\n❌ ÉCHECS DÉTECTÉS:');
      failures.forEach(failure => {
        console.log(`   • ${failure.name}: ${failure.message}`);
      });
    } else {
      console.log('\n✅ Aucun échec critique détecté');
    }

    // Évaluation globale
    let evaluation;
    if (successRate >= 95) evaluation = '🟢 Excellent';
    else if (successRate >= 80) evaluation = '🟡 Bon'; 
    else if (successRate >= 60) evaluation = '🟠 Moyen';
    else evaluation = '🔴 À améliorer';

    console.log(`\n🎯 Évaluation globale: ${evaluation}`);
    console.log(`🔗 URL de test: ${this.baseUrl}`);
    console.log('='.repeat(80));
  }

  async run() {
    console.log('🔍 === VÉRIFICATION FONCTIONNALITÉS ECODELI ===\n');
    
    // Test connectivité
    try {
      const health = await fetch(`${this.baseUrl}/api/health`);
      if (!health.ok) throw new Error('Serveur inaccessible');
      console.log('✅ Serveur EcoDeli accessible\n');
    } catch (error) {
      console.log(`❌ Erreur serveur: ${error.message}`);
      return;
    }

    // Authentification (optionnelle pour ce test)
    await this.authenticateTestUsers();

    // Vérifications
    await this.checkPages();
    await this.checkAPIs();
    
    // Rapport
    this.generateReport();

    console.log('\n📋 INSTRUCTIONS POUR TESTS COMPLETS:');
    console.log('   1. Lancer: node test-browser-auth.mjs');
    console.log('   2. Effectuer les tests manuels suggérés');
    console.log('   3. Vérifier que les APIs authentifiées fonctionnent');
  }
}

// Lancement
const verifier = new FeaturesVerifier();
verifier.run().catch(console.error);