import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { DocumentValidationService } from '@/features/admin/services/document-validation.service'

const validateDocumentSchema = z.object({
  documentId: z.string().cuid(),
  status: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional()
})

const bulkValidateSchema = z.object({
  documentIds: z.array(z.string().cuid()),
  status: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional()
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
    const url = new URL(request.url)
    const isBulk = url.searchParams.get('bulk') === 'true'

    if (isBulk) {
      const { documentIds, status, notes } = bulkValidateSchema.parse(body)
      
      const result = await DocumentValidationService.bulkValidateDocuments(
        documentIds,
        status,
        session.user.id,
        notes
      )

      return NextResponse.json({
        success: true,
        message: `${result.success.length} documents traités avec succès`,
        result
      })
    } else {
      const { documentId, status, notes } = validateDocumentSchema.parse(body)
      
      const document = await DocumentValidationService.validateDocument({
        documentId,
        status,
        notes,
        adminId: session.user.id
      })

      return NextResponse.json({
        success: true,
        message: `Document ${status === 'APPROVED' ? 'approuvé' : 'rejeté'} avec succès`,
        document
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Données invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur validation document:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Erreur lors de la validation'
    }, { status: 500 })
  }
}