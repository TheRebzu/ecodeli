async function testProviderDirect() {
  try {
    console.log('🧪 Test direct de la page provider...');
    
    // Étape 1: Connexion
    console.log('1. Connexion...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/simple-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'provider-test@example.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login:', loginData.success ? '✅' : '❌');
    
    if (!loginData.success) {
      console.log('Erreur:', loginData.error);
      return;
    }
    
    // Étape 2: Extraire les cookies
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('2. Cookies reçus:', cookies ? '✅' : '❌');
    
    if (!cookies) {
      console.log('❌ Aucun cookie reçu');
      return;
    }
    
    // Étape 3: Test de la page provider
    console.log('3. Test page provider...');
    const pageResponse = await fetch('http://localhost:3000/fr/provider', {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('Status:', pageResponse.status);
    console.log('Headers:', Object.fromEntries(pageResponse.headers.entries()));
    
    if (pageResponse.status === 200) {
      const html = await pageResponse.text();
      console.log('✅ Page accessible');
      console.log('Taille HTML:', html.length, 'caractères');
      
      // Vérifier si c'est une page de redirection
      if (html.includes('redirect') || html.includes('onboarding')) {
        console.log('⚠️ Page contient une redirection');
      }
      
      if (html.includes('Tableau de Bord Prestataire')) {
        console.log('✅ Page provider chargée correctement');
      } else {
        console.log('⚠️ Contenu inattendu');
      }
      
    } else if (pageResponse.status === 404) {
      console.log('❌ Page non trouvée (404)');
      
      // Tester l'API de vérification de session
      console.log('4. Test API session...');
      const sessionResponse = await fetch('http://localhost:3000/api/auth/me', {
        headers: { 'Cookie': cookies }
      });
      
      const sessionData = await sessionResponse.json();
      console.log('Session API:', sessionData);
      
    } else {
      console.log('❌ Erreur:', pageResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testProviderDirect(); 