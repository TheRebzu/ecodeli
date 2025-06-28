#!/usr/bin/env node

/**
 * Tests d'inscription NextAuth - EcoDeli
 * Teste tous les rôles avec les bonnes données
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Comptes de test EcoDeli (exactement comme définis dans create-test-accounts.js)
const testAccounts = {
  CLIENT: {
    email: 'client-complete@test.com',
    password: 'Test123!',
    firstName: 'Marie',
    lastName: 'Dubois',
    phone: '0123456789',
    role: 'CLIENT',
    address: '123 Rue de la Paix',
    city: 'Paris',
    postalCode: '75001'
  },
  DELIVERER: {
    email: 'deliverer-complete@test.com',
    password: 'Test123!',
    firstName: 'Jean',
    lastName: 'Martin',
    phone: '0987654321',
    role: 'DELIVERER',
    address: '456 Avenue des Livreurs',
    city: 'Lyon',
    postalCode: '69000'
  },
  MERCHANT: {
    email: 'merchant-complete@test.com',
    password: 'Test123!',
    firstName: 'Pierre',
    lastName: 'Durand',
    phone: '0134567890',
    role: 'MERCHANT',
    companyName: 'Commerce Durand SARL',
    siret: '12345678901234',
    address: '321 Boulevard du Commerce',
    city: 'Toulouse',
    postalCode: '31000'
  },
  PROVIDER: {
    email: 'provider-complete@test.com',
    password: 'Test123!',
    firstName: 'Sophie',
    lastName: 'Bernard',
    phone: '0156789012',
    role: 'PROVIDER',
    businessName: 'Services à Domicile SB',
    address: '789 Rue des Services',
    city: 'Marseille',
    postalCode: '13000'
  },
  ADMIN: {
    email: 'admin-complete@test.com',
    password: 'Test123!',
    firstName: 'Admin',
    lastName: 'EcoDeli',
    phone: '0198765432',
    role: 'ADMIN',
    address: '999 Avenue de l\'Administration',
    city: 'Paris',
    postalCode: '75008'
  }
}

/**
 * Test inscription pour un rôle
 */
async function testRegistration(role, userData) {
  console.log(`\n🔍 Test inscription ${role}...`)
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })

    const data = await response.json()

    if (response.ok) {
      console.log(`✅ ${role} - Inscription réussie`)
      console.log(`   Email: ${userData.email}`)
      console.log(`   Utilisateur ID: ${data.user?.id}`)
      console.log(`   Statut: ${data.user?.isActive ? 'Actif' : 'En attente'}`)
      console.log(`   Message: ${data.message}`)
      return { success: true, data, email: userData.email }
    } else {
      console.log(`❌ ${role} - Erreur inscription`)
      console.log(`   Code: ${response.status}`)
      console.log(`   Erreur: ${data.error}`)
      if (data.details) {
        console.log(`   Détails: ${JSON.stringify(data.details, null, 2)}`)
      }
      return { success: false, error: data.error, email: userData.email }
    }
  } catch (error) {
    console.log(`❌ ${role} - Erreur réseau`)
    console.log(`   Erreur: ${error.message}`)
    return { success: false, error: error.message, email: userData.email }
  }
}

/**
 * Test connexion pour un compte
 */
