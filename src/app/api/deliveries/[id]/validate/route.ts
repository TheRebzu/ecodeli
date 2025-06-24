// API pour la validation des livraisons par les livreurs
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DeliveryValidationService } from '@/features/deliveries/services/validation.service'
import { z } from 'zod'

const validateDeliverySchema = z.object({
  validationCode: z.string().length(6, 'Le code doit contenir 6 chiffres').regex(/^\d{6}$/, 'Le code doit être composé uniquement de chiffres'),
  notes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est un livreur
    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ 
        error: 'Seuls les livreurs peuvent valider une livraison' 
      }, { status: 403 })
    }

    const deliveryId = params.id
    const body = await request.json()

    // Valider les données d'entrée
    const validationResult = validateDeliverySchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Données invalides',
        details: validationResult.error.issues
      }, { status: 400 })
    }

    const { validationCode, notes, latitude, longitude } = validationResult.data

    // Valider le code de validation
    const result = await DeliveryValidationService.validateCode(
      deliveryId,
      validationCode,
      session.user.id
    )

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 400 })
    }

    // Enregistrer les coordonnées de livraison si fournies
    if (latitude && longitude && result.delivery) {
      try {
        await prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            deliveryLatitude: latitude,
            deliveryLongitude: longitude,
            deliveryNotes: notes
          }
        })
      } catch (error) {
        console.warn('Erreur enregistrement coordonnées:', error)
        // Ne pas faire échouer la validation pour ça
      }
    }

    // TODO: Envoyer notifications
    // - Notification au client que sa livraison est terminée
    // - Notification au livreur de confirmation
    // - Déclencher le paiement automatique

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        delivery: {
          id: result.delivery?.id,
          status: result.delivery?.status,
          deliveredAt: result.delivery?.deliveredAt
        }
      }
    })

  } catch (error) {
    console.error('Erreur validation livraison:', error)
    return NextResponse.json({ 
      error: 'Erreur interne du serveur' 
    }, { status: 500 })
  }
}