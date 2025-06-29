#!/usr/bin/env node

/**
 * Debug spécifique pour l'API deliverer/opportunities
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

async function loginAsDeliverer() {
  console.log('🔐 Connexion en tant que livreur...');
  
  try {
    // 1. Récupérer le CSRF token
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    
    // Extraire les cookies de la réponse CSRF
    const csrfCookies = await extractCookies(csrfResponse);
    if (csrfCookies) {
      sessionCookies = csrfCookies;
    }
    
    // 2. Login avec credentials deliverer
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': sessionCookies
      },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        email: 'livreur1@test.com',
        password: 'Test123!',
        callbackUrl: `${BASE_URL}/`,
        json: 'true'
      }),
      redirect: 'manual'
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
    
    console.log('❌ Échec de la connexion livreur');
    return false;
    
  } catch (error) {
    console.log(`❌ Erreur de connexion: ${error.message}`);
    return false;
  }
}

async function debugOpportunitiesAPI() {
  console.log('\n📡 Debug de /api/deliverer/opportunities...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/deliverer/opportunities`, {
      headers: {
        'Cookie': sessionCookies,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.log(`❌ Erreur réseau: ${error.message}`);
  }
}

async function runDebug() {
  console.log('🐛 === DEBUG DELIVERER OPPORTUNITIES ===\n');
  
  const loginSuccess = await loginAsDeliverer();
  
  if (!loginSuccess) {
    console.log('❌ Impossible de se connecter - arrêt du debug');
    return;
  }
  
  await debugOpportunitiesAPI();
}

runDebug();