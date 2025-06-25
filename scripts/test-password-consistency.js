const bcrypt = require('bcryptjs')

async function testPasswordConsistency() {
  console.log('🔐 Test de cohérence du hashage de mot de passe')
  
  const testPassword = 'Test123!'
  const testEmail = 'test-consistency@example.com'
  
  console.log(`Mot de passe de test: ${testPassword}`)
  
  // 1. Tester le hashage (comme lors de l'inscription)
  const hashedPassword = await bcrypt.hash(testPassword, 12)
  console.log(`✅ Mot de passe hashé: ${hashedPassword.substring(0, 20)}...`)
  
  // 2. Tester la vérification (comme lors de la connexion)
  const isValid = await bcrypt.compare(testPassword, hashedPassword)
  console.log(`✅ Vérification: ${isValid ? 'SUCCÈS' : 'ÉCHEC'}`)
  
  // 3. Tester avec un mauvais mot de passe
  const wrongPassword = 'WrongPassword123!'
  const isInvalid = await bcrypt.compare(wrongPassword, hashedPassword)
  console.log(`✅ Mauvais mot de passe: ${isInvalid ? 'ÉCHEC INATTENDU' : 'REJETÉ CORRECTEMENT'}`)
  
  console.log('\n🎯 Résumé:')
  console.log(`- Hashage: ✅`)
  console.log(`- Vérification valide: ${isValid ? '✅' : '❌'}`)
  console.log(`- Rejet invalide: ${!isInvalid ? '✅' : '❌'}`)
  
  if (isValid && !isInvalid) {
    console.log('\n🎉 SUCCÈS: La cohérence du mot de passe est assurée!')
  } else {
    console.log('\n❌ ÉCHEC: Problème de cohérence détecté!')
  }
}

testPasswordConsistency().catch(console.error) 