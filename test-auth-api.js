// Script de test pour les API d'authentification EcoDeli
const https = require('http')

const API_BASE = 'http://localhost:3000'

// Utilitaire pour faire des requêtes HTTP
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          }
          resolve(response)
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          })
        }
      })
    })

    req.on('error', reject)
    
    if (data) {
      req.write(JSON.stringify(data))
    }
    
    req.end()
  })
}

async function testAuthentication() {
  console.log('🧪 Test des API d\'authentification EcoDeli\n')

  // 1. Test inscription client
  console.log('1️⃣ Test inscription client...')
  try {
    const clientData = {
      email: 'client@test.com',
      password: 'Test123!',
      firstName: 'Marie',
      lastName: 'Dupont',
      phone: '0612345678',
      address: '123 Rue de la Paix',
      city: 'Paris',
      postalCode: '75001',
      termsAccepted: true
    }

    const registerResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register/client',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, clientData)

    console.log(`   Status: ${registerResponse.status}`)
    console.log(`   Response:`, registerResponse.body)
    console.log('')
  } catch (error) {
    console.log(`   ❌ Erreur:`, error.message)
    console.log('')
  }

  // 2. Test connexion Better Auth
  console.log('2️⃣ Test connexion Better Auth...')
  try {
    const loginData = {
      email: 'client@test.com',
      password: 'Test123!'
    }

    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/sign-in/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, loginData)

    console.log(`   Status: ${loginResponse.status}`)
    console.log(`   Response:`, loginResponse.body)
    console.log(`   Cookies:`, loginResponse.headers['set-cookie'] || 'Aucun')
    console.log('')
  } catch (error) {
    console.log(`   ❌ Erreur:`, error.message)
    console.log('')
  }

  // 3. Test de session
  console.log('3️⃣ Test session utilisateur...')
  try {
    const sessionResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/session',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log(`   Status: ${sessionResponse.status}`)
    console.log(`   Response:`, sessionResponse.body)
    console.log('')
  } catch (error) {
    console.log(`   ❌ Erreur:`, error.message)
    console.log('')
  }

  // 4. Test API protégée
  console.log('4️⃣ Test API protégée (dashboard client)...')
  try {
    const dashboardResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/client/dashboard',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log(`   Status: ${dashboardResponse.status}`)
    console.log(`   Response:`, dashboardResponse.body)
    console.log('')
  } catch (error) {
    console.log(`   ❌ Erreur:`, error.message)
    console.log('')
  }

  console.log('✅ Tests terminés')
}

// Exécuter les tests
testAuthentication().catch(console.error) 