import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reason } = await request.json()

    // Vérifier que la réservation appartient au client
    const { id } = await params;
    const booking = await db.booking.findFirst({
      where: {
        id: id,
        clientId: session.user.id
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Vérifier que la réservation peut être annulée
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Booking cannot be cancelled' }, { status: 400 })
    }

    // Calculer les frais d'annulation si applicable
    const scheduledDate = new Date(booking.scheduledDate)
    const now = new Date()
    const hoursUntilBooking = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    let cancellationFee = 0
    if (hoursUntilBooking < 24) {
      cancellationFee = booking.totalPrice * 0.5 // 50% si annulation moins de 24h avant
    } else if (hoursUntilBooking < 48) {
      cancellationFee = booking.totalPrice * 0.25 // 25% si annulation moins de 48h avant
    }

    // Mettre à jour la réservation
    const updatedBooking = await db.booking.update({
      where: { id: id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
        cancelledAt: new Date(),
        cancellationFee
      }
    })

    // Créer une notification pour le prestataire
    await db.notification.create({
      data: {
        userId: booking.providerId,
        type: 'BOOKING_CANCELLED',
        title: 'Réservation annulée',
        message: `La réservation du ${scheduledDate.toLocaleDateString()} a été annulée par le client.`,
        status: 'UNREAD'
      }
    })

    return NextResponse.json({ 
      success: true, 
      cancellationFee,
      message: cancellationFee > 0 
        ? `Réservation annulée. Frais d'annulation: ${cancellationFee}€`
        : 'Réservation annulée sans frais'
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}