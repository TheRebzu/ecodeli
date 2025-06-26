/**
 * Test simple de la page client dashboard
 */

const CLIENT_TOKEN = 'w6m2kpYA9JzaXBA0xZBBN92U9oP2TKSk.2myQ4P0qD7jyOAuzzBYNu%2BDIky5uDwG2Iu12tCogs6g%3D'

async function testClientPage() {
  console.log('🧪 Test de la page client dashboard')
  console.log('=' .repeat(50))

  try {
    // 1. Tester l'API dashboard
    console.log('1️⃣ Test API dashboard...')
    const apiResponse = await fetch('http://localhost:3000/api/client/dashboard', {
      headers: {
        'Cookie': `better-auth.session_token=${CLIENT_TOKEN}`
      }
    })

    if (apiResponse.ok) {
      const data = await apiResponse.json()
      console.log('✅ API Dashboard fonctionne')
      console.log(`   - Utilisateur: ${data.client?.user?.name || 'N/A'}`)
      console.log(`   - Abonnement: ${data.client?.subscriptionPlan || 'N/A'}`)
      console.log(`   - Tutoriel: ${data.tutorial?.completed ? 'Terminé' : 'En cours'}`)
      console.log(`   - Annonces: ${data.stats?.totalAnnouncements || 0}`)
      console.log(`   - Livraisons: ${data.stats?.activeDeliveries || 0}`)
    } else {
      console.log('❌ API Dashboard échoue:', apiResponse.status)
    }

    // 2. Tester la page HTML
    console.log('\n2️⃣ Test page HTML...')
    const pageResponse = await fetch('http://localhost:3000/fr/client', {
      headers: {
        'Cookie': `better-auth.session_token=${CLIENT_TOKEN}`,
        'Accept': 'text/html'
      }
    })

    if (pageResponse.ok) {
      const html = await pageResponse.text()
      
      // Vérifier que ce n'est pas une page d'erreur
      if (html.includes('Application error')) {
        console.log('❌ Page contient une erreur d\'application')
        
        // Extraire l'erreur si possible
        const errorMatch = html.match(/Application error: ([^<]+)/)
        if (errorMatch) {
          console.log(`   Erreur: ${errorMatch[1]}`)
        }
      } else if (html.includes('Tableau de Bord') || html.includes('Dashboard')) {
        console.log('✅ Page client dashboard se charge correctement')
        console.log('   - Contient le titre du dashboard')
        
        // Vérifier d'autres éléments
        if (html.includes('Annonces')) {
          console.log('   - Section annonces présente')
        }
        if (html.includes('Actions Rapides')) {
          console.log('   - Actions rapides présentes')
        }
      } else {
        console.log('⚠️  Page se charge mais contenu inattendu')
      }
    } else {
      console.log('❌ Page HTML échoue:', pageResponse.status)
    }

    // 3. Vérifier les ressources statiques
    console.log('\n3️⃣ Test ressources...')
    
    const resourceTests = [
      { name: 'CSS Global', url: '/globals.css' },
      { name: 'Health Check', url: '/api/health' }
    ]

    for (const resource of resourceTests) {
      try {
        const response = await fetch(`http://localhost:3000${resource.url}`)
        console.log(`   ${response.ok ? '✅' : '❌'} ${resource.name}: ${response.status}`)
      } catch (error) {
        console.log(`   ❌ ${resource.name}: ${error.message}`)
      }
    }

  } catch (error) {
    console.log('❌ Erreur générale:', error.message)
  }

  console.log('\n🎯 RÉSUMÉ:')
  console.log('Si l\'API fonctionne mais la page a des erreurs,')
  console.log('vérifiez la console du navigateur pour plus de détails.')
  console.log('\n💡 COMMANDES UTILES:')
  console.log('- Ouvrir http://localhost:3000/fr/client dans le navigateur')
  console.log('- Ouvrir les DevTools (F12) pour voir les erreurs JavaScript')
  console.log('- Vérifier la console pour les erreurs de composants React')
}

