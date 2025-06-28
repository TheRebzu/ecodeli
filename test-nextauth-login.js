#!/usr/bin/env node

/**
 * Tests de connexion et session NextAuth - EcoDeli
 * Teste la persistance des sessions et l'accès aux API
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Comptes de test EcoDeli (depuis les seeds users)
const testAccounts = [
  {
    email: 'client1@test.com',
    password: 'Test123!',
    role: 'CLIENT',
    name: 'Marie Dubois',
    dashboardEndpoint: '/api/client/dashboard'
  },
  {
    email: 'client2@test.com',
    password: 'Test123!',
    role: 'CLIENT',
    name: 'Jean Martin',
    dashboardEndpoint: '/api/client/dashboard'
  },
  {
    email: 'livreur1@test.com',
    password: 'Test123!',
    role: 'DELIVERER',
    name: 'Thomas Moreau',
    status: 'VALIDATED',
    dashboardEndpoint: '/api/deliverer/dashboard'
  },
  {
    email: 'livreur2@test.com',
    password: 'Test123!',
    role: 'DELIVERER',
    name: 'Lucas Simon',
    status: 'VALIDATED',
    dashboardEndpoint: '/api/deliverer/dashboard'
  },
  {
    email: 'commercant1@test.com',
    password: 'Test123!',
    role: 'MERCHANT',
    name: 'Carrefour City',
    company: 'Carrefour City Flandre',
    dashboardEndpoint: '/api/merchant/dashboard'
  },
  {
    email: 'prestataire1@test.com',
    password: 'Test123!',
    role: 'PROVIDER',
    name: 'Julie Durand',
    status: 'VALIDATED',
    dashboardEndpoint: '/api/provider/dashboard'
  },
  {
    email: 'admin1@test.com',
    password: 'Test123!',
    role: 'ADMIN',
    name: 'Admin Principal',
    dashboardEndpoint: '/api/admin/dashboard'
  }
]

/**
 * Test de connexion NextAuth avec cookies
 */
