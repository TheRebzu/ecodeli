const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixUserAccounts() {
  try {
    console.log('🔧 Recherche des utilisateurs sans Account credential...')
    
    // Trouver tous les utilisateurs qui n'ont pas d'Account credential
    const usersWithoutCredentialAccount = await prisma.user.findMany({
      where: {
        accounts: {
          none: {
            type: 'credential',
            provider: 'credential'
          }
        }
      },
      include: {
        accounts: true
      }
    })

    console.log(`📊 Trouvé ${usersWithoutCredentialAccount.length} utilisateurs sans Account credential`)

    for (const user of usersWithoutCredentialAccount) {
      console.log(`🔧 Correction pour l'utilisateur: ${user.email}`)
      
      // Créer un Account credential pour cet utilisateur
      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'credential',
          provider: 'credential',
          providerAccountId: user.id, // Utiliser l'ID utilisateur comme providerAccountId
        }
      })

      console.log(`✅ Account credential créé pour ${user.email}`)
    }

    console.log('🎉 Correction terminée avec succès!')
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
fixUserAccounts() 