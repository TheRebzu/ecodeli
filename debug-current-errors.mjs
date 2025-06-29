#!/usr/bin/env node

/**
 * Debug des erreurs actuelles dans les APIs
 */

const BASE_URL = 'http://172.30.80.1:3000';

// Cookie jar simple
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
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    
    const csrfCookies = await extractCookies(csrfResponse);
    if (csrfCookies) {
      sessionCookies = csrfCookies;
    }
    
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
      redirect: 'manual'
    });
    
    const loginCookies = await extractCookies(loginResponse);
    if (loginCookies) {
      sessionCookies += '; ' + loginCookies;
    }
    
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
    
    return false;
    
  } catch (error) {
    console.log(`❌ Erreur de connexion: ${error.message}`);
    return false;
  }
}

async function debugAPI(endpoint, description) {
  console.log(`\n📡 Debug de ${endpoint} (${description})...`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Cookie': sessionCookies,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ API fonctionne !');
    } else {
      console.log('❌ Erreur détaillée:');
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ Erreur réseau: ${error.message}`);
  }
}

async function runDebug() {
  console.log('🐛 === DEBUG DES ERREURS ACTUELLES ===\n');
  
  // Test avec client
  const clientLogin = await loginUser('client1@test.com', 'Test123!');
  if (clientLogin) {
    await debugAPI('/api/client/announcements', 'Liste des annonces client');
  }
  
  // Test avec livreur
  const delivererLogin = await loginUser('livreur1@test.com', 'Test123!');
  if (delivererLogin) {
    await debugAPI('/api/deliverer/opportunities', 'Opportunités livreur');
  }
}

runDebug();