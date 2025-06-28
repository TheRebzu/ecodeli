#!/usr/bin/env node

/**
 * Test des comptes seeds NextAuth - EcoDeli
 * Teste la connexion avec les comptes créés par le seed
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Comptes du seed (mot de passe: Test123! pour tous)
const seedAccounts = [
  // Clients
  { email: 'client1@test.com', name: 'Marie Dubois', role: 'CLIENT' },
  { email: 'client2@test.com', name: 'Jean Martin', role: 'CLIENT' },
  { email: 'client3@test.com', name: 'Sophie Bernard', role: 'CLIENT' },
  
  // Livreurs
  { email: 'livreur1@test.com', name: 'Thomas Moreau', role: 'DELIVERER', status: 'VALIDATED' },
  { email: 'livreur2@test.com', name: 'Lucas Simon', role: 'DELIVERER', status: 'VALIDATED' },
  
  // Commerçants
  { email: 'commercant1@test.com', name: 'Carrefour City', role: 'MERCHANT' },
  { email: 'commercant2@test.com', name: 'Monoprix', role: 'MERCHANT' },
  
  // Prestataires
  { email: 'prestataire1@test.com', name: 'Julie Durand', role: 'PROVIDER', status: 'VALIDATED' },
  { email: 'prestataire2@test.com', name: 'Marc Rousseau', role: 'PROVIDER', status: 'VALIDATED' },
  
  // Admins
  { email: 'admin1@test.com', name: 'Admin Principal', role: 'ADMIN' },
  { email: 'admin2@test.com', name: 'Admin Support', role: 'ADMIN' }
]

const PASSWORD = 'Test123!'

/**
 * Test de connexion pour un compte seed
 */
async function testSeedLogin(account) {
  console.log(`\n🔐 Test ${account.role}: ${account.name} (${account.email})`)
  
  try {
    // Test avec NextAuth credentials
    const response = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: account.email,
        password: PASSWORD,
        callbackUrl: '/'
      })
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ Connexion réussie`)
      
      if (data.url) {
        console.log(`   🔗 Redirection: ${data.url}`)
      }
      
      return { success: true, account }
    } else {
      const errorData = await response.json()
      console.log(`   ❌ Échec connexion (${response.status})`)
      console.log(`   💬 Erreur: ${JSON.stringify(errorData)}`)
      
      return { success: false, account, error: errorData }
    }

  } catch (error) {
    console.log(`   ❌ Erreur réseau: ${error.message}`)
    return { success: false, account, error: error.message }
  }
}

/**
 * Test de session après connexion
 */
async function testSession() {
  console.log(`\n📊 Test session API...`)
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/session`)
    const data = await response.json()
    
    if (data.user) {
      console.log(`   ✅ Session active: ${data.user.email} (${data.user.role})`)
      return { success: true, session: data }
    } else {
      console.log(`   ⚠️ Aucune session active`)
      return { success: false }
    }
    
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Test de vérification d'un compte spécifique
 */
async function testSpecificAccount(email) {
  console.log(`\n🎯 Test compte spécifique: ${email}`)
  
  const account = seedAccounts.find(acc => acc.email === email)
  if (!account) {
    console.log(`   ❌ Compte non trouvé dans la liste`)
    return { success: false, error: 'Account not found' }
  }
  
  const result = await testSeedLogin(account)
  
  if (result.success) {
    // Test de la session après connexion
    await testSession()
  }
  
  return result
}

/**
 * Test de tous les comptes par rôle
 */
async function testByRole(role) {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`🧪 TEST COMPTES ${role}`)
  console.log(`${'='.repeat(50)}`)
  
  const accounts = seedAccounts.filter(acc => acc.role === role)
  const results = []
  
  for (const account of accounts) {
    const result = await testSeedLogin(account)
    results.push(result)
  }
  
  const successful = results.filter(r => r.success).length
  console.log(`\n📊 ${role}: ${successful}/${accounts.length} connexions réussies`)
  
  return results
}

/**
 * Test complet de tous les comptes
 */
async function testAllSeedAccounts() {
  console.log('🚀 Test des comptes seed NextAuth - EcoDeli')
  console.log(`📍 URL: ${BASE_URL}`)
  console.log(`🔑 Mot de passe: ${PASSWORD}`)
  console.log(`📅 ${new Date().toLocaleString()}`)

  const allResults = {}
  let totalSuccess = 0
  let totalTests = 0

  // Test par rôle
  for (const role of ['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN']) {
    const results = await testByRole(role)
    allResults[role] = results
    
    totalTests += results.length
    totalSuccess += results.filter(r => r.success).length
  }

  // Résumé global
  console.log(`\n${'='.repeat(50)}`)
  console.log('📋 RÉSUMÉ GLOBAL')
  console.log(`${'='.repeat(50)}`)
  
  console.log(`📊 Total: ${totalSuccess}/${totalTests} connexions réussies`)
  console.log(`📈 Taux de réussite: ${Math.round(totalSuccess/totalTests*100)}%`)

  // Détails des échecs
  const failures = Object.values(allResults)
    .flat()
    .filter(r => !r.success)

  if (failures.length > 0) {
    console.log(`\n❌ ÉCHECS (${failures.length}):`)
    failures.forEach(failure => {
      console.log(`   - ${failure.account.email} (${failure.account.role}): ${failure.error?.message || 'Erreur inconnue'}`)
    })
  } else {
    console.log(`\n✅ Tous les comptes seed fonctionnent !`)
  }

  // Recommandations
  console.log(`\n🎯 RECOMMANDATIONS:`)
  if (totalSuccess === totalTests) {
    console.log('✅ NextAuth fonctionne parfaitement avec les comptes seed')
    console.log('   Vous pouvez utiliser ces comptes pour tester l\'application')
  } else {
    console.log('⚠️ Problèmes détectés avec certains comptes:')
    console.log('   - Vérifiez que le seed a été exécuté: npx prisma db seed')
    console.log('   - Vérifiez que NextAuth est bien configuré')
    console.log('   - Contrôlez les logs du serveur pour plus de détails')
  }

  console.log('\n✨ Test terminé')
  return allResults
}

/**
 * Test rapide d'un seul compte
 */
async function quickTest() {
  console.log('⚡ Test rapide - Client 1')
  return await testSpecificAccount('client1@test.com')
}

// Exécution selon les arguments
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--quick')) {
    quickTest().catch(console.error)
  } else if (args.includes('--role')) {
    const roleIndex = args.indexOf('--role')
    const role = args[roleIndex + 1]?.toUpperCase()
    if (['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN'].includes(role)) {
      testByRole(role).catch(console.error)
    } else {
      console.log('❌ Rôle invalide. Utilisez: CLIENT, DELIVERER, MERCHANT, PROVIDER, ADMIN')
    }
  } else if (args.includes('--email')) {
    const emailIndex = args.indexOf('--email')
    const email = args[emailIndex + 1]
    if (email) {
      testSpecificAccount(email).catch(console.error)
    } else {
      console.log('❌ Email requis avec --email')
    }
  } else {
    testAllSeedAccounts().catch(console.error)
  }
}

module.exports = { 
  testAllSeedAccounts, 
  testByRole, 
  testSpecificAccount, 
  quickTest,
  seedAccounts 
}