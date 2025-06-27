// Script pour créer tous les comptes de test nécessaires pour l'API EcoDeli
import { PrismaClient } from '@prisma/client'
import { auth } from './src/lib/auth'

const prisma = new PrismaClient()

const TEST_USERS = [
  {
    email: 'client-complete@test.com',
    password: 'Test123!',
    name: 'Client Complete',
    role: 'CLIENT',
    profile: {
      firstName: 'Client',
      lastName: 'Complete',
      phone: '+33123456789'
    },
    clientData: {
      subscriptionPlan: 'PREMIUM',
      tutorialCompleted: true
    }
  },
  {
    email: 'deliverer-complete@test.com',
    password: 'Test123!',
    name: 'Deliverer Complete', 
    role: 'DELIVERER',
    profile: {
      firstName: 'Deliverer',
      lastName: 'Complete',
      phone: '+33987654321'
    },
    delivererData: {
      vehicleType: 'BIKE',
      isAvailable: true,
      documentsValidated: true
    }
  },
  {
    email: 'admin-complete@test.com',
    password: 'Test123!',
    name: 'Admin Complete',
    role: 'ADMIN',
    profile: {
      firstName: 'Admin',
      lastName: 'Complete',
      phone: '+33321654987'
    }
  },
  {
    email: 'merchant-complete@test.com',
    password: 'Test123!',
    name: 'Merchant Complete',
    role: 'MERCHANT',
    profile: {
      firstName: 'Merchant',
      lastName: 'Complete',
      phone: '+33456789123'
    },
    merchantData: {
      companyName: 'Test Shop SAS',
      siret: '12345678901234',
      contractStatus: 'ACTIVE'
    }
  },
  {
    email: 'provider-complete@test.com',
    password: 'Test123!',
    name: 'Provider Complete',
    role: 'PROVIDER',
    profile: {
      firstName: 'Provider',
      lastName: 'Complete',
      phone: '+33654321987'
    },
    providerData: {
      businessName: 'Test Services SARL',
      siret: '98765432109876',
      validationStatus: 'VALIDATED'
    }
  }
]

async function createTestUser(userData: typeof TEST_USERS[0]) {
  console.log(`\n🔄 Création de ${userData.email} (${userData.role})...`)
  
  try {
    // 1. Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    if (existingUser) {
      console.log(`ℹ️  Utilisateur ${userData.email} existe déjà`)
      return existingUser
    }

    // 2. Créer l'utilisateur via Better-Auth
    const authResult = await auth.api.signUpEmail({
      body: {
        email: userData.email,
        password: userData.password,
        name: userData.name
      }
    })

    if (!authResult.user) {
      throw new Error('Échec création utilisateur via Better-Auth')
    }

    console.log(`✅ Utilisateur Better-Auth créé: ${authResult.user.id}`)

    // 3. Mettre à jour les données utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        role: userData.role as any,
        isActive: true,
        validationStatus: 'VALIDATED',
        emailVerified: true,
        emailVerifiedAt: new Date()
      }
    })

    // 4. Créer le profil
    await prisma.profile.create({
      data: {
        userId: updatedUser.id,
        firstName: userData.profile.firstName,
        lastName: userData.profile.lastName,
        phone: userData.profile.phone,
        isVerified: true,
        address: '110 rue de Flandre',
        postalCode: '75019',
        city: 'Paris',
        country: 'France'
      }
    })

    // 5. Créer les données spécifiques au rôle
    switch (userData.role) {
      case 'CLIENT':
        if (userData.clientData) {
          await prisma.client.create({
            data: {
              userId: updatedUser.id,
              subscriptionPlan: userData.clientData.subscriptionPlan as any,
              tutorialCompleted: userData.clientData.tutorialCompleted,
              tutorialCompletedAt: new Date(),
              subscriptionStartDate: new Date(),
              subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 an
            }
          })
        }
        break

      case 'DELIVERER':
        if (userData.delivererData) {
          await prisma.deliverer.create({
            data: {
              userId: updatedUser.id,
              vehicleType: userData.delivererData.vehicleType as any,
              isAvailable: userData.delivererData.isAvailable,
              documentsValidated: userData.delivererData.documentsValidated,
              validatedAt: new Date(),
              maxWeight: 10.0,
              maxDistance: 50.0
            }
          })

          // Créer un wallet pour le livreur
          await prisma.wallet.create({
            data: {
              delivererId: updatedUser.id,
              balance: 0.0,
              currency: 'EUR'
            }
          })
        }
        break

      case 'MERCHANT':
        if (userData.merchantData) {
          await prisma.merchant.create({
            data: {
              userId: updatedUser.id,
              companyName: userData.merchantData.companyName,
              siret: userData.merchantData.siret,
              contractStatus: userData.merchantData.contractStatus,
              contractStartDate: new Date(),
              commissionRate: 0.15, // 15%
              vatNumber: '12345678901'
            }
          })
        }
        break

      case 'PROVIDER':
        if (userData.providerData) {
          await prisma.provider.create({
            data: {
              userId: updatedUser.id,
              businessName: userData.providerData.businessName,
              siret: userData.providerData.siret,
              validationStatus: userData.providerData.validationStatus as any,
              activatedAt: new Date(),
              isActive: true,
              specialties: ['HOME_SERVICE', 'OTHER'],
              hourlyRate: 25.0,
              description: 'Prestataire de services test',
              zone: {
                'coordinates': [48.8566, 2.3522],
                'radius': 10
              }
            }
          })
        }
        break
    }

    console.log(`✅ ${userData.role} ${userData.email} créé avec succès`)
    return updatedUser

  } catch (error) {
    console.error(`❌ Erreur création ${userData.email}:`, error)
    throw error
  }
}

