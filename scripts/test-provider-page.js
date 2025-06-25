// Script de test pour la page provider
async function testProviderPage() {
  console.log('🧪 Test de la page provider...');
  
  try {
    // Test 1: Vérifier que la page se charge sans erreur
    console.log('1. Test de chargement de la page...');
    const response = await fetch('http://localhost:3000/fr/provider');
    console.log('Status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Page provider accessible');
    } else {
      console.log('❌ Erreur de chargement:', response.status);
      return;
    }
    
    // Test 2: Vérifier l'API de connexion
    console.log('\n2. Test de connexion provider...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/simple-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'provider-test@example.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (loginData.success) {
      console.log('✅ Connexion réussie');
      
      // Extraire les cookies
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('Cookies reçus:', cookies ? 'Oui' : 'Non');
      
      // Test 3: Accéder à la page provider avec authentification
      console.log('\n3. Test d\'accès authentifié...');
      const authResponse = await fetch('http://localhost:3000/fr/provider', {
        headers: {
          'Cookie': cookies || ''
        }
      });
      
      console.log('Status authentifié:', authResponse.status);
      
      if (authResponse.status === 200) {
        console.log('✅ Page provider accessible avec authentification');
      } else {
        console.log('❌ Erreur d\'accès authentifié');
      }
      
    } else {
      console.log('❌ Erreur de connexion:', loginData.error);
    }
    
    console.log('\n🎉 Tests terminés !');
    console.log('🔗 URL de test: http://localhost:3000/fr/provider');
    console.log('📧 Email: provider-test@example.com');
    console.log('🔑 Mot de passe: password123');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testProviderPage(); 