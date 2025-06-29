#!/usr/bin/env node

/**
 * Test complet avec connexion utilisateur pour vérifier NextAuth
 */

const BASE_URL = 'http://172.30.80.1:3000';

// Cookie jar simple pour maintenir la session
let sessionCookies = '';

async function extractCookies(response) {
  const setCookieHeaders = response.headers.getSetCookie?.() || response.headers.get('set-cookie')?.split(',') || [];
  const cookies = [];
  
  for (const cookie of setCookieHeaders) {
    const cookiePart = cookie.split(';')[0];
    if (cookiePart) {
      cookies.push(cookiePart);
    }
  }
  
  return cookies.join('; ');
}

async function loginUser(email, password) {
  console.log(`🔐 Connexion avec ${email}...`);
  
  try {
    // 1. Récupérer le CSRF token
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    console.log('✅ CSRF token récupéré');
    
    // Extraire les cookies de la réponse CSRF
    const csrfCookies = await extractCookies(csrfResponse);
    if (csrfCookies) {
      sessionCookies = csrfCookies;
    }
    
    // 2. Login avec credentials
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': sessionCookies
      },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        email: email,
        password: password,
        callbackUrl: `${BASE_URL}/`,
        json: 'true'
      }),
      redirect: 'manual' // Important pour récupérer les cookies
    });
    
    console.log(`Login response: ${loginResponse.status} ${loginResponse.statusText}`);
    
    // Extraire les cookies de login
    const loginCookies = await extractCookies(loginResponse);
    if (loginCookies) {
      sessionCookies += '; ' + loginCookies;
    }
    
    // 3. Vérifier la session
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Cookie': sessionCookies
      }
    });
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      if (sessionData?.user) {
        console.log(`✅ Connecté comme: ${sessionData.user.email} (${sessionData.user.role})`);
        return true;
      }
    }
    
    console.log('❌ Échec de la connexion');
    return false;
    
  } catch (error) {
    console.log(`❌ Erreur de connexion: ${error.message}`);
    return false;
  }
}

async function testProtectedAPI(endpoint) {
  console.log(`\n📡 Test de ${endpoint} avec session...`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Cookie': sessionCookies,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ API accessible avec authentification');
      // Ne pas logger les données complètes pour éviter le spam
    } else {
      const errorData = await response.json();
      console.log(`❌ Erreur: ${errorData.error || errorData.message || 'Erreur inconnue'}`);
    }
    
  } catch (error) {
    console.log(`❌ Erreur réseau: ${error.message}`);
  }
}

async function runCompleteTest() {
  console.log('🧪 === TEST COMPLET AVEC AUTHENTIFICATION ===\n');
  
  // Test de connexion avec un admin
  const loginSuccess = await loginUser('admin1@test.com', 'Test123!');
  
  if (!loginSuccess) {
    console.log('❌ Impossible de se connecter - arrêt du test');
    return;
  }
  
  // Test des APIs admin (devrait fonctionner)
  await testProtectedAPI('/api/admin/users');
  
  // Test des APIs avec mauvais rôle (devrait retourner 403)
  await testProtectedAPI('/api/client/announcements');
  await testProtectedAPI('/api/deliverer/opportunities');
  
  console.log('\n🎯 === CONNEXION CLIENT ===');
  
  // Test avec un client
  const clientLoginSuccess = await loginUser('client1@test.com', 'Test123!');
  
  if (clientLoginSuccess) {
    await testProtectedAPI('/api/client/announcements');
    await testProtectedAPI('/api/client/dashboard');
  }
  
  console.log('\n✅ Test terminé !');
}

runCompleteTest();