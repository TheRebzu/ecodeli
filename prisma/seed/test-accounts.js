// Script de seed pour créer les comptes de test spécifiques EcoDeli
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestAccounts() {
  console.log('🌱 Création des comptes de test EcoDeli...')

  // Mot de passe par défaut pour tous les comptes
  const defaultPassword = await bcrypt.hash('Test123!', 12)

  try {
    // Nettoyage des comptes existants avec ces emails
    const testEmails = [
      'client-complete@test.com',
      'deliverer-complete@test.com', 
      'merchant-complete@test.com',
      'provider-complete@test.com',
      'admin-complete@test.com'
    ]

    await prisma.user.deleteMany({
      where: {
        email: {
          in: testEmails
        }
      }
    })

    console.log('🧹 Nettoyage des comptes existants terminé')

    // 1. CLIENT COMPLET - avec tutoriel à faire
    const client = await prisma.user.create({
      data: {
        email: 'client-complete@test.com',
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
            tutorialCompleted: false, // Tutoriel pas encore fait
            hasActiveSubscription: false
          }
        }
      }
    })

    // 2. DELIVERER COMPLET - documents à valider
    const deliverer = await prisma.user.create({
      data: {
        email: 'deliverer-complete@test.com',
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
            validationStatus: 'PENDING', // Documents en attente de validation
            vehicleType: 'CAR',
            maxWeight: 50.0,
            maxVolume: 100.0,
            isActive: false, // Pas encore actif
            nfcCardGenerated: false
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

    // 3. MERCHANT COMPLET - contrat à signer
    const merchant = await prisma.user.create({
      data: {
        email: 'merchant-complete@test.com',
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
            contractStatus: 'PENDING', // Contrat à signer
            commissionRate: 0.05,
            isActive: false
          }
        }
      }
    })

    // 4. PROVIDER COMPLET - profil à valider
    const provider = await prisma.user.create({
      data: {
        email: 'provider-complete@test.com',
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
            validationStatus: 'PENDING', // Profil en attente de validation
            businessName: 'Services Sophie',
            specialties: ['HOME_CLEANING', 'PET_CARE'],
            hourlyRate: 25.0,
            isActive: false, // Pas encore actif
            certificationsVerified: false
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

    // 5. ADMIN COMPLET - toutes permissions
    const admin = await prisma.user.create({
      data: {
        email: 'admin-complete@test.com',
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
            permissions: [
              'MANAGE_USERS', 
              'MANAGE_PLATFORM', 
              'VIEW_ANALYTICS', 
              'VALIDATE_DOCUMENTS',
              'MANAGE_PAYMENTS',
              'MANAGE_WAREHOUSES'
            ],
            department: 'PLATFORM_MANAGEMENT'
          }
        }
      }
    })

    console.log('✅ Comptes de test créés avec succès!')
    console.log('\n🧪 Comptes de test - Mode développement')
    console.log('Mot de passe pour tous les comptes: Test123!')
    console.log('\n👤 CLIENT')
    console.log('Accès client avec tutoriel')
    console.log(`Email: client-complete@test.com (ID: ${client.id})`)
    console.log('\n🚚 DELIVERER')
    console.log('Livreur (documents à valider)')
    console.log(`Email: deliverer-complete@test.com (ID: ${deliverer.id})`)
    console.log('\n🏪 MERCHANT')
    console.log('Commerçant (contrat à signer)')
    console.log(`Email: merchant-complete@test.com (ID: ${merchant.id})`)
    console.log('\n🔧 PROVIDER')
    console.log('Prestataire (profil à valider)')
    console.log(`Email: provider-complete@test.com (ID: ${provider.id})`)
    console.log('\n👨‍💼 ADMIN')
    console.log('Administrateur (toutes permissions)')
    console.log(`Email: admin-complete@test.com (ID: ${admin.id})`)

  } catch (error) {
    console.error('❌ Erreur lors de la création des comptes:', error)
    throw error
  }
}

module.exports = { createTestAccounts }

// Exécution directe si le script est appelé
if (require.main === module) {
  createTestAccounts()
    .then(() => {
      console.log('✅ Seed des comptes de test terminé avec succès')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erreur seed:', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
} 