const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testAuthDetailed() {
  try {
    console.log('🔍 Test détaillé d\'authentification...')
    
    // 1. Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: 'admin-complete@test.com' }
    })
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé')
      return
    }
    
    console.log('✅ Utilisateur trouvé:', {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified
    })
    
    // 2. Tester la vérification du mot de passe
    const passwordTest = await bcrypt.compare('Test123!', user.password)
    console.log('🔒 Test mot de passe:', passwordTest ? '✅ Valide' : '❌ Invalide')
    
    // 3. Vérifier le hash stocké (première partie)
    console.log('🗝️ Hash stocké (début):', user.password.substring(0, 20) + '...')
    
    // 4. Test de hash direct
    const directHash = await bcrypt.hash('Test123!', 12)
    const directTest = await bcrypt.compare('Test123!', directHash)
    console.log('🧪 Test hash direct:', directTest ? '✅ OK' : '❌ KO')
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAuthDetailed() 