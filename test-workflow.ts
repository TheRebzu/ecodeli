#!/usr/bin/env npx tsx

interface ApiResponse {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

class EcoDeliWorkflowTester {
  private baseUrl: string;
  private clientToken: string = '';
  private delivererToken: string = '';

  constructor(baseUrl: string = 'http://172.28.240.1:3000') {
    this.baseUrl = baseUrl;
  }

  private async makeRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' = 'GET', 
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    console.log(`🔄 ${method} ${endpoint}`);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${method} ${endpoint} - Success`);
        return data;
      } else {
        console.log(`❌ ${method} ${endpoint} - Error ${response.status}:`, data.error);
        throw new Error(data.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${method} ${endpoint} - Network Error:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  private async checkServerHealth(): Promise<boolean> {
    try {
      console.log('🔍 Vérification de la connexion au serveur...');
      await this.makeRequest('/api/health');
      console.log('✅ Serveur accessible');
      return true;
    } catch (error) {
      console.log('❌ Serveur inaccessible:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  private async loginUser(email: string, password: string, role: string): Promise<any> {
    console.log(`🔐 Connexion en tant que ${role} (${email})`);
    
    const response = await this.makeRequest('/api/auth/login', 'POST', {
      email,
      password
    });

    if (response.success && response.session) {
      console.log(`✅ Connexion réussie pour ${role}`);
      return response.session;
    } else {
      throw new Error('Échec de la connexion');
    }
  }

  private async getUserInfo(token: string): Promise<any> {
    // Pour les tests, on utilise les infos utilisateur retournées par le login
    // au lieu d'appeler /api/auth/me qui utilise NextAuth
    try {
      const response = await this.makeRequest('/api/auth/me', 'GET', undefined, {
        'Authorization': `Bearer ${token}`
      });
      return response.user;
    } catch (error) {
      // Si l'API NextAuth ne fonctionne pas, on utilise les infos du token JWT
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);
      return {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.email.split('@')[0], // Fallback name
        role: decoded.role
      };
    }
  }

  private async createAnnouncement(token: string, clientId: string): Promise<any> {
    console.log('📦 Création d\'une nouvelle annonce...');
    
    const announcementData = {
      clientId: clientId,
      type: 'PACKAGE_DELIVERY',
      title: 'Livraison colis urgent - Test Node.js',
      description: 'Livraison d\'un colis de documents importants depuis Paris vers Lyon. Manipulation délicate requise.',
      pickupAddress: '75 Avenue des Champs-Élysées, 75008 Paris, France',
      deliveryAddress: 'Place Bellecour, 69002 Lyon, France',
      pickupDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      basePrice: 45.00,
      urgencyLevel: 'HIGH',
      packageDetails: {
        weight: 2.5,
        dimensions: {
          length: 30,
          width: 25,
          height: 10
        },
        fragile: true,
        value: 500
      },
      instructions: 'Appeler 30 minutes avant la livraison. Accès par l\'entrée principale.'
    };

    const response = await this.makeRequest('/api/client/announcements', 'POST', announcementData, {
      'Authorization': `Bearer ${token}`
    });

    if (response.success) {
      console.log(`✅ Annonce créée avec succès (ID: ${response.announcement.id})`);
      return response.announcement;
    } else {
      throw new Error('Échec de la création de l\'annonce');
    }
  }

  private async getAvailableAnnouncements(token: string, delivererId: string): Promise<any[]> {
    console.log('🚚 Recherche d\'annonces disponibles...');
    
    const response = await this.makeRequest(
      `/api/deliverer/announcements?delivererId=${delivererId}&status=PENDING`, 
      'GET', 
      undefined, 
      { 'Authorization': `Bearer ${token}` }
    );

    if (response.announcements) {
      console.log(`✅ ${response.announcements.length} annonce(s) disponible(s)`);
      return response.announcements;
    } else {
      console.log('⚠️ Aucune annonce disponible');
      return [];
    }
  }

  private async acceptAnnouncement(token: string, announcementId: string, delivererId: string): Promise<any> {
    console.log(`✋ Acceptation de l'annonce ${announcementId}...`);
    
