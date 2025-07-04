#!/usr/bin/env node

/**
 * SCRIPT DE TEST FRONTEND COMPLET - ECODELI
 * Test de toutes les interfaces utilisateur et fonctionnalités frontend
 */

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
}

function log(message, color = 'white') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function success(message) { log(`✅ ${message}`, 'green') }
function error(message) { log(`❌ ${message}`, 'red') }
function info(message) { log(`ℹ️  ${message}`, 'blue') }
function step(message) { log(`🔄 ${message}`, 'cyan') }

const ACCOUNTS = {
  CLIENT: { email: 'client1@test.com', password: 'Test123!' },
  DELIVERER: { email: 'livreur1@test.com', password: 'Test123!' },
  MERCHANT: { email: 'commercant1@test.com', password: 'Test123!' },
  PROVIDER: { email: 'prestataire1@test.com', password: 'Test123!' },
  ADMIN: { email: 'admin1@test.com', password: 'Test123!' }
}

class FrontendTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    }
  }

  async makeRequest(method, url, data = null, userEmail = null, expectedStatus = 200) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      }

      if (userEmail) {
        headers['X-Test-User-Email'] = userEmail
      }

      const options = {
        method,
        headers
      }

      if (data) {
        options.body = JSON.stringify(data)
      }

      const response = await fetch(`http://localhost:3000${url}`, options)
      const result = await response.json()

      this.results.total++

      if (response.status === expectedStatus) {
        this.results.passed++
        return { success: true, data: result, status: response.status }
      } else {
        this.results.failed++
        this.results.errors.push(`${method} ${url} → Expected ${expectedStatus}, got ${response.status}`)
        return { success: false, data: result, status: response.status, error: `Status ${response.status}` }
      }
    } catch (err) {
      this.results.total++
      this.results.failed++
      this.results.errors.push(`${method} ${url} → ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  /**
   * Test des APIs Dashboard pour chaque rôle
   */
  async testDashboards() {
    step('Test des Dashboards par rôle')

    // Dashboard Client
    const clientDashboard = await this.makeRequest('GET', '/api/client/dashboard', null, ACCOUNTS.CLIENT.email, 200)
    if (clientDashboard.success) {
      success('Dashboard Client accessible')
      if (clientDashboard.data.stats) {
        info(`Stats Client: ${clientDashboard.data.stats.totalAnnouncements} annonces, ${clientDashboard.data.stats.totalSpent}€ dépensés`)
      }
    } else {
      error('Dashboard Client inaccessible')
    }

    // Dashboard Admin (si existe)
    const adminDashboard = await this.makeRequest('GET', '/api/admin/dashboard', null, ACCOUNTS.ADMIN.email, 200)
    if (adminDashboard.success) {
      success('Dashboard Admin accessible')
    } else {
      info('Dashboard Admin non implémenté ou inaccessible')
    }

    return { clientDashboard, adminDashboard }
  }

  /**
   * Test du système de tutoriel client
   */
  async testTutorialSystem() {
    step('Test du Système de Tutoriel Client')

    // Vérifier état du tutoriel
    const tutorialStatus = await this.makeRequest('GET', '/api/client/tutorial', null, ACCOUNTS.CLIENT.email, 200)
    if (tutorialStatus.success) {
      success('API Tutorial accessible')
      info(`Tutorial requis: ${tutorialStatus.data.tutorialRequired}`)
      
      if (tutorialStatus.data.progress) {
        info(`Progression: ${JSON.stringify(tutorialStatus.data.progress)}`)
      }
    } else {
      error('API Tutorial inaccessible')
    }

    // Test démarrage tutoriel
    const startTutorial = await this.makeRequest('POST', '/api/client/tutorial?action=start', {}, ACCOUNTS.CLIENT.email, 200)
    if (startTutorial.success) {
      success('Démarrage du tutoriel réussi')
    } else {
      error('Impossible de démarrer le tutoriel')
    }

    return { tutorialStatus, startTutorial }
  }

  /**
   * Test des fonctionnalités d'annonces
   */
  async testAnnouncementFeatures() {
    step('Test des Fonctionnalités d\'Annonces')

    // Créer une annonce test
    const announcementData = {
      title: 'Test Frontend Livraison',
      description: 'Test automatisé du frontend EcoDeli',
      type: 'PACKAGE_DELIVERY',
      price: 25,
      currency: 'EUR',
      pickupAddress: '110 rue de Flandre, 75019 Paris',
      deliveryAddress: 'Place Bellecour, 69002 Lyon',
      desiredDate: new Date(Date.now() + 86400000).toISOString(), // +24h
      packageDetails: {
        weight: 2.5,
        length: 30,
        width: 20,
        height: 15,
        fragile: false,
        requiresInsurance: false
      },
      urgent: false,
      specialInstructions: 'Test automatisé - ne pas traiter'
    }

    const createAnnouncement = await this.makeRequest('POST', '/api/client/announcements', announcementData, ACCOUNTS.CLIENT.email, 201)
    if (createAnnouncement.success) {
      success(`Annonce créée: ${createAnnouncement.data.announcement.id}`)
      
      // Récupérer l'annonce créée
      const getAnnouncement = await this.makeRequest('GET', `/api/client/announcements/${createAnnouncement.data.announcement.id}`, null, ACCOUNTS.CLIENT.email, 200)
      if (getAnnouncement.success) {
        success('Récupération d\'annonce réussie')
      } else {
        error('Impossible de récupérer l\'annonce créée')
      }

      return { createAnnouncement, getAnnouncement, announcementId: createAnnouncement.data.announcement.id }
    } else {
      error('Impossible de créer une annonce')
      return { createAnnouncement }
    }
  }

  /**
   * Test des fonctionnalités de paiement
   */
  async testPaymentFeatures(announcementId) {
    if (!announcementId) {
      info('Pas d\'annonce pour tester les paiements')
      return
    }

    step('Test des Fonctionnalités de Paiement')

    const paymentData = {
      amount: 25,
      currency: 'EUR',
      announcementId: announcementId,
      paymentMethod: 'stripe',
      description: 'Test paiement frontend'
    }

    const createPayment = await this.makeRequest('POST', '/api/client/payments', paymentData, ACCOUNTS.CLIENT.email, 201)
    if (createPayment.success) {
      success(`Paiement créé: ${createPayment.data.payment.id}`)
      info(`Stripe Payment ID: ${createPayment.data.payment.stripePaymentId}`)
    } else {
      error('Impossible de créer un paiement')
    }

    // Lister les paiements
    const listPayments = await this.makeRequest('GET', '/api/client/payments', null, ACCOUNTS.CLIENT.email, 200)
    if (listPayments.success) {
      success(`${listPayments.data.payments.length} paiements trouvés`)
    } else {
      error('Impossible de lister les paiements')
    }

    return { createPayment, listPayments }
  }

  /**
   * Test des fonctionnalités livreur
   */
  async testDelivererFeatures() {
    step('Test des Fonctionnalités Livreur')

    // Consulter les annonces disponibles
    const availableAnnouncements = await this.makeRequest('GET', '/api/deliverer/announcements', null, ACCOUNTS.DELIVERER.email, 200)
    if (availableAnnouncements.success) {
      success(`${availableAnnouncements.data.announcements.length} annonces disponibles pour livreurs`)
    } else {
      error('Impossible de consulter les annonces livreur')
    }

    // Consulter les livraisons du livreur
    const deliveries = await this.makeRequest('GET', '/api/deliverer/deliveries', null, ACCOUNTS.DELIVERER.email, 200)
    if (deliveries.success) {
      success(`${deliveries.data.deliveries.length} livraisons en cours`)
    } else {
      error('Impossible de consulter les livraisons')
    }

    return { availableAnnouncements, deliveries }
  }

  /**
   * Test des APIs de santé et monitoring
   */
  async testSystemHealth() {
    step('Test de Santé du Système')

    // API de santé principale
    const health = await this.makeRequest('GET', '/api/health', null, null, 200)
    if (health.success) {
      success('API de santé opérationnelle')
      info(`Statut: ${health.data.status}, Database: ${health.data.database}, Version: ${health.data.version}`)
    } else {
      error('API de santé non accessible')
    }

    return { health }
  }

  /**
   * Test des fonctionnalités d'upload de documents
   */
  async testDocumentUpload() {
    step('Test d\'Upload de Documents')

    // Tester l'authentification de l'API upload (GET pour lister les documents)
    const uploadAuth = await this.makeRequest('GET', '/api/upload', null, ACCOUNTS.CLIENT.email, 200)
    if (uploadAuth.success) {
      success('API d\'upload authentifiée et accessible')
      info(`Documents trouvés: ${uploadAuth.data.documents?.length || 0}`)
    } else {
      info('API d\'upload configurée mais nécessite des fichiers réels pour test complet')
    }

    return { uploadAuth }
  }

  /**
   * Afficher le rapport final
   */
  showResults() {
    log('\n' + '='.repeat(60), 'cyan')
    log('📊 RAPPORT FINAL - TESTS FRONTEND ECODELI', 'cyan')
    log('='.repeat(60), 'cyan')

    const percentage = Math.round((this.results.passed / this.results.total) * 100)
    
    if (percentage >= 90) {
      success(`🎉 EXCELLENT: ${percentage}% (${this.results.passed}/${this.results.total})`)
    } else if (percentage >= 70) {
      log(`⚠️ BIEN: ${percentage}% (${this.results.passed}/${this.results.total})`, 'yellow')
    } else {
      error(`❌ PROBLÈMES: ${percentage}% (${this.results.passed}/${this.results.total})`)
    }

    log(`✅ Tests réussis: ${this.results.passed}`, 'green')
    log(`❌ Tests échoués: ${this.results.failed}`, 'red')
    log(`📊 Total tests: ${this.results.total}`, 'blue')

    if (this.results.errors.length > 0) {
      log('\n🔍 ERREURS DÉTECTÉES:', 'red')
      this.results.errors.forEach(error => {
        log(`   • ${error}`, 'red')
      })
    }

    log('\n📋 RECOMMANDATIONS:', 'yellow')
    if (percentage >= 90) {
      log('   • Frontend opérationnel ! ✨', 'green')
      log('   • Déploiement possible en production', 'green')
    } else if (percentage >= 70) {
      log('   • Corriger les erreurs identifiées', 'yellow')
      log('   • Tester à nouveau avant déploiement', 'yellow')
    } else {
      log('   • Révision complète nécessaire', 'red')
      log('   • Corriger les problèmes majeurs', 'red')
    }
  }

  /**
   * Lancer tous les tests
   */
  async runAllTests() {
    log('🚀 DÉMARRAGE DES TESTS FRONTEND ECODELI', 'cyan')
    log(`⏰ ${new Date().toLocaleString('fr-FR')}`, 'blue')
    log('─'.repeat(60), 'blue')

    try {
      // Tests de base
      await this.testSystemHealth()
      await this.testDashboards()
      await this.testTutorialSystem()

      // Tests des fonctionnalités principales
      const announcementTest = await this.testAnnouncementFeatures()
      
      if (announcementTest?.announcementId) {
        await this.testPaymentFeatures(announcementTest.announcementId)
      }

      await this.testDelivererFeatures()
      await this.testDocumentUpload()

      this.showResults()

    } catch (error) {
      error(`💥 Erreur fatale: ${error.message}`)
      console.error(error)
    }
  }
}

// Exécution du script
async function main() {
  const tester = new FrontendTester()
  await tester.runAllTests()
}

main().catch(console.error) 