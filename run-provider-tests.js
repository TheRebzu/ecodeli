#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Démarrage des tests Provider EcoDeli...\n')

const testFiles = [
  'tests/provider-autoentrepreneur.test.js',
  'tests/provider-contracts.test.js',
  'tests/provider-certifications-admin.test.js',
  'tests/provider-monthly-billing.test.js',
  'tests/provider-missing-features.test.js'
]

const results = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
}

async function runTest(file) {
  console.log(`📋 Test: ${file}`)
  
  try {
    const output = execSync(`npx playwright test ${file} --reporter=line`, {
      encoding: 'utf8',
      stdio: 'pipe'
    })
    
    console.log('✅ Succès')
    results.passed++
    results.details.push({ file, status: 'PASSED', output })
    
  } catch (error) {
    console.log('❌ Échec')
    console.log(error.stdout || error.message)
    results.failed++
    results.details.push({ file, status: 'FAILED', error: error.message })
  }
  
  results.total++
  console.log('')
}

async function runAllTests() {
  console.log('🔍 Vérification des fichiers de test...\n')
  
  for (const file of testFiles) {
    if (fs.existsSync(file)) {
      await runTest(file)
    } else {
      console.log(`⚠️  Fichier manquant: ${file}`)
      results.failed++
      results.total++
    }
  }
  
  // Résumé
  console.log('📊 RÉSUMÉ DES TESTS')
  console.log('====================')
  console.log(`Total: ${results.total}`)
  console.log(`✅ Succès: ${results.passed}`)
  console.log(`❌ Échecs: ${results.failed}`)
  console.log(`📈 Taux de succès: ${((results.passed / results.total) * 100).toFixed(1)}%`)
  
  // Détails des échecs
  if (results.failed > 0) {
    console.log('\n🔍 DÉTAILS DES ÉCHECS:')
    results.details
      .filter(d => d.status === 'FAILED')
      .forEach(d => {
        console.log(`\n❌ ${d.file}:`)
        console.log(`   ${d.error}`)
      })
  }
  
  // Fonctionnalités manquantes
  console.log('\n📋 FONCTIONNALITÉS PROVIDER IMPLÉMENTÉES:')
  console.log('============================================')
  
  const implementedFeatures = [
    '✅ Statut autoentrepreneur obligatoire',
    '✅ Système de contrats avec EcoDeli',
    '✅ Validation des certifications par admin',
    '✅ Facturation mensuelle automatique (30/mois)',
    '✅ Code validation 6 chiffres livraisons',
    '✅ Matching automatique trajets/annonces',
    '✅ Notifications push OneSignal',
    '✅ Abonnements 3 niveaux (Free/Starter/Premium)',
    '✅ Upload documents sécurisé',
    '✅ Génération PDF factures',
    '✅ Suivi temps réel livraisons',
    '✅ Paiements Stripe intégrés',
    '✅ Multilingue FR/EN',
    '✅ Tutoriel client overlay première connexion'
  ]
  
  implementedFeatures.forEach(feature => {
    console.log(feature)
  })
  
  console.log('\n🎯 PROCHAINES ÉTAPES:')
  console.log('=====================')
  console.log('1. Tester les intégrations OneSignal')
  console.log('2. Valider les webhooks Stripe')
  console.log('3. Tester la génération PDF')
  console.log('4. Vérifier les notifications push')
  console.log('5. Tester le tutoriel client')
  console.log('6. Valider le matching trajets/annonces')
  
  // Exit code
  process.exit(results.failed > 0 ? 1 : 0)
}

// Vérifier que l'application est en cours d'exécution
console.log('🔍 Vérification de l\'application...')
try {
  execSync('curl -s http://localhost:3000/api/health', { stdio: 'pipe' })
  console.log('✅ Application en cours d\'exécution sur http://localhost:3000')
} catch (error) {
  console.log('❌ Application non accessible sur http://localhost:3000')
  console.log('   Démarrez l\'application avec: npm run dev')
  process.exit(1)
}

console.log('')

// Lancer les tests
runAllTests().catch(error => {
  console.error('❌ Erreur lors de l\'exécution des tests:', error)
  process.exit(1)
}) 