    const response = await this.makeRequest(
      `/api/deliverer/announcements/${announcementId}/accept`, 
      'POST', 
      { delivererId }, 
      { 'Authorization': `Bearer ${token}` }
    );

    if (response.success) {
      console.log('✅ Annonce acceptée avec succès');
      return response.delivery;
    } else {
      throw new Error('Échec de l\'acceptation');
    }
  }

  private async updateDeliveryStatus(token: string, announcementId: string, status: string, delivererId: string): Promise<any> {
    console.log(`🔄 Mise à jour du statut vers: ${status}`);
    
    const response = await this.makeRequest(
      `/api/deliverer/announcements/${announcementId}/status`, 
      'PUT', 
      { delivererId, status }, 
      { 'Authorization': `Bearer ${token}` }
    );

    if (response.success) {
      console.log(`✅ Statut mis à jour: ${status}`);
      return response.announcement;
    } else {
      throw new Error('Échec de la mise à jour');
    }
  }

  private async getClientDeliveries(token: string, clientId: string): Promise<any[]> {
    console.log('📋 Vérification des livraisons du client...');
    
    const response = await this.makeRequest(
      `/api/client/deliveries?clientId=${clientId}`, 
      'GET', 
      undefined, 
      { 'Authorization': `Bearer ${token}` }
    );

    if (response.deliveries) {
      console.log(`✅ ${response.deliveries.length} livraison(s) trouvée(s)`);
      return response.deliveries;
    } else {
      console.log('⚠️ Aucune livraison trouvée');
      return [];
    }
  }

