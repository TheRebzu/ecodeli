#!/usr/bin/env node

/**
 * Vérifier les données livreur dans la base
 */

const BASE_URL = 'http://172.30.80.1:3000';

async function checkDelivererData() {
  console.log('🔍 === VÉRIFICATION DONNÉES LIVREUR ===\n');
  
  try {
    // Se connecter en admin pour avoir accès aux données
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    
    const sessionCookies = csrfResponse.headers.getSetCookie?.() || csrfResponse.headers.get('set-cookie')?.split(',') || [];
    let cookies = sessionCookies.map(cookie => cookie.split(';')[0]).join('; ');
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies
      },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        email: 'admin1@test.com',
        password: 'Test123!',
        callbackUrl: `${BASE_URL}/`,
        json: 'true'
      }),
      redirect: 'manual'
    });
    
    const loginCookies = loginResponse.headers.getSetCookie?.() || loginResponse.headers.get('set-cookie')?.split(',') || [];
    if (loginCookies.length) {
      cookies += '; ' + loginCookies.map(cookie => cookie.split(';')[0]).join('; ');
    }
    
    // Vérifier les utilisateurs livreurs
    const usersResponse = await fetch(`${BASE_URL}/api/admin/users?role=DELIVERER`, {
      headers: { 'Cookie': cookies }
    });
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('📋 Utilisateurs DELIVERER:');
      usersData.users?.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id}, Role: ${user.role})`);
      });
      
      // Vérifier les profils deliverer dans la DB
      console.log('\n🔍 Test accès API deliverer avec premier compte...');
      if (usersData.users?.length > 0) {
        const firstDeliverer = usersData.users[0];
        
        // Tenter de se connecter avec ce livreur
        const delivererCsrf = await fetch(`${BASE_URL}/api/auth/csrf`);
        const delivererCsrfData = await delivererCsrf.json();
        
        const delivererLogin = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            csrfToken: delivererCsrfData.csrfToken,
            email: firstDeliverer.email,
            password: 'Test123!',
            callbackUrl: `${BASE_URL}/`,
            json: 'true'
          }),
          redirect: 'manual'
        });
        
        console.log(`Connexion livreur: ${delivererLogin.status}`);
        
        const delivererSessionCookies = delivererLogin.headers.getSetCookie?.() || [];
        let delivererCookies = delivererSessionCookies.map(cookie => cookie.split(';')[0]).join('; ');
        
        // Tester l'API
        const opportunitiesResponse = await fetch(`${BASE_URL}/api/deliverer/opportunities`, {
          headers: { 'Cookie': delivererCookies }
        });
        
        console.log(`API opportunities: ${opportunitiesResponse.status}`);
        
        if (!opportunitiesResponse.ok) {
          const errorData = await opportunitiesResponse.json();
          console.log('Erreur:', errorData);
        }
      }
      
    } else {
      console.log('❌ Impossible de récupérer les utilisateurs');
    }
    
  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
}

checkDelivererData();