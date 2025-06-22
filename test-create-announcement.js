/**
 * Test de création d'annonce pour débugger le problème d'affichage
 */

import fs from 'fs';

const BASE_URL = 'http://windows:3000';
const TEST_USER = {
  email: 'jean.dupont@orange.fr',
  password: 'password123'
};

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

class AnnouncementTester {
  constructor() {
    this.sessionCookies = '';
    this.csrfToken = '';
  }

  async log(message, data = null) {
    console.log(`[${new Date().toISOString()}] ${message}`);
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
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
      
      await this.log('✅ Token CSRF obtenu');
      return true;
    } catch (error) {
      await this.log(`❌ Erreur CSRF: ${error.message}`);
      return false;
    }
  }

  async authenticate() {
    try {
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
        await this.log('✅ Authentification réussie');
        return true;
      } else {
        await this.log('❌ Échec authentification');
        return false;
      }
    } catch (error) {
      await this.log(`❌ Erreur auth: ${error.message}`);
      return false;
    }
  }

  async testAPI(endpoint, data = null) {
    try {
      const url = `${BASE_URL}/api/trpc/${endpoint}`;
      
      const options = {
        method: data ? 'POST' : 'GET',
        headers: {
          ...BROWSER_HEADERS,
          ...(this.sessionCookies ? { 'Cookie': this.sessionCookies } : {})
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const responseData = await response.json();

      await this.log(`📡 ${endpoint} - Status: ${response.status}`, {
        status: response.status,
        hasResult: !!responseData.result,
        hasError: !!responseData.error,
        dataKeys: responseData.result ? Object.keys(responseData.result.data || {}) : null
      });

      return responseData;
    } catch (error) {
      await this.log(`❌ Erreur API ${endpoint}: ${error.message}`);
      return null;
    }
  }

  async createTestAnnouncement() {
    const testData = {
      title: "Test Livraison API",
      description: "Test automatisé pour vérifier l'affichage des annonces",
      deliveryType: "EXPRESS",
      pickupAddress: "123 Rue de Test, Paris",
      pickupCity: "Paris",
      pickupPostalCode: "75001", 
      deliveryAddress: "456 Avenue Test, Paris",
      deliveryCity: "Paris",
      deliveryPostalCode: "75002",
      pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      packageType: "SMALL_PACKAGE",
      estimatedWeight: 1.5,
      suggestedPrice: 20.0
    };

    await this.log('🔨 Création d\'annonce de test', testData);
    return await this.testAPI('clientAnnouncements.createAnnouncement', testData);
  }

  async getMyAnnouncements() {
    await this.log('📋 Récupération de mes annonces');
    return await this.testAPI('clientAnnouncements.getMyAnnouncements');
  }

  async runTest() {
    console.log('🚀 DÉBUT DU TEST D\'ANNONCES');
    console.log('=' .repeat(60));
    
    // 1. Authentification
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.log('❌ Arrêt - Échec authentification');
      return;
    }

    // 2. Test de récupération des annonces existantes
    const existingAnnouncements = await this.getMyAnnouncements();
    
    if (existingAnnouncements?.result?.data) {
      await this.log(`📊 Annonces existantes: ${existingAnnouncements.result.data.length}`, 
        existingAnnouncements.result.data.map(a => ({ id: a.id, title: a.title, status: a.status }))
      );
    }

    // 3. Création d'une nouvelle annonce
    const newAnnouncement = await this.createTestAnnouncement();
    
    if (newAnnouncement?.result?.data) {
      await this.log('✅ Annonce créée avec succès', {
        id: newAnnouncement.result.data.id,
        title: newAnnouncement.result.data.title,
        status: newAnnouncement.result.data.status
      });
    }

    // 4. Vérification de l'affichage
    const updatedAnnouncements = await this.getMyAnnouncements();
    
    if (updatedAnnouncements?.result?.data) {
      await this.log(`📊 Annonces après création: ${updatedAnnouncements.result.data.length}`, 
        updatedAnnouncements.result.data.map(a => ({ id: a.id, title: a.title, status: a.status }))
      );
    }

    // 5. Test endpoint simple sans input
    await this.log('🧪 Test endpoint simple');
    const simpleTest = await this.testAPI('clientAnnouncements.createAnnouncementNoInput', {});
    
    console.log('\n📋 RÉSUMÉ DU TEST:');
    console.log(`- Authentification: ${authSuccess ? '✅' : '❌'}`);
    console.log(`- Annonces existantes: ${existingAnnouncements?.result?.data?.length || 0}`);
    console.log(`- Création nouvelle: ${newAnnouncement?.result?.data ? '✅' : '❌'}`);
    console.log(`- Annonces après création: ${updatedAnnouncements?.result?.data?.length || 0}`);
    console.log(`- Test simple: ${simpleTest?.result ? '✅' : '❌'}`);
  }
}

// Exécution
const tester = new AnnouncementTester();
tester.runTest()
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });

export default AnnouncementTester;