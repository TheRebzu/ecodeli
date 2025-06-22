/**
 * Script pour obtenir les cookies d'authentification d'un compte client test
 * Utilise le compte client principal : jean.dupont@orange.fr / password123
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

interface AuthResponse {
  url?: string;
  error?: string;
  ok?: boolean;
}

async function getCsrfToken(): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/csrf`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json() as { csrfToken: string };
    return data.csrfToken;
  } catch (error) {
    console.error('Erreur lors de la récupération du token CSRF:', error);
    throw error;
  }
}

async function login(email: string, password: string): Promise<string | null> {
  try {
    // 1. Obtenir le token CSRF
    console.log('📋 Récupération du token CSRF...');
    const csrfToken = await getCsrfToken();
    console.log('✅ Token CSRF obtenu:', csrfToken);

    // 2. Se connecter avec les credentials
    console.log('\n🔐 Tentative de connexion...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        email,
        password,
        csrfToken,
        callbackUrl: `${BASE_URL}/client`,
        json: 'true',
      }),
      redirect: 'manual',
    });

    // Récupérer les cookies de la réponse
    const cookies = loginResponse.headers.get('set-cookie');
    
    if (loginResponse.ok || loginResponse.status === 302) {
      console.log('✅ Connexion réussie!');
      
      if (cookies) {
        // Extraire le cookie de session
        const sessionCookie = cookies.split(';').find(c => 
          c.includes('next-auth.session-token') || 
          c.includes('__Secure-next-auth.session-token')
        );
        
        if (sessionCookie) {
          const cookieName = sessionCookie.includes('__Secure-') 
            ? '__Secure-next-auth.session-token' 
            : 'next-auth.session-token';
          
          const cookieValue = sessionCookie.split('=')[1]?.split(';')[0];
          
          console.log('\n🍪 Cookie d\'authentification trouvé:');
          console.log(`Nom: ${cookieName}`);
          console.log(`Valeur: ${cookieValue}`);
          
          return `${cookieName}=${cookieValue}`;
        }
      }
    } else {
      const errorData = await loginResponse.text();
      console.error('❌ Erreur de connexion:', errorData);
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erreur lors de la connexion:', error);
    return null;
  }
}

async function testAuthenticatedRoute(cookie: string) {
  console.log('\n🧪 Test d\'une route protégée avec le cookie...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/trpc/client.getProfile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
      },
      body: JSON.stringify({ input: {} }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Accès à la route protégée réussi!');
      console.log('Données du profil:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Échec de l\'accès à la route protégée:', response.status);
    }
  } catch (error) {
    console.error('❌ Erreur lors du test de la route protégée:', error);
  }
}

async function main() {
  console.log('🚀 Démarrage du script d\'obtention des cookies d\'authentification');
  console.log(`📍 URL de base: ${BASE_URL}`);
  console.log('\n👤 Compte client test:');
  console.log('Email: jean.dupont@orange.fr');
  console.log('Mot de passe: password123');
  console.log('-----------------------------------\n');

  // Se connecter et obtenir le cookie
  const authCookie = await login('jean.dupont@orange.fr', 'password123');
  
  if (authCookie) {
    console.log('\n✨ Cookie d\'authentification obtenu avec succès!');
    console.log('\n📝 Pour utiliser ce cookie dans vos requêtes:');
    console.log('1. Dans le navigateur (DevTools Console):');
    console.log(`   document.cookie = "${authCookie}"`);
    console.log('\n2. Dans une requête HTTP (curl):');
    console.log(`   curl -H "Cookie: ${authCookie}" ${BASE_URL}/api/...`);
    console.log('\n3. Dans Postman/Insomnia:');
    console.log(`   Ajouter un header "Cookie" avec la valeur: ${authCookie}`);
    
    // Tester une route protégée
    await testAuthenticatedRoute(authCookie);
  } else {
    console.error('\n❌ Impossible d\'obtenir le cookie d\'authentification');
    console.log('Vérifiez que:');
    console.log('- Le serveur est démarré sur', BASE_URL);
    console.log('- Les credentials sont corrects');
    console.log('- La base de données contient l\'utilisateur test');
  }
}

// Exécuter le script
main().catch(console.error);