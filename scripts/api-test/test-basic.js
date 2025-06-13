#!/usr/bin/env node

// Test basique en JavaScript pur pour éviter les problèmes d'esbuild
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testBasicConnectivity() {
  console.log('🔍 Test de connectivité basique...\n');

  try {
    // Test 1: Page d'accueil
    console.log('Test 1: Page d\'accueil');
    const homeResponse = await axios.get(BASE_URL, {
      timeout: 10000,
      validateStatus: () => true
    });
    console.log(`Status: ${homeResponse.status}`);
    console.log(`Headers: ${JSON.stringify(homeResponse.headers['content-type'])}`);
    
    if (homeResponse.status === 200) {
      console.log('✅ Page d\'accueil accessible\n');
    } else {
      console.log(`⚠️  Page d'accueil retourne: ${homeResponse.status}\n`);
    }

    // Test 2: API Health Check
    console.log('Test 2: API Health Check');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/health`, {
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`Status: ${healthResponse.status}`);
      if (healthResponse.data) {
        console.log(`Data: ${JSON.stringify(healthResponse.data, null, 2)}`);
      }
      
      if (healthResponse.status === 200) {
        console.log('✅ API Health accessible\n');
      } else {
        console.log('⚠️  API Health non accessible\n');
      }
    } catch (error) {
      console.log(`❌ API Health erreur: ${error.message}\n`);
    }

    // Test 3: Auth endpoints
    console.log('Test 3: Auth CSRF Token');
    try {
      const csrfResponse = await axios.get(`${BASE_URL}/api/auth/csrf`, {
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`Status: ${csrfResponse.status}`);
      if (csrfResponse.data) {
        console.log(`CSRF Token: ${csrfResponse.data.csrfToken ? 'Present' : 'Missing'}`);
      }
      
      if (csrfResponse.status === 200) {
        console.log('✅ Auth CSRF endpoint accessible\n');
      } else {
        console.log('⚠️  Auth CSRF endpoint non accessible\n');
      }
    } catch (error) {
      console.log(`❌ Auth CSRF erreur: ${error.message}\n`);
    }

    // Test 4: tRPC endpoint
    console.log('Test 4: tRPC endpoint basic');
    try {
      const trpcResponse = await axios.post(`${BASE_URL}/api/trpc/public.health`, {
        input: {}
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`Status: ${trpcResponse.status}`);
      if (trpcResponse.data) {
        console.log(`Response: ${JSON.stringify(trpcResponse.data, null, 2)}`);
      }
      
      if (trpcResponse.status === 200) {
        console.log('✅ tRPC endpoint accessible\n');
      } else {
        console.log('⚠️  tRPC endpoint non accessible\n');
      }
    } catch (error) {
      console.log(`❌ tRPC endpoint erreur: ${error.message}\n`);
    }

    console.log('🎉 Tests de connectivité terminés!');

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Le serveur semble ne pas être accessible sur http://localhost:3000');
      console.log('Vérifiez que le serveur Next.js est démarré avec: pnpm dev');
    }
  }
}

// Lancer le test
if (require.main === module) {
  testBasicConnectivity()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { testBasicConnectivity };