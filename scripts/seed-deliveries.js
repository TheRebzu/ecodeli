const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

// Données de livraisons de test
const sampleDeliveries = [
  {
    title: "Livraison colis Paris-Lyon",
    description: "Colis fragile contenant des documents importants",
    type: "PACKAGE_DELIVERY",
    price: 25.50,
    commission: 5.10,
    status: "DELIVERED",
    pickupAddress: "12 rue de Rivoli, 75001 Paris",
    deliveryAddress: "45 cours Lafayette, 69003 Lyon",
    validationCode: "ABC123",
    scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
  },
  {
    title: "Transport personne aeroport",
    description: "Transport vers CDG pour vol international",
    type: "AIRPORT_TRANSFER",
    price: 45.00,
    commission: 9.00,
    status: "IN_TRANSIT",
    pickupAddress: "78 avenue des Champs-Elysees, 75008 Paris",
    deliveryAddress: "Aeroport Charles de Gaulle, 95700 Roissy-en-France",
    validationCode: "DEF456",
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    completedAt: null
  },
  {
    title: "Courses supermarche",
    description: "Liste de courses pour personne agee",
    type: "SHOPPING",
    price: 15.80,
    commission: 3.16,
    status: "PENDING",
    pickupAddress: "Carrefour, 156 rue de la Republique, 13002 Marseille",
    deliveryAddress: "23 boulevard Michelet, 13008 Marseille",
    validationCode: "GHI789",
    scheduledAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
    completedAt: null
  }
]

async function testDatabaseConnection() {
  try {
    console.log('🔗 Test de la connexion à la base de données...')
    await prisma.$connect()
    console.log('✅ Connexion à la base de données réussie')
    
    // Test simple query
    const userCount = await prisma.user.count()
    console.log(`📊 Nombre d'utilisateurs existants: ${userCount}`)
    
    return true
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message)
    return false
  }
}

async function createTestUsers() {
  console.log('👥 Creation des utilisateurs de test...')
  
  const testUsers = [
    {
      email: 'client1@test.com',
      password: '$2b$10$example',
      role: 'CLIENT',
      emailVerified: true,
      profile: {
        firstName: 'Marie',
        lastName: 'Dubois',
        phone: '+33 6 12 34 56 78',
        address: '12 rue de Rivoli',
        city: 'Paris',
        postalCode: '75001',
        verified: true
      }
    },
    {
      email: 'deliverer1@test.com',
      password: '$2b$10$example',
      role: 'DELIVERER',
      emailVerified: true,
      profile: {
        firstName: 'Jean',
        lastName: 'Leroy',
        phone: '+33 6 55 44 33 22',
        address: '78 avenue des Champs-Elysees',
        city: 'Paris',
        postalCode: '75008',
        verified: true
      }
    }
  ]

  const createdUsers = []
  
  for (const userData of testUsers) {
    try {
      const { profile, ...userInfo } = userData
      
      const existingUser = await prisma.user.findUnique({
        where: { email: userInfo.email },
        include: { profile: true }
      })
      
      if (!existingUser) {
        console.log(`   Creating user: ${userInfo.email}`)
        const user = await prisma.user.create({
          data: {
            ...userInfo,
            profile: {
              create: profile
            }
          },
          include: { profile: true }
        })
        createdUsers.push(user)
        console.log(`   ✅ Utilisateur cree: ${user.email} (${user.role})`)
      } else {
        createdUsers.push(existingUser)
        console.log(`   ℹ️  Utilisateur existant: ${existingUser.email}`)
      }
    } catch (error) {
      console.error(`   ❌ Erreur lors de la création de l'utilisateur ${userData.email}:`, error.message)
    }
  }
  
  return createdUsers
}

