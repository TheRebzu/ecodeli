#!/usr/bin/env node

/**
 * Test complet pour vérifier que l'authentification NextAuth fonctionne
 */

const BASE_URL = 'http://172.30.80.1:3000';

async function testAuthenticationFlow() {
  console.log('🔍 === TEST AUTHENTICATION FLOW NEXTAUTH ===\n');
  
  try {
    // Test 1: Vérifier que les APIs sans auth retournent le bon message
    console.log('📡 Test des APIs protégées sans authentification...');
    const protectedAPIs = [
      '/api/admin/users',
      '/api/client/announcements', 
      '/api/client/dashboard',
      '/api/deliverer/dashboard',
      '/api/deliverer/opportunities',
      '/api/deliverer/wallet'
    ];
    
    let allCorrect = true;
    
    for (const api of protectedAPIs) {
      try {
        const response = await fetch(`${BASE_URL}${api}`);
        const data = await response.json();
        
        console.log(`${api}: ${response.status} - ${data.error || data.message || 'OK'}`);
        
        // Vérifier que c'est bien "Accès refusé" et non "Non authentifié"
        if (data.error && (data.error.includes('Accès refusé') || data.error.includes('Unauthorized'))) {
          console.log('✅ Erreur correcte: API utilise bien NextAuth');
        } else if (data.error && data.error.includes('Non authentifié')) {
          console.log('❌ Erreur ancienne: API n\'utilise pas NextAuth correctement');
          allCorrect = false;
        } else {
          console.log('⚠️ Réponse inattendue');
        }
      } catch (error) {
        console.log(`❌ Erreur réseau pour ${api}: ${error.message}`);
        allCorrect = false;
      }
    }
    
    // Test 2: Vérifier quelques APIs publiques
    console.log('\n📡 Test des APIs publiques...');
    const publicAPIs = [
      '/api/health',
      '/api/auth/session'
    ];
    
    for (const api of publicAPIs) {
      try {
        const response = await fetch(`${BASE_URL}${api}`);
        console.log(`${api}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          console.log('✅ API publique accessible');
        } else {
          console.log('⚠️ API publique pas accessible');
        }
      } catch (error) {
        console.log(`❌ Erreur réseau pour ${api}: ${error.message}`);
      }
    }
    
    // Résultat final
    console.log('\n🎯 === RÉSULTAT FINAL ===');
    if (allCorrect) {
      console.log('✅ Toutes les APIs utilisent maintenant NextAuth correctement !');
      console.log('✅ Plus de messages "Non authentifié"');
      console.log('✅ Messages d\'erreur cohérents : "Accès refusé"');
    } else {
      console.log('❌ Il reste encore des APIs avec des problèmes');
    }
    
    console.log('\n📋 === INSTRUCTIONS TEST COMPLET ===');
    console.log('Pour test avec authentification :');
    console.log('1. Ouvrir: http://172.30.80.1:3000/fr/login');
    console.log('2. Login: admin1@test.com / Test123!');
    console.log('3. Tester: http://172.30.80.1:3000/api/admin/users');
    console.log('4. Devrait retourner des données utilisateurs');
    
  } catch (error) {
    console.log('❌ Erreur de test:', error.message);
  }
}

testAuthenticationFlow();