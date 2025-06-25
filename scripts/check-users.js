const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('🔍 Vérification des utilisateurs dans la base...')
    
    const users = await prisma.user.findMany({
      include: {
        profile: true
      }
    })
    
    console.log(`\n📊 Total utilisateurs: ${users.length}`)
    
    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé dans la base')
      console.log('💡 Les données affichées sur la page admin sont MOCKÉES')
    } else {
      console.log('\n👥 Utilisateurs réels:')
      users.forEach(user => {
        console.log(`- ${user.email} (${user.role}) - Vérifié: ${user.emailVerified ? '✅' : '❌'}`)
        if (user.profile) {
          console.log(`  └─ ${user.profile.firstName} ${user.profile.lastName}`)
        }
      })
      console.log('\n💡 Ces sont les VRAIES données de votre base PostgreSQL')
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers() 