async function testLoginWithCookies(account) {
  console.log(`\n🔐 Test connexion complète ${account.role} (${account.email})...`)
  
  try {
    // 1. Obtenir le CSRF token
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`, {
      method: 'GET'
    })
    const csrfData = await csrfResponse.json()
    const csrfToken = csrfData.csrfToken

    console.log(`   📝 CSRF Token obtenu: ${csrfToken.substring(0, 20)}...`)

    // 2. Tenter la connexion
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: account.email,
        password: account.password,
        csrfToken: csrfToken,
        callbackUrl: '/',
        json: 'true'
      }),
      redirect: 'manual'
    })

    const cookies = loginResponse.headers.get('set-cookie')
    console.log(`   🍪 Cookies reçus: ${cookies ? 'Oui' : 'Non'}`)

    // 3. Vérifier la session
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Cookie': cookies || ''
      }
    })

    const sessionData = await sessionResponse.json()

    if (sessionData.user) {
      console.log(`   ✅ Session active pour ${sessionData.user.email}`)
      console.log(`   👤 Rôle: ${sessionData.user.role}`)
      console.log(`   🎯 ID: ${sessionData.user.id}`)
      
      return {
        success: true,
        session: sessionData,
        cookies: cookies,
        user: sessionData.user
      }
    } else {
      console.log(`   ❌ Aucune session active`)
      return {
        success: false,
        error: 'Pas de session'
      }
    }

  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Test d'accès au dashboard avec session
 */
async function testDashboardAccess(account, cookies) {
  console.log(`\n📊 Test accès dashboard ${account.role}...`)
  
  try {
    const response = await fetch(`${BASE_URL}${account.dashboardEndpoint}`, {
      method: 'GET',
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (response.ok) {
      console.log(`   ✅ Dashboard accessible`)
      console.log(`   📊 Données: ${Object.keys(data).join(', ')}`)
      
      // Analyser les données reçues
      if (data.client) {
        console.log(`   👤 Client ID: ${data.client.id}`)
        console.log(`   📧 Email vérifié: ${data.client.emailVerified || 'Non'}`)
        console.log(`   🎓 Tutoriel: ${data.client.tutorialCompleted ? 'Terminé' : 'En cours'}`)
      }
      
      return {
        success: true,
        data: data
      }
    } else {
      console.log(`   ❌ Accès refusé`)
      console.log(`   📄 Code: ${response.status}`)
      console.log(`   💬 Erreur: ${data.error || 'Inconnue'}`)
      
      return {
        success: false,
        error: data.error,
        status: response.status
      }
    }

  } catch (error) {
    console.log(`   ❌ Erreur réseau: ${error.message}`)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Test de déconnexion
 */
async function testLogout(cookies) {
  console.log(`\n🚪 Test déconnexion...`)
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: 'POST',
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        callbackUrl: '/'
      })
    })

    if (response.ok) {
      console.log(`   ✅ Déconnexion réussie`)
      return { success: true }
    } else {
      console.log(`   ❌ Erreur déconnexion: ${response.status}`)
      return { success: false, status: response.status }
    }

  } catch (error) {
    console.log(`   ❌ Erreur réseau: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Test du tutoriel client
 */
async function testClientTutorial(cookies) {
  console.log(`\n🎓 Test API tutoriel client...`)
  
  try {
    // Vérifier si tutoriel requis
    const checkResponse = await fetch(`${BASE_URL}/api/client/tutorial/check`, {
      headers: {
        'Cookie': cookies || ''
      }
    })

    const checkData = await checkResponse.json()
    console.log(`   📋 Tutoriel requis: ${checkData.required ? 'Oui' : 'Non'}`)

    if (checkData.required) {
      // Obtenir les étapes
      const stepsResponse = await fetch(`${BASE_URL}/api/client/tutorial`, {
        headers: {
          'Cookie': cookies || ''
        }
      })

      const stepsData = await stepsResponse.json()
      console.log(`   📚 Étapes disponibles: ${stepsData.steps?.length || 0}`)

      return {
        success: true,
        required: checkData.required,
        steps: stepsData.steps?.length || 0
      }
    }

    return {
      success: true,
      required: false
    }

  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Test complet d'une session utilisateur
 */
async function testUserSession(account) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🧪 TEST SESSION UTILISATEUR ${account.role}`)
  console.log(`${'='.repeat(60)}`)

  const results = {
    login: null,
    dashboard: null,
    tutorial: null,
    logout: null
  }

  // 1. Test de connexion
  const loginResult = await testLoginWithCookies(account)
  results.login = loginResult

  if (!loginResult.success) {
    console.log(`❌ Impossible de continuer sans session`)
    return results
  }

  // 2. Test d'accès au dashboard
  const dashboardResult = await testDashboardAccess(account, loginResult.cookies)
  results.dashboard = dashboardResult

  // 3. Test tutoriel (si client)
  if (account.role === 'CLIENT') {
    const tutorialResult = await testClientTutorial(loginResult.cookies)
    results.tutorial = tutorialResult
  }

  // 4. Test de déconnexion
  const logoutResult = await testLogout(loginResult.cookies)
  results.logout = logoutResult

  return results
}

/**
 * Exécution de tous les tests
 */
async function runAllSessionTests() {
  console.log('🚀 Tests de session NextAuth - EcoDeli')
  console.log(`📍 URL: ${BASE_URL}`)
  console.log(`📅 ${new Date().toLocaleString()}`)

  const allResults = []

  for (const account of testAccounts) {
    const results = await testUserSession(account)
    allResults.push({
      role: account.role,
      email: account.email,
      ...results
    })
  }

  // Résumé
  console.log(`\n${'='.repeat(60)}`)
  console.log('📋 RÉSUMÉ GLOBAL')
  console.log(`${'='.repeat(60)}`)

  let totalTests = 0
  let successfulTests = 0

  allResults.forEach(result => {
    console.log(`\n👤 ${result.role} (${result.email}):`)
    
    const tests = ['login', 'dashboard', 'tutorial', 'logout']
    tests.forEach(test => {
      if (result[test] !== null) {
        totalTests++
        const success = result[test].success
        if (success) successfulTests++
        console.log(`   ${test}: ${success ? '✅' : '❌'}`)
      }
    })
  })

  console.log(`\n📊 Score global: ${successfulTests}/${totalTests} (${Math.round(successfulTests/totalTests*100)}%)`)

  // Recommandations
  console.log(`\n🎯 DIAGNOSTIC:`)
  if (successfulTests === totalTests) {
    console.log('✅ Tous les tests de session sont passés !')
    console.log('   Le système NextAuth fonctionne correctement.')
  } else {
    console.log('⚠️  Problèmes détectés:')
    
    const failures = allResults.flatMap(result => 
      Object.entries(result)
        .filter(([key, value]) => value && typeof value === 'object' && !value.success)
        .map(([test, details]) => ({ role: result.role, test, error: details.error }))
    )

    failures.forEach(failure => {
      console.log(`   - ${failure.role} ${failure.test}: ${failure.error}`)
    })
  }

  console.log('\n✨ Tests de session terminés')
  return allResults
}

// Exécution
if (require.main === module) {
  runAllSessionTests().catch(console.error)
}

module.exports = { 
  runAllSessionTests, 
  testUserSession, 
  testLoginWithCookies,
  testDashboardAccess 
}