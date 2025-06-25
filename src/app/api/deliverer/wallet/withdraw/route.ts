import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema de validation pour les retraits
const withdrawalSchema = z.object({
  amount: z.number().min(10, 'Minimum withdrawal amount is 10 EUR').max(5000, 'Maximum withdrawal amount is 5000 EUR'),
  bankAccount: z.object({
    iban: z.string().min(15, 'IBAN must be at least 15 characters').max(34, 'IBAN must be at most 34 characters'),
    bic: z.string().min(8, 'BIC must be at least 8 characters').max(11, 'BIC must be at most 11 characters'),
    accountHolder: z.string().min(2, 'Account holder name is required').max(100)
  }),
  withdrawalMethod: z.enum(['BANK_TRANSFER', 'PAYPAL', 'STRIPE']).default('BANK_TRANSFER'),
  notes: z.string().max(200).optional()
})

// POST - Demander un retrait
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = withdrawalSchema.parse(body)

    // Récupérer le profil livreur et son portefeuille
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: {
        wallet: true
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    if (!deliverer.wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Vérifier le solde disponible
    const availableBalance = parseFloat(deliverer.wallet.balance.toString())
    if (availableBalance < validatedData.amount) {
      return NextResponse.json({ 
        error: `Insufficient balance. Available: ${availableBalance} EUR, Requested: ${validatedData.amount} EUR` 
      }, { status: 400 })
    }

    // Vérifier si le livreur a déjà une demande de retrait en cours
    const pendingWithdrawal = await prisma.withdrawal.findFirst({
      where: {
        userId: session.user.id,
        status: 'PENDING'
      }
    })

    if (pendingWithdrawal) {
      return NextResponse.json({ 
        error: 'You already have a pending withdrawal request' 
      }, { status: 409 })
    }

    // Validation IBAN simplifiée (à améliorer avec une vraie validation)
    const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/
    if (!ibanRegex.test(validatedData.bankAccount.iban.replace(/\s/g, ''))) {
      return NextResponse.json({ 
        error: 'Invalid IBAN format' 
      }, { status: 400 })
    }

    // Calculer les frais de retrait (2% minimum 1 EUR)
    const feePercent = 0.02
    const minFee = 1
    const calculatedFee = Math.max(validatedData.amount * feePercent, minFee)
    const netAmount = validatedData.amount - calculatedFee

    // Utiliser une transaction pour garantir la cohérence
    const result = await prisma.$transaction(async (tx) => {
      // Créer la demande de retrait
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId: session.user.id,
          amount: validatedData.amount,
          netAmount: netAmount,
          fee: calculatedFee,
          bankAccount: validatedData.bankAccount,
          method: validatedData.withdrawalMethod,
          status: 'PENDING',
          notes: validatedData.notes
        }
      })

      // Débiter le portefeuille (montant en attente)
      await tx.wallet.update({
        where: { id: deliverer.wallet!.id },
        data: {
          balance: { decrement: validatedData.amount },
          pendingAmount: { increment: validatedData.amount }
        }
      })

      // Enregistrer la transaction dans l'historique
      await tx.walletTransaction.create({
        data: {
          walletId: deliverer.wallet!.id,
          type: 'DEBIT',
          amount: -validatedData.amount,
          description: `Withdrawal request #${withdrawal.id}`,
          relatedId: withdrawal.id,
          relatedType: 'WITHDRAWAL'
        }
      })

      return withdrawal
    })

    // TODO: Envoyer notification à l'admin pour traitement
    // await sendNotificationToAdmin('withdrawal_request', {
    //   delivererId: deliverer.id,
    //   amount: validatedData.amount,
    //   withdrawalId: result.id
    // })

    // TODO: Envoyer email de confirmation au livreur
    // await sendWithdrawalConfirmationEmail(session.user.email, result)

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: result.id,
        amount: result.amount,
        netAmount: result.netAmount,
        fee: result.fee,
        status: result.status,
        estimatedProcessingTime: '2-3 business days',
        createdAt: result.createdAt
      },
      message: 'Withdrawal request submitted successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'processing withdrawal request')
  }
}

// GET - Récupérer l'historique des retraits
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') // PENDING, APPROVED, COMPLETED, REJECTED

    const skip = (page - 1) * limit

    // Construire le filtre de statut
    const statusFilter = status ? { status: status.toUpperCase() } : {}

    // Récupérer les retraits avec pagination
    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: {
          userId: session.user.id,
          ...statusFilter
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.withdrawal.count({
        where: {
          userId: session.user.id,
          ...statusFilter
        }
      })
    ])

    // Calculer les statistiques
    const stats = await prisma.withdrawal.groupBy({
      by: ['status'],
      where: { userId: session.user.id },
      _count: { status: true },
      _sum: { amount: true }
    })

    const withdrawalStats = {
      total: 0,
      pending: 0,
      completed: 0,
      rejected: 0,
      totalAmount: 0,
      pendingAmount: 0,
      completedAmount: 0
    }

    stats.forEach(stat => {
      const count = stat._count.status
      const amount = parseFloat(stat._sum.amount?.toString() || '0')
      
      withdrawalStats.total += count
      withdrawalStats.totalAmount += amount

      switch (stat.status) {
        case 'PENDING':
          withdrawalStats.pending = count
          withdrawalStats.pendingAmount = amount
          break
        case 'COMPLETED':
          withdrawalStats.completed = count
          withdrawalStats.completedAmount = amount
          break
        case 'REJECTED':
          withdrawalStats.rejected = count
          break
      }
    })

    return NextResponse.json({
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: withdrawalStats
    })

  } catch (error) {
    return handleApiError(error, 'fetching withdrawal history')
  }
}
