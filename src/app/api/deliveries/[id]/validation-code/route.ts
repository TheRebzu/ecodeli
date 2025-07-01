// API pour la génération et récupération des codes de validation
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id: deliveryId } = await params

    // Récupérer la livraison
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        client: true
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Livraison non trouvée' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est le client propriétaire
    if (delivery.clientId !== user.id) {
      return NextResponse.json({ 
        error: 'Non autorisé' 
      }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      code: delivery.validationCode,
      status: delivery.status
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
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id: deliveryId } = await params

    // Récupérer la livraison
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        client: true
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Livraison non trouvée' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est le client propriétaire
    if (delivery.clientId !== user.id) {
      return NextResponse.json({ 
        error: 'Non autorisé' 
      }, { status: 403 })
    }

    // Générer un nouveau code de validation à 6 chiffres
    const newValidationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Mettre à jour la livraison
    const updatedDelivery = await db.delivery.update({
      where: { id: deliveryId },
      data: {
        validationCode: newValidationCode
      }
    })

    return NextResponse.json({
      success: true,
      code: newValidationCode,
      message: 'Code de validation généré avec succès'
    })

  } catch (error) {
    console.error('Erreur génération code validation:', error)
    return NextResponse.json({ 
      error: 'Erreur interne du serveur' 
    }, { status: 500 })
  }
}