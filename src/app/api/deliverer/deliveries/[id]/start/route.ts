import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

// Fonction pour générer un code de validation à 6 chiffres
function generateValidationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: deliveryId } = await params

    // Vérifier que la livraison existe et appartient au livreur
    const delivery = await db.delivery.findFirst({
      where: {
        id: deliveryId,
        delivererId: user.id,
        status: 'PICKED_UP'
      },
      include: {
        announcement: true,
        client: {
          select: {
            id: true,
            profile: true
          }
        }
      }
    })

    if (!delivery) {
      return NextResponse.json({ 
        error: 'Livraison non trouvée ou ne peut pas être démarrée' 
      }, { status: 404 })
    }

    // Générer un code de validation unique
    const validationCode = generateValidationCode()
    console.log(`🔐 Code de validation généré: ${validationCode}`)

    // Mettre à jour le statut de la livraison
    const updatedDelivery = await db.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'IN_TRANSIT',
          validationCode: validationCode
        }
      })

      // Créer une entrée de suivi
      await tx.trackingUpdate.create({
        data: {
          deliveryId,
          status: 'IN_TRANSIT',
          message: 'Livraison en cours de transport - Code de validation généré',
          location: delivery.currentLocation ? JSON.stringify(delivery.currentLocation) : null,
          isAutomatic: false
        }
      })

      // Créer une entrée dans l'historique
      await tx.deliveryHistory.create({
        data: {
          deliveryId,
          action: 'START_DELIVERY',
          description: 'Livraison démarrée par le livreur - Code de validation généré',
          createdBy: user.id,
          metadata: {
            previousStatus: 'PICKED_UP',
            newStatus: 'IN_TRANSIT',
            validationCode: validationCode,
            timestamp: new Date().toISOString()
          }
        }
      })

      return updated
    })

    return NextResponse.json({
      success: true,
      delivery: updatedDelivery,
      validationCode: validationCode,
      message: 'Livraison démarrée avec succès - Code de validation généré'
    })

  } catch (error) {
    console.error('Erreur lors du démarrage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}