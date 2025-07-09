const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createHomeServiceAnnouncements() {
  try {
    console.log('🔧 Création d\'annonces HOME_SERVICE pour test...')

    // Récupérer un client pour créer les annonces
    const client = await prisma.user.findFirst({
      where: { role: 'CLIENT' },
      include: { profile: true }
    })

    if (!client) {
      console.log('❌ Aucun client trouvé')
      return
    }

    console.log(`✅ Client trouvé: ${client.profile?.firstName} ${client.profile?.lastName}`)

    // Créer des annonces HOME_SERVICE
    const homeServiceAnnouncements = [
      {
        title: 'Ménage complet appartement 3 pièces',
        description: 'Besoin d\'un ménage complet pour mon appartement de 3 pièces. Surface 65m². Préférence pour le matin.',
        serviceDetails: {
          serviceType: 'HOME_SERVICE',
          estimatedDuration: 180, // 3 heures
          isRecurring: false,
          requirements: ['Équipement fourni', 'Produits écologiques']
        },
        basePrice: 45.00,
        isUrgent: false
      },
      {
        title: 'Jardinage - Taille haies et tonte',
        description: 'Jardin de 200m² nécessite taille des haies et tonte de la pelouse. Outils disponibles sur place.',
        serviceDetails: {
          serviceType: 'HOME_SERVICE',
          estimatedDuration: 240, // 4 heures
          isRecurring: true,
          frequency: 'WEEKLY',
          requirements: ['Expérience jardinage', 'Taille-haie']
        },
        basePrice: 60.00,
        isUrgent: false
      },
      {
        title: 'Petits travaux - Réparation robinet',
        description: 'Robinet de cuisine qui fuit, besoin d\'une réparation rapide. Pièces disponibles.',
        serviceDetails: {
          serviceType: 'HOME_SERVICE',
          estimatedDuration: 60, // 1 heure
          isRecurring: false,
          requirements: ['Plomberie', 'Outils de base']
        },
        basePrice: 35.00,
        isUrgent: true
      },
      {
        title: 'Cours particuliers mathématiques niveau lycée',
        description: 'Soutien scolaire en mathématiques pour élève de 1ère S. 2h par semaine.',
        serviceDetails: {
          serviceType: 'HOME_SERVICE',
          estimatedDuration: 120, // 2 heures
          isRecurring: true,
          frequency: 'WEEKLY',
          requirements: ['Bac+3 minimum', 'Expérience enseignement']
        },
        basePrice: 25.00,
        isUrgent: false
      },
      {
        title: 'Garde d\'animaux - 2 chats pendant vacances',
        description: 'Garde de 2 chats pendant mes vacances (1 semaine). Visites quotidiennes, nourriture fournie.',
        serviceDetails: {
          serviceType: 'HOME_SERVICE',
          estimatedDuration: 30, // 30 minutes par visite
          isRecurring: true,
          frequency: 'DAILY',
          requirements: ['Expérience chats', 'Disponible matin et soir']
        },
        basePrice: 15.00,
        isUrgent: false
      }
    ]

    for (const announcementData of homeServiceAnnouncements) {
      const announcement = await prisma.announcement.create({
        data: {
          title: announcementData.title,
          description: announcementData.description,
          type: 'HOME_SERVICE',
          status: 'ACTIVE',
          basePrice: announcementData.basePrice,
          authorId: client.id,
          pickupAddress: 'Adresse à préciser',
          deliveryAddress: 'Adresse à préciser',
          pickupLatitude: 48.8566,
          pickupLongitude: 2.3522,
          deliveryLatitude: 48.8566,
          deliveryLongitude: 2.3522,
          pickupDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
          isUrgent: announcementData.isUrgent,
          serviceDetails: announcementData.serviceDetails,
          viewCount: 0
        }
      })

      console.log(`✅ Annonce créée: ${announcement.title} (ID: ${announcement.id})`)
    }

    console.log('🎉 Toutes les annonces HOME_SERVICE ont été créées avec succès!')
    console.log('📊 Vous pouvez maintenant tester l\'API /api/provider/service-requests')

  } catch (error) {
    console.error('❌ Erreur lors de la création des annonces:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createHomeServiceAnnouncements() 