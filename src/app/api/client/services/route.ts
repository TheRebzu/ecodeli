import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const location = searchParams.get('location')
    const minRating = searchParams.get('minRating')

    // Récupérer le client pour obtenir sa localisation
    const client = await db.client.findUnique({
      where: { userId: clientId || user.id },
      include: { user: true }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // Construire la requête pour les prestataires
    const whereClause: any = {
      validationStatus: 'VALIDATED',
      isActive: true,
      services: {
        some: {
          isActive: true,
          ...(category && category !== 'all' ? { type: category } : {}),
          ...(maxPrice ? { basePrice: { lte: parseFloat(maxPrice) } } : {}),
          ...(minPrice ? { basePrice: { gte: parseFloat(minPrice) } } : {})
        }
      }
    }

    if (minRating) {
      whereClause.averageRating = { gte: parseFloat(minRating) }
    }

    const providers = await db.provider.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
            city: true,
            address: true
          }
        },
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            basePrice: true,
            priceUnit: true,
            duration: true,
            requirements: true
          }
        },
        reviews: {
          select: {
            rating: true,
            comment: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        certifications: {
          select: {
            name: true,
            issuedBy: true,
            validUntil: true
          }
        },
        availability: {
          where: { isActive: true },
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true
          }
        },
        timeSlots: {
          where: {
            date: { gte: new Date() },
            isAvailable: true,
            bookingId: null
          },
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true
          },
          take: 10
        }
      }
    })

    // Transformer les données pour correspondre à l'interface attendue
    const transformedProviders = providers.map(provider => {
      const fullName = `${provider.user.firstName} ${provider.user.lastName}`
      const reviewCount = provider.reviews.length
      const avgRating = provider.averageRating || 0

      // Calculer la distance si les coordonnées sont disponibles
      let distance = undefined
      if (client.user.city && provider.user.city && client.user.city !== provider.user.city) {
        // Pour l'instant on indique une distance par défaut entre villes différentes
        distance = 15 // km - valeur par défaut inter-ville
      } else if (client.user.city === provider.user.city) {
        distance = 5 // km - même ville
      }

      // Calculer l'expérience réelle basée sur la date d'activation
      const experienceYears = provider.activatedAt 
        ? Math.floor((new Date().getTime() - provider.activatedAt.getTime()) / (1000 * 60 * 60 * 24 * 365))
        : Math.floor((new Date().getTime() - provider.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365))

      return {
        id: provider.id,
        name: fullName,
        profilePhoto: provider.user.profilePhoto,
        rating: avgRating,
        reviewCount: reviewCount,
        description: provider.description || 'Prestataire professionnel',
        experience: Math.max(experienceYears, 1),
        location: provider.user.city || 'Non spécifié',
        distance: distance,
        services: provider.services.map(service => ({
          id: service.id,
          name: service.name,
          category: service.type,
          description: service.description,
          duration: service.duration || 60,
          price: service.basePrice,
          homeService: provider.specialties.includes('HOME_SERVICE'),
          requirements: service.requirements || []
        })),
        availability: provider.timeSlots.map(slot => ({
          id: slot.id,
          date: slot.date.toISOString().split('T')[0],
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxBookings: 1,
          currentBookings: 0,
          status: 'available' as const
        })),
        certifications: provider.certifications.map(cert => cert.name),
        languages: provider.user.languages || ['Français'],
        responseTime: 30 // Temps de réponse standard de 30 minutes
      }
    })

    return NextResponse.json({
      providers: transformedProviders,
      total: transformedProviders.length
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}