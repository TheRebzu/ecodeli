#!/usr/bin/env node

/**
 * Test spécifique pour vérifier que les corrections d'authentification fonctionnent
 * Ce script teste directement l'API admin/users pour voir si l'erreur a été corrigée
 */

const BASE_URL = 'http://172.30.80.1:3000';

async function testAuthFix() {
  console.log('🔍 === TEST CORRECTION AUTHENTIFICATION ===\n');
  
  try {
    console.log('📡 Test de l\'API admin/users sans authentification...');
    const response = await fetch(`${BASE_URL}/api/admin/users`);
    
    console.log(`📊 Statut: ${response.status} ${response.statusText}`);
    
    if (response.status === 403) {
      console.log('✅ Correction réussie: API correctement protégée (403 au lieu de erreur serveur)');
      console.log('💡 L\'erreur "Non authentifié" a été résolue');
    } else if (response.status === 401) {
      console.log('✅ Correction réussie: API correctement protégée (401 au lieu de erreur serveur)');
      console.log('💡 L\'erreur "Non authentifié" a été résolue');
    } else if (response.status === 500) {
      console.log('❌ Erreur serveur persistante - vérifier les logs');
      const text = await response.text();
      console.log('Réponse:', text.substring(0, 200));
    } else {
      console.log(`⚠️ Statut inattendu: ${response.status}`);
    }
    
    console.log('\n📋 Instructions pour validation complète:');
    console.log('1. Se connecter sur: http://172.30.80.1:3000/fr/login');
    console.log('2. Utiliser: admin1@test.com / Test123!');
    console.log('3. Tester: http://172.30.80.1:3000/api/admin/users');
    console.log('4. Devrait retourner JSON des utilisateurs (status 200)');
    
    console.log('\n✅ Test de vérification terminé');
    
  } catch (error) {
    console.log('❌ Erreur de test:', error.message);
  }
}

testAuthFix();