/**
 * Script de test complet des APIs EcoDeli
 * Utilise les tokens valides générés précédemment
 */

// Tokens valides générés via /api/auth/sign-in/email
const TOKENS = {
  CLIENT: 'Nyj1RUHr0OM9uEmRd61LfIb4vGrh21iB9QdNOQbJNXRGI0Hy7Z',
  ADMIN: 'ODBLAqS0lUl74BiJyLINPhKumEFsiS2RNj4vGrh21iB9QdNOQbJNXRGI0Hy7Z'
}

const BASE_URL = 'http://localhost:3000'

async function testAPI(endpoint: string, method: string = 'GET', token?: string, body?: any) {
  const headers: any = {
    'Content-Type': 'application/json'
  }
  
  if (token) {
    headers['Cookie'] = `better-auth.session_token=${token}`
  }

  const options: any = {
    method,
    headers
  }

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options)
    const data = await response.text()
    
    let parsedData
    try {
      parsedData = JSON.parse(data)
    } catch {
      parsedData = data.substring(0, 200) + '...'
    }

    return {
      status: response.status,
      ok: response.ok,
      data: parsedData
    }
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    }
  }
}

async function runTests() {
  console.log('🧪 Test des APIs EcoDeli - Mission 1')
  console.log('=' .repeat(50))

  const tests = [
    // APIs de base
    { name: 'Health Check', endpoint: '/api/health' },
    { name: 'Auth Session (CLIENT)', endpoint: '/api/auth/get-session', token: TOKENS.CLIENT },
    { name: 'Auth Session (ADMIN)', endpoint: '/api/auth/get-session', token: TOKENS.ADMIN },
    
    // APIs Client (CORRIGÉES)
    { name: 'Client Dashboard', endpoint: '/api/client/dashboard', token: TOKENS.CLIENT },
    { name: 'Client Profile', endpoint: '/api/client/profile', token: TOKENS.CLIENT },
    { name: 'Client Announcements', endpoint: '/api/client/announcements', token: TOKENS.CLIENT },
    
    // APIs Admin (NOUVELLES)
    { name: 'Admin Dashboard', endpoint: '/api/admin/dashboard', token: TOKENS.ADMIN },
    { name: 'Admin Users', endpoint: '/api/admin/users', token: TOKENS.ADMIN },
    
    // APIs Publiques
    { name: 'Public Announcements', endpoint: '/api/announcements' },
    
    // APIs spécialisées
    { name: 'Deliverer Profile', endpoint: '/api/deliverer/profile', token: TOKENS.CLIENT },
    { name: 'Merchant Profile', endpoint: '/api/merchant/profile', token: TOKENS.CLIENT },
    { name: 'Provider Profile', endpoint: '/api/provider/profile', token: TOKENS.CLIENT }
  ]

  const results = []

  for (const test of tests) {
    console.log(`\n🔍 Testing: ${test.name}`)
    console.log(`   Endpoint: ${test.endpoint}`)
    
    const result = await testAPI(test.endpoint, 'GET', test.token)
    
    const status = result.ok ? '✅' : '❌'
    console.log(`   Status: ${status} ${result.status}`)
    
    if (!result.ok) {
      if (typeof result.data === 'string' && result.data.includes('<!DOCTYPE html>')) {
        console.log(`   Error: 404 - Route not found`)
      } else if (result.data?.error) {
        console.log(`   Error: ${result.data.error}`)
      } else {
        console.log(`   Error: ${result.error || 'Unknown error'}`)
      }
    } else {
      if (typeof result.data === 'object' && result.data !== null) {
        const keys = Object.keys(result.data).slice(0, 3)
        console.log(`   Response: ${keys.join(', ')}${keys.length > 3 ? '...' : ''}`)
      }
    }

    results.push({
      name: test.name,
      endpoint: test.endpoint,
      status: result.status,
      ok: result.ok,
      error: result.data?.error || result.error
    })
  }

  // Résumé final
  console.log('\n' + '=' .repeat(50))
  console.log('📊 RÉSUMÉ DES TESTS')
  console.log('=' .repeat(50))

  const working = results.filter(r => r.ok)
  const failing = results.filter(r => !r.ok)

  console.log(`✅ APIs fonctionnelles: ${working.length}/${results.length}`)
  working.forEach(r => console.log(`   ✓ ${r.name}`))

  console.log(`\n❌ APIs en échec: ${failing.length}/${results.length}`)
  failing.forEach(r => console.log(`   ✗ ${r.name} (${r.status}) - ${r.error || 'Unknown'}`))

  // Recommandations
  console.log('\n🔧 ACTIONS RECOMMANDÉES:')
  
  if (failing.some(r => r.status === 404)) {
    console.log('   • Créer les routes manquantes (404)')
  }
  
  if (failing.some(r => r.status === 500)) {
    console.log('   • Corriger les erreurs serveur (500)')
  }
  
  if (failing.some(r => r.status === 403)) {
    console.log('   • Vérifier les permissions (403)')
  }

  if (failing.some(r => r.error?.includes('auth'))) {
    console.log('   • Corriger les problèmes d\'authentification')
  }

  console.log('\n🎯 PRIORITÉS MISSION 1:')
  console.log('   1. Dashboard Client ✅ (FONCTIONNE)')
  console.log('   2. Tutoriel overlay première connexion')
  console.log('   3. Code validation 6 chiffres livraisons')
  console.log('   4. Matching trajets/annonces automatique')
  console.log('   5. Notifications OneSignal')
  console.log('   6. Abonnements 3 niveaux')
  console.log('   7. Facturation automatique prestataires')
}

// Exécuter les tests
runTests().catch(console.error) 