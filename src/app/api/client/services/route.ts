import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const location = searchParams.get('location')
    const minRating = searchParams.get('minRating')

    // Construire les filtres
    const where: any = {
      isActive: true,
      provider: {
        isActive: true,
        validationStatus: 'APPROVED'
      }
    }

    if (category && category !== 'all') {
      where.type = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (minPrice || maxPrice) {
      where.basePrice = {}
      if (minPrice) where.basePrice.gte = parseFloat(minPrice)
      if (maxPrice) where.basePrice.lte = parseFloat(maxPrice)
    }

    if (location) {
      where.provider.user.profile = {
        OR: [
          { city: { contains: location, mode: 'insensitive' } },
          { address: { contains: location, mode: 'insensitive' } }
        ]
      }
    }

    // Récupérer les services
    const services = await db.service.findMany({
      where,
      include: {
        provider: {
          include: {
            user: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                    avatar: true,
                    city: true,
                    address: true
                  }
                }
              }
            },
            reviews: {
              select: {
                rating: true
              }
            },
            bookings: {
              where: { status: 'COMPLETED' },
              select: { id: true }
            }
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    })

    // Filtrer par note minimale si spécifiée
    let filteredServices = services
    if (minRating) {
      const minRatingNum = parseFloat(minRating)
      filteredServices = services.filter(service => {
        const avgRating = service.provider.averageRating || 0
        return avgRating >= minRatingNum
      })
    }

    // Transformer les données
    const transformedServices = filteredServices.map(service => {
      const provider = service.provider
      const user = provider.user
      const profile = user.profile
      
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        type: service.type,
        basePrice: service.basePrice,
        priceUnit: service.priceUnit,
        duration: service.duration || 60,
        isActive: service.isActive,
        provider: {
          id: provider.id,
          name: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : user.name || 'Anonyme',
          businessName: provider.businessName,
          rating: Math.round((provider.averageRating || 0) * 10) / 10,
          completedBookings: provider.totalBookings || 0,
          location: profile ? `${profile.city || ''} ${profile.address || ''}`.trim() : '',
          phone: profile?.phone,
          avatar: profile?.avatar || user.image
        }
      }
    })

    return NextResponse.json({
      services: transformedServices,
      total: transformedServices.length
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}