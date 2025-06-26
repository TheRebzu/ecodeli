// Script pour créer des utilisateurs de test via l'API Better-Auth
const fetch = require('node-fetch')

const API_BASE = 'http://localhost:3000/api/auth'

const testUsers = [
  {
    email: 'admin-complete@test.com',
    password: 'Test123!',
    name: 'Admin EcoDeli',
    role: 'ADMIN'
  },
  {
    email: 'client-complete@test.com',
    password: 'Test123!',
    name: 'Client Test',
    role: 'CLIENT'
  },
  {
    email: 'deliverer-complete@test.com',
    password: 'Test123!',
    name: 'Deliverer Test',
    role: 'DELIVERER'
  },
  {
    email: 'merchant-complete@test.com',
    password: 'Test123!',
    name: 'Merchant Test',
    role: 'MERCHANT'
  },
  {
    email: 'provider-complete@test.com',
    password: 'Test123!',
    name: 'Provider Test',
    role: 'PROVIDER'
  }
]

async function createTestUsers() {
  console.log('🌱 Création des utilisateurs de test via API...')

  for (const user of testUsers) {
    try {
      console.log(`📧 Création de ${user.email} (${user.role})...`)
      
      const response = await fetch(`${API_BASE}/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role,
          isActive: true,
          validationStatus: 'VALIDATED'
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ ${user.email} créé avec succès`)
      } else {
        const error = await response.text()
        console.log(`⚠️ ${user.email} existe déjà ou erreur: ${response.status}`)
      }
    } catch (error) {
      console.error(`❌ Erreur création ${user.email}:`, error.message)
    }
  }

  console.log(`
🎉 Processus terminé !

📧 Identifiants de connexion:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 ADMIN:      admin-complete@test.com
👤 CLIENT:     client-complete@test.com  
👤 DELIVERER:  deliverer-complete@test.com
👤 MERCHANT:   merchant-complete@test.com
👤 PROVIDER:   provider-complete@test.com

🔑 Mot de passe pour tous: Test123!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

// Lancer le script
if (require.main === module) {
  createTestUsers().catch(console.error)
}

module.exports = { createTestUsers }