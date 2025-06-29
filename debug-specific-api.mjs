#!/usr/bin/env node

/**
 * Debug des APIs spécifiques qui retournent des erreurs 500
 */

const BASE_URL = 'http://172.30.80.1:3000';

async function debugAPI(endpoint) {
  try {
    console.log(`\n🔍 Debug de ${endpoint}...`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Essayer d'identifier le problème
    if (data.error && data.details) {
      console.log(`❌ Détails de l'erreur: ${data.details}`);
    }
    
  } catch (error) {
    console.log(`❌ Erreur réseau: ${error.message}`);
  }
}

async function debugProblematicAPIs() {
  console.log('🐛 === DEBUG DES APIS PROBLÉMATIQUES ===');
  
  const problematicAPIs = [
    '/api/client/announcements',
    '/api/deliverer/opportunities', 
    '/api/deliverer/wallet'
  ];
  
  for (const api of problematicAPIs) {
    await debugAPI(api);
  }
  
  console.log('\n💡 Les erreurs 500 peuvent être dues à:');
  console.log('- Problèmes de base de données');
  console.log('- Relations Prisma manquantes');
  console.log('- Erreurs de validation des schémas');
  console.log('- Problèmes de configuration');
}

debugProblematicAPIs();