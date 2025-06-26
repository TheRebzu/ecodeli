// Script de diagnostic pour vérifier Better-Auth
const fetch = require('node-fetch')

const API_BASE = 'http://localhost:3000/api/auth'

async function diagnoseAuth() {
  console.log('🔍 Diagnostic Better-Auth...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Test 1: Vérifier si l'API Better-Auth répond
  try {
    console.log('\n1️⃣ Test API Better-Auth...')
    const response = await fetch(`${API_BASE}`)
    console.log(`   Status: ${response.status}`)
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`)
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
  }

  // Test 2: Tester l'endpoint session
  try {
    console.log('\n2️⃣ Test endpoint session...')
    const response = await fetch(`${API_BASE}/get-session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    console.log(`   Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`)
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
  }

  // Test 3: Liste des endpoints disponibles
  try {
    console.log('\n3️⃣ Test endpoints disponibles...')
    const endpoints = [
      'sign-up/email',
      'sign-in/email', 
      'sign-out',
      'get-session',
      'forgot-password',
      'reset-password'
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${API_BASE}/${endpoint}`, {
          method: 'GET'
        })
        console.log(`   ${endpoint}: ${response.status} ${response.statusText}`)
      } catch (error) {
        console.log(`   ${endpoint}: ❌ ${error.message}`)
      }
    }
  } catch (error) {
    console.log(`   ❌ Erreur globale: ${error.message}`)
  }

  // Test 4: Création d'un utilisateur test
  try {
    console.log('\n4️⃣ Test création utilisateur...')
    const testUser = {
      email: 'test-diagnosis@test.com',
      password: 'Test123!',
      name: 'Test User',
      role: 'CLIENT'
    }

    const response = await fetch(`${API_BASE}/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    })

    console.log(`   Status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ Utilisateur créé: ${JSON.stringify(data, null, 2)}`)
    } else {
      const error = await response.text()
      console.log(`   ⚠️ Erreur: ${error}`)
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🏁 Diagnostic terminé')
}

// Lancer le diagnostic
if (require.main === module) {
  diagnoseAuth().catch(console.error)
}

module.exports = { diagnoseAuth }