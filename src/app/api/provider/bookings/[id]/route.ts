import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: bookingId } = await params

    // Vérifier que le provider existe
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    })

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        service: true,
        review: true
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Vérifier que la réservation appartient au provider
    if (booking.service.providerId !== provider.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json(booking)

  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: bookingId } = await params
    const body = await request.json()

    // Vérifier que le provider existe
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    })

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Vérifier que la réservation appartient au provider
    if (booking.service.providerId !== provider.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: body.status,
        notes: body.notes,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        completedAt: body.status === 'COMPLETED' ? new Date() : undefined
      },
      include: {
        client: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        service: true,
        review: true
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