async function seedDeliveries() {
  console.log('🚚 Creation de livraisons de test pour EcoDeli...\n')

  try {
    // Test de la connexion DB
    const isConnected = await testDatabaseConnection()
    if (!isConnected) {
      throw new Error('Impossible de se connecter à la base de données')
    }

    const users = await createTestUsers()
    console.log(`📝 ${users.length} utilisateurs récupérés`)
    
    const clients = users.filter(u => u.role === 'CLIENT')
    const deliverers = users.filter(u => u.role === 'DELIVERER')
    
    console.log(`👥 Clients trouvés: ${clients.length}`)
    console.log(`🚛 Livreurs trouvés: ${deliverers.length}`)
    
    if (clients.length === 0 || deliverers.length === 0) {
      throw new Error(`Utilisateurs insuffisants - Clients: ${clients.length}, Livreurs: ${deliverers.length}`)
    }

    // Vérifier les livraisons existantes
    const existingDeliveries = await prisma.delivery.findMany()
    console.log(`📦 Livraisons existantes: ${existingDeliveries.length}`)
    
    if (existingDeliveries.length > 0) {
      console.log('   Suppression des livraisons existantes...')
      
      await prisma.trackingUpdate.deleteMany()
      await prisma.payment.deleteMany({
        where: { deliveryId: { not: null } }
      })
      await prisma.announcement.deleteMany()
      await prisma.delivery.deleteMany()
      
      console.log('   ✅ Livraisons existantes supprimees')
    }

    let createdDeliveriesCount = 0
    let createdAnnouncementsCount = 0

    console.log('\n📦 Creation des annonces et livraisons...')

    for (const deliveryData of sampleDeliveries) {
      try {
        const randomClient = clients[Math.floor(Math.random() * clients.length)]
        const randomDeliverer = deliverers[Math.floor(Math.random() * deliverers.length)]
        
        console.log(`   Création annonce: ${deliveryData.title}`)
        const announcement = await prisma.announcement.create({
          data: {
            title: deliveryData.title,
            description: deliveryData.description,
            type: deliveryData.type,
            status: 'ACTIVE',
            price: deliveryData.price,
            authorId: randomClient.id,
            scheduledAt: deliveryData.scheduledAt
          }
        })
        
        createdAnnouncementsCount++

        console.log(`   Création livraison: ${deliveryData.title}`)
        const delivery = await prisma.delivery.create({
          data: {
            announcementId: announcement.id,
            clientId: randomClient.id,
            delivererId: deliveryData.status !== 'PENDING' ? randomDeliverer.id : null,
            status: deliveryData.status,
            validationCode: deliveryData.validationCode,
            pickupAddress: deliveryData.pickupAddress,
            deliveryAddress: deliveryData.deliveryAddress,
            scheduledAt: deliveryData.scheduledAt,
            completedAt: deliveryData.completedAt,
            price: deliveryData.price,
            commission: deliveryData.commission
          }
        })
        
        createdDeliveriesCount++
        console.log(`   ✅ Livraison creee: ${deliveryData.title} (${deliveryData.status})`)

        if (deliveryData.status === 'DELIVERED') {
          await prisma.payment.create({
            data: {
              userId: randomClient.id,
              deliveryId: delivery.id,
              amount: deliveryData.price,
              currency: 'EUR',
              status: 'COMPLETED',
              type: 'DELIVERY'
            }
          })
          console.log(`   💰 Paiement créé pour la livraison`)
        }
      } catch (error) {
        console.error(`   ❌ Erreur lors de la création de la livraison ${deliveryData.title}:`, error.message)
      }
    }

    console.log(`\n🎉 Seeding des livraisons termine avec succes !`)
    console.log(`   📊 Statistiques:`)
    console.log(`      - Annonces creees: ${createdAnnouncementsCount}`)
    console.log(`      - Livraisons creees: ${createdDeliveriesCount}`)
    console.log(`      - Clients utilises: ${clients.length}`)
    console.log(`      - Livreurs utilises: ${deliverers.length}`)

    console.log(`\n🌐 Page admin disponible a: http://localhost:3000/fr/admin/deliveries`)

  } catch (error) {
    console.error('❌ Erreur lors du seeding des livraisons:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Connexion à la base de données fermée')
  }
}

if (require.main === module) {
  console.log('🚀 Démarrage du script de seeding...')
  seedDeliveries()
    .then(() => {
      console.log('✅ Script terminé avec succès')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Erreur fatale:', error)
      process.exit(1)
    })
}

module.exports = { seedDeliveries } 