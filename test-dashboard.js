const fetch = require('node-fetch')

async function testDashboard() {
  try {
    console.log('🚀 Test de l\'API Dashboard EcoDeli')
    
    // Attendre que le serveur soit prêt
    console.log('⏳ Attente du démarrage du serveur...')
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    // Test de connexion
    console.log('🔐 Connexion avec compte client...')
    const loginResponse = await fetch('http://localhost:3000/api/auth/sign-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'client@test.com',
        password: 'Test123!'
      })
    })
    
    if (!loginResponse.ok) {
      console.error('❌ Erreur de connexion:', loginResponse.status)
      const error = await loginResponse.text()
      console.error(error)
      return
    }
    
    // Récupérer les cookies de session
    const cookies = loginResponse.headers.get('set-cookie')
    console.log('✅ Connexion réussie')
    
    // Test du dashboard
    console.log('📊 Test de l\'API dashboard...')
    const dashboardResponse = await fetch('http://localhost:3000/api/client/dashboard', {
      headers: {
        'Cookie': cookies || ''
      }
    })
    
    if (!dashboardResponse.ok) {
      console.error('❌ Erreur dashboard:', dashboardResponse.status)
      const error = await dashboardResponse.text()
      console.error(error)
      return
    }
    
    const dashboardData = await dashboardResponse.json()
    console.log('✅ Dashboard chargé avec succès!')
    console.log('📈 Stats:', dashboardData.stats)
    console.log('📢 Annonces récentes:', dashboardData.recentAnnouncements?.length || 0)
    console.log('🎓 Tutoriel:', dashboardData.tutorial?.completed ? 'Terminé' : 'En cours')
    
  } catch (error) {
    console.error('💥 Erreur:', error.message)
  }
}

testDashboard() 