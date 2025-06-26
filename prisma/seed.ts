// Seed script pour créer des comptes de test EcoDeli
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Création des comptes de test EcoDeli...')

  // Nettoyage des données existantes
  await prisma.delivery.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.user.deleteMany()

  // 1. ADMIN - Administrateur plateforme
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ecodeli.com',
      password: 'hashed_password_placeholder',
      role: 'ADMIN',
      emailVerified: true,
      emailVerifiedAt: new Date()
    }
  })

  // 2. CLIENT - Client particulier
  const client = await prisma.user.create({
    data: {
      email: 'client@ecodeli.com',
      password: 'hashed_password_placeholder',
      role: 'CLIENT',
      emailVerified: true,
      emailVerifiedAt: new Date()
    }
  })

  // 3. DELIVERER - Livreur occasionnel
  const deliverer = await prisma.user.create({
    data: {
      email: 'deliverer@ecodeli.com',
      password: 'hashed_password_placeholder',
      role: 'DELIVERER',
      emailVerified: true,
      emailVerifiedAt: new Date()
    }
  })

  // Créer des annonces de test variées
  const announcements = []
  
  // Annonces de livraison de colis
  const packageAnnouncements = [
    {
      title: 'Livraison colis fragile Paris → Lyon',
      description: 'Vase en cristal, emballage soigné requis',
      startLocation: { address: '123 Rue de la Paix, 75001 Paris', city: 'Paris', postalCode: '75001', lat: 48.8566, lng: 2.3522 },
      endLocation: { address: '789 Cours Lafayette, 69003 Lyon', city: 'Lyon', postalCode: '69003', lat: 45.7640, lng: 4.8357 },
      price: 25.0,
      type: 'PACKAGE_DELIVERY'
    },
    {
      title: 'Transport documents Marseille → Nice',
      description: 'Documents importants, livraison urgente',
      startLocation: { address: '456 Quai des Belges, 13001 Marseille', city: 'Marseille', postalCode: '13001', lat: 43.2965, lng: 5.3698 },
      endLocation: { address: '321 Promenade des Anglais, 06000 Nice', city: 'Nice', postalCode: '06000', lat: 43.7102, lng: 7.2620 },
      price: 18.0,
      type: 'PACKAGE_DELIVERY'
    },
    {
      title: 'Livraison alimentaire Lille → Roubaix',
      description: 'Produits frais, transport réfrigéré',
      startLocation: { address: '789 Place du Général de Gaulle, 59000 Lille', city: 'Lille', postalCode: '59000', lat: 50.6292, lng: 3.0573 },
      endLocation: { address: '123 Grand Place, 59100 Roubaix', city: 'Roubaix', postalCode: '59100', lat: 50.6927, lng: 3.1762 },
      price: 12.0,
      type: 'PACKAGE_DELIVERY'
    },
    {
      title: 'Transport personne Bordeaux → Toulouse',
      description: 'Covoiturage régulier, 2 places disponibles',
      startLocation: { address: '456 Place de la Bourse, 33000 Bordeaux', city: 'Bordeaux', postalCode: '33000', lat: 44.8378, lng: -0.5792 },
      endLocation: { address: '789 Place du Capitole, 31000 Toulouse', city: 'Toulouse', postalCode: '31000', lat: 43.6047, lng: 1.4442 },
      price: 35.0,
      type: 'PERSON_TRANSPORT'
    },
    {
      title: 'Transfert aéroport CDG → Paris centre',
      description: 'Service de transfert aéroport, véhicule confortable',
      startLocation: { address: 'Aéroport Charles de Gaulle, 95700 Roissy', city: 'Roissy', postalCode: '95700', lat: 49.0097, lng: 2.5479 },
      endLocation: { address: '123 Avenue des Champs-Élysées, 75008 Paris', city: 'Paris', postalCode: '75008', lat: 48.8698, lng: 2.3077 },
      price: 45.0,
      type: 'AIRPORT_TRANSFER'
        }
  ]

  for (const annData of packageAnnouncements) {
    const announcement = await prisma.announcement.create({
    data: {
      clientId: client.id,
        type: annData.type as any,
        title: annData.title,
        description: annData.description,
        startLocation: annData.startLocation,
        endLocation: annData.endLocation,
        desiredDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        price: annData.price,
      status: 'ACTIVE',
        publishedAt: new Date()
      }
    })
    announcements.push(announcement)
  }

  // Créer des livraisons pour chaque annonce
  const deliveryStatuses = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']
  const locations = [
    { address: 'Entrepôt Paris Nord', lat: 48.8566, lng: 2.3522 },
    { address: 'Entrepôt Lyon Part-Dieu', lat: 45.7640, lng: 4.8357 },
    { address: 'Entrepôt Marseille', lat: 43.2965, lng: 5.3698 },
    { address: 'En transit autoroute A6', lat: 46.2276, lng: 2.2137 },
    { address: 'En transit autoroute A7', lat: 44.8378, lng: 4.8001 },
    { address: 'Entrepôt Lille', lat: 50.6292, lng: 3.0573 },
    { address: 'Entrepôt Nice', lat: 43.7102, lng: 7.2620 }
  ]

  const allDeliveries = []
  
  for (let i = 0; i < announcements.length; i++) {
    const announcement = announcements[i]
    const numDeliveries = Math.floor(Math.random() * 3) + 2 // 2-4 livraisons par annonce
    
    for (let j = 0; j < numDeliveries; j++) {
      const status = deliveryStatuses[Math.floor(Math.random() * deliveryStatuses.length)]
      const pickupDate = new Date(Date.now() + (i + j) * 24 * 60 * 60 * 1000)
      const deliveryDate = new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000)
      const location = locations[Math.floor(Math.random() * locations.length)]
      
      const delivery = await prisma.delivery.create({
    data: {
          announcementId: announcement.id,
          clientId: client.id,
          delivererId: deliverer.id,
          status,
          trackingNumber: `TRACK${1000 + i * 10 + j}`,
          validationCode: (100000 + Math.floor(Math.random() * 900000)).toString(),
          pickupDate,
          deliveryDate,
          actualDeliveryDate: status === 'DELIVERED' ? deliveryDate : null,
          isPartial: false,
          currentLocation: {
            address: location.address,
            lat: location.lat,
            lng: location.lng,
            updatedAt: new Date()
          },
          price: announcement.price + Math.floor(Math.random() * 10),
          delivererFee: Math.floor(announcement.price * 0.7),
          platformFee: Math.floor(announcement.price * 0.1),
          insuranceFee: Math.floor(Math.random() * 3) + 1,
        }
      })
      allDeliveries.push(delivery)
    }
  }

  console.log(`- ${announcements.length} annonces créées`)
  console.log(`- ${allDeliveries.length} livraisons créées`)

  console.log('✅ Comptes de test créés avec succès!')
  console.log('\n🔑 Identifiants de connexion (mot de passe: Test123!):')
  console.log('👨‍💼 Admin: admin@ecodeli.com')
  console.log('👤 Client: client@ecodeli.com')
  console.log('🚚 Livreur: deliverer@ecodeli.com')
  console.log('\n📦 Données de test créées:')
  console.log(`- ${announcements.length} annonces de livraison`)
  console.log(`- ${allDeliveries.length} livraisons`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
