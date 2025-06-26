import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
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
        status: 'APPROVED'
      }
    }

    if (category && category !== 'all') {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (minPrice || maxPrice) {
      where.pricePerHour = {}
      if (minPrice) where.pricePerHour.gte = parseFloat(minPrice)
      if (maxPrice) where.pricePerHour.lte = parseFloat(maxPrice)
    }

    if (location) {
      where.provider.user = {
        OR: [
          { city: { contains: location, mode: 'insensitive' } },
          { address: { contains: location, mode: 'insensitive' } }
        ]
      }
    }

    // Récupérer les services
    const services = await db.providerService.findMany({
      where,
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                image: true,
                city: true,
                address: true
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
        { provider: { reviews: { _count: 'desc' } } },
        { createdAt: 'desc' }
      ]
    })

    // Filtrer par note minimale si spécifiée
    let filteredServices = services
    if (minRating) {
      const minRatingNum = parseFloat(minRating)
      filteredServices = services.filter(service => {
        const reviews = service.provider.reviews
        if (reviews.length === 0) return minRatingNum <= 0
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        return avgRating >= minRatingNum
      })
    }

    // Transformer les données
    const transformedServices = filteredServices.map(service => {
      const reviews = service.provider.reviews
      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0

      return {
        id: service.id,
        name: service.name,
        description: service.description,
        category: service.category,
        pricePerHour: service.pricePerHour,
        duration: service.defaultDuration || 60,
        isActive: service.isActive,
        provider: {
          id: service.provider.id,
          name: service.provider.user.name,
          businessName: service.provider.businessName,
          rating: Math.round(avgRating * 10) / 10,
          completedBookings: service.provider.bookings.length,
          location: `${service.provider.user.city || ''} ${service.provider.user.address || ''}`.trim(),
          phone: service.provider.user.phone,
          avatar: service.provider.user.image
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