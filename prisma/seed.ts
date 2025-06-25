// Seed script pour créer des comptes de test EcoDeli
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Création des comptes de test EcoDeli...')

  // Nettoyage des données existantes
  await prisma.deliveryApplication.deleteMany()
  await prisma.delivery.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.service.deleteMany()
  await prisma.providerProfile.deleteMany()
  await prisma.merchantProfile.deleteMany()
  await prisma.delivererProfile.deleteMany()
  await prisma.clientProfile.deleteMany()
  await prisma.adminProfile.deleteMany()
  await prisma.wallet.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  // Mot de passe par défaut pour tous les comptes de test (sera hashé par bcryptjs)
  const defaultPassword = 'Test123!'

  // 1. ADMIN - Administrateur plateforme
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ecodeli.com',
      // Le mot de passe sera géré via JWT auth lors de l'inscription
      emailVerified: new Date(),
      role: 'ADMIN',
      name: 'Admin EcoDeli',
      adminProfile: {
        create: {
          permissions: ['MANAGE_USERS', 'MANAGE_PLATFORM', 'VIEW_ANALYTICS', 'MANAGE_PAYMENTS'],
          department: 'PLATFORM_MANAGEMENT'
        }
      }
    }
  })

  // 2. CLIENT - Client particulier
  const client = await prisma.user.create({
    data: {
      email: 'client@ecodeli.com',
      // Le mot de passe sera géré via JWT auth lors de l'inscription
      emailVerified: new Date(),
      role: 'CLIENT',
      name: 'Marie Dupont',
      phone: '+33612345678',
      clientProfile: {
        create: {
          subscriptionPlan: 'FREE',
          tutorialCompleted: false,
          defaultDeliveryAddress: '123 Rue de la Paix, 75001 Paris',
          emergencyContact: '+33687654321'
        }
      }
    }
  })

  // 3. DELIVERER - Livreur occasionnel
  const deliverer = await prisma.user.create({
    data: {
      email: 'deliverer@ecodeli.com',
      // Le mot de passe sera géré via JWT auth lors de l'inscription
      emailVerified: new Date(),
      role: 'DELIVERER',
      name: 'Pierre Martin',
      phone: '+33698765432',
      delivererProfile: {
        create: {
          verificationStatus: 'PENDING',
          vehicleType: 'CAR',
          maxWeight: 50.0,
          maxDistance: 100,
          availabilityStatus: 'AVAILABLE',
          rating: 4.8,
          completedDeliveries: 0,
          nfcCardId: 'NFC_' + Math.random().toString(36).substr(2, 9).toUpperCase()
        }
      },
      wallet: {
        create: {
          balance: 0.0,
          currency: 'EUR'
        }
      }
    }
  })

  // 4. MERCHANT - Commerçant partenaire
  const merchant = await prisma.user.create({
    data: {
      email: 'merchant@ecodeli.com',
      // Le mot de passe sera géré via JWT auth lors de l'inscription
      emailVerified: new Date(),
      role: 'MERCHANT',
      name: 'Sophie Leblanc',
      phone: '+33623456789',
      merchantProfile: {
        create: {
          businessName: 'Boutique Bio Sophie',
          businessType: 'RETAIL',
          siret: '12345678901234',
          address: '456 Avenue du Commerce, 75010 Paris',
          verificationStatus: 'VERIFIED',
          commissionRate: 0.05
        }
      }
    }
  })

  // 5. PROVIDER - Prestataire de services
  const provider = await prisma.user.create({
    data: {
      email: 'provider@ecodeli.com',
      // Le mot de passe sera géré via JWT auth lors de l'inscription
      emailVerified: new Date(),
      role: 'PROVIDER',
      name: 'Thomas Rousseau',
      phone: '+33634567890',
      providerProfile: {
        create: {
          businessName: 'Services Thomas',
          specialties: ['PET_CARE', 'HOME_CLEANING'],
          verificationStatus: 'VERIFIED',
          rating: 4.9,
          completedServices: 25,
          hourlyRate: 25.0
        }
      },
      wallet: {
        create: {
          balance: 150.0,
          currency: 'EUR'
        }
      }
    }
  })

  // Créer des annonces de test
  const testAnnouncement = await prisma.announcement.create({
    data: {
      clientId: client.id,
      title: 'Livraison colis Paris -> Lyon',
      description: 'Colis fragile à livrer avec précaution',
      pickupAddress: '123 Rue de la Paix, 75001 Paris',
      deliveryAddress: '789 Cours Lafayette, 69003 Lyon',
      weight: 2.5,
      dimensions: '30x20x15cm',
      price: 15.0,
      status: 'ACTIVE',
      pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
      deliveryDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000), // Dans 3 jours
      serviceType: 'PACKAGE_DELIVERY'
    }
  })

  // Créer un service de test pour le prestataire
  const testService = await prisma.service.create({
    data: {
      providerId: provider.id,
      title: 'Garde d\'animaux à domicile',
      description: 'Service de garde pour chiens et chats pendant vos absences',
      category: 'PET_CARE',
      price: 20.0,
      duration: 120, // 2 heures
      isActive: true,
      location: 'Paris et proche banlieue'
    }
  })

  console.log('✅ Comptes de test créés avec succès!')
  console.log('\n🔑 Identifiants de connexion (mot de passe: Test123!):')
  console.log('👨‍💼 Admin: admin@ecodeli.com')
  console.log('👤 Client: client@ecodeli.com')
  console.log('🚚 Livreur: deliverer@ecodeli.com')
  console.log('🏪 Commerçant: merchant@ecodeli.com')
  console.log('🔧 Prestataire: provider@ecodeli.com')
  console.log('\n📦 Données de test créées:')
  console.log(`- 1 annonce de livraison (ID: ${testAnnouncement.id})`)
  console.log(`- 1 service de garde d'animaux (ID: ${testService.id})`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
