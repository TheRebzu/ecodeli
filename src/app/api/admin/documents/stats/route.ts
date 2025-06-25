import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { DocumentValidationService } from '@/features/admin/services/document-validation.service'

const statsSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const { dateFrom, dateTo } = statsSchema.parse({
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo')
    })

    const stats = await DocumentValidationService.getValidationStats(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    )

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Paramètres invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur statistiques documents:', error)
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    }, { status: 500 })
  }
}