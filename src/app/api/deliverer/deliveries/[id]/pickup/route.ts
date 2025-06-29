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
        status: 'ACCEPTED'
      }
    })

    if (!delivery) {
      return NextResponse.json({ 
        error: 'Livraison non trouvée ou ne peut pas être récupérée' 
      }, { status: 404 })
    }

    // Mettre à jour le statut de la livraison
    const updatedDelivery = await db.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'PICKED_UP',
          actualPickupTime: new Date()
        }
      })

      // Créer une entrée de suivi
      await tx.deliveryTracking.create({
        data: {
          deliveryId,
          status: 'PICKED_UP',
          message: 'Colis récupéré par le livreur',
          location: delivery.pickupLocation as any
        }
      })

      return updated
    })

    return NextResponse.json({
      success: true,
      delivery: updatedDelivery,
      message: 'Colis marqué comme récupéré'
    })

  } catch (error) {
    console.error('Erreur lors de la récupération:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}