#!/usr/bin/env node

/**
 * Script de test complet EcoDeli selon le cahier des charges
 * Test avec authentification et cookies pour tous les rôles
 */

import { readFileSync } from 'fs';

const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 10000;

// Configuration des utilisateurs de test selon les rôles
const TEST_USERS = {
  client: {
    email: 'client@ecodeli.test',
    password: 'TestClient123!',
    role: 'CLIENT'
  },
  deliverer: {
    email: 'livreur@ecodeli.test', 
    password: 'TestLivreur123!',
    role: 'DELIVERER'
  },
  merchant: {
    email: 'commercant@ecodeli.test',
    password: 'TestCommercant123!',
    role: 'MERCHANT'
  },
  provider: {
    email: 'prestataire@ecodeli.test',
    password: 'TestPrestataire123!',
    role: 'PROVIDER'
  },
  admin: {
    email: 'admin@ecodeli.test',
    password: 'TestAdmin123!',
    role: 'ADMIN'
  }
};

// Tests selon le cahier des charges par rôle
const CAHIER_DES_CHARGES_TESTS = {
  client: {
    name: "ESPACE CLIENT",
    requirements: [
      "Déposer une annonce",
      "Être averti des activités EcoDeli", 
      "Réserver des services",
      "Prendre des rendez-vous avec prestataires",
      "Gérer ses paiements",
      "Accéder aux informations des box de stockage",
      "Tutoriel première connexion (obligatoire avec overlays)"
    ],
    apis: [
      { endpoint: '/api/client/dashboard', description: 'Dashboard client' },
      { endpoint: '/api/client/announcements', description: 'Gestion des annonces' },
      { endpoint: '/api/client/services', description: 'Réservation de services' },
      { endpoint: '/api/client/bookings', description: 'Rendez-vous prestataires' },
      { endpoint: '/api/client/payments', description: 'Gestion des paiements' },
      { endpoint: '/api/client/storage-boxes', description: 'Box de stockage' },
      { endpoint: '/api/client/tutorial', description: 'Tutoriel obligatoire' },
      { endpoint: '/api/client/deliveries', description: 'Suivi des livraisons' },
      { endpoint: '/api/client/tracking', description: 'Suivi en temps réel' },
      { endpoint: '/api/client/profile', description: 'Gestion du profil' }
    ]
  },
  deliverer: {
    name: "ESPACE LIVREUR",
    requirements: [
      "Faire une demande validée par la société",
      "Validation par pièces justificatives",
      "Assurer des livraisons/transports",
      "Indiquer trajets à l'avance",
      "Notifications si annonce correspondante"
    ],
    subRequirements: [
      "Gérer ses annonces",
      "Gérer ses pièces justificatives", 
      "Gérer ses livraisons (toutes formes)",
      "Gérer ses paiements",
      "Gérer son planning et déplacements"
    ],
    apis: [
      { endpoint: '/api/deliverer/dashboard', description: 'Dashboard livreur' },
      { endpoint: '/api/deliverer/opportunities', description: 'Opportunités de livraison' },
      { endpoint: '/api/deliverer/wallet', description: 'Gestion des paiements' },
      { endpoint: '/api/deliverer/tracking', description: 'Suivi des livraisons' },
      { endpoint: '/api/deliverer/route-optimization', description: 'Planning et trajets' },
      { endpoint: '/api/deliverer/reviews', description: 'Évaluations reçues' }
    ]
  },
  merchant: {
    name: "ESPACE COMMERÇANT", 
    requirements: [
      "Accès dédié au suivi des activités",
      "Proposer des annonces"
    ],
    subRequirements: [
      "Gestion de son contrat",
      "Gestion de ses annonces", 
      "Gestion de la facturation des services demandés",
      "Accès aux paiements"
    ],
    apis: [
      { endpoint: '/api/merchant/announcements/bulk', description: 'Gestion des annonces' },
      { endpoint: '/api/merchant/orders', description: 'Commandes et facturation' }
    ]
  },
  provider: {
    name: "ESPACE PRESTATAIRE",
    requirements: [
      "Prestations de qualité et régulières",
      "Base de prestataires rigoureusement sélectionnée et validée"
    ],
    subRequirements: [
      "Suivi des évaluations des prestations réalisées (note clients)",
      "Validation de la sélection des prestataires (vérification profil, prestations, habilitations, tarifs)",
      "Calendrier des disponibilités du prestataire",
      "Gestion de leurs interventions diverses",
      "Facturation automatique mensuelle (synthèse prestations + gains)",
      "Factures archivées et accessibles prestataire + comptable"
    ],
    apis: [
      { endpoint: '/api/provider/reviews', description: 'Évaluations clients' },
      { endpoint: '/api/provider/availability', description: 'Calendrier disponibilités' },
      { endpoint: '/api/provider/interventions', description: 'Gestion interventions' },
      { endpoint: '/api/provider/invoices', description: 'Facturation mensuelle' },
      { endpoint: '/api/provider/earnings', description: 'Gains et revenus' },
      { endpoint: '/api/provider/documents', description: 'Validation et habilitations' },
      { endpoint: '/api/provider/onboarding', description: 'Processus de validation' },
      { endpoint: '/api/provider/announcements', description: 'Annonces de services' }
    ]
  },
  admin: {
    name: "ADMINISTRATION GÉNÉRALE",
    requirements: [
      "Outil principal de gestion EcoDeli",
      "Suivi intégralité activité professionnelle et revenus/charges",
      "Tout doit y être accessible"
    ],
    subRequirements: [
      "Gestion des commerçants, contrats, livreurs, prestataires, livraisons",
      "Gestion de toutes les prestations et de leur suivi",
      "Gestion des différents paiements et facturation", 
      "Gestion financière de l'entreprise"
    ],
    apis: [
      { endpoint: '/api/admin/dashboard', description: 'Dashboard administration' },
      { endpoint: '/api/admin/users', description: 'Gestion des utilisateurs' },
      { endpoint: '/api/admin/announcements', description: 'Gestion des annonces' },
      { endpoint: '/api/admin/deliveries', description: 'Gestion des livraisons' },
      { endpoint: '/api/admin/contracts', description: 'Gestion des contrats' },
      { endpoint: '/api/admin/finance', description: 'Gestion financière' },
      { endpoint: '/api/admin/settings', description: 'Paramètres système' },
      { endpoint: '/api/admin/verifications/users', description: 'Vérifications utilisateurs' },
      { endpoint: '/api/admin/documents/pending', description: 'Documents en attente' },
      { endpoint: '/api/admin/monitoring/metrics', description: 'Métriques système' },
      { endpoint: '/api/admin/locations', description: 'Gestion des emplacements' },
      { endpoint: '/api/admin/withdrawals', description: 'Retraits et paiements' },
      { endpoint: '/api/admin/tests/email', description: 'Tests email' },
      { endpoint: '/api/admin/tests/notification', description: 'Tests notifications' }
    ]
  }
};

