// API pour la validation des livraisons par les livreurs
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { validationCode } = await request.json()

    if (!validationCode) {
      return NextResponse.json({ error: 'Code de validation requis' }, { status: 400 })
    }

    // Récupérer la livraison
    const delivery = await db.delivery.findUnique({
      where: { id },
      include: {
        client: true,
        deliverer: true,
        announcement: true
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Livraison non trouvée' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est le livreur
    if (delivery.delivererId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Vérifier le code de validation
    if (delivery.validationCode !== validationCode) {
      return NextResponse.json({ error: 'Code de validation incorrect' }, { status: 400 })
    }

    // Vérifier que la livraison peut être validée
    if (delivery.status !== 'IN_TRANSIT' && delivery.status !== 'PENDING') {
      return NextResponse.json({ error: 'Livraison déjà validée ou annulée' }, { status: 400 })
    }

    // Valider la livraison
    const updatedDelivery = await db.$transaction(async (tx) => {
      // Mettre à jour le statut de la livraison
      const delivery = await tx.delivery.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          actualDeliveryDate: new Date()
        }
      })

      // Ajouter un historique
      await tx.deliveryHistory.create({
        data: {
          deliveryId: id,
          action: 'VALIDATED',
          description: 'Livraison validée avec le code de validation',
          createdBy: user.id
        }
      })

      // Créer la preuve de livraison
      await tx.proofOfDelivery.create({
        data: {
          deliveryId: id,
          validatedWithCode: true
        }
      })

      return delivery
    })

    return NextResponse.json({
      success: true,
      message: 'Livraison validée avec succès',
      delivery: updatedDelivery
    })

  } catch (error) {
    console.error('Error validating delivery:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}