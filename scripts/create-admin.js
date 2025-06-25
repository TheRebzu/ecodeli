// Script pour créer un compte admin EcoDeli
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    console.log('🔧 Création du compte admin...')

    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin-complete@test.com' }
    })

    if (existingAdmin) {
      console.log('✅ Le compte admin existe déjà!')
      console.log('📧 Email: admin-complete@test.com')
      console.log('🔑 Mot de passe: Test123!')
      return
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('Test123!', 12)

    // Créer l'utilisateur admin avec profil
    const admin = await prisma.user.create({
      data: {
        email: 'admin-complete@test.com',
        password: hashedPassword,
        emailVerified: true,
        role: 'ADMIN',
        language: 'fr',
        profile: {
          create: {
            firstName: 'Admin',
            lastName: 'EcoDeli',
            phone: '+33123456789',
            country: 'FR',
            language: 'fr',
            isVerified: true,
            verifiedAt: new Date()
          }
        },
        admin: {
          create: {
            permissions: ['ALL'],
            department: 'PLATFORM_MANAGEMENT'
          }
        }
      },
      include: {
        profile: true,
        admin: true
      }
    })

    console.log('✅ Compte admin créé avec succès!')
    console.log('📧 Email:', admin.email)
    console.log('🔑 Mot de passe: Test123!')
    console.log('🆔 ID:', admin.id)
    console.log('🎯 Rôle:', admin.role)
    console.log('👤 Nom:', admin.profile?.firstName, admin.profile?.lastName)
    console.log('\n🚀 Vous pouvez maintenant vous connecter sur: http://localhost:3000/login')

  } catch (error) {
    console.error('❌ Erreur lors de la création du compte admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin() 