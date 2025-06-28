const http = require('http')

function testServer() {
  console.log('🚀 Test de connexion au serveur EcoDeli')
    
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET'
  }
  
  const req = http.request(options, (res) => {
    console.log(`✅ Serveur répond: ${res.statusCode}`)
    
    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })
    
    res.on('end', () => {
      console.log('📊 Réponse:', data)
      
      // Test du dashboard si le serveur répond
      if (res.statusCode === 200) {
        console.log('🎯 Serveur opérationnel! Vous pouvez maintenant:')
        console.log('   1. Ouvrir http://localhost:3000 dans le navigateur')
        console.log('   2. Se connecter avec client@test.com / Test123!')
        console.log('   3. Vérifier le dashboard client avec le dark mode')
      }
    })
  })
  
  req.on('error', (err) => {
    console.log('❌ Serveur non disponible:', err.message)
    console.log('⏳ Veuillez attendre le démarrage complet...')
  })
  
  req.end()
}

// Test immédiat puis toutes les 5 secondes
testServer()
const interval = setInterval(() => {
  testServer()
}, 5000)

// Arrêter après 30 secondes
setTimeout(() => {
  clearInterval(interval)
  console.log('🏁 Test terminé')
}, 30000) 