/**
 * Script de test complet pour l'API tRPC EcoDeli
 * Teste tous les endpoints critiques de Mission 1
 */

import fs from 'fs';

// Configuration
const BASE_URL = 'http://windows:3000';
const TEST_USER = {
  email: 'jean.dupont@orange.fr',
  password: 'password123'
};

// Headers pour simuler un navigateur
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Content-Type': 'application/json',
  'Referer': `${BASE_URL}/login`,
  'Origin': BASE_URL
};

class EcoDeliAPITester {
  constructor() {
    this.sessionCookies = '';
    this.csrfToken = '';
    this.results = [];
  }

  async log(test, status, message, data = null) {
    const result = {
      test,
      status,
      message,
      timestamp: new Date().toISOString(),
      data: data ? JSON.stringify(data, null, 2) : null
    };
    this.results.push(result);
    
    const statusEmoji = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '⚠️';
    console.log(`${statusEmoji} [${test}] ${message}`);
    if (data && status === 'ERROR') {
      console.log('   Details:', JSON.stringify(data, null, 2));
    }
  }

  async testEndpoint(name, method, path, data = null, authenticated = true) {
    try {
      const url = `${BASE_URL}/api/trpc/${path}`;
      const options = {
        method,
        headers: {
          ...BROWSER_HEADERS,
          ...(authenticated && this.sessionCookies ? { 'Cookie': this.sessionCookies } : {})
        }
      };

      if (data && method === 'POST') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const responseData = await response.json();

      if (response.ok && responseData.result) {
        await this.log(name, 'SUCCESS', `${method} ${path} - OK`, responseData.result.data);
        return responseData.result.data;
      } else if (responseData.error) {
        await this.log(name, 'ERROR', `${method} ${path} - ${responseData.error.json.message}`, responseData.error);
        return null;
      } else {
        await this.log(name, 'WARNING', `${method} ${path} - Réponse inattendue`, responseData);
        return responseData;
      }
    } catch (error) {
      await this.log(name, 'ERROR', `${method} ${path} - Exception: ${error.message}`, { error: error.toString() });
      return null;
    }
  }

  async testHealthCheck() {
    return await this.testEndpoint('Health Check', 'GET', 'health', null, false);
  }

