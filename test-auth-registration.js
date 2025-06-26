cl// Script pour créer les comptes de test via l'API Better-Auth
const fetch = require('node-fetch')

const baseUrl = 'http://localhost:3000'

const testUsers = [
  {
    email: 'client-complete@test.com',
    password: 'Test123!',
    name: 'Marie Client',
    role: 'CLIENT'
  },
  {
    email: 'deliverer-complete@test.com',
    password: 'Test123!',
    name: 'Pierre Livreur',
    role: 'DELIVERER'
  },
  {
    email: 'merchant-complete@test.com',
    password: 'Test123!',
    name: 'Thomas Commerçant',
    role: 'MERCHANT'
  },
  {
    email: 'provider-complete@test.com',
    password: 'Test123!',
    name: 'Sophie Prestataire',
    role: 'PROVIDER'
  },
  {
    email: 'admin-complete@test.com',
    password: 'Test123!',
    name: 'Admin EcoDeli',
    role: 'ADMIN'
  }
]

async function createTestUsers() {
  console.log('🌱 Création des utilisateurs de test EcoDeli...')
  
  for (const user of testUsers) {
    try {
      console.log(`📝 Création de ${user.name} (${user.email})...`)
      
      const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`✅ ${user.name} créé avec succès`)
        
        // Tenter de vérifier l'email immédiatement
        try {
          const verifyResponse = await fetch(`${baseUrl}/api/auth/verify-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: result.verificationToken || 'auto-verify',
              email: user.email
            })
          })
          
          if (verifyResponse.ok) {
            console.log(`📧 Email vérifié pour ${user.name}`)
          }
        } catch (verifyError) {
          console.log(`⚠️  Vérification email échouée pour ${user.name}`)
        }
        
      } else {
        const error = await response.text()
        console.log(`❌ Erreur pour ${user.name}: ${error}`)
      }
      
    } catch (error) {
      console.error(`💥 Erreur création ${user.name}:`, error.message)
    }
    
    // Petite pause entre les créations
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n🎯 Test de connexion...')
  await testLogin()
}

async function testLogin() {
  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'client-complete@test.com',
        password: 'Test123!'
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Test de connexion réussi!')
      console.log('🍪 Cookies disponibles:', response.headers.get('set-cookie') || 'Aucun')
      
      // Essayer d'accéder à une route protégée
      const cookies = response.headers.get('set-cookie')
      if (cookies) {
        const protectedResponse = await fetch(`${baseUrl}/api/auth/session`, {
          method: 'GET',
          headers: {
            'Cookie': cookies
          }
        })
        
        if (protectedResponse.ok) {
          const session = await protectedResponse.json()
          console.log('👤 Session active:', session)
        }
      }
      
    } else {
      const error = await response.text()
      console.log('❌ Test de connexion échoué:', error)
    }
  } catch (error) {
    console.error('💥 Erreur test connexion:', error.message)
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  createTestUsers()
    .then(() => {
      console.log('\n🏁 Script terminé!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Erreur fatale:', error)
      process.exit(1)
    })
} 