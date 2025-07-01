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
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const serviceType = searchParams.get('serviceType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const filters: any = { clientId: clientId || user.id }
    
    if (status) {
      filters.status = status
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
              businessName: true,
              averageRating: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profilePhoto: true
                }
              }
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          review: true
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
      providerId: booking.provider.id,
      providerName: `${booking.provider.user.firstName} ${booking.provider.user.lastName}`,
      serviceId: booking.service?.id || '',
      serviceName: booking.service?.name || 'Service',
      date: booking.scheduledDate.toISOString().split('T')[0],
      startTime: booking.scheduledTime,
      endTime: `${parseInt(booking.scheduledTime.split(':')[0]) + Math.floor(booking.duration / 60)}:${booking.scheduledTime.split(':')[1]}`,
      status: booking.status.toLowerCase(),
      location: typeof booking.address === 'object' ? 
        `${booking.address.address}, ${booking.address.city}` : 
        booking.address?.toString() || 'Non spécifié',
      price: booking.totalPrice,
      notes: booking.notes,
      specialRequests: '',
      rating: booking.review?.rating,
      review: booking.review?.comment,
      createdAt: booking.createdAt.toISOString()
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
      clientId,
      providerId,
      serviceId,
      date,
      timeSlot,
      location,
      homeService,
      notes,
      specialRequests
    } = body

    // Vérifier que le prestataire et le service existent
    const [provider, service] = await Promise.all([
      db.provider.findUnique({
        where: { id: providerId },
        include: { 
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      db.service.findUnique({
        where: { id: serviceId }
      })
    ])

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Extraire l'heure de début du timeSlot
    const [startTime, endTime] = timeSlot.split('-')
    const duration = service.duration || 60

    // Créer la réservation
    const booking = await db.booking.create({
      data: {
        clientId: clientId || user.id,
        providerId,
        serviceId,
        status: 'PENDING',
        scheduledDate: new Date(date),
        scheduledTime: startTime,
        duration,
        address: { address: location, city: '', postalCode: '', lat: 0, lng: 0 },
        totalPrice: service.basePrice,
        notes: notes || null
      },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            averageRating: true,
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        service: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Transformer les données pour la réponse
    const transformedBooking = {
      id: booking.id,
      providerId: booking.provider.id,
      providerName: `${booking.provider.user.firstName} ${booking.provider.user.lastName}`,
      serviceId: booking.service.id,
      serviceName: booking.service.name,
      date: booking.scheduledDate.toISOString().split('T')[0],
      startTime: booking.scheduledTime,
      endTime: endTime,
      status: booking.status.toLowerCase(),
      location: location,
      price: booking.totalPrice,
      notes: booking.notes,
      createdAt: booking.createdAt.toISOString()
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