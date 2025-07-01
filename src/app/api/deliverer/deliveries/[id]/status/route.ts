import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'])
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🚚 [PUT /api/deliverer/deliveries/[id]/status] Début de la requête')
    
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
    console.log('📦 ID Livraison:', deliveryId)

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
        }
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

    // Valider le body de la requête
    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)

    console.log('🔄 Nouveau statut demandé:', status)

    // Vérifier les transitions de statut autorisées
    const allowedTransitions: Record<string, string[]> = {
      'accepted': ['picked_up', 'cancelled'],
      'picked_up': ['in_transit', 'cancelled'],
      'in_transit': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    }

    const currentStatus = existingDelivery.status
    const allowedNextStatuses = allowedTransitions[currentStatus] || []

    if (!allowedNextStatuses.includes(status)) {
      console.log('❌ Transition de statut non autorisée:', `${currentStatus} -> ${status}`)
      return NextResponse.json(
        { error: `Invalid status transition from ${currentStatus} to ${status}` },
        { status: 400 }
      )
    }

    // Mettre à jour le statut
    const updatedDelivery = await db.delivery.update({
      where: { id: deliveryId },
      data: {
        status,
        ...(status === 'picked_up' && { pickupDate: new Date() }),
        ...(status === 'delivered' && { 
          deliveryDate: new Date(),
          actualDeliveryDate: new Date()
        }),
        ...(status === 'cancelled' && { cancelledAt: new Date() })
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
        tracking: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })

    // Ajouter une entrée de tracking
    const trackingMessages: Record<string, string> = {
      'picked_up': 'Colis récupéré par le livreur',
      'in_transit': 'En cours de livraison',
      'delivered': 'Livraison terminée avec succès',
      'cancelled': 'Livraison annulée'
    }

    if (trackingMessages[status]) {
      await db.deliveryTracking.create({
        data: {
          deliveryId,
          status,
          message: trackingMessages[status],
          timestamp: new Date()
        }
      })
    }

    // Si la livraison est terminée, débloquer le paiement
    if (status === 'delivered') {
      await db.payment.updateMany({
        where: {
          deliveryId,
          status: 'PENDING'
        },
        data: {
          status: 'COMPLETED',
          paidAt: new Date()
        }
      })
    }

    console.log('✅ Statut mis à jour avec succès:', status)

    return NextResponse.json({
      success: true,
      delivery: {
        id: updatedDelivery.id,
        status: updatedDelivery.status,
        pickupDate: updatedDelivery.pickupDate?.toISOString(),
        deliveryDate: updatedDelivery.deliveryDate?.toISOString(),
        actualDeliveryDate: updatedDelivery.actualDeliveryDate?.toISOString(),
        cancelledAt: updatedDelivery.cancelledAt?.toISOString(),
        updatedAt: updatedDelivery.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Erreur mise à jour statut livraison:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 