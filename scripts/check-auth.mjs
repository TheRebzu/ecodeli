import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAuth() {
  console.log('🔍 Vérification de l\'authentification...\n')

  // 1. Vérifier les utilisateurs
  console.log('📋 Utilisateurs CLIENT dans la base de données:')
  const clients = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      validationStatus: true,
      client: {
        select: {
          id: true,
          tutorialCompleted: true
        }
      }
    },
    take: 5
  })

  clients.forEach(client => {
    console.log(`- ${client.email} (ID: ${client.id})`)
    console.log(`  Active: ${client.isActive}, Status: ${client.validationStatus}`)
    console.log(`  Tutorial: ${client.client?.tutorialCompleted ? 'Complété' : 'Non complété'}`)
  })

  // 2. Vérifier les sessions existantes
  console.log('\n📋 Sessions dans la base de données:')
  const sessions = await prisma.session.findMany({
    select: {
      id: true,
      userId: true,
      expires: true,
      user: {
        select: {
          email: true
        }
      }
    },
    take: 5
  })

  if (sessions.length === 0) {
    console.log('Aucune session trouvée')
  } else {
    sessions.forEach(session => {
      console.log(`- Session ${session.id} pour ${session.user.email}`)
      console.log(`  User ID: ${session.userId}`)
      console.log(`  Expire: ${session.expires}`)
    })
  }

  // 3. Nettoyer les sessions expirées
  const deleted = await prisma.session.deleteMany({
    where: {
      expires: {
        lt: new Date()
      }
    }
  })
  console.log(`\n🧹 ${deleted.count} sessions expirées supprimées`)

  // 4. Afficher un utilisateur de test recommandé
  console.log('\n✅ Utilisateur de test recommandé:')
  console.log('Email: john.doe@example.com')
  console.log('Mot de passe: password123')
  console.log('\nAssurez-vous de vous déconnecter complètement et de vous reconnecter avec ces identifiants.')
}

checkAuth()
  .catch(console.error)
  .finally(() => prisma.$disconnect())