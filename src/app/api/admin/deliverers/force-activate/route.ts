import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { DocumentValidationService } from '@/features/admin/services/document-validation.service'

const forceActivateSchema = z.object({
  delivererId: z.string().cuid(),
  reason: z.string().min(1, 'Une raison est requise')
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { delivererId, reason } = forceActivateSchema.parse(body)

    const result = await DocumentValidationService.forceActivateDeliverer(
      delivererId,
      session.user.id,
      reason
    )

    return NextResponse.json({
      success: true,
      message: 'Livreur activé avec succès',
      result
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Données invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur activation forcée livreur:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur lors de l\'activation'
    }, { status: 500 })
  }
}