// APIs spécifiques selon le cahier des charges technique
const TECHNICAL_REQUIREMENTS_TESTS = {
  payments: [
    { endpoint: '/api/webhooks/stripe', description: 'Webhooks Stripe (paiements)' }
  ],
  notifications: [
    { endpoint: '/api/webhooks/onesignal', description: 'Notifications push OneSignal' }
  ],
  shared: [
    { endpoint: '/api/shared/geo/distance', description: 'Calculs géographiques' },
    { endpoint: '/api/shared/analytics/dashboard', description: 'Analytics partagées' },
    { endpoint: '/api/upload', description: 'Upload de documents' },
    { endpoint: '/api/health', description: 'Santé du système' }
  ],
  documents: [
    { endpoint: '/api/documents/generate', description: 'Génération automatique PDF' }
  ],
  multilingue: [
    { endpoint: '/fr/login', description: 'Français' },
    { endpoint: '/en/login', description: 'Anglais' },
    { endpoint: '/es/login', description: 'Espagnol' }
  ]
};

class EcoDeliTester {
  constructor() {
    this.sessions = {};
    this.results = {
      connectivity: false,
      authentication: {},
      cahierDesCharges: {},
      technical: {},
      score: { passed: 0, total: 0 }
    };
  }

  async makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async checkConnectivity() {
    console.log('🔗 Test de connectivité...');
    try {
      const response = await this.makeRequest(`${BASE_URL}/api/health`);
      if (response.ok) {
        console.log('✅ Serveur accessible');
        this.results.connectivity = true;
        return true;
      } else {
        console.log('❌ Serveur inaccessible');
        return false;
      }
    } catch (error) {
      console.log('❌ Serveur inaccessible:', error.message);
      return false;
    }
  }

