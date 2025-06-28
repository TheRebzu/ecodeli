import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const booking = await db.booking.findFirst({
      where: {
        id: params.id,
        clientId: session.user.id
      },
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
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Transformer les données pour correspondre à l'interface frontend
    const transformedBooking = {
      id: booking.id,
      serviceType: booking.serviceType,
      providerId: booking.provider.id,
      providerName: booking.provider.name,
      providerEmail: booking.provider.email,
      providerPhone: booking.provider.phone,
      providerRating: booking.provider.rating || 0,
      providerAvatar: booking.provider.avatar,
      scheduledDate: booking.scheduledDate.toISOString(),
      duration: booking.duration,
      price: booking.price,
      status: booking.status,
      location: booking.location,
      description: booking.description,
      notes: booking.notes,
      cancelReason: booking.cancelReason,
      completedAt: booking.completedAt?.toISOString(),
      rating: booking.rating,
      review: booking.review,
      createdAt: booking.createdAt.toISOString(),
      messages: booking.messages.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.sender.name,
        message: msg.content,
        timestamp: msg.createdAt.toISOString()
      }))
    }

    return NextResponse.json(transformedBooking)
  } catch (error) {
    console.error('Error fetching booking details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Vérifier que la réservation appartient au client
    const existingBooking = await db.booking.findFirst({
      where: {
        id: params.id,
        clientId: session.user.id
      }
    })

    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Vérifier que la réservation peut être modifiée
    if (existingBooking.status !== 'PENDING' && existingBooking.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Booking cannot be modified' }, { status: 400 })
    }

    // Mettre à jour la réservation
    const updatedBooking = await db.booking.update({
      where: { id: params.id },
      data: {
        ...body,
        updatedAt: new Date()
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

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}