#!/usr/bin/env node

/**
 * Test pratique des APIs EcoDeli avec authentification NextAuth
 * Ce script vérifie que les APIs sont correctement protégées et suggère des tests manuels
 */

const BASE_URL = 'http://172.30.80.1:3000';

class BrowserAuthTester {
  constructor() {
    this.results = [];
  }

  /**
   * Tester l'accessibilité des APIs publiques
   */
  async testPublicAPIs() {
    console.log('🌍 === TEST APIs PUBLIQUES ===\n');

    const publicAPIs = [
      { name: 'Health Check', endpoint: '/api/health' },
      { name: 'Session Info', endpoint: '/api/auth/session' },
      { name: 'Géo Distance', endpoint: '/api/shared/geo/distance' }
    ];

    for (const api of publicAPIs) {
      try {
        const response = await fetch(`${BASE_URL}${api.endpoint}`);
        const success = [200, 201].includes(response.status);
        
        console.log(`${success ? '✅' : '❌'} ${api.name}: ${response.status} ${response.statusText}`);
        
        this.results.push({
          name: api.name,
          endpoint: api.endpoint,
          type: 'public',
          status: response.status,
          success
        });
      } catch (error) {
        console.log(`❌ ${api.name}: ${error.message}`);
        this.results.push({
          name: api.name,
          endpoint: api.endpoint,
          type: 'public',
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Tester la protection des APIs (doivent retourner 401/403)
   */
  async testProtectedAPIs() {
    console.log('\n🔒 === TEST PROTECTION DES APIs ===\n');

    const protectedAPIs = [
      // Client APIs
      { role: 'CLIENT', name: 'Dashboard Client', endpoint: '/api/client/dashboard' },
      { role: 'CLIENT', name: 'Annonces Client', endpoint: '/api/client/announcements' },
      { role: 'CLIENT', name: 'Tutoriel Client', endpoint: '/api/client/tutorial' },
      
      // Deliverer APIs  
      { role: 'DELIVERER', name: 'Dashboard Livreur', endpoint: '/api/deliverer/dashboard' },
      { role: 'DELIVERER', name: 'Opportunités', endpoint: '/api/deliverer/opportunities' },
      { role: 'DELIVERER', name: 'Portefeuille', endpoint: '/api/deliverer/wallet' },
      
      // Provider APIs
      { role: 'PROVIDER', name: 'Documents Prestataire', endpoint: '/api/provider/documents' },
      { role: 'PROVIDER', name: 'Disponibilités', endpoint: '/api/provider/availability' },
      
      // Admin APIs
      { role: 'ADMIN', name: 'Utilisateurs Admin', endpoint: '/api/admin/users' },
      { role: 'ADMIN', name: 'Livraisons Admin', endpoint: '/api/admin/deliveries' },
      { role: 'ADMIN', name: 'Paramètres Admin', endpoint: '/api/admin/settings' }
    ];

    for (const api of protectedAPIs) {
      try {
        const response = await fetch(`${BASE_URL}${api.endpoint}`);
        const isProtected = [401, 403].includes(response.status);
        
        console.log(`${isProtected ? '✅' : '⚠️'} ${api.name} (${api.role}): ${response.status} ${response.statusText}`);
        
        this.results.push({
          name: api.name,
          endpoint: api.endpoint,
          role: api.role,
          type: 'protected',
          status: response.status,
          success: isProtected,
          message: isProtected ? 'Correctement protégée' : 'Accessible sans auth!'
        });
      } catch (error) {
        console.log(`❌ ${api.name}: ${error.message}`);
        this.results.push({
          name: api.name,
          endpoint: api.endpoint,
          role: api.role,
          type: 'protected',
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Afficher les instructions pour les tests manuels avec authentification
   */
  showManualTestInstructions() {
    console.log('\n📋 === INSTRUCTIONS TESTS MANUELS AVEC AUTHENTIFICATION ===\n');
    
    console.log('🔐 SYSTÈME UNIFIÉ: NextAuth uniquement');
    console.log('Pour tester les APIs avec authentification NextAuth:');
    console.log('');
    
    const testAccounts = [
      { email: 'client1@test.com', password: 'Test123!', role: 'CLIENT' },
      { email: 'livreur1@test.com', password: 'Test123!', role: 'DELIVERER' }, 
      { email: 'commercant1@test.com', password: 'Test123!', role: 'MERCHANT' },
      { email: 'prestataire1@test.com', password: 'Test123!', role: 'PROVIDER' },
      { email: 'admin1@test.com', password: 'Test123!', role: 'ADMIN' }
    ];

    testAccounts.forEach((account, index) => {
      console.log(`${index + 1}. 🔐 Test ${account.role}:`);
      console.log(`   a) Ouvrir: ${BASE_URL}/fr/login`);
      console.log(`   b) Se connecter: ${account.email} / ${account.password}`);
      console.log(`   c) Tester les APIs du rôle ${account.role}:`);
      
      // Montrer les APIs spécifiques au rôle
      const roleAPIs = this.results.filter(r => r.role === account.role && r.type === 'protected');
      roleAPIs.forEach(api => {
        console.log(`      - ${BASE_URL}${api.endpoint}`);
      });
      console.log('');
    });

    console.log('🎯 Résultats attendus:');
    console.log('   ✅ Les APIs doivent retourner des données JSON (status 200)');
    console.log('   ❌ Sinon, il y a un problème d\'authentification');
    console.log('');
  }

  /**
   * Générer le rapport de sécurité
   */
  generateSecurityReport() {
    const publicAPIs = this.results.filter(r => r.type === 'public');
    const protectedAPIs = this.results.filter(r => r.type === 'protected');
    
    const publicWorking = publicAPIs.filter(r => r.success).length;
    const protectedWorking = protectedAPIs.filter(r => r.success).length;
    
    // Détecter les problèmes de sécurité
    const securityIssues = protectedAPIs.filter(r => r.status === 200);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 RAPPORT DE SÉCURITÉ APIS');
    console.log('='.repeat(80));
    
    console.log(`🌍 APIs Publiques: ${publicWorking}/${publicAPIs.length} fonctionnelles`);
    console.log(`🔒 APIs Protégées: ${protectedWorking}/${protectedAPIs.length} correctement protégées`);
    
    if (securityIssues.length > 0) {
      console.log('\n⚠️ PROBLÈMES DE SÉCURITÉ DÉTECTÉS:');
      securityIssues.forEach(issue => {
        console.log(`   🚨 ${issue.name}: Accessible sans authentification!`);
      });
    } else {
      console.log('\n✅ Aucun problème de sécurité détecté');
    }
    
    // Score de sécurité
    const securityScore = protectedAPIs.length > 0 ? 
      Math.round((protectedWorking / protectedAPIs.length) * 100) : 100;
    
    console.log(`\n🛡️ Score de sécurité: ${securityScore}%`);
    
    let securityLevel;
    if (securityScore >= 95) securityLevel = '🟢 Excellent';
    else if (securityScore >= 80) securityLevel = '🟡 Bon';
    else securityLevel = '🔴 À corriger';
    
    console.log(`🎯 Niveau de sécurité: ${securityLevel}`);
    
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Effectuer les tests manuels ci-dessus');
    console.log('   2. Vérifier que les APIs retournent des données avec auth');
    console.log('   3. Corriger les problèmes de sécurité si détectés');
    
    console.log('='.repeat(80));
  }

  /**
   * Lancer tous les tests
   */
  async run() {
    console.log('🔍 === TEST SÉCURITÉ ET AUTHENTIFICATION ECODELI ===\n');
    
    // Test connectivité
    try {
      const health = await fetch(`${BASE_URL}/api/health`);
      if (!health.ok) throw new Error('Serveur inaccessible');
      console.log('✅ Serveur EcoDeli accessible\n');
    } catch (error) {
      console.log(`❌ Erreur serveur: ${error.message}`);
      return;
    }
    
    // Tests
    await this.testPublicAPIs();
    await this.testProtectedAPIs();
    this.showManualTestInstructions();
    this.generateSecurityReport();
  }
}

// Lancement des tests
const tester = new BrowserAuthTester();
tester.run().catch(console.error);