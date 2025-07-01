// API pour la génération et récupération des codes de validation
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { DeliveryValidationService } from '@/features/deliveries/services/validation.service'
import { getNotificationTemplate } from '@/features/notifications/templates/notification-templates'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id: deliveryId } = await params

    // Vérifier que l'utilisateur est le client propriétaire
    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ 
        error: 'Seul le client peut récupérer le code de validation' 
      }, { status: 403 })
    }

    // Récupérer le code actuel
    const validationCode = await DeliveryValidationService.getCurrentValidationCode(
      deliveryId, 
      session.user.id
    )

    if (!validationCode) {
      return NextResponse.json({ 
        error: 'Aucun code de validation actif trouvé' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        code: validationCode.code,
        expiresAt: validationCode.expiresAt,
        timeRemaining: Math.max(0, validationCode.expiresAt.getTime() - Date.now())
      }
    })

  } catch (error) {
    console.error('Erreur récupération code validation:', error)
    return NextResponse.json({ 
      error: 'Erreur interne du serveur' 
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id: deliveryId } = await params

    // Vérifier que l'utilisateur est le client propriétaire
    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ 
        error: 'Seul le client peut générer un code de validation' 
      }, { status: 403 })
    }

    // Générer ou rafraîchir le code
    const validationCode = await DeliveryValidationService.refreshValidationCode(
      deliveryId,
      session.user.id
    )

    if (!validationCode) {
      return NextResponse.json({ 
        error: 'Impossible de générer un code de validation' 
      }, { status: 400 })
    }

    // TODO: Envoyer une notification push au client avec le code
    // const notification = getNotificationTemplate(
    //   'DELIVERY_VALIDATION_CODE',
    //   'fr', // TODO: récupérer la langue de l'utilisateur
    //   { validationCode: validationCode.code }
    // )

    return NextResponse.json({
      success: true,
      data: {
        code: validationCode.code,
        expiresAt: validationCode.expiresAt,
        timeRemaining: validationCode.expiresAt.getTime() - Date.now(),
        message: 'Code de validation généré avec succès'
      }
    })

  } catch (error) {
    console.error('Erreur génération code validation:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erreur interne du serveur' 
    }, { status: 500 })
  }
}