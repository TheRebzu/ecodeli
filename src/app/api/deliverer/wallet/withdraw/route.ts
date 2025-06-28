import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { WalletService } from '@/features/deliverer/services/wallet.service'

const withdrawalSchema = z.object({
  amount: z.number().min(10, 'Le montant minimum est de 10€'),
  bankAccount: z.object({
    iban: z.string().min(15, 'IBAN invalide'),
    bic: z.string().min(8, 'BIC invalide'),
    accountHolderName: z.string().min(1, 'Nom du titulaire requis')
  }),
  notes: z.string().optional()
})

/**
 * POST - Créer une demande de retrait
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json(
        { error: 'Profil livreur non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = withdrawalSchema.parse(body)

    const withdrawal = await WalletService.createWithdrawalRequest({
      delivererId: deliverer.id,
      amount: validatedData.amount,
      bankAccount: validatedData.bankAccount,
      notes: validatedData.notes
    })

    return NextResponse.json({
      success: true,
      message: 'Demande de retrait créée avec succès',
      withdrawal
    })

  } catch (error) {
    console.error('Error creating withdrawal request:', error)
    
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
      { error: 'Erreur lors de la création de la demande de retrait' },
      { status: 500 }
    )
  }
}