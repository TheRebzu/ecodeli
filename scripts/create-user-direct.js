// Créer un utilisateur directement via Prisma pour les tests
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    console.log('🌱 Création utilisateur test direct...')

    const password = 'Test123!'
    const hashedPassword = await bcrypt.hash(password, 12)

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: 'client-complete@test.com' }
    })

    if (existingUser) {
      console.log('⚠️ Utilisateur existe déjà:', existingUser.email)
      return existingUser
    }

    // Créer l'utilisateur avec Better-Auth account
    const user = await prisma.user.create({
      data: {
        email: 'client-complete@test.com',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        name: 'Client Test',
        role: 'CLIENT',
        isActive: true,
        validationStatus: 'VALIDATED',
        language: 'fr',
        accounts: {
          create: {
            accountId: 'client-complete@test.com',
            providerId: 'credential',
            password: hashedPassword,
          }
        }
      },
      include: {
        accounts: true
      }
    })

    console.log('✅ Utilisateur créé:', user.email)
    console.log(`🔑 Email: client-complete@test.com`)
    console.log(`🔑 Password: ${password}`)

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()