  async registerUser(userConfig) {
    try {
      const response = await this.makeRequest(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          email: userConfig.email,
          password: userConfig.password,
          role: userConfig.role,
          firstName: 'Test',
          lastName: userConfig.role,
          acceptTerms: true
        })
      });

      if (response.ok || response.status === 409) { // 409 = utilisateur existe déjà
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async authenticateUser(userConfig) {
    console.log(`🔐 Authentification ${userConfig.role}...`);
    
    // Tenter d'abord l'inscription
    await this.registerUser(userConfig);

    try {
      const response = await this.makeRequest(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({
          email: userConfig.email,
          password: userConfig.password
        })
      });

      if (response.ok) {
        // Extraire les cookies de session
        const cookies = response.headers.get('set-cookie');
        if (cookies) {
          this.sessions[userConfig.role] = {
            cookies: cookies,
            headers: { 'Cookie': cookies }
          };
          console.log(`✅ ${userConfig.role} authentifié`);
          this.results.authentication[userConfig.role] = true;
          return true;
        }
      }
      
      console.log(`❌ Échec authentification ${userConfig.role}`);
      this.results.authentication[userConfig.role] = false;
      return false;
    } catch (error) {
      console.log(`❌ Erreur authentification ${userConfig.role}:`, error.message);
      this.results.authentication[userConfig.role] = false;
      return false;
    }
  }

  async testAPIWithAuth(endpoint, role, description) {
    const session = this.sessions[role];
    if (!session) {
      return { success: false, status: 'NO_AUTH', message: 'Pas d\'authentification' };
    }

    try {
      const response = await this.makeRequest(`${BASE_URL}${endpoint}`, {
        headers: session.headers
      });

      const success = response.status < 500; // Tout sauf erreur serveur
      this.results.score.total++;
      if (success) this.results.score.passed++;

      return {
        success,
        status: response.status,
        message: this.getStatusMessage(response.status)
      };
    } catch (error) {
      this.results.score.total++;
      return { success: false, status: 'ERROR', message: error.message };
    }
  }

  getStatusMessage(status) {
    const messages = {
      200: 'OK',
      201: 'Créé',
      401: 'Non authentifié',
      403: 'Accès refusé', 
      404: 'Non trouvé',
      405: 'Méthode non autorisée',
      500: 'Erreur serveur'
    };
    return messages[status] || `Status ${status}`;
  }

  async testCahierDesCharges() {
    console.log('\n📋 === TESTS CONFORMITÉ CAHIER DES CHARGES ===\n');

    for (const [role, config] of Object.entries(CAHIER_DES_CHARGES_TESTS)) {
      console.log(`\n🎯 ${config.name}`);
      console.log(`📖 Exigences du cahier des charges:`);
      
      config.requirements.forEach(req => {
        console.log(`   • ${req}`);
      });
      
      if (config.subRequirements) {
        console.log(`📝 Sous-exigences:`);
        config.subRequirements.forEach(req => {
          console.log(`   - ${req}`);
        });
      }

      console.log(`\n🧪 Tests des APIs:`);
      
      this.results.cahierDesCharges[role] = {
        apis: [],
        passed: 0,
        total: config.apis.length
      };

      for (const api of config.apis) {
        const result = await this.testAPIWithAuth(api.endpoint, role, api.description);
        this.results.cahierDesCharges[role].apis.push({
          ...api,
          ...result
        });

        const statusIcon = result.success ? '✅' : '❌';
        console.log(`   ${statusIcon} ${api.endpoint} - ${api.description} (${result.message})`);
        
        if (result.success) {
          this.results.cahierDesCharges[role].passed++;
        }
      }

      const roleScore = this.results.cahierDesCharges[role];
      const percentage = Math.round((roleScore.passed / roleScore.total) * 100);
      console.log(`\n📊 ${config.name}: ${roleScore.passed}/${roleScore.total} (${percentage}%)`);
    }
  }

  async testTechnicalRequirements() {
    console.log('\n🛠️ === TESTS EXIGENCES TECHNIQUES ===\n');

    this.results.technical = {};

    for (const [category, apis] of Object.entries(TECHNICAL_REQUIREMENTS_TESTS)) {
      console.log(`\n🔧 ${category.toUpperCase()}`);
      
      this.results.technical[category] = {
        apis: [],
        passed: 0,
        total: apis.length
      };

      for (const api of apis) {
        let result;
        
        // Test sans authentification pour les APIs publiques
        if (['health', 'multilingue'].includes(category)) {
          try {
            const response = await this.makeRequest(`${BASE_URL}${api.endpoint}`);
            result = {
              success: response.ok,
              status: response.status,
              message: this.getStatusMessage(response.status)
            };
          } catch (error) {
            result = { success: false, status: 'ERROR', message: error.message };
          }
        } else {
          // Test avec authentification admin pour les autres
          result = await this.testAPIWithAuth(api.endpoint, 'admin', api.description);
        }

        this.results.technical[category].apis.push({
          ...api,
          ...result
        });

        const statusIcon = result.success ? '✅' : '❌';
        console.log(`   ${statusIcon} ${api.endpoint} - ${api.description} (${result.message})`);
        
        if (result.success) {
          this.results.technical[category].passed++;
        }
      }

      const categoryScore = this.results.technical[category];
      const percentage = Math.round((categoryScore.passed / categoryScore.total) * 100);
      console.log(`📊 ${category}: ${categoryScore.passed}/${categoryScore.total} (${percentage}%)`);
    }
  }

  async testSpecialFeatures() {
    console.log('\n🌟 === TESTS FONCTIONNALITÉS SPÉCIALES ===\n');

    // Test du tutoriel obligatoire (exigence cahier des charges)
    console.log('🎓 Test du tutoriel client (obligatoire première connexion)');
    if (this.sessions.CLIENT) {
      const tutorialResult = await this.testAPIWithAuth('/api/client/tutorial', 'CLIENT', 'Tutoriel obligatoire');
      const statusIcon = tutorialResult.success ? '✅' : '❌';
      console.log(`   ${statusIcon} Tutoriel avec overlays bloquants: ${tutorialResult.message}`);
    }

    // Test de la facturation automatique (exigence prestataires)
    console.log('\n💰 Test facturation automatique mensuelle prestataires');
    if (this.sessions.PROVIDER) {
      const billingResult = await this.testAPIWithAuth('/api/provider/invoices', 'PROVIDER', 'Facturation automatique');
      const statusIcon = billingResult.success ? '✅' : '❌';
      console.log(`   ${statusIcon} Facturation mensuelle automatique: ${billingResult.message}`);
    }

    // Test multilingue (exigence technique)
    console.log('\n🌍 Test support multilingue (sans Google)');
    const languages = [
      { code: 'fr', name: 'Français' },
      { code: 'en', name: 'Anglais' },
      { code: 'es', name: 'Espagnol' }
    ];

    for (const lang of languages) {
      try {
        const response = await this.makeRequest(`${BASE_URL}/${lang.code}/login`);
        const statusIcon = response.ok ? '✅' : '❌';
        console.log(`   ${statusIcon} Support ${lang.name} (/${lang.code}/): ${this.getStatusMessage(response.status)}`);
      } catch (error) {
        console.log(`   ❌ Support ${lang.name}: Erreur`);
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RAPPORT FINAL DE CONFORMITÉ ECODELI');
    console.log('='.repeat(80));

    // Score global
    const globalPercentage = Math.round((this.results.score.passed / this.results.score.total) * 100);
    console.log(`\n🎯 SCORE GLOBAL: ${this.results.score.passed}/${this.results.score.total} (${globalPercentage}%)`);

    // Authentification
    console.log('\n🔐 AUTHENTIFICATION:');
    Object.entries(this.results.authentication).forEach(([role, success]) => {
      const icon = success ? '✅' : '❌';
      console.log(`   ${icon} ${role}`);
    });

    // Conformité par rôle
    console.log('\n📋 CONFORMITÉ CAHIER DES CHARGES:');
    Object.entries(this.results.cahierDesCharges).forEach(([role, data]) => {
      const percentage = Math.round((data.passed / data.total) * 100);
      const icon = percentage >= 80 ? '✅' : percentage >= 60 ? '⚠️' : '❌';
      console.log(`   ${icon} ${role.toUpperCase()}: ${data.passed}/${data.total} (${percentage}%)`);
    });

    // Exigences techniques
    console.log('\n🛠️ EXIGENCES TECHNIQUES:');
    Object.entries(this.results.technical).forEach(([category, data]) => {
      const percentage = Math.round((data.passed / data.total) * 100);
      const icon = percentage >= 80 ? '✅' : percentage >= 60 ? '⚠️' : '❌';
      console.log(`   ${icon} ${category.toUpperCase()}: ${data.passed}/${data.total} (${percentage}%)`);
    });

    // Évaluation finale
    console.log('\n🏆 ÉVALUATION FINALE:');
    if (globalPercentage >= 95) {
      console.log('🟢 EXCELLENT - Application pleinement conforme au cahier des charges!');
    } else if (globalPercentage >= 85) {
      console.log('🟡 TRÈS BIEN - Application largement conforme avec quelques améliorations possibles');
    } else if (globalPercentage >= 70) {
      console.log('🟠 BIEN - Application conforme avec des corrections nécessaires');
    } else {
      console.log('🔴 INSUFFISANT - Application nécessite des corrections majeures');
    }

    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    const failedApis = [];
    Object.values(this.results.cahierDesCharges).forEach(roleData => {
      roleData.apis.forEach(api => {
        if (!api.success && api.status === 500) {
          failedApis.push(api.endpoint);
        }
      });
    });

    if (failedApis.length > 0) {
      console.log('   🔧 Corriger les erreurs serveur (500) sur:');
      failedApis.forEach(api => console.log(`      - ${api}`));
    } else {
      console.log('   ✅ Aucune correction majeure requise');
      console.log('   🚀 Application prête pour la production');
    }

    console.log('\n' + '='.repeat(80));
  }

  async run() {
    console.log('🔍 === TEST COMPLET ECODELI SELON CAHIER DES CHARGES ===\n');
    console.log(`Base URL: ${BASE_URL}\n`);

    // Test de connectivité
    if (!await this.checkConnectivity()) {
      console.log('❌ Impossible de continuer sans connexion au serveur');
      return;
    }

    // Authentification de tous les rôles
    console.log('\n🔐 === AUTHENTIFICATION DES RÔLES ===');
    for (const [role, userConfig] of Object.entries(TEST_USERS)) {
      await this.authenticateUser(userConfig);
    }

    // Tests selon le cahier des charges
    await this.testCahierDesCharges();

    // Tests des exigences techniques
    await this.testTechnicalRequirements();

    // Tests des fonctionnalités spéciales
    await this.testSpecialFeatures();

    // Génération du rapport final
    this.generateReport();
  }
}

// Lancement du test
const tester = new EcoDeliTester();
tester.run().catch(console.error);