async function main() {
  console.log('🌱 Configuration des comptes de test EcoDeli')
  console.log('============================================')

  try {
    // Nettoyer les données de test existantes si nécessaire
    const shouldClean = process.argv.includes('--clean')
    
    if (shouldClean) {
      console.log('\n🧹 Nettoyage des données de test existantes...')
      
      for (const userData of TEST_USERS) {
        try {
          const user = await prisma.user.findUnique({
            where: { email: userData.email }
          })
          
          if (user) {
            // Supprimer les données liées
            await prisma.profile.deleteMany({ where: { userId: user.id } })
            await prisma.client.deleteMany({ where: { userId: user.id } })
            await prisma.deliverer.deleteMany({ where: { userId: user.id } })
            await prisma.merchant.deleteMany({ where: { userId: user.id } })
            await prisma.provider.deleteMany({ where: { userId: user.id } })
            await prisma.wallet.deleteMany({ where: { delivererId: user.id } })
            await prisma.session.deleteMany({ where: { userId: user.id } })
            await prisma.user.delete({ where: { id: user.id } })
            
            console.log(`🗑️  Supprimé: ${userData.email}`)
          }
        } catch (error) {
          console.log(`⚠️  Erreur suppression ${userData.email}:`, error)
        }
      }
    }

    // Créer tous les utilisateurs de test
    console.log('\n👥 Création des utilisateurs de test...')
    
    for (const userData of TEST_USERS) {
      await createTestUser(userData)
    }

    console.log('\n🎉 Configuration terminée avec succès!')
    console.log('\n📋 Comptes de test disponibles:')
    console.log('===============================')
    
    for (const userData of TEST_USERS) {
      console.log(`${userData.role.padEnd(10)} | ${userData.email} | Test123!`)
    }

    console.log('\n💡 Utilisation:')
    console.log('- Connectez-vous avec ces comptes sur http://localhost:3000')
    console.log('- Utilisez les scripts de test : npm run test ou ./test-announcement-workflow.sh')
    console.log('- Pour nettoyer et recréer : npm run setup-test-users -- --clean')

    // Vérifier la connectivité
    console.log('\n🔍 Test de connectivité rapide...')
    
    try {
      const loginTest = await auth.api.signInEmail({
        body: {
          email: 'client-complete@test.com',
          password: 'Test123!'
        }
      })
      
      if (loginTest.user) {
        console.log('✅ Test de connexion réussi')
      } else {
        console.log('❌ Test de connexion échoué')
      }
    } catch (error) {
      console.log('⚠️  Test de connexion non concluant:', error)
    }

  } catch (error) {
    console.error('\n💥 Erreur durant la configuration:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Gestion des arguments de ligne de commande
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Erreur fatale:', error)
    process.exit(1)
  })
}

export { main, createTestUser, TEST_USERS }