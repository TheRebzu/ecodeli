#!/usr/bin/env node

/**
 * Test pour vérifier que NextAuth fonctionne correctement avec les cookies
 */

const BASE_URL = 'http://172.30.80.1:3000';

async function testNextAuthIntegration() {
  console.log('🔍 === TEST INTÉGRATION NEXTAUTH ===\n');
  
  try {
    // Test 1: Vérifier que /api/auth/session fonctionne
    console.log('📡 Test de /api/auth/session...');
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`);
    console.log(`✅ Session API: ${sessionResponse.status} ${sessionResponse.statusText}`);
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      if (sessionData && sessionData.user) {
        console.log(`✅ Session active trouvée: ${sessionData.user.email}`);
      } else {
        console.log('💡 Aucune session active (normal sans cookie)');
      }
    }
    
    // Test 2: Vérifier que les APIs protégées retournent le bon message
    console.log('\n📡 Test des APIs protégées...');
    const protectedAPIs = [
      '/api/admin/users',
      '/api/client/dashboard',
      '/api/deliverer/dashboard'
    ];
    
    for (const api of protectedAPIs) {
      const response = await fetch(`${BASE_URL}${api}`);
      const data = await response.json();
      
      console.log(`${api}: ${response.status} - ${data.error || data.message || 'OK'}`);
      
      // Vérifier que c'est bien "Accès refusé" et non "Non authentifié"
      if (data.error && data.error.includes('Accès refusé')) {
        console.log('✅ Erreur correcte: API utilise bien NextAuth');
      } else if (data.error && data.error.includes('Non authentifié')) {
        console.log('❌ Erreur ancienne: API n\'utilise pas NextAuth correctement');
      }
    }
    
    // Test 3: Instructions pour test manuel
    console.log('\n📋 === INSTRUCTIONS TEST MANUEL ===\n');
    console.log('Pour vérifier que NextAuth fonctionne complètement :');
    console.log('');
    console.log('1. Ouvrir dans le navigateur: http://172.30.80.1:3000/fr/login');
    console.log('2. Se connecter avec: admin1@test.com / Test123!');
    console.log('3. Après connexion, tester: http://172.30.80.1:3000/api/admin/users');
    console.log('4. Devrait retourner JSON des utilisateurs (pas d\'erreur)');
    console.log('');
    console.log('Si ça marche = NextAuth fonctionne parfaitement ! 🎉');
    
  } catch (error) {
    console.log('❌ Erreur de test:', error.message);
  }
}

testNextAuthIntegration();