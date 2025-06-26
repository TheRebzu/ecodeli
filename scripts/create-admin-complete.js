const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminComplete() {
  console.log('🌱 Création du compte admin complet...')

  const passwordHash = await bcrypt.hash('Test123!', 12)

  try {
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin-complete@test.com' }
    })

    if (existingUser) {
      console.log('❌ Un compte avec cet email existe déjà')
      return
    }

    // Créer l'utilisateur admin complet
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-complete@test.com',
        password: passwordHash,
        emailVerified: true,
        role: 'ADMIN',
        profile: {
          create: {
            firstName: 'Admin',
            lastName: 'Complete',
            phone: '+33612345999',
            address: '110 Rue de Flandre',
            city: 'Paris',
            postalCode: '75019',
            country: 'FR',
            verified: true
          }
        }
      },
      include: {
        profile: true
      }
    })

    console.log('✅ Compte admin créé avec succès!')
    console.log('\n🔑 Informations de connexion:')
    console.log(`📧 Email: admin-complete@test.com`)
    console.log(`🔒 Mot de passe: Test123!`)
    console.log(`👤 ID: ${adminUser.id}`)
    console.log(`🏷️ Rôle: ${adminUser.role}`)

  } catch (error) {
    console.error('❌ Erreur lors de la création du compte admin:', error)
    throw error
  }
}

// Exécution du script
createAdminComplete()
  .then(() => {
    console.log('✅ Script terminé avec succès')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur script:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  }) 