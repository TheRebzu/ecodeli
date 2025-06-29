import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deliveryId = params.id

    // Récupérer le profil livreur
    const deliverer = await db.deliverer.findUnique({
      where: { userId: user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Profil livreur non trouvé' }, { status: 404 })
    }

    // Vérifier que la livraison existe et appartient au livreur
    const delivery = await db.delivery.findFirst({
      where: {
        id: deliveryId,
        delivererId: deliverer.id,
        status: 'PICKED_UP'
      }
    })

    if (!delivery) {
      return NextResponse.json({ 
        error: 'Livraison non trouvée ou ne peut pas être démarrée' 
      }, { status: 404 })
    }

    // Mettre à jour le statut de la livraison
    const updatedDelivery = await db.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'IN_TRANSIT'
        }
      })

      // Créer une entrée de suivi
      await tx.deliveryTracking.create({
        data: {
          deliveryId,
          status: 'IN_TRANSIT',
          message: 'Livraison en cours de transport',
          location: delivery.pickupLocation as any
        }
      })

      return updated
    })

    return NextResponse.json({
      success: true,
      delivery: updatedDelivery,
      message: 'Livraison démarrée avec succès'
    })

  } catch (error) {
    console.error('Erreur lors du démarrage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}