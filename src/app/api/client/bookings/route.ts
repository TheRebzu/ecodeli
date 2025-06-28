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
    const status = searchParams.get('status')
    const serviceType = searchParams.get('serviceType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const filters: any = { clientId: user.id }
    
    if (status) {
      filters.status = status
    }
    
    if (serviceType) {
      filters.serviceType = serviceType
    }
    
    if (dateFrom || dateTo) {
      filters.scheduledDate = {}
      if (dateFrom) filters.scheduledDate.gte = new Date(dateFrom)
      if (dateTo) filters.scheduledDate.lte = new Date(dateTo)
    }

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where: filters,
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              rating: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.booking.count({ where: filters })
    ])

    // Transformer les données pour correspondre à l'interface frontend
    const transformedBookings = bookings.map(booking => ({
      id: booking.id,
      serviceType: booking.serviceType,
      providerName: booking.provider.name,
      providerRating: booking.provider.rating || 0,
      scheduledDate: booking.scheduledDate.toISOString(),
      duration: booking.duration,
      price: booking.price,
      status: booking.status,
      location: booking.location,
      description: booking.description,
      providerId: booking.provider.id,
      notes: booking.notes,
      cancelReason: booking.cancelReason,
      completedAt: booking.completedAt?.toISOString(),
      rating: booking.rating,
      review: booking.review
    }))

    return NextResponse.json({
      bookings: transformedBookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching client bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      providerId,
      serviceType,
      scheduledDate,
      duration,
      location,
      description,
      specialRequirements
    } = body

    // Vérifier que le prestataire existe et est disponible
    const provider = await db.provider.findUnique({
      where: { id: providerId },
      include: { availability: true }
    })

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // Calculer le prix basé sur le service et la durée
    const baseRate = provider.hourlyRate || 25 // Prix de base par heure
    const price = Math.round((duration / 60) * baseRate)

    // Créer la réservation
    const booking = await db.booking.create({
      data: {
        clientId: user.id,
        providerId,
        serviceType,
        scheduledDate: new Date(scheduledDate),
        duration,
        price,
        location,
        description,
        specialRequirements,
        status: 'PENDING'
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            rating: true
          }
        }
      }
    })

    // Transformer les données pour la réponse
    const transformedBooking = {
      id: booking.id,
      serviceType: booking.serviceType,
      providerName: booking.provider.name,
      providerRating: booking.provider.rating || 0,
      scheduledDate: booking.scheduledDate.toISOString(),
      duration: booking.duration,
      price: booking.price,
      status: booking.status,
      location: booking.location,
      description: booking.description,
      providerId: booking.provider.id
    }

    return NextResponse.json(transformedBooking, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}