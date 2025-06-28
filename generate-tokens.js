/**
 * Script pour générer de nouveaux tokens de session EcoDeli
 */

const BASE_URL = 'http://localhost:3000'

const accounts = [
  { email: 'client-complete@test.com', password: 'Test123!', role: 'CLIENT' },
  { email: 'admin-complete@test.com', password: 'Test123!', role: 'ADMIN' },
  { email: 'deliverer-complete@test.com', password: 'Test123!', role: 'DELIVERER' }
]

async function generateTokens() {
  console.log('🔐 Génération de nouveaux tokens de session EcoDeli...\n')

  const tokens = {}

  for (const account of accounts) {
    try {
      console.log(`Connexion ${account.role}: ${account.email}`)
      
      const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: account.email,
          password: account.password
        })
      })

      if (response.ok) {
        // Récupérer le cookie de session
        const setCookie = response.headers.get('set-cookie')
        if (setCookie) {
          const match = setCookie.match(/better-auth\.session_token=([^;]+)/)
          if (match) {
            const token = match[1]
            tokens[account.role] = token
            console.log(`✅ Token ${account.role}: ${token.substring(0, 30)}...`)
            
            // Vérifier immédiatement le token
            const sessionResponse = await fetch(`${BASE_URL}/api/auth/get-session`, {
              headers: {
                'Cookie': `better-auth.session_token=${token}`
              }
            })
            
            if (sessionResponse.ok) {
              const session = await sessionResponse.json()
              console.log(`   Utilisateur: ${session?.user?.email} (${session?.user?.role})`)
            }
          }
        }
      } else {
        const error = await response.text()
        console.log(`❌ Erreur ${account.role}: ${response.status} - ${error}`)
      }
      
      console.log('')
    } catch (error) {
      console.log(`❌ Erreur ${account.role}: ${error.message}\n`)
    }
  }

  // Afficher les tokens pour utilisation
  console.log('📋 TOKENS GÉNÉRÉS:')
  console.log('='.repeat(50))
  
  Object.entries(tokens).forEach(([role, token]) => {
    console.log(`${role}: ${token}`)
  })
  
  console.log('\n🧪 COMMANDES DE TEST:')
  console.log('='.repeat(50))
  
  if (tokens.CLIENT) {
    console.log(`# Test Dashboard Client:`)
    console.log(`curl -X GET "http://localhost:3000/api/client/dashboard" -H "Cookie: better-auth.session_token=${tokens.CLIENT}"`)
    console.log('')
  }
  
  if (tokens.ADMIN) {
    console.log(`# Test Dashboard Admin:`)
    console.log(`curl -X GET "http://localhost:3000/api/admin/dashboard" -H "Cookie: better-auth.session_token=${tokens.ADMIN}"`)
    console.log('')
  }

  return tokens
}

// Exécuter
generateTokens().catch(console.error) 