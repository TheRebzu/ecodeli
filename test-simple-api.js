// Test simple pour l'API announcements
const fetch = require('node-fetch');

async function testSimpleAPI() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Test API Simple');
  
  try {
    // 1. Connexion
    console.log('🔐 Connexion...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'client-complete@test.com',
        password: 'Test123!'
      })
    });
    
    console.log('🔍 Status connexion:', loginResponse.status);
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log('❌ Erreur de connexion:', errorText);
      return;
    }
    
    const loginData = await loginResponse.text();
    console.log('📝 Réponse connexion:', loginData);
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('🍪 Cookies reçus:', cookies);
    console.log('✅ Connexion OK');
    
    // 2. Test GET simple
    console.log('📋 Test GET announcements...');
    const getResponse = await fetch(`${baseUrl}/api/client/announcements`, {
      headers: {
        'Cookie': cookies || ''
      }
    });
    
    console.log('🔍 Status GET:', getResponse.status);
    
    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.log('❌ Erreur GET:', errorText);
      return;
    }
    
    const getData = await getResponse.text();
    console.log('📝 Réponse GET:', getData);
    console.log('✅ GET OK');
    
    // 3. Test POST sans validation Zod complexe
    console.log('➕ Test POST direct base...');
    
    // Testons directement avec l'API prisma pour contourner la validation Zod
    const directTest = await fetch(`${baseUrl}/api/test-direct-db`, {
      method: 'POST',
      headers: { 
        'Cookie': cookies || '',
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        title: 'Test Direct DB',
        description: 'Test sans validation Zod',
        type: 'PACKAGE_DELIVERY',
        price: 25
      })
    });
    
    console.log('Direct DB Status:', directTest.status);
    if (directTest.ok) {
      const directResult = await directTest.json();
      console.log('✅ Direct DB OK:', directResult);
    } else {
      const directError = await directTest.text();
      console.log('❌ Direct DB Error:', directError);
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  }
}

testSimpleAPI(); 