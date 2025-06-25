import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { MatchingService } from '@/features/deliveries/services/matching.service'

const acceptOpportunitySchema = z.object({
  announcementId: z.string().cuid('ID d\'annonce invalide')
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { announcementId } = acceptOpportunitySchema.parse(body)

    const result = await MatchingService.acceptOpportunity(
      session.user.id,
      announcementId
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        deliveryId: result.deliveryId
      })
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Données invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur acceptation opportunité:', error)
    return NextResponse.json({
      success: false,
      message: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}