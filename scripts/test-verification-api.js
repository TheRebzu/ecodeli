// Script de test pour l'API de vérifications
const fs = require('fs');

async function testVerificationAPI() {
  try {
    console.log('Test de l\'API de vérifications...');
    
    // Lire les cookies d'authentification
    let cookies = '';
    try {
      cookies = fs.readFileSync('cookies.txt', 'utf8').trim();
    } catch (error) {
      console.log('❌ Fichier cookies.txt introuvable. Veuillez vous connecter d\'abord.');
      return;
    }
    
    console.log('Cookies trouvés:', cookies.substring(0, 50) + '...');
    
    // Test 1: API des utilisateurs
    console.log('\n1. Test de l\'API /api/admin/verifications/users');
    const usersResponse = await fetch('http://localhost:3000/api/admin/verifications/users', {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    });
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('✅ API utilisateurs OK');
      console.log('Nombre d\'utilisateurs:', usersData.users?.length || 0);
      console.log('Premier utilisateur:', usersData.users?.[0]?.email || 'Aucun');
    } else {
      console.log('❌ Erreur API utilisateurs:', usersResponse.status, usersResponse.statusText);
      const errorText = await usersResponse.text();
      console.log('Détail erreur:', errorText);
    }
    
    // Test 2: API des statistiques
    console.log('\n2. Test de l\'API /api/admin/verifications/stats');
    const statsResponse = await fetch('http://localhost:3000/api/admin/verifications/stats', {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    });
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ API statistiques OK');
      console.log('Stats:', JSON.stringify(statsData.stats, null, 2));
    } else {
      console.log('❌ Erreur API statistiques:', statsResponse.status, statsResponse.statusText);
      const errorText = await statsResponse.text();
      console.log('Détail erreur:', errorText);
    }
    
    console.log('\n🔗 Vous pouvez maintenant ouvrir http://localhost:3000/fr/admin/verifications');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testVerificationAPI(); 