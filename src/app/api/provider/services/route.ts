import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET - Liste des services disponibles pour les clients
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const location = searchParams.get('location')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    // Construire les filtres
    const where: any = {
      isActive: true,
      provider: {
        role: 'PROVIDER',
        providerProfile: {
          isVerified: true,
          isAvailable: true
        }
      }
    }

    if (category && category !== 'all') {
      where.category = category
    }

    // Récupérer les services
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { provider: { providerProfile: { rating: 'desc' } } },
          { createdAt: 'desc' }
        ],
        include: {
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              city: true,
              providerProfile: {
                select: {
                  businessName: true,
                  rating: true,
                  completedBookings: true,
                  isVerified: true,
                  isAvailable: true
                }
              }
            }
          }
        }
      }),
      prisma.service.count({ where })
    ])

    // Formatter les services pour l'affichage client
    const formattedServices = services.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category,
      pricePerHour: service.pricePerHour,
      duration: service.duration || 60,
      isActive: service.isActive,
      provider: {
        id: service.provider.id,
        name: `${service.provider.firstName} ${service.provider.lastName}`,
        businessName: service.provider.providerProfile?.businessName,
        rating: service.provider.providerProfile?.rating || 0,
        completedBookings: service.provider.providerProfile?.completedBookings || 0,
        location: service.provider.city || 'Non spécifié',
        phone: service.provider.phone
      }
    }))

    return NextResponse.json({
      services: formattedServices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST - Créer un nouveau service (pour les prestataires)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validation basique
    const { name, description, category, pricePerHour, duration } = body
    
    if (!name || !description || !category || !pricePerHour) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants' },
        { status: 400 }
      )
    }

    // Créer le service
    const service = await prisma.service.create({
      data: {
        name,
        description,
        category,
        pricePerHour: parseFloat(pricePerHour),
        duration: parseInt(duration) || 60,
        providerId: session.user.id,
        isActive: true
      },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            providerProfile: {
              select: {
                businessName: true,
                rating: true,
                completedBookings: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(service, { status: 201 })

  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
