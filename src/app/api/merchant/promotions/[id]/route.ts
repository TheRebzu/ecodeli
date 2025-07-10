import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { MerchantPromotionsService } from '@/features/merchant/services/promotions.service'
import { z } from 'zod'

const updatePromotionSchema = z.object({
  merchantId: z.string(),
  updates: z.object({}).passthrough()
})

const deletePromotionSchema = z.object({
  merchantId: z.string()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérification de l'authentification
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérification du rôle
    if (session.user.role !== 'MERCHANT' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    const promotionId = params.id
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId') || session.user.id

    // Vérification des permissions
    if (session.user.role === 'MERCHANT' && session.user.id !== merchantId) {
      return NextResponse.json(
        { error: 'Accès refusé à ces données' },
        { status: 403 }
      )
    }

    // Récupération de la promotion
    const promotion = await MerchantPromotionsService.getPromotionById(promotionId, merchantId)

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(promotion)

  } catch (error) {
    console.error('Erreur API promotion GET:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérification de l'authentification
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérification du rôle
    if (session.user.role !== 'MERCHANT' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    const promotionId = params.id
    const body = await request.json()
    const { merchantId, updates } = updatePromotionSchema.parse(body)

    // Vérification des permissions
    if (session.user.role === 'MERCHANT' && session.user.id !== merchantId) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    // Mise à jour de la promotion
    const promotion = await MerchantPromotionsService.updatePromotion(promotionId, merchantId, updates)

    return NextResponse.json(promotion)

  } catch (error) {
    console.error('Erreur API promotion PUT:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérification de l'authentification
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérification du rôle
    if (session.user.role !== 'MERCHANT' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    const promotionId = params.id
    const body = await request.json()
    const { merchantId } = deletePromotionSchema.parse(body)

    // Vérification des permissions
    if (session.user.role === 'MERCHANT' && session.user.id !== merchantId) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    // Suppression de la promotion
    await MerchantPromotionsService.deletePromotion(promotionId, merchantId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur API promotion DELETE:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 