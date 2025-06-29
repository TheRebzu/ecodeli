#!/usr/bin/env node

/**
 * Test des workflows métier EcoDeli selon le cahier des charges
 * Simulation de scénarios utilisateur complets
 */

const BASE_URL = 'http://localhost:3000';

class BusinessWorkflowTester {
  constructor() {
    this.sessions = {};
    this.testData = {};
  }

  async makeAuthenticatedRequest(endpoint, role, options = {}) {
    const session = this.sessions[role];
    if (!session) {
      throw new Error(`Pas de session pour le rôle ${role}`);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...session.headers,
        ...options.headers
      }
    });

    return response;
  }

  async authenticateUser(email, password, role) {
    console.log(`🔐 Authentification ${role}...`);
    
    try {
      // Tentative d'inscription
      await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role,
          firstName: 'Test',
          lastName: role,
          acceptTerms: true
        })
      });

      // Connexion
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const cookies = response.headers.get('set-cookie');
        if (cookies) {
          this.sessions[role] = {
            cookies,
            headers: { 'Cookie': cookies }
          };
          console.log(`✅ ${role} authentifié`);
          return true;
        }
      }
      
      console.log(`❌ Échec authentification ${role}`);
      return false;
    } catch (error) {
      console.log(`❌ Erreur authentification ${role}:`, error.message);
      return false;
    }
  }

  async testClientWorkflow() {
    console.log('\n👤 === WORKFLOW CLIENT (selon cahier des charges) ===');
    
    // 1. Tutoriel obligatoire première connexion
    console.log('\n🎓 Test: Tutoriel obligatoire première connexion');
    try {
      const tutorialResponse = await this.makeAuthenticatedRequest('/api/client/tutorial', 'CLIENT');
      const tutorialData = await tutorialResponse.json();
      
      if (tutorialResponse.ok) {
        console.log('✅ Tutoriel accessible');
        console.log('   📋 Étapes du tutoriel:', tutorialData.steps?.length || 'N/A');
      } else {
        console.log('❌ Tutoriel non accessible');
      }
    } catch (error) {
      console.log('❌ Erreur tutoriel:', error.message);
    }

    // 2. Création d'une annonce
    console.log('\n📝 Test: Création d\'une annonce de livraison');
    try {
      const announcementData = {
        title: 'Livraison de colis urgent',
        description: 'Livraison d\'un colis fragile à effectuer rapidement',
        type: 'PACKAGE_DELIVERY',
        pickupAddress: '123 Rue de la Paix, 75001 Paris',
        deliveryAddress: '456 Avenue de la Liberté, 69001 Lyon',
        price: 25.50,
        weight: 2.5,
        urgent: true,
        fragile: true
      };

      const createResponse = await this.makeAuthenticatedRequest('/api/client/announcements', 'CLIENT', {
        method: 'POST',
        body: JSON.stringify(announcementData)
      });

      if (createResponse.ok) {
        const announcement = await createResponse.json();
        this.testData.clientAnnouncement = announcement;
        console.log('✅ Annonce créée avec succès');
        console.log(`   🆔 ID: ${announcement.id}`);
      } else {
        console.log('❌ Échec création annonce');
      }
    } catch (error) {
      console.log('❌ Erreur création annonce:', error.message);
    }

    // 3. Réservation d'un service
    console.log('\n📅 Test: Réservation d\'un service prestataire');
    try {
      const bookingData = {
        serviceType: 'CLEANING',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 120,
        address: '789 Rue du Commerce, 75015 Paris',
        notes: 'Nettoyage de bureau, 2 pièces'
      };

      const bookingResponse = await this.makeAuthenticatedRequest('/api/client/bookings', 'CLIENT', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });

      if (bookingResponse.ok) {
        const booking = await bookingResponse.json();
        this.testData.clientBooking = booking;
        console.log('✅ Service réservé avec succès');
      } else {
        console.log('❌ Échec réservation service');
      }
    } catch (error) {
      console.log('❌ Erreur réservation service:', error.message);
    }

    // 4. Gestion des paiements
    console.log('\n💳 Test: Gestion des paiements');
    try {
      const paymentsResponse = await this.makeAuthenticatedRequest('/api/client/payments', 'CLIENT');
      
      if (paymentsResponse.ok) {
        const payments = await paymentsResponse.json();
        console.log('✅ Accès aux paiements disponible');
        console.log(`   💰 Paiements: ${payments.payments?.length || 0}`);
      } else {
        console.log('❌ Accès aux paiements indisponible');
      }
    } catch (error) {
      console.log('❌ Erreur accès paiements:', error.message);
    }

    // 5. Accès aux box de stockage
    console.log('\n📦 Test: Accès aux box de stockage');
    try {
      const storageResponse = await this.makeAuthenticatedRequest('/api/client/storage-boxes', 'CLIENT');
      
      if (storageResponse.ok) {
        const storage = await storageResponse.json();
        console.log('✅ Accès aux box de stockage disponible');
        console.log(`   📦 Box disponibles: ${storage.boxes?.length || 0}`);
      } else {
        console.log('❌ Accès aux box indisponible');
      }
    } catch (error) {
      console.log('❌ Erreur accès box:', error.message);
    }
  }

  async testDelivererWorkflow() {
    console.log('\n🚚 === WORKFLOW LIVREUR (selon cahier des charges) ===');

    // 1. Vérification du statut de validation
    console.log('\n📋 Test: Validation par pièces justificatives');
    try {
      const dashboardResponse = await this.makeAuthenticatedRequest('/api/deliverer/dashboard', 'DELIVERER');
      
      if (dashboardResponse.ok) {
        const dashboard = await dashboardResponse.json();
        console.log('✅ Dashboard livreur accessible');
        console.log(`   📄 Statut validation: ${dashboard.validationStatus || 'N/A'}`);
        console.log(`   🆔 Documents requis: ${dashboard.documents ? 'Oui' : 'Non'}`);
      } else {
        console.log('❌ Dashboard livreur inaccessible');
      }
    } catch (error) {
      console.log('❌ Erreur dashboard livreur:', error.message);
    }

    // 2. Gestion des opportunités de livraison
    console.log('\n🎯 Test: Opportunités de livraison');
    try {
      const opportunitiesResponse = await this.makeAuthenticatedRequest('/api/deliverer/opportunities', 'DELIVERER');
      
      if (opportunitiesResponse.ok) {
        const opportunities = await opportunitiesResponse.json();
        console.log('✅ Opportunités de livraison accessibles');
        console.log(`   📦 Opportunités: ${opportunities.opportunities?.length || 0}`);
      } else {
        console.log('❌ Opportunités non accessibles');
      }
    } catch (error) {
      console.log('❌ Erreur opportunités:', error.message);
    }

    // 3. Gestion du portefeuille et paiements
    console.log('\n💰 Test: Gestion des paiements livreur');
    try {
      const walletResponse = await this.makeAuthenticatedRequest('/api/deliverer/wallet', 'DELIVERER');
      
      if (walletResponse.ok) {
        const wallet = await walletResponse.json();
        console.log('✅ Portefeuille livreur accessible');
        console.log(`   💵 Solde: ${wallet.balance || 0}€`);
        console.log(`   📊 Gains: ${wallet.totalEarnings || 0}€`);
      } else {
        console.log('❌ Portefeuille non accessible');
      }
    } catch (error) {
      console.log('❌ Erreur portefeuille:', error.message);
    }

    // 4. Optimisation des trajets
    console.log('\n🗺️ Test: Planning et optimisation des trajets');
    try {
      const routeResponse = await this.makeAuthenticatedRequest('/api/deliverer/route-optimization', 'DELIVERER');
      
      if (routeResponse.ok) {
        const routes = await routeResponse.json();
        console.log('✅ Optimisation des trajets disponible');
        console.log(`   🛣️ Routes optimisées: ${routes.routes?.length || 0}`);
      } else {
        console.log('❌ Optimisation des trajets indisponible');
      }
    } catch (error) {
      console.log('❌ Erreur optimisation trajets:', error.message);
    }
  }

  async testProviderWorkflow() {
    console.log('\n👨‍🔧 === WORKFLOW PRESTATAIRE (selon cahier des charges) ===');

    // 1. Suivi des évaluations clients
    console.log('\n⭐ Test: Suivi des évaluations des prestations');
    try {
      const reviewsResponse = await this.makeAuthenticatedRequest('/api/provider/reviews', 'PROVIDER');
      
      if (reviewsResponse.ok) {
        const reviews = await reviewsResponse.json();
        console.log('✅ Évaluations accessibles');
        console.log(`   ⭐ Note moyenne: ${reviews.averageRating || 'N/A'}`);
        console.log(`   📝 Nombre d\'évaluations: ${reviews.totalReviews || 0}`);
      } else {
        console.log('❌ Évaluations non accessibles');
      }
    } catch (error) {
      console.log('❌ Erreur évaluations:', error.message);
    }

    // 2. Calendrier des disponibilités
    console.log('\n📅 Test: Calendrier des disponibilités');
    try {
      const availabilityResponse = await this.makeAuthenticatedRequest('/api/provider/availability', 'PROVIDER');
      
      if (availabilityResponse.ok) {
        const availability = await availabilityResponse.json();
        console.log('✅ Calendrier de disponibilités accessible');
        console.log(`   📅 Créneaux: ${availability.slots?.length || 0}`);
      } else {
        console.log('❌ Calendrier non accessible');
      }
    } catch (error) {
      console.log('❌ Erreur calendrier:', error.message);
    }

    // 3. Gestion des interventions
    console.log('\n🔧 Test: Gestion des interventions');
    try {
      const interventionsResponse = await this.makeAuthenticatedRequest('/api/provider/interventions?providerId=test', 'PROVIDER');
      
      if (interventionsResponse.ok) {
        const interventions = await interventionsResponse.json();
        console.log('✅ Gestion des interventions disponible');
        console.log(`   🔧 Interventions: ${interventions.interventions?.length || 0}`);
      } else {
        console.log('❌ Gestion des interventions indisponible');
      }
    } catch (error) {
      console.log('❌ Erreur interventions:', error.message);
    }

    // 4. Facturation automatique mensuelle
    console.log('\n💼 Test: Facturation automatique mensuelle');
    try {
      const invoicesResponse = await this.makeAuthenticatedRequest('/api/provider/invoices', 'PROVIDER');
      
      if (invoicesResponse.ok) {
        const invoices = await invoicesResponse.json();
        console.log('✅ Facturation automatique disponible');
        console.log(`   📄 Factures: ${invoices.invoices?.length || 0}`);
        console.log(`   💰 Gains mensuels: ${invoices.monthlyEarnings || 0}€`);
      } else {
        console.log('❌ Facturation automatique indisponible');
      }
    } catch (error) {
      console.log('❌ Erreur facturation:', error.message);
    }

    // 5. Validation et habilitations
    console.log('\n📋 Test: Validation et habilitations');
    try {
      const documentsResponse = await this.makeAuthenticatedRequest('/api/provider/documents', 'PROVIDER');
      
      if (documentsResponse.ok) {
        const documents = await documentsResponse.json();
        console.log('✅ Système de validation accessible');
        console.log(`   📄 Documents: ${documents.documents?.length || 0}`);
        console.log(`   ✅ Statut validation: ${documents.validationStatus || 'N/A'}`);
      } else {
        console.log('❌ Système de validation indisponible');
      }
    } catch (error) {
      console.log('❌ Erreur validation:', error.message);
    }
  }

  async testMerchantWorkflow() {
    console.log('\n🏪 === WORKFLOW COMMERÇANT (selon cahier des charges) ===');

    // 1. Gestion des annonces avec import en masse
    console.log('\n📦 Test: Gestion des annonces (import en masse)');
    try {
      const announcementsResponse = await this.makeAuthenticatedRequest('/api/merchant/announcements/bulk', 'MERCHANT');
      
      if (announcementsResponse.ok) {
        console.log('✅ Import en masse d\'annonces disponible');
      } else {
        console.log('❌ Import en masse indisponible');
      }
    } catch (error) {
      console.log('❌ Erreur import en masse:', error.message);
    }

    // 2. Gestion des commandes et facturation
    console.log('\n💰 Test: Gestion de la facturation');
    try {
      const ordersResponse = await this.makeAuthenticatedRequest('/api/merchant/orders', 'MERCHANT');
      
      if (ordersResponse.ok) {
        const orders = await ordersResponse.json();
        console.log('✅ Gestion de la facturation accessible');
        console.log(`   📄 Commandes: ${orders.orders?.length || 0}`);
      } else {
        console.log('❌ Gestion de la facturation indisponible');
      }
    } catch (error) {
      console.log('❌ Erreur facturation commerçant:', error.message);
    }
  }

  async testAdminWorkflow() {
    console.log('\n👑 === WORKFLOW ADMINISTRATION (selon cahier des charges) ===');

    // 1. Gestion centralisée des utilisateurs
    console.log('\n👥 Test: Gestion des utilisateurs');
    try {
      const usersResponse = await this.makeAuthenticatedRequest('/api/admin/users', 'ADMIN');
      
      if (usersResponse.ok) {
        const users = await usersResponse.json();
        console.log('✅ Gestion centralisée des utilisateurs');
        console.log(`   👥 Utilisateurs: ${users.users?.length || 0}`);
      } else {
        console.log('❌ Gestion des utilisateurs indisponible');
      }
    } catch (error) {
      console.log('❌ Erreur gestion utilisateurs:', error.message);
    }

    // 2. Gestion financière
    console.log('\n💰 Test: Gestion financière de l\'entreprise');
    try {
      const financeResponse = await this.makeAuthenticatedRequest('/api/admin/finance', 'ADMIN');
      
      if (financeResponse.ok) {
        const finance = await financeResponse.json();
        console.log('✅ Gestion financière accessible');
        console.log(`   💵 Revenus: ${finance.totalRevenue || 0}€`);
        console.log(`   📊 Charges: ${finance.totalExpenses || 0}€`);
      } else {
        console.log('❌ Gestion financière indisponible');
      }
    } catch (error) {
      console.log('❌ Erreur gestion financière:', error.message);
    }

    // 3. Monitoring système
    console.log('\n📊 Test: Monitoring et métriques système');
    try {
      const monitoringResponse = await this.makeAuthenticatedRequest('/api/admin/monitoring/metrics', 'ADMIN');
      
      if (monitoringResponse.ok) {
        const metrics = await monitoringResponse.json();
        console.log('✅ Monitoring système accessible');
        console.log(`   📈 Métriques: ${Object.keys(metrics).length || 0}`);
      } else {
        console.log('❌ Monitoring système indisponible');
      }
    } catch (error) {
      console.log('❌ Erreur monitoring:', error.message);
    }

    // 4. Tests système (email et notifications)
    console.log('\n📧 Test: Tests système');
    try {
      const emailTestResponse = await this.makeAuthenticatedRequest('/api/admin/tests/email', 'ADMIN');
      const notifTestResponse = await this.makeAuthenticatedRequest('/api/admin/tests/notification', 'ADMIN');
      
      const emailOk = emailTestResponse.ok;
      const notifOk = notifTestResponse.ok;
      
      console.log(`   📧 Test email: ${emailOk ? '✅' : '❌'}`);
      console.log(`   🔔 Test notifications: ${notifOk ? '✅' : '❌'}`);
    } catch (error) {
      console.log('❌ Erreur tests système:', error.message);
    }
  }

  async testTechnicalRequirements() {
    console.log('\n🛠️ === EXIGENCES TECHNIQUES (selon cahier des charges) ===');

    // 1. Test Stripe (paiements)
    console.log('\n💳 Test: Intégration Stripe');
    try {
      const stripeResponse = await this.makeAuthenticatedRequest('/api/webhooks/stripe', 'ADMIN');
      console.log(`   💳 Webhooks Stripe: ${stripeResponse.ok ? '✅' : '❌'}`);
    } catch (error) {
      console.log('   💳 Webhooks Stripe: ❌');
    }

    // 2. Test OneSignal (notifications push)
    console.log('\n🔔 Test: Notifications push OneSignal');
    try {
      const onesignalResponse = await this.makeAuthenticatedRequest('/api/webhooks/onesignal', 'ADMIN');
      console.log(`   🔔 OneSignal: ${onesignalResponse.ok ? '✅' : '❌'}`);
    } catch (error) {
      console.log('   🔔 OneSignal: ❌');
    }

    // 3. Test génération PDF
    console.log('\n📄 Test: Génération automatique de documents PDF');
    try {
      const pdfResponse = await this.makeAuthenticatedRequest('/api/documents/generate', 'ADMIN');
      console.log(`   📄 Génération PDF: ${pdfResponse.ok ? '✅' : '❌'}`);
    } catch (error) {
      console.log('   📄 Génération PDF: ❌');
    }

    // 4. Test multilingue
    console.log('\n🌍 Test: Support multilingue');
    const languages = ['fr', 'en', 'es'];
    for (const lang of languages) {
      try {
        const response = await fetch(`${BASE_URL}/${lang}/login`);
        console.log(`   🌍 ${lang.toUpperCase()}: ${response.ok ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`   🌍 ${lang.toUpperCase()}: ❌`);
      }
    }
  }

  async run() {
    console.log('🔍 === TEST WORKFLOWS MÉTIER ECODELI ===\n');
    console.log(`Base URL: ${BASE_URL}\n`);

    // Authentification des utilisateurs de test
    const users = [
      { email: 'client@ecodeli.test', password: 'TestClient123!', role: 'CLIENT' },
      { email: 'livreur@ecodeli.test', password: 'TestLivreur123!', role: 'DELIVERER' },
      { email: 'commercant@ecodeli.test', password: 'TestCommercant123!', role: 'MERCHANT' },
      { email: 'prestataire@ecodeli.test', password: 'TestPrestataire123!', role: 'PROVIDER' },
      { email: 'admin@ecodeli.test', password: 'TestAdmin123!', role: 'ADMIN' }
    ];

    console.log('🔐 === AUTHENTIFICATION ===');
    for (const user of users) {
      await this.authenticateUser(user.email, user.password, user.role);
    }

    // Tests des workflows métier
    await this.testClientWorkflow();
    await this.testDelivererWorkflow();
    await this.testProviderWorkflow();
    await this.testMerchantWorkflow();
    await this.testAdminWorkflow();
    await this.testTechnicalRequirements();

    console.log('\n' + '='.repeat(80));
    console.log('🎯 WORKFLOWS MÉTIER TESTÉS SELON LE CAHIER DES CHARGES');
    console.log('='.repeat(80));
    console.log('\n✅ Tests terminés - Vérifiez les résultats ci-dessus');
    console.log('🚀 Application prête pour validation fonctionnelle');
  }
}

// Lancement du test
const tester = new BusinessWorkflowTester();
tester.run().catch(console.error);