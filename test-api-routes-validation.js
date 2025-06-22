/**
 * Validation des routes API tRPC sans authentification
 * Vérifie que tous les endpoints existent et sont correctement configurés
 */

import fs from 'fs';

// Configuration
const BASE_URL = 'http://windows:3000';

// Headers pour simuler un navigateur
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Content-Type': 'application/json',
  'Referer': `${BASE_URL}/client`,
  'Origin': BASE_URL
};

class EcoDeliRouteValidator {
  constructor() {
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
    if (data && (status === 'ERROR' || status === 'WARNING')) {
      console.log('   Details:', JSON.stringify(data, null, 2).substring(0, 300) + '...');
    }
  }

  async testRouteExists(name, path, expectAuth = true) {
    try {
      const url = `${BASE_URL}/api/trpc/${path}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: BROWSER_HEADERS
      });

      const responseData = await response.json();

      // Si on s'attend à une authentification et qu'on reçoit UNAUTHORIZED, c'est bon
      if (expectAuth && response.status === 401) {
        await this.log(name, 'SUCCESS', `Route ${path} exists (requires auth)`, {
          status: response.status,
          message: responseData.error?.json?.message || 'Auth required'
        });
        return true;
      }
      
      // Si la route existe mais retourne une autre erreur (comme NOT_FOUND ou INVALID_INPUT)
      if (response.status === 400 || response.status === 404) {
        if (responseData.error?.json?.code === 'NOT_FOUND' && responseData.error?.json?.message?.includes('No procedure found')) {
          await this.log(name, 'ERROR', `Route ${path} NOT FOUND`, responseData.error.json);
          return false;
        } else {
          await this.log(name, 'SUCCESS', `Route ${path} exists (validation error)`, {
            status: response.status,
            message: responseData.error?.json?.message || 'Route exists but needs valid input'
          });
          return true;
        }
      }

      // Si on reçoit une réponse OK
      if (response.ok) {
        await this.log(name, 'SUCCESS', `Route ${path} accessible`, responseData.result?.data);
        return true;
      }

      // Autres cas
      await this.log(name, 'WARNING', `Route ${path} - Status ${response.status}`, responseData);
      return false;

    } catch (error) {
      await this.log(name, 'ERROR', `Route ${path} - Exception: ${error.message}`, { error: error.toString() });
      return false;
    }
  }

  async validateClientRoutes() {
    console.log('\n🔍 VALIDATION DES ROUTES CLIENT (Mission 1)');
    console.log('=' .repeat(60));
    
    const clientRoutes = [
      // Routes principales du client
      { name: 'Client Profile', path: 'client.getProfile' },
      { name: 'Client Stats', path: 'client.getStats' },
      { name: 'Client Dashboard', path: 'client.getDashboardData' },
      
      // Routes des annonces
      { name: 'My Announcements', path: 'clientAnnouncements.getMyAnnouncements' },
      { name: 'Create Announcement', path: 'clientAnnouncements.createAnnouncement' },
      { name: 'Update Announcement', path: 'clientAnnouncements.updateAnnouncement' },
      { name: 'Delete Announcement', path: 'clientAnnouncements.deleteAnnouncement' },
      
      // Routes des services
      { name: 'Search Services', path: 'clientServices.searchServices' },
      { name: 'Get Service Details', path: 'clientServices.getServiceDetails' },
      { name: 'Book Service', path: 'clientServices.bookService' },
      
      // Routes du stockage
      { name: 'Search Storage Boxes', path: 'storage.searchBoxes' },
      { name: 'Get Box Details', path: 'storage.getBoxDetails' },
      { name: 'Reserve Box', path: 'storage.reserveBox' },
      
      // Routes des rendez-vous
      { name: 'Client Appointments', path: 'clientAppointments.getClientAppointments' },
      { name: 'Create Appointment', path: 'clientAppointments.createAppointment' },
      { name: 'Cancel Appointment', path: 'clientAppointments.cancelAppointment' },
      
      // Routes des contrats
      { name: 'Client Contracts', path: 'clientContracts.getClientContracts' },
      { name: 'Get Contract Details', path: 'clientContracts.getContractDetails' },
      
      // Routes des avis
      { name: 'Client Reviews', path: 'clientReviews.getClientReviews' },
      { name: 'Create Review', path: 'clientReviews.createReview' },
      
      // Routes des paiements (tentative de routes alternatives)
      { name: 'Payment History (Alt)', path: 'payment.getPaymentHistory' },
      { name: 'Payment Methods', path: 'payment.getPaymentMethods' },
      
      // Routes alternatives du stockage
      { name: 'Storage Boxes Alt', path: 'clientStorageBoxes.searchBoxes' },
      { name: 'Storage Reservations', path: 'clientStorageBoxes.getReservations' }
    ];

    let successCount = 0;
    for (const route of clientRoutes) {
      const success = await this.testRouteExists(route.name, route.path, true);
      if (success) successCount++;
      
      // Petite pause pour éviter de surcharger le serveur
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { total: clientRoutes.length, success: successCount };
  }

  async validatePublicRoutes() {
    console.log('\n📡 VALIDATION DES ROUTES PUBLIQUES');
    console.log('=' .repeat(60));
    
    const publicRoutes = [
      { name: 'Health Check', path: 'health', expectAuth: false },
      { name: 'User Registration', path: 'auth.register', expectAuth: false },
      { name: 'Email Verification', path: 'auth.verifyEmail', expectAuth: false },
      { name: 'Password Reset', path: 'auth.resetPassword', expectAuth: false }
    ];

    let successCount = 0;
    for (const route of publicRoutes) {
      const success = await this.testRouteExists(route.name, route.path, route.expectAuth);
      if (success) successCount++;
    }

    return { total: publicRoutes.length, success: successCount };
  }

  async runValidation() {
    console.log('🚀 VALIDATION DES ROUTES API tRPC ECODELI');
    console.log('=' .repeat(80));
    
    // 1. Validation des routes publiques
    const publicResults = await this.validatePublicRoutes();
    
    // 2. Validation des routes client
    const clientResults = await this.validateClientRoutes();
    
    return this.generateReport({ publicResults, clientResults });
  }

  generateReport(results) {
    const successes = this.results.filter(r => r.status === 'SUCCESS').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    
    console.log('\n' + '=' .repeat(80));
    console.log('📊 RAPPORT DE VALIDATION DES ROUTES');
    console.log('=' .repeat(80));
    console.log(`✅ Routes trouvées: ${successes}`);
    console.log(`❌ Routes manquantes: ${errors}`);
    console.log(`⚠️ Routes problématiques: ${warnings}`);
    console.log(`📈 Taux de succès: ${Math.round((successes / this.results.length) * 100)}%`);
    
    if (errors > 0) {
      console.log('\n❌ ROUTES MANQUANTES:');
      this.results
        .filter(r => r.status === 'ERROR')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }
    
    if (warnings > 0) {
      console.log('\n⚠️ ROUTES PROBLÉMATIQUES:');
      this.results
        .filter(r => r.status === 'WARNING')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }

    // Analyse détaillée
    console.log('\n📋 ANALYSE DÉTAILLÉE:');
    console.log(`🏠 Routes publiques: ${results.publicResults.success}/${results.publicResults.total}`);
    console.log(`👤 Routes client: ${results.clientResults.success}/${results.clientResults.total}`);
    
    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    if (errors > 0) {
      console.log('🔧 Vérifier les routes manquantes dans src/server/api/routers/');
      console.log('🔧 Vérifier les imports dans src/server/api/root.ts');
      console.log('🔧 Vérifier la configuration des routers tRPC');
    } else {
      console.log('✅ Toutes les routes sont correctement configurées');
      console.log('✅ Structure API prête pour l\'intégration frontend');
    }
    
    console.log('\n💾 Résultats détaillés sauvegardés dans route-validation-results.json');
    fs.writeFileSync('route-validation-results.json', JSON.stringify(this.results, null, 2));
    
    return {
      total: this.results.length,
      successes,
      errors,
      warnings,
      successRate: Math.round((successes / this.results.length) * 100)
    };
  }
}

// Exécution
const validator = new EcoDeliRouteValidator();
validator.runValidation()
  .then(report => {
    console.log('\n🎯 Validation terminée!');
    process.exit(report.errors > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });

export default EcoDeliRouteValidator;