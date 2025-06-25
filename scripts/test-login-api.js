const fetch = require('node-fetch')

async function testLoginAPI() {
  console.log('🔐 Test de l\'API de connexion')
  
  const testUser = {
    email: 'test-unverified@ecodeli.test',
    password: 'Test123!'
  }
  
  try {
    console.log(`📧 Test avec: ${testUser.email}`)
    console.log('🚀 Envoi de la requête...')
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    })
    
    console.log('📥 Réponse reçue')
    console.log(`📊 Status: ${response.status}`)
    console.log(`📋 Headers:`, response.headers.raw())
    
    const text = await response.text()
    console.log(`📜 Raw response:`, text)
    
    let result
    try {
      result = JSON.parse(text)
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError.message)
      console.log('📜 Contenu brut:', text)
      return
    }
    
    console.log(`📋 Réponse parsée:`, result)
    
    if (response.ok) {
      console.log('✅ SUCCÈS: Connexion réussie!')
      console.log(`👤 Utilisateur: ${result.user?.email}`)
      console.log(`🎭 Rôle: ${result.user?.role}`)
    } else {
      console.log('❌ ÉCHEC: Connexion échouée')
      console.log(`🔍 Erreur: ${result.error}`)
    }
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message)
    console.error('❌ Stack:', error.stack)
    console.log('💡 Vérifiez que le serveur est démarré avec "npm run dev"')
  }
}

console.log('🎬 Démarrage du test...')
testLoginAPI().then(() => {
  console.log('🏁 Test terminé')
}).catch(err => {
  console.error('💥 Erreur fatale:', err)
}) 