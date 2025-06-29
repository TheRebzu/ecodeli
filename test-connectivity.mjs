#!/usr/bin/env node

/**
 * Test simple de connectivité et des APIs principales
 */

const BASE_URL = 'http://172.30.80.1:3000';

async function testConnectivity() {
  console.log('🔍 Test de connectivité...\n');

  try {
    console.log('📡 Test health check...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    console.log(`Health API: ${healthResponse.status} ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      const data = await healthResponse.text();
      console.log('✅ Serveur accessible');
      console.log('Réponse:', data.substring(0, 100));
    }
  } catch (error) {
    console.log('❌ Erreur health check:', error.message);
    return false;
  }

  console.log('\n📡 Test APIs sans authentification...');
  
  const publicAPIs = [
    '/api/auth/session',
    '/api/shared/geo/distance',
  ];

  for (const endpoint of publicAPIs) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`${endpoint}: Erreur - ${error.message}`);
    }
  }

  console.log('\n📡 Test APIs protégées (doit retourner 401/403)...');
  
  const protectedAPIs = [
    '/api/client/dashboard',
    '/api/admin/users',
    '/api/deliverer/dashboard'
  ];

  for (const endpoint of protectedAPIs) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const status = response.status === 401 || response.status === 403 ? '✅' : '⚠️';
      console.log(`${status} ${endpoint}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`❌ ${endpoint}: Erreur - ${error.message}`);
    }
  }

  console.log('\n🔐 Instructions pour test manuel avec authentification:');
  console.log('1. Aller sur: http://172.30.80.1:3000/fr/login');
  console.log('2. Se connecter avec: admin1@test.com / Test123!');
  console.log('3. Tester cette URL: http://172.30.80.1:3000/api/admin/users');
  console.log('4. Devrait afficher des données JSON des utilisateurs');

  return true;
}

testConnectivity().catch(console.error);