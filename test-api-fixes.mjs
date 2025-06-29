#!/usr/bin/env node

/**
 * Script de test pour vérifier les corrections d'API
 */

const BASE_URL = 'http://localhost:3000';

const APIs_TO_TEST = [
  '/api/deliverer/dashboard',
  '/api/admin/deliveries',
  '/api/provider/interventions?providerId=test',
  '/api/provider/interventions/test-id',
];

async function testAPI(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const status = response.status;
    
    if (status === 401) {
      console.log(`✅ ${endpoint}: Retourne 401 (Unauthorized) - Corrigé!`);
      return true;
    } else if (status === 500) {
      console.log(`❌ ${endpoint}: Retourne encore 500 (Server Error)`);
      return false;
    } else {
      console.log(`ℹ️  ${endpoint}: Retourne ${status}`);
      return true;
    }
  } catch (error) {
    console.log(`🔗 ${endpoint}: Serveur non accessible`);
    return false;
  }
}

async function runTests() {
  console.log('🔍 === TEST DES CORRECTIONS D\'API ===\n');
  
  let passedTests = 0;
  const totalTests = APIs_TO_TEST.length;
  
  for (const api of APIs_TO_TEST) {
    const result = await testAPI(api);
    if (result) passedTests++;
  }
  
  console.log('\n======================================');
  console.log(`📊 RÉSULTAT: ${passedTests}/${totalTests} APIs corrigées`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Toutes les APIs sont maintenant corrigées!');
  } else {
    console.log('⚠️  Certaines APIs nécessitent encore des corrections');
  }
}

runTests();