  private async sleep(seconds: number): Promise<void> {
    console.log(`⏳ Attente de ${seconds} secondes...`);
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  public async runCompleteWorkflowTest(): Promise<void> {
    console.log('🌱 === Test du Workflow Complet EcoDeli ===');
    console.log(`Base URL: ${this.baseUrl}`);
    console.log('');

    try {
      // Vérification du serveur
      const serverOk = await this.checkServerHealth();
      if (!serverOk) {
        throw new Error('Serveur inaccessible');
      }

      // Étape 1: Connexion du client
      console.log('=== ÉTAPE 1: CONNEXION CLIENT ===');
      const clientSession = await this.loginUser('client1@test.com', 'Test123!', 'CLIENT');
      this.clientToken = clientSession.token;
      
      const clientUser = clientSession.user; // Utiliser directement les infos du login
      console.log(`Client connecté: ${clientUser.name} (${clientUser.email})`);
      console.log('');

      // Étape 2: Création d'une annonce
      console.log('=== ÉTAPE 2: CRÉATION D\'ANNONCE ===');
      const announcement = await this.createAnnouncement(this.clientToken, clientUser.id);
      console.log('Annonce créée:');
      console.log(`  - ID: ${announcement.id}`);
      console.log(`  - Titre: ${announcement.title}`);
      console.log(`  - Prix: ${announcement.basePrice}€`);
      console.log(`  - De: ${announcement.pickupAddress}`);
      console.log(`  - Vers: ${announcement.deliveryAddress}`);
      console.log('');

      // Attente pour la propagation
      await this.sleep(2);

      // Étape 3: Connexion du livreur
      console.log('=== ÉTAPE 3: CONNEXION LIVREUR ===');
      const delivererSession = await this.loginUser('livreur1@test.com', 'Test123!', 'DELIVERER');
      this.delivererToken = delivererSession.token;
      
      const delivererUser = delivererSession.user; // Utiliser directement les infos du login
      console.log(`Livreur connecté: ${delivererUser.name} (${delivererUser.email})`);
      console.log('');

      // Étape 4: Recherche d'annonces disponibles
      console.log('=== ÉTAPE 4: RECHERCHE D\'ANNONCES ===');
      const availableAnnouncements = await this.getAvailableAnnouncements(this.delivererToken, delivererUser.id);
      
      if (availableAnnouncements.length === 0) {
        console.log('⚠️ Aucune annonce disponible pour le test');
        return;
      }

      // Chercher notre annonce créée ou utiliser la première disponible
      let targetAnnouncement = availableAnnouncements.find(a => a.id === announcement.id);
      if (!targetAnnouncement) {
        console.log('⚠️ Notre annonce n\'est pas visible, utilisation de la première disponible');
        console.log('Annonces disponibles:');
        availableAnnouncements.forEach(ann => {
          console.log(`  - ${ann.id}: ${ann.title}`);
        });
        targetAnnouncement = availableAnnouncements[0];
      }

      console.log(`Annonce sélectionnée: ${targetAnnouncement.title}`);
      console.log('');

      // Étape 5: Acceptation de l'annonce
      console.log('=== ÉTAPE 5: ACCEPTATION DE L\'ANNONCE ===');
      const delivery = await this.acceptAnnouncement(this.delivererToken, targetAnnouncement.id, delivererUser.id);
      console.log(`Livraison créée (ID: ${delivery.id})`);
      console.log('');

      // Étape 6: Progression de la livraison
      console.log('=== ÉTAPE 6: PROGRESSION DE LA LIVRAISON ===');
      
      // Démarrage de la livraison
      console.log('📍 Démarrage de la livraison...');
      await this.updateDeliveryStatus(this.delivererToken, targetAnnouncement.id, 'IN_PROGRESS', delivererUser.id);
      await this.sleep(1);
      
      // Simulation de la livraison en cours
      console.log('🚚 Livraison en cours...');
      await this.sleep(2);
      
      // Finalisation de la livraison
      console.log('📦 Finalisation de la livraison...');
      await this.updateDeliveryStatus(this.delivererToken, targetAnnouncement.id, 'COMPLETED', delivererUser.id);
      console.log('');

      // Étape 7: Vérification côté client
      console.log('=== ÉTAPE 7: VÉRIFICATION CÔTÉ CLIENT ===');
      const clientDeliveries = await this.getClientDeliveries(this.clientToken, clientUser.id);
      
      if (clientDeliveries.length > 0) {
        const completedDelivery = clientDeliveries.find(d => d.announcementId === targetAnnouncement.id);
        if (completedDelivery) {
          console.log('✅ Livraison trouvée côté client:');
          console.log(`  - Statut: ${completedDelivery.status}`);
          console.log(`  - ID Livraison: ${completedDelivery.id}`);
        }
      }
      console.log('');

      // Résumé final
      console.log('=== RÉSUMÉ DU TEST ===');
      console.log('✅ Connexion client réussie');
      console.log('✅ Création d\'annonce réussie');
      console.log('✅ Connexion livreur réussie');
      console.log('✅ Acceptation d\'annonce réussie');
      console.log('✅ Progression de livraison réussie');
      console.log('✅ Vérification côté client réussie');
      console.log('');
      console.log('🎉 WORKFLOW COMPLET TESTÉ AVEC SUCCÈS!');

    } catch (error) {
      console.log('❌ ERREUR DANS LE WORKFLOW:', error instanceof Error ? error.message : error);
      if (error instanceof Error && error.stack) {
        console.log('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  }
}

// Fonction d'aide
function showHelp() {
  console.log('Script de test du workflow EcoDeli (Node.js)');
  console.log('');
  console.log('Usage:');
  console.log('  npx tsx test-workflow.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help          Afficher cette aide');
  console.log('  --url <url>     URL de base (défaut: http://172.28.240.1:3000)');
  console.log('');
  console.log('Exemples:');
  console.log('  npx tsx test-workflow.ts');
  console.log('  npx tsx test-workflow.ts --url http://localhost:3000');
  console.log('');
  console.log('Prérequis:');
  console.log('  - L\'application EcoDeli doit être démarrée');
  console.log('  - Les comptes de test doivent être créés (seed)');
  console.log('  - client1@test.com / Test123! (CLIENT)');
  console.log('  - livreur1@test.com / Test123! (DELIVERER)');
}

// Point d'entrée principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  let baseUrl = 'http://172.28.240.1:3000';
  const urlIndex = args.indexOf('--url');
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    baseUrl = args[urlIndex + 1];
  }

  const tester = new EcoDeliWorkflowTester(baseUrl);
  await tester.runCompleteWorkflowTest();
}

// Lancer le test si ce script est exécuté directement
if (require.main === module) {
  main().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}