import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { WalletService } from '@/features/deliverer/services/wallet.service'

const processWithdrawalSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED']),
  notes: z.string().optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * PUT - Traiter une demande de retrait
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = processWithdrawalSchema.parse(body)

    const processedWithdrawal = await WalletService.processWithdrawal(
      params.id,
      validatedData.status,
      session.user.id,
      validatedData.notes
    )

    return NextResponse.json({
      success: true,
      message: `Demande de retrait ${validatedData.status === 'COMPLETED' ? 'approuvée' : 'refusée'}`,
      withdrawal: processedWithdrawal
    })

  } catch (error) {
    console.error('Error processing withdrawal:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
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
      { error: 'Erreur lors du traitement de la demande de retrait' },
      { status: 500 }
    )
  }
}