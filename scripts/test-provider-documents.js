const axios = require('axios')

async function testProviderDocuments() {
  try {
    console.log('🧪 Test de l\'API documents prestataire...')
    
    // D'abord se connecter pour obtenir un token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/simple-login', {
      email: 'provider-test@example.com',
      password: 'password123'
    })
    
    if (!loginResponse.data.success) {
      console.error('❌ Échec de connexion:', loginResponse.data.error)
      return
    }
    
    console.log('✅ Connexion réussie')
    
    // Tester l'API documents
    const documentsResponse = await axios.get('http://localhost:3000/api/provider/documents', {
      headers: {
        'Cookie': `auth-token=${loginResponse.data.token}`
      }
    })
    
    console.log('📄 Documents récupérés:')
    console.log(JSON.stringify(documentsResponse.data, null, 2))
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message)
  }
}

testProviderDocuments() 