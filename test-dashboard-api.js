const fetch = require('node-fetch');

async function testDashboardAPI() {
  try {
    // 1. Connexion avec un compte client
    console.log('🔐 Connexion en cours...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/sign-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'client@test.com',
        password: 'Test123!'
      })
    });

    const loginData = await loginResponse.text();
    console.log('Login response:', loginResponse.status, loginData);

    // Extraire les cookies
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies:', cookies);

    if (!cookies) {
      console.error('❌ Pas de cookies reçus');
      return;
    }

    // 2. Test de l'API dashboard
    console.log('\n📊 Test API Dashboard...');
    const dashboardResponse = await fetch('http://localhost:3001/api/client/dashboard', {
      method: 'GET',
      headers: {
        'Cookie': cookies
      }
    });

    const dashboardData = await dashboardResponse.text();
    console.log('Dashboard response:', dashboardResponse.status);
    console.log('Dashboard data:', dashboardData);

    if (dashboardResponse.ok) {
      console.log('✅ API Dashboard fonctionne !');
    } else {
      console.log('❌ Erreur API Dashboard');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testDashboardAPI(); 