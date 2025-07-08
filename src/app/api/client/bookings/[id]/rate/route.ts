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

    const { id } = await params
    const { rating, review } = await request.json()

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }

    // Récupérer le profil client
    const client = await db.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Vérifier que la réservation appartient au client
    const booking = await db.booking.findFirst({
      where: {
        id: id,
        clientId: client.id,
        status: 'COMPLETED'
      },
      include: {
        provider: true,
        review: true
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found or not completed' }, { status: 404 })
    }

    // Vérifier si déjà noté
    if (booking.review) {
      return NextResponse.json({ error: 'Booking already rated' }, { status: 400 })
    }

    // Transaction pour créer le review et mettre à jour la note du prestataire
    await db.$transaction(async (tx) => {
      // Créer un review
      await tx.review.create({
        data: {
          clientId: client.id,
          providerId: booking.providerId,
          bookingId: booking.id,
          rating,
          comment: review
        }
      })

      // Recalculer la note moyenne du prestataire
      const providerReviews = await tx.review.findMany({
        where: { providerId: booking.providerId }
      })

      const averageRating = providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length

      // Mettre à jour la note du prestataire
      await tx.provider.update({
        where: { id: booking.providerId },
        data: { averageRating: averageRating }
      })
    })

    // Créer une notification pour le prestataire
    await db.notification.create({
      data: {
        userId: booking.provider.userId,
        type: 'REVIEW_RECEIVED',
        title: 'Nouvelle évaluation',
        message: `Vous avez reçu une note de ${rating}/5 pour votre service.`,
        isRead: false
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Évaluation enregistrée avec succès'
    })
  } catch (error) {
    console.error('Error rating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}