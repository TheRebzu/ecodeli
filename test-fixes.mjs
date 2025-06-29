/**
 * Test rapide des corrections apportées (version ESM)
 */

async function testFixes() {
  const baseUrl = 'http://172.30.80.1:3000';

  console.log('🧪 Test des corrections EcoDeli');
  console.log('================================\n');

  // Test 1: API Health Check
  try {
    console.log('1. Test Health Check...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    console.log(`   ✅ Status: ${healthResponse.status}`);
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }

  // Test 2: Login pour obtenir un token
  try {
    console.log('2. Test Login Client...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'client1@test.com',
        password: 'Test123!'
      })
    });
    
    if (loginResponse.status === 200) {
      console.log('   ✅ Login réussi');
    } else {
      console.log(`   ❌ Login échoué: ${loginResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur login: ${error.message}`);
  }

  // Test 3: API Client Announcements (la plus problématique)
  try {
    console.log('3. Test API Client Announcements...');
    const announcementsResponse = await fetch(`${baseUrl}/api/client/announcements`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (announcementsResponse.status === 401) {
      console.log('   ✅ API répond (auth requise - normal)');
    } else if (announcementsResponse.status === 200) {
      console.log('   ✅ API répond avec succès');
    } else if (announcementsResponse.status === 500) {
      console.log('   ❌ Erreur serveur 500 - correction nécessaire');
    } else {
      console.log(`   ⚠️ Status inattendu: ${announcementsResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur API: ${error.message}`);
  }

  console.log('\n🎯 Test terminé!');
}

// Exécution
testFixes().catch(console.error);