  async getCSRFToken() {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/csrf`, {
        headers: BROWSER_HEADERS
      });
      
      if (response.headers.get('set-cookie')) {
        this.sessionCookies = response.headers.get('set-cookie');
      }
      
      const data = await response.json();
      this.csrfToken = data.csrfToken;
      
      await this.log('CSRF Token', 'SUCCESS', 'Token CSRF obtenu');
      return true;
    } catch (error) {
      await this.log('CSRF Token', 'ERROR', `Erreur: ${error.message}`);
      return false;
    }
  }

  async authenticate() {
    try {
      // D'abord obtenir le token CSRF
      await this.getCSRFToken();

      const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          ...BROWSER_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(this.sessionCookies ? { 'Cookie': this.sessionCookies } : {})
        },
        body: new URLSearchParams({
          email: TEST_USER.email,
          password: TEST_USER.password,
          csrfToken: this.csrfToken,
          callbackUrl: `${BASE_URL}/client`
        }),
        redirect: 'manual'
      });

      if (response.headers.get('set-cookie')) {
        this.sessionCookies = response.headers.get('set-cookie');
        await this.log('Authentication', 'SUCCESS', 'Authentification réussie');
        return true;
      } else {
        await this.log('Authentication', 'ERROR', 'Échec de l\'authentification - pas de cookies de session');
        return false;
      }
    } catch (error) {
      await this.log('Authentication', 'ERROR', `Erreur d'authentification: ${error.message}`);
      return false;
    }
  }

  async testClientEndpoints() {
    console.log('\n🔍 TEST DES ENDPOINTS CLIENT (Mission 1)');
    
    // Test du profil client
    await this.testEndpoint('Client Profile', 'GET', 'client.getProfile');
    
    // Test des statistiques dashboard
    await this.testEndpoint('Dashboard Stats', 'GET', 'client.getStats');
    
    // Test des annonces
    await this.testEndpoint('Client Announcements', 'GET', 'clientAnnouncements.getMyAnnouncements');
    
    // Test des services
    await this.testEndpoint('Client Services', 'GET', 'clientServices.searchServices');
    
    // Test du stockage
    await this.testEndpoint('Storage Search', 'GET', 'storage.searchBoxes');
    
    // Test des rendez-vous
    await this.testEndpoint('Appointments', 'GET', 'clientAppointments.getClientAppointments');
    
    // Test des paiements
    await this.testEndpoint('Payment History', 'GET', 'clientPayments.getPaymentHistory');
    
    // Test des contrats
    await this.testEndpoint('Client Contracts', 'GET', 'clientContracts.getClientContracts');
    
    // Test des avis
    await this.testEndpoint('Client Reviews', 'GET', 'clientReviews.getClientReviews');
  }

  async testMutations() {
    console.log('\n🔄 TEST DES MUTATIONS (Création de données)');
    
    // Test de création d'annonce (POST)
    const announcementData = {
      title: "Test de livraison API",
      description: "Test automatisé",
      pickupAddress: "123 Rue de Test, Paris",
      deliveryAddress: "456 Avenue Test, Paris", 
      packageType: "SMALL",
      pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      maxPrice: 15.50
    };
    
    const announcement = await this.testEndpoint(
      'Create Announcement', 
      'POST', 
      'clientAnnouncements.createAnnouncement',
      announcementData
    );
    
    if (announcement) {
      // Test de mise à jour de l'annonce
      const updateData = {
        id: announcement.id,
        title: "Test de livraison API - Modifié",
        description: "Test automatisé modifié"
      };
      
      await this.testEndpoint(
        'Update Announcement',
        'POST',
        'clientAnnouncements.updateAnnouncement', 
        updateData
      );
    }
  }

  async runFullTest() {
    console.log('🚀 DÉBUT DU TEST COMPLET API tRPC ECODELI');
    console.log('=' .repeat(60));
    
    // 1. Test de santé (sans auth)
    console.log('\n📡 TESTS PUBLICS');
    await this.testHealthCheck();
    
    // 2. Authentification
    console.log('\n🔐 AUTHENTIFICATION');
    const authSuccess = await this.authenticate();
    
    if (!authSuccess) {
      console.log('❌ Tests arrêtés - échec d\'authentification');
      return this.generateReport();
    }
    
    // 3. Tests des endpoints protégés
    await this.testClientEndpoints();
    
    // 4. Tests des mutations
    await this.testMutations();
    
    return this.generateReport();
  }

  generateReport() {
    const successes = this.results.filter(r => r.status === 'SUCCESS').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RAPPORT FINAL DES TESTS API');
    console.log('=' .repeat(60));
    console.log(`✅ Succès: ${successes}`);
    console.log(`❌ Erreurs: ${errors}`);
    console.log(`⚠️ Avertissements: ${warnings}`);
    console.log(`📈 Taux de réussite: ${Math.round((successes / this.results.length) * 100)}%`);
    
    if (errors > 0) {
      console.log('\n❌ ERREURS DÉTECTÉES:');
      this.results
        .filter(r => r.status === 'ERROR')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }
    
    console.log('\n💾 Résultats détaillés sauvegardés dans test-results.json');
    fs.writeFileSync('test-results.json', JSON.stringify(this.results, null, 2));
    
    return {
      total: this.results.length,
      successes,
      errors,
      warnings,
      successRate: Math.round((successes / this.results.length) * 100)
    };
  }
}

// Exécution du test
const tester = new EcoDeliAPITester();
tester.runFullTest()
  .then(report => {
    console.log('\n🎯 Test terminé!');
    process.exit(report.errors > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });

export default EcoDeliAPITester;