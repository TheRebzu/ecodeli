// Seed pour créer des utilisateurs de test EcoDeli
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestUsers() {
  console.log('🌱 Création des utilisateurs de test EcoDeli...')

  const defaultPassword = await bcrypt.hash('Test123!', 12)

  try {
    // 1. Client de test
    const client = await prisma.user.create({
      data: {
        email: 'client@test.com',
        password: defaultPassword,
        emailVerified: true,
        role: 'CLIENT',
        firstName: 'Marie',
        lastName: 'Dupont',
        phoneNumber: '+33612345678',
        language: 'fr',
        Profile: {
          create: {
            address: '123 Rue de la Paix',
            city: 'Paris',
            postalCode: '75001',
            country: 'FR'
          }
        },
        Client: {
          create: {
            subscriptionPlan: 'FREE',
            tutorialCompleted: false
          }
        }
      }
    })

    // 2. Livreur de test
    const deliverer = await prisma.user.create({
      data: {
        email: 'deliverer@test.com',
        password: defaultPassword,
        emailVerified: true,
        role: 'DELIVERER',
        firstName: 'Pierre',
        lastName: 'Martin',
        phoneNumber: '+33698765432',
        language: 'fr',
        Profile: {
          create: {
            address: '456 Avenue de la République',
            city: 'Lyon',
            postalCode: '69000',
            country: 'FR'
          }
        },
        Deliverer: {
          create: {
            validationStatus: 'APPROVED',
            vehicleType: 'CAR',
            maxWeight: 50.0,
            maxVolume: 100.0,
            isActive: true
          }
        },
        Wallet: {
          create: {
            balance: 0.0,
            currency: 'EUR'
          }
        }
      }
    })

    // 3. Prestataire de test
    const provider = await prisma.user.create({
      data: {
        email: 'provider@test.com',
        password: defaultPassword,
        emailVerified: true,
        role: 'PROVIDER',
        firstName: 'Sophie',
        lastName: 'Leblanc',
        phoneNumber: '+33623456789',
        language: 'fr',
        Profile: {
          create: {
            address: '789 Cours Lafayette',
            city: 'Marseille',
            postalCode: '13000',
            country: 'FR'
          }
        },
        Provider: {
          create: {
            validationStatus: 'APPROVED',
            businessName: 'Services Sophie',
            specialties: ['HOME_CLEANING', 'PET_CARE'],
            hourlyRate: 25.0,
            isActive: true
          }
        },
        Wallet: {
          create: {
            balance: 150.0,
            currency: 'EUR'
          }
        }
      }
    })

    // 4. Commerçant de test
    const merchant = await prisma.user.create({
      data: {
        email: 'merchant@test.com',
        password: defaultPassword,
        emailVerified: true,
        role: 'MERCHANT',
        firstName: 'Thomas',
        lastName: 'Rousseau',
        phoneNumber: '+33634567890',
        language: 'fr',
        Profile: {
          create: {
            address: '321 Rue du Commerce',
            city: 'Toulouse',
            postalCode: '31000',
            country: 'FR'
          }
        },
        Merchant: {
          create: {
            companyName: 'Boutique Thomas',
            siret: '12345678901234',
            contractStatus: 'ACTIVE',
            commissionRate: 0.05
          }
        }
      }
    })

    // 5. Admin de test
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: defaultPassword,
        emailVerified: true,
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'EcoDeli',
        phoneNumber: '+33612345678',
        language: 'fr',
        Profile: {
          create: {
            address: '110 Rue de Flandre',
            city: 'Paris',
            postalCode: '75019',
            country: 'FR'
          }
        },
        Admin: {
          create: {
            permissions: ['MANAGE_USERS', 'MANAGE_PLATFORM'],
            department: 'OPERATIONS'
          }
        }
      }
    })

    console.log('✅ Utilisateurs de test créés avec succès!')
    console.log('\n🔑 Comptes de test (mot de passe: Test123!):')
    console.log(`👤 Client: client@test.com (${client.id})`)
    console.log(`🚚 Livreur: deliverer@test.com (${deliverer.id})`)
    console.log(`🔧 Prestataire: provider@test.com (${provider.id})`)
    console.log(`🏪 Commerçant: merchant@test.com (${merchant.id})`)
    console.log(`👨‍💼 Admin: admin@test.com (${admin.id})`)

  } catch (error) {
    console.error('❌ Erreur lors de la création des utilisateurs:', error)
    throw error
  }
}

module.exports = { createTestUsers }

// Exécution directe si le script est appelé
if (require.main === module) {
  createTestUsers()
    .then(() => {
      console.log('✅ Seed terminé avec succès')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erreur seed:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
} 