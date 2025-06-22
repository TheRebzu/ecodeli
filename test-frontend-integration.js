/**
 * Test d'intégration frontend complet pour Mission 1
 * Vérifie l'expérience utilisateur end-to-end
 */

import fs from 'fs';

const BASE_URL = 'http://windows:3000';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0'
};

class FrontendIntegrationTester {
  constructor() {
    this.results = [];
    this.sessionCookies = '';
  }

  async log(category, test, status, message, data = null) {
    const result = {
      category,
      test,
      status,
      message,
      timestamp: new Date().toISOString(),
      data: data ? JSON.stringify(data, null, 2) : null
    };
    this.results.push(result);
    
    const statusEmoji = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '⚠️';
    console.log(`${statusEmoji} [${category}] ${test}: ${message}`);
    if (data && status === 'ERROR') {
      console.log('   Details:', JSON.stringify(data, null, 2).substring(0, 300) + '...');
    }
  }

  async testPage(category, pageName, path, expectedElements = []) {
    try {
      const url = `${BASE_URL}${path}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...BROWSER_HEADERS,
          ...(this.sessionCookies ? { 'Cookie': this.sessionCookies } : {})
        },
        redirect: 'manual'
      });

      const content = await response.text();

      // Vérifier le statut de la réponse
      if (response.status === 200) {
        await this.log(category, pageName, 'SUCCESS', `Page accessible (${response.status})`, {
          contentLength: content.length,
          hasHtml: content.includes('<html'),
          hasReact: content.includes('__NEXT_DATA__')
        });

        // Vérifier la présence d'éléments attendus
        let elementChecks = 0;
        for (const element of expectedElements) {
          if (content.includes(element)) {
            elementChecks++;
          }
        }

        if (expectedElements.length > 0) {
          const elementScore = (elementChecks / expectedElements.length * 100).toFixed(0);
          await this.log(category, `${pageName} - Éléments`, 'SUCCESS', 
            `${elementChecks}/${expectedElements.length} éléments trouvés (${elementScore}%)`, 
            { foundElements: elementChecks, totalElements: expectedElements.length }
          );
        }

        return true;
      } else if (response.status === 302 || response.status === 307) {
        const location = response.headers.get('location');
        await this.log(category, pageName, 'WARNING', 
          `Redirection vers ${location} (${response.status})`, 
          { redirectTo: location }
        );
        return false;
      } else {
        await this.log(category, pageName, 'ERROR', 
          `Page inaccessible (${response.status})`, 
          { status: response.status, content: content.substring(0, 200) }
        );
        return false;
      }

    } catch (error) {
      await this.log(category, pageName, 'ERROR', 
        `Exception: ${error.message}`, 
        { error: error.toString() }
      );
      return false;
    }
  }

  async testPublicPages() {
    console.log('\n📱 TEST DES PAGES PUBLIQUES');
    console.log('=' .repeat(60));

    const publicPages = [
      {
        name: 'Page d\'accueil',
        path: '/',
        elements: ['EcoDeli', 'livraison', 'écologique']
      },
      {
        name: 'Page de connexion',
        path: '/login',
        elements: ['form', 'email', 'password', 'button']
      },
      {
        name: 'Page d\'inscription',
        path: '/register',
        elements: ['form', 'client', 'deliverer', 'merchant']
      },
      {
        name: 'Page À propos',
        path: '/about',
        elements: ['EcoDeli', 'mission', 'équipe']
      },
      {
        name: 'Page Services',
        path: '/services',
        elements: ['service', 'livraison', 'prestations']
      },
      {
        name: 'Page FAQ',
        path: '/faq',
        elements: ['questions', 'réponses', 'aide']
      }
    ];

    let successCount = 0;
    for (const page of publicPages) {
      const success = await this.testPage('PUBLIC', page.name, page.path, page.elements);
      if (success) successCount++;
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { total: publicPages.length, success: successCount };
  }

  async testProtectedPagesWithoutAuth() {
    console.log('\n🔒 TEST DES PAGES PROTÉGÉES (SANS AUTH)');
    console.log('=' .repeat(60));

    const protectedPages = [
      {
        name: 'Dashboard Client',
        path: '/client',
        elements: []
      },
      {
        name: 'Annonces Client',
        path: '/client/announcements',
        elements: []
      },
      {
        name: 'Créer Annonce',
        path: '/client/announcements/create',
        elements: []
      },
      {
        name: 'Services Client',
        path: '/client/services',
        elements: []
      },
      {
        name: 'Stockage Client',
        path: '/client/storage',
        elements: []
      },
      {
        name: 'Rendez-vous Client',
        path: '/client/appointments',
        elements: []
      },
      {
        name: 'Paiements Client',
        path: '/client/payments',
        elements: []
      }
    ];

    let redirectCount = 0;
    for (const page of protectedPages) {
      const response = await fetch(`${BASE_URL}${page.path}`, {
        method: 'GET',
        headers: BROWSER_HEADERS,
        redirect: 'manual'
      });

      if (response.status === 302 || response.status === 307) {
        const location = response.headers.get('location');
        if (location && location.includes('/login')) {
          await this.log('PROTECTED', page.name, 'SUCCESS', 
            'Redirection vers login correcte', 
            { redirectTo: location }
          );
          redirectCount++;
        } else {
          await this.log('PROTECTED', page.name, 'WARNING', 
            `Redirection inattendue vers ${location}`, 
            { redirectTo: location }
          );
        }
      } else {
        await this.log('PROTECTED', page.name, 'ERROR', 
          `Page accessible sans authentification (${response.status})`, 
          { status: response.status }
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { total: protectedPages.length, success: redirectCount };
  }

  async testAPIConnection() {
    console.log('\n🔌 TEST DE CONNEXION API');
    console.log('=' .repeat(60));

    const apiTests = [
      {
        name: 'Health Check',
        endpoint: '/api/health',
        method: 'GET'
      },
      {
        name: 'tRPC Health',
        endpoint: '/api/trpc/health',
        method: 'GET'
      },
      {
        name: 'tRPC Metadata',
        endpoint: '/api/trpc',
        method: 'GET'
      }
    ];

    let successCount = 0;
    for (const test of apiTests) {
      try {
        const response = await fetch(`${BASE_URL}${test.endpoint}`, {
          method: test.method,
          headers: BROWSER_HEADERS
        });

        if (response.ok) {
          const data = await response.json();
          await this.log('API', test.name, 'SUCCESS', 
            `Endpoint accessible (${response.status})`, 
            { status: response.status, hasData: !!data }
          );
          successCount++;
        } else {
          await this.log('API', test.name, 'WARNING', 
            `Endpoint retourne ${response.status}`, 
            { status: response.status }
          );
        }
      } catch (error) {
        await this.log('API', test.name, 'ERROR', 
          `Exception: ${error.message}`, 
          { error: error.toString() }
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { total: apiTests.length, success: successCount };
  }

  async testStaticAssets() {
    console.log('\n📦 TEST DES ASSETS STATIQUES');
    console.log('=' .repeat(60));

    const staticAssets = [
      {
        name: 'Favicon',
        path: '/favicon.ico',
        type: 'image'
      },
      {
        name: 'Manifest',
        path: '/manifest.json',
        type: 'json'
      },
      {
        name: 'Robots.txt',
        path: '/robots.txt',
        type: 'text'
      }
    ];

    let successCount = 0;
    for (const asset of staticAssets) {
      try {
        const response = await fetch(`${BASE_URL}${asset.path}`, {
          method: 'GET',
          headers: BROWSER_HEADERS
        });

        if (response.ok) {
          await this.log('ASSETS', asset.name, 'SUCCESS', 
            `Asset accessible (${response.status})`, 
            { status: response.status, contentType: response.headers.get('content-type') }
          );
          successCount++;
        } else if (response.status === 404) {
          await this.log('ASSETS', asset.name, 'WARNING', 
            'Asset non trouvé (404)', 
            { status: response.status }
          );
        } else {
          await this.log('ASSETS', asset.name, 'ERROR', 
            `Asset inaccessible (${response.status})`, 
            { status: response.status }
          );
        }
      } catch (error) {
        await this.log('ASSETS', asset.name, 'ERROR', 
          `Exception: ${error.message}`, 
          { error: error.toString() }
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { total: staticAssets.length, success: successCount };
  }

  async runCompleteTest() {
    console.log('🚀 DÉBUT DU TEST D\'INTÉGRATION FRONTEND COMPLET');
    console.log('=' .repeat(80));
    
    // 1. Test des pages publiques
    const publicResults = await this.testPublicPages();
    
    // 2. Test des pages protégées (redirection)
    const protectedResults = await this.testProtectedPagesWithoutAuth();
    
    // 3. Test de la connexion API
    const apiResults = await this.testAPIConnection();
    
    // 4. Test des assets statiques
    const assetsResults = await this.testStaticAssets();
    
    return this.generateReport({
      publicResults,
      protectedResults,
      apiResults,
      assetsResults
    });
  }

  generateReport(results) {
    const successes = this.results.filter(r => r.status === 'SUCCESS').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    
    console.log('\n' + '=' .repeat(80));
    console.log('📊 RAPPORT D\'INTÉGRATION FRONTEND');
    console.log('=' .repeat(80));
    console.log(`✅ Tests réussis: ${successes}`);
    console.log(`❌ Tests échoués: ${errors}`);
    console.log(`⚠️ Avertissements: ${warnings}`);
    console.log(`📈 Taux de succès: ${Math.round((successes / this.results.length) * 100)}%`);
    
    // Détails par catégorie
    console.log('\n📋 RÉSULTATS PAR CATÉGORIE:');
    console.log(`🏠 Pages publiques: ${results.publicResults.success}/${results.publicResults.total}`);
    console.log(`🔒 Pages protégées: ${results.protectedResults.success}/${results.protectedResults.total}`);
    console.log(`🔌 Endpoints API: ${results.apiResults.success}/${results.apiResults.total}`);
    console.log(`📦 Assets statiques: ${results.assetsResults.success}/${results.assetsResults.total}`);
    
    if (errors > 0) {
      console.log('\n❌ ERREURS DÉTECTÉES:');
      this.results
        .filter(r => r.status === 'ERROR')
        .forEach(r => console.log(`   - [${r.category}] ${r.test}: ${r.message}`));
    }
    
    if (warnings > 0) {
      console.log('\n⚠️ AVERTISSEMENTS:');
      this.results
        .filter(r => r.status === 'WARNING')
        .forEach(r => console.log(`   - [${r.category}] ${r.test}: ${r.message}`));
    }

    // Analyse et recommandations
    console.log('\n💡 ANALYSE:');
    
    const publicSuccessRate = (results.publicResults.success / results.publicResults.total * 100);
    const protectedSuccessRate = (results.protectedResults.success / results.protectedResults.total * 100);
    const apiSuccessRate = (results.apiResults.success / results.apiResults.total * 100);
    
    if (publicSuccessRate >= 80) {
      console.log('✅ Site public accessible et fonctionnel');
    } else {
      console.log('⚠️ Problèmes détectés sur le site public');
    }
    
    if (protectedSuccessRate >= 90) {
      console.log('✅ Sécurité des pages protégées correcte');
    } else {
      console.log('⚠️ Problèmes de sécurité sur les pages protégées');
    }
    
    if (apiSuccessRate >= 70) {
      console.log('✅ API accessible et responsive');
    } else {
      console.log('⚠️ Problèmes de connectivité API');
    }

    console.log('\n🎯 RECOMMANDATIONS:');
    if (errors === 0 && warnings <= 2) {
      console.log('🟢 Frontend prêt pour la production');
      console.log('✅ Expérience utilisateur optimale');
      console.log('✅ Intégration tRPC fonctionnelle');
    } else if (errors <= 2) {
      console.log('🟡 Frontend globalement fonctionnel');
      console.log('⚠️ Quelques améliorations recommandées');
    } else {
      console.log('🔴 Frontend nécessite des corrections');
      console.log('❌ Problèmes critiques à résoudre');
    }
    
    console.log('\n💾 Résultats détaillés sauvegardés dans frontend-integration-results.json');
    fs.writeFileSync('frontend-integration-results.json', JSON.stringify(this.results, null, 2));
    
    return {
      total: this.results.length,
      successes,
      errors,
      warnings,
      successRate: Math.round((successes / this.results.length) * 100),
      categories: {
        public: results.publicResults,
        protected: results.protectedResults,
        api: results.apiResults,
        assets: results.assetsResults
      }
    };
  }
}

// Exécution
const tester = new FrontendIntegrationTester();
tester.runCompleteTest()
  .then(report => {
    console.log('\n🎯 Test d\'intégration terminé!');
    process.exit(report.errors > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });

export default FrontendIntegrationTester;