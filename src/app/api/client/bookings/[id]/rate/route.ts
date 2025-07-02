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

    const { rating, review } = await request.json()

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }

    // Vérifier que la réservation appartient au client
    const booking = await db.booking.findFirst({
      where: {
        const { id } = await params;

        id: id,
        clientId: session.user.id,
        status: 'COMPLETED'
      },
      include: {
        provider: true
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found or not completed' }, { status: 404 })
    }

    // Vérifier si déjà noté
    if (booking.rating) {
      return NextResponse.json({ error: 'Booking already rated' }, { status: 400 })
    }

    // Transaction pour mettre à jour la réservation et le rating du prestataire
    await db.$transaction(async (tx) => {
      // Mettre à jour la réservation avec la note
      await tx.booking.update({
        where: { const { id } = await params;
 id: id },
        data: {
          rating,
          review,
          ratedAt: new Date()
        }
      })

      // Créer un review
      await tx.review.create({
        data: {
          clientId: session.user.id,
          providerId: booking.providerId,
          bookingId: booking.id,
          rating,
          comment: review,
          serviceType: booking.serviceType
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
        data: { rating: averageRating }
      })
    })

    // Créer une notification pour le prestataire
    await db.notification.create({
      data: {
        userId: booking.providerId,
        type: 'REVIEW_RECEIVED',
        title: 'Nouvelle évaluation',
        message: `Vous avez reçu une note de ${rating}/5 pour votre service.`,
        status: 'UNREAD'
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