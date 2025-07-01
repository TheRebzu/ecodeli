import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🚚 [POST /api/deliverer/deliveries/[id]/cancel] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user) {
      console.log('❌ Utilisateur non authentifié')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'DELIVERER') {
      console.log('❌ Rôle incorrect:', user.role)
      return NextResponse.json({ error: 'Forbidden - DELIVERER role required' }, { status: 403 })
    }

    const { id: deliveryId } = await params
    console.log('📦 ID Livraison à annuler:', deliveryId)

    // Vérifier que la livraison existe et appartient au livreur
    const existingDelivery = await db.delivery.findFirst({
      where: {
        id: deliveryId,
        delivererId: user.id
      },
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: true
              }
            }
          }
        },
        payment: true
      }
    })

    if (!existingDelivery) {
      console.log('❌ Livraison non trouvée ou non autorisée')
      return NextResponse.json({ error: 'Delivery not found or not authorized' }, { status: 404 })
    }

    console.log('📋 Livraison trouvée:', {
      id: existingDelivery.id,
      currentStatus: existingDelivery.status,
      delivererId: existingDelivery.delivererId
    })

    // Vérifier que la livraison peut être annulée
    const cancellableStatuses = ['accepted', 'picked_up', 'in_transit']
    if (!cancellableStatuses.includes(existingDelivery.status)) {
      console.log('❌ Livraison ne peut pas être annulée, statut:', existingDelivery.status)
      return NextResponse.json(
        { error: `Cannot cancel delivery with status: ${existingDelivery.status}` },
        { status: 400 }
      )
    }

    // Annuler la livraison
    const cancelledDelivery = await db.delivery.update({
      where: { id: deliveryId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date()
      },
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    })

    // Ajouter une entrée de tracking
    await db.deliveryTracking.create({
      data: {
        deliveryId,
        status: 'cancelled',
        message: 'Livraison annulée par le livreur',
        timestamp: new Date()
      }
    })

    // Rembourser le paiement si nécessaire
    if (existingDelivery.payment && existingDelivery.payment.status === 'COMPLETED') {
      await db.payment.update({
        where: { id: existingDelivery.payment.id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date()
        }
      })
    }

    // Libérer l'annonce pour qu'elle puisse être reprise par un autre livreur
    await db.announcement.update({
      where: { id: existingDelivery.announcementId },
      data: {
        status: 'ACTIVE'
      }
    })

    console.log('✅ Livraison annulée avec succès')

    return NextResponse.json({
      success: true,
      delivery: {
        id: cancelledDelivery.id,
        status: cancelledDelivery.status,
        cancelledAt: cancelledDelivery.cancelledAt?.toISOString(),
        updatedAt: cancelledDelivery.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Erreur annulation livraison:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 