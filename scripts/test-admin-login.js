const https = require('http');

async function testAdminLogin() {
  const loginData = JSON.stringify({
    email: 'admin-complete@test.com',
    password: 'Test123!'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/simple-login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.write(loginData);
      req.end();
    });

    console.log('🔐 Test de connexion admin:');
    console.log(`📊 Status: ${response.statusCode}`);
    console.log(`📄 Réponse:`, JSON.parse(response.data));
    
    if (response.statusCode === 200) {
      console.log('✅ Connexion admin réussie!');
    } else {
      console.log('❌ Échec de la connexion');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Assurez-vous que le serveur Next.js est démarré (npm run dev)');
    }
  }
}

testAdminLogin(); 