async function testLogin(email, password, role) {
  console.log(`\n🔐 Test connexion ${role} (${email})...`)
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        callbackUrl: '/'
      })
    })

    const data = await response.json()

    if (response.ok && data.url) {
      console.log(`✅ ${role} - Connexion réussie`)
      console.log(`   Redirection: ${data.url}`)
      return { success: true, redirectUrl: data.url }
    } else {
      console.log(`❌ ${role} - Erreur connexion`)
      console.log(`   Code: ${response.status}`)
      console.log(`   Erreur: ${JSON.stringify(data, null, 2)}`)
      return { success: false, error: data }
    }
  } catch (error) {
    console.log(`❌ ${role} - Erreur réseau connexion`)
    console.log(`   Erreur: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Test du dashboard pour un rôle
 */
async function testDashboard(role, email) {
  console.log(`\n📊 Test dashboard ${role}...`)
  
  try {
    // Simuler la session avec l'email (en réalité il faudrait les cookies)
    const response = await fetch(`${BASE_URL}/api/${role.toLowerCase()}/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // En réalité on aurait besoin des cookies de session
        'User-Agent': 'EcoDeli-Test'
      }
    })

    const data = await response.json()

    if (response.ok) {
      console.log(`✅ ${role} - Dashboard accessible`)
      console.log(`   Données récupérées: ${Object.keys(data).join(', ')}`)
      return { success: true, data }
    } else {
      console.log(`❌ ${role} - Dashboard inaccessible`)
      console.log(`   Code: ${response.status}`)
      console.log(`   Erreur: ${data.error || 'Erreur inconnue'}`)
      return { success: false, error: data.error }
    }
  } catch (error) {
    console.log(`❌ ${role} - Erreur réseau dashboard`)
    console.log(`   Erreur: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Test complet
 */
async function runCompleteTest() {
  console.log('🚀 Début des tests NextAuth - EcoDeli')
  console.log(`📍 URL de test: ${BASE_URL}`)
  console.log(`📅 ${new Date().toLocaleString()}`)

  const results = {
    registrations: [],
    logins: [],
    dashboards: [],
    summary: {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0
    }
  }

  // Test des inscriptions
  console.log('\n' + '='.repeat(50))
  console.log('📝 TESTS INSCRIPTION')
  console.log('='.repeat(50))

  for (const [role, userData] of Object.entries(testAccounts)) {
    const result = await testRegistration(role, userData)
    results.registrations.push({ role, ...result })
    results.summary.totalTests++
    if (result.success) results.summary.successfulTests++
    else results.summary.failedTests++
  }

  // Test des connexions
  console.log('\n' + '='.repeat(50))
  console.log('🔐 TESTS CONNEXION')
  console.log('='.repeat(50))

  for (const [role, userData] of Object.entries(testAccounts)) {
    const result = await testLogin(userData.email, userData.password, role)
    results.logins.push({ role, email: userData.email, ...result })
    results.summary.totalTests++
    if (result.success) results.summary.successfulTests++
    else results.summary.failedTests++
  }

  // Test des dashboards (uniquement pour les rôles avec dashboard)
  console.log('\n' + '='.repeat(50))
  console.log('📊 TESTS DASHBOARD')
  console.log('='.repeat(50))

  const dashboardRoles = ['CLIENT', 'DELIVERER', 'ADMIN']
  for (const role of dashboardRoles) {
    const userData = testAccounts[role]
    const result = await testDashboard(role, userData.email)
    results.dashboards.push({ role, email: userData.email, ...result })
    results.summary.totalTests++
    if (result.success) results.summary.successfulTests++
    else results.summary.failedTests++
  }

  // Résumé final
  console.log('\n' + '='.repeat(50))
  console.log('📋 RÉSUMÉ DES TESTS')
  console.log('='.repeat(50))

  console.log(`📊 Tests totaux: ${results.summary.totalTests}`)
  console.log(`✅ Réussis: ${results.summary.successfulTests}`)
  console.log(`❌ Échoués: ${results.summary.failedTests}`)
  console.log(`📈 Taux de réussite: ${Math.round((results.summary.successfulTests / results.summary.totalTests) * 100)}%`)

  // Détails des erreurs
  console.log('\n🔍 DÉTAILS DES ERREURS:')
  const allResults = [...results.registrations, ...results.logins, ...results.dashboards]
  const failures = allResults.filter(r => !r.success)
  
  if (failures.length === 0) {
    console.log('✅ Aucune erreur détectée')
  } else {
    failures.forEach(failure => {
      console.log(`❌ ${failure.role}: ${failure.error}`)
    })
  }

  console.log('\n🎯 RECOMMANDATIONS:')
  if (results.summary.failedTests === 0) {
    console.log('✅ Tous les tests sont passés ! Le système NextAuth est opérationnel.')
  } else {
    console.log('⚠️  Certains tests ont échoué. Vérifiez:')
    console.log('   - La base de données est-elle accessible ?')
    console.log('   - Les schémas Prisma sont-ils synchronisés ?')
    console.log('   - Les variables d\'environnement sont-elles correctes ?')
    console.log('   - Le serveur Next.js est-il démarré ?')
  }

  console.log('\n✨ Tests terminés')
  return results
}

// Exécution
if (require.main === module) {
  runCompleteTest().catch(console.error)
}

module.exports = { runCompleteTest, testRegistration, testLogin, testDashboard }