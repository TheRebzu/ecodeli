import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { validationCode } = await request.json()

    if (!validationCode || validationCode.length !== 6) {
      return NextResponse.json({ error: 'Invalid validation code' }, { status: 400 })
    }

    // Récupérer la livraison avec l'annonce
    const delivery = await db.delivery.findFirst({
      where: {
        id: params.id,
        announcement: {
          clientId: session.user.id
        }
      },
      include: {
        announcement: true,
        deliverer: {
          include: {
            user: true
          }
        }
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // Vérifier que la livraison est en cours
    if (delivery.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Delivery is not in progress' }, { status: 400 })
    }

    // Vérifier le code de validation
    if (delivery.validationCode !== validationCode) {
      return NextResponse.json({ error: 'Invalid validation code' }, { status: 400 })
    }

    // Transaction pour confirmer la livraison
    await db.$transaction(async (tx) => {
      // Mettre à jour la livraison
      await tx.delivery.update({
        where: { id: params.id },
        data: {
          status: 'DELIVERED',
          actualDelivery: new Date()
        }
      })

      // Mettre à jour l'annonce
      await tx.announcement.update({
        where: { id: delivery.announcementId },
        data: {
          status: 'COMPLETED'
        }
      })

      // Créer un paiement pour le livreur (si pas déjà fait)
      const existingPayment = await tx.payment.findFirst({
        where: {
          deliveryId: delivery.id,
          recipientId: delivery.delivererId,
          type: 'DELIVERY_PAYMENT'
        }
      })

      if (!existingPayment) {
        await tx.payment.create({
          data: {
            deliveryId: delivery.id,
            payerId: session.user.id,
            recipientId: delivery.delivererId!,
            amount: delivery.announcement.price,
            currency: 'EUR',
            type: 'DELIVERY_PAYMENT',
            status: 'PENDING',
            description: `Paiement pour livraison: ${delivery.announcement.title}`
          }
        })
      }

      // Notification pour le livreur
      await tx.notification.create({
        data: {
          userId: delivery.delivererId!,
          type: 'DELIVERY_CONFIRMED',
          title: 'Livraison confirmée',
          message: `Le client a confirmé la réception de "${delivery.announcement.title}". Paiement en cours.`,
          status: 'UNREAD'
        }
      })
    })

    return NextResponse.json({ 
      success: true,
      message: 'Livraison confirmée avec succès'
    })
  } catch (error) {
    console.error('Error confirming delivery:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}