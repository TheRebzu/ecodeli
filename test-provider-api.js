const https = require('https');
const http = require('http');

// Configuration pour ignorer les certificats SSL auto-signés
const agent = new https.Agent({
  rejectUnauthorized: false
});

// Test de l'API provider/service-requests
async function testProviderAPI() {
  try {
    console.log('🔍 Test de l\'API provider/service-requests...');
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/provider/service-requests?page=1&limit=10',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Ajouter un cookie de session de test si nécessaire
        'Cookie': 'session=test-session'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`📊 Status: ${res.statusCode}`);
      console.log(`📊 Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('✅ Réponse API:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('📄 Réponse brute:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erreur requête:', error);
    });

    req.end();
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testProviderAPI(); 