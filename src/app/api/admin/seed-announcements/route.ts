import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parisAddresses } from '@/prisma/seed/data/addresses/paris'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      include: { client: true }
    })
    
    if (!user || !user.client) {
      return NextResponse.json({ error: 'Utilisateur client non trouvé' }, { status: 404 })
    }
    
    // Créer plusieurs annonces
    const announcements = [
      {
        title: 'Livraison colis urgent - Paris 15e',
        description: 'Colis de 5kg à livrer rapidement. Documents importants à l\'intérieur.',
        type: 'PACKAGE_DELIVERY',
        basePrice: 25,
        isUrgent: true,
        pickupAddress: '123 Avenue de Suffren, 75015 Paris',
        pickupLatitude: 48.849445,
        pickupLongitude: 2.292991,
        deliveryAddress: '45 Rue de la République, 75011 Paris',
        deliveryLatitude: 48.866667,
        deliveryLongitude: 2.366667,
        pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Transport courses du supermarché',
        description: 'Besoin d\'aide pour transporter mes courses depuis Carrefour jusqu\'à mon domicile.',
        type: 'SHOPPING',
        basePrice: 15,
        isUrgent: false,
        pickupAddress: 'Carrefour City, 89 Boulevard Saint-Michel, 75005 Paris',
        pickupLatitude: 48.847222,
        pickupLongitude: 2.342778,
        deliveryAddress: '12 Rue Monge, 75005 Paris',
        deliveryLatitude: 48.845556,
        deliveryLongitude: 2.350833,
        pickupDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Déménagement cartons - Studio',
        description: 'J\'ai 10 cartons à déménager de mon ancien studio vers le nouveau. Besoin d\'un véhicule adapté.',
        type: 'PACKAGE_DELIVERY',
        basePrice: 75,
        isUrgent: false,
        pickupAddress: '78 Rue de Rennes, 75006 Paris',
        pickupLatitude: 48.850000,
        pickupLongitude: 2.328889,
        deliveryAddress: '156 Avenue de Versailles, 75016 Paris',
        deliveryLatitude: 48.841111,
        deliveryLongitude: 2.267778,
        pickupDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Transfert aéroport CDG',
        description: 'Besoin d\'un transport pour 2 personnes avec bagages vers l\'aéroport Charles de Gaulle.',
        type: 'AIRPORT_TRANSFER',
        basePrice: 65,
        isUrgent: false,
        pickupAddress: '34 Rue du Faubourg Saint-Antoine, 75012 Paris',
        pickupLatitude: 48.852222,
        pickupLongitude: 2.371944,
        deliveryAddress: 'Aéroport Charles de Gaulle, Terminal 2E',
        deliveryLatitude: 49.004167,
        deliveryLongitude: 2.570833,
        pickupDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Livraison meuble IKEA',
        description: 'Table et 4 chaises achetées chez IKEA à livrer et monter si possible.',
        type: 'PACKAGE_DELIVERY',
        basePrice: 45,
        isUrgent: false,
        pickupAddress: 'IKEA Paris La Madeleine, 23 Boulevard de la Madeleine, 75001 Paris',
        pickupLatitude: 48.869444,
        pickupLongitude: 2.325278,
        deliveryAddress: '67 Rue de Turbigo, 75003 Paris',
        deliveryLatitude: 48.865833,
        deliveryLongitude: 2.361389,
        pickupDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Récupération colis Chronopost',
        description: 'Mon colis est arrivé au point relais, besoin de quelqu\'un pour le récupérer et me le livrer.',
        type: 'PACKAGE_DELIVERY',
        basePrice: 12,
        isUrgent: true,
        pickupAddress: 'Relay Chronopost, 156 Rue de Rivoli, 75001 Paris',
        pickupLatitude: 48.860611,
        pickupLongitude: 2.339444,
        deliveryAddress: '89 Avenue des Champs-Élysées, 75008 Paris',
        deliveryLatitude: 48.872222,
        deliveryLongitude: 2.299444,
        pickupDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // Dans 4 heures
      },
      {
        title: 'Accompagnement personne âgée - Rendez-vous médical',
        description: 'Ma mère a besoin d\'être accompagnée pour son rendez-vous chez le médecin. Personne autonome mais préfère être accompagnée.',
        type: 'PERSON_TRANSPORT',
        basePrice: 35,
        isUrgent: false,
        pickupAddress: '23 Rue de la Paix, 75002 Paris',
        pickupLatitude: 48.868889,
        pickupLongitude: 2.330556,
        deliveryAddress: 'Hôpital Saint-Louis, 1 Avenue Claude Vellefaux, 75010 Paris',
        deliveryLatitude: 48.873611,
        deliveryLongitude: 2.369167,
        pickupDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Livraison fleurs anniversaire',
        description: 'Bouquet de fleurs à récupérer chez le fleuriste et à livrer pour un anniversaire surprise.',
        type: 'PACKAGE_DELIVERY',
        basePrice: 18,
        isUrgent: false,
        pickupAddress: 'Au Nom de la Rose, 87 Rue Saint-Antoine, 75004 Paris',
        pickupLatitude: 48.854722,
        pickupLongitude: 2.363611,
        deliveryAddress: '34 Rue de Bretagne, 75003 Paris',
        deliveryLatitude: 48.863333,
        deliveryLongitude: 2.363889,
        pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      }
    ]
    
    const createdAnnouncements = []
    
    for (const announcementData of announcements) {
      const announcement = await prisma.announcement.create({
        data: {
          ...announcementData,
          authorId: user.id,
          status: 'ACTIVE',
          currency: 'EUR',
          viewCount: 0
        }
      })
      
      // Si c'est une livraison de colis, ajouter les détails
      if (announcement.type === 'PACKAGE_DELIVERY') {
        await prisma.packageAnnouncement.create({
          data: {
            announcementId: announcement.id,
            weight: 5 + Math.floor(Math.random() * 20),
            length: 30 + Math.floor(Math.random() * 50),
            width: 20 + Math.floor(Math.random() * 30),
            height: 15 + Math.floor(Math.random() * 25),
            fragile: Math.random() > 0.7,
            requiresInsurance: Math.random() > 0.5,
            insuredValue: Math.random() > 0.5 ? 100 + Math.floor(Math.random() * 400) : null
          }
        })
      }
      
      createdAnnouncements.push(announcement)
    }
    
    return NextResponse.json({
      success: true,
      message: `${createdAnnouncements.length} annonces créées pour ${user.email}`,
      announcements: createdAnnouncements.map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        status: a.status
      }))
    })
    
  } catch (error) {
    console.error('Erreur création annonces:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création des annonces' },
      { status: 500 }
    )
  }
}