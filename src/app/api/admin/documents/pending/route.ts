import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { DocumentValidationService } from '@/features/admin/services/document-validation.service'

const filtersSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  type: z.enum(['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'VEHICLE_REGISTRATION', 'CERTIFICATION', 'OTHER']).optional(),
  userId: z.string().cuid().optional(),
  userRole: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN']).optional(),
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
    const filters = filtersSchema.parse({
      status: searchParams.get('status') as any,
      type: searchParams.get('type') as any,
      userId: searchParams.get('userId'),
      userRole: searchParams.get('userRole') as any,
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo')
    })

    // Convertir les dates
    const processedFilters = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined
    }

    const documents = await DocumentValidationService.getPendingDocuments(processedFilters)

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Paramètres invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur récupération documents:', error)
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des documents'
    }, { status: 500 })
  }
}