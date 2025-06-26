const http = require('http');

const data = JSON.stringify({
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
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      console.log('Réponse:', parsed);
      
      if (res.statusCode === 200) {
        console.log('✅ Connexion réussie!');
        console.log('🔑 Token présent dans les cookies');
      } else {
        console.log('❌ Échec de la connexion');
      }
    } catch (error) {
      console.log('Réponse brute:', responseData);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erreur:', e.message);
});

req.write(data);
req.end(); 