testClientPage().catch(console.error)

// Script de test pour l'API client announcements
const fetch = require('node-fetch');

async function testClientAnnouncementsAPI() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Test de l\'API Client Announcements');
  
  try {
    // 1. Se connecter d'abord
    console.log('\n1️⃣ Connexion avec client-complete@test.com...');
    
    const loginResponse = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'client-complete@test.com',
        password: 'Test123!'
      })
    });
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.log('❌ Erreur de connexion:', loginResponse.status, error);
      return;
    }
    
    // Récupérer les cookies de session
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Connexion réussie');
    console.log('🍪 Cookies reçus:', cookies ? 'Oui' : 'Non');
    
    // 2. Tester GET /api/client/announcements
    console.log('\n2️⃣ Test GET /api/client/announcements...');
    
    const getResponse = await fetch(`${baseUrl}/api/client/announcements`, {
      method: 'GET',
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Status:', getResponse.status);
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('✅ Réponse GET annonces:', {
        totalAnnouncements: data.announcements?.length || 'Non défini',
        pagination: data.pagination || 'Non défini'
      });
    } else {
      const error = await getResponse.text();
      console.log('❌ Erreur GET:', error);
    }
    
    // 3. Tester POST /api/client/announcements avec des données conformes au schéma
    console.log('\n3️⃣ Test POST /api/client/announcements...');
    
    const testAnnouncement = {
      title: 'Test Livraison Paris-Lyon',
      description: 'Test de création d\'annonce via API pour transport d\'un colis fragile',
      type: 'PACKAGE_DELIVERY',
      startLocation: {
        address: '110 rue de Flandre, Paris',
        city: 'Paris',
        postalCode: '75019',
        country: 'FR'
      },
      endLocation: {
        address: 'Place Bellecour, Lyon',
        city: 'Lyon', 
        postalCode: '69002',
        country: 'FR'
      },
      desiredDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Demain
      price: 25.50,
      currency: 'EUR',
      urgent: false,
      packageDetails: {
        weight: 2.5,
        length: 30,
        width: 20,
        height: 15,
        fragile: true,
        requiresInsurance: true,
        insuredValue: 100,
        content: 'Produits électroniques fragiles',
        specialHandling: 'Manipuler avec précaution - fragile'
      }
    };
    
    const postResponse = await fetch(`${baseUrl}/api/client/announcements`, {
      method: 'POST',
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAnnouncement)
    });
    
    console.log('📊 Status POST:', postResponse.status);
    
    if (postResponse.ok) {
      const createdAnnouncement = await postResponse.json();
      console.log('✅ Annonce créée:', {
        id: createdAnnouncement.id,
        title: createdAnnouncement.title,
        status: createdAnnouncement.status,
        type: createdAnnouncement.type,
        price: createdAnnouncement.price
      });
      
      // 4. Re-tester GET pour voir l'annonce créée
      console.log('\n4️⃣ Re-test GET après création...');
      
      const getResponse2 = await fetch(`${baseUrl}/api/client/announcements`, {
        method: 'GET',
        headers: {
          'Cookie': cookies || '',
          'Content-Type': 'application/json'
        }
      });
      
      if (getResponse2.ok) {
        const data2 = await getResponse2.json();
        console.log('✅ Annonces après création:', {
          totalAnnouncements: data2.announcements?.length || 0,
          pagination: data2.pagination || 'Non défini'
        });
        
        if (data2.announcements && data2.announcements.length > 0) {
          console.log('📋 Première annonce:', {
            id: data2.announcements[0].id,
            title: data2.announcements[0].title,
            type: data2.announcements[0].type,
            status: data2.announcements[0].status
          });
        }
      }
      
    } else {
      const error = await postResponse.text();
      console.log('❌ Erreur POST:', error);
    }
    
  } catch (error) {
    console.error('💥 Erreur script:', error.message);
  }
}

testClientAnnouncementsAPI(); 