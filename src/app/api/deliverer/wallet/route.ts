import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Schema pour demande de retrait
const withdrawalRequestSchema = z.object({
  amount: z.number().min(10, 'Minimum withdrawal amount is 10 EUR'),
  bankAccount: z.object({
    iban: z.string().min(15, 'Invalid IBAN'),
    bic: z.string().min(8, 'Invalid BIC'),
    accountHolder: z.string().min(2, 'Account holder name required')
  })
})

// Schema pour historique des transactions
const transactionFilterSchema = z.object({
  type: z.enum(['CREDIT', 'DEBIT', 'WITHDRAWAL', 'REFUND']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

// GET - Informations du portefeuille et historique
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = transactionFilterSchema.parse({
      type: searchParams.get('type'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
    })

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: {
        wallet: true
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Créer le portefeuille s'il n'existe pas
    let wallet = deliverer.wallet
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          delivererId: deliverer.id,
          balance: 0,
          pendingBalance: 0,
          currency: 'EUR'
        }
      })
    }

    // Construire les filtres pour les transactions
    const transactionWhere: any = {
      walletId: wallet.id
    }

    if (filters.type) {
      transactionWhere.type = filters.type
    }

    if (filters.dateFrom || filters.dateTo) {
      transactionWhere.createdAt = {}
      if (filters.dateFrom) transactionWhere.createdAt.gte = new Date(filters.dateFrom)
      if (filters.dateTo) transactionWhere.createdAt.lte = new Date(filters.dateTo)
    }

    // Récupérer les transactions avec pagination
    const [transactions, totalTransactions] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: transactionWhere,
        include: {
          payment: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit
      }),
      prisma.walletTransaction.count({ where: transactionWhere })
    ])

    // Récupérer les retraits en cours
    const pendingWithdrawals = await prisma.withdrawal.findMany({
      where: {
        walletId: wallet.id,
        status: { in: ['PENDING', 'PROCESSING'] }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculer les statistiques
    const stats = await prisma.walletTransaction.groupBy({
      by: ['type'],
      where: { walletId: wallet.id },
      _sum: { amount: true },
      _count: true
    })

    const statistics = {
      totalEarnings: stats.find(s => s.type === 'CREDIT')?._sum.amount || 0,
      totalWithdrawals: stats.find(s => s.type === 'WITHDRAWAL')?._sum.amount || 0,
      totalTransactions: stats.reduce((sum, stat) => sum + stat._count, 0),
      averageEarningPerDelivery: deliverer.totalDeliveries > 0 
        ? (stats.find(s => s.type === 'CREDIT')?._sum.amount || 0) / deliverer.totalDeliveries
        : 0
    }

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance,
        currency: wallet.currency,
        canWithdraw: wallet.balance >= 10,
        lastUpdated: wallet.updatedAt
      },
      transactions,
      pendingWithdrawals,
      statistics,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: totalTransactions,
        totalPages: Math.ceil(totalTransactions / filters.limit)
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error fetching wallet information:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Demande de retrait
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = withdrawalRequestSchema.parse(body)

    // Récupérer le profil livreur avec portefeuille
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

    // Vérifier que le livreur est validé
    if (deliverer.validationStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Account must be validated before withdrawals' },
        { status: 403 }
      )
    }

    // Vérifier le solde disponible
    if (deliverer.wallet.balance < validatedData.amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
    }

    // Créer la demande de retrait
    const withdrawal = await prisma.$transaction(async (tx) => {
      const newWithdrawal = await tx.withdrawal.create({
        data: {
          walletId: deliverer.wallet!.id,
          amount: validatedData.amount,
          status: 'PENDING',
          bankAccount: validatedData.bankAccount
        }
      })

      // Mettre à jour le portefeuille
      await tx.wallet.update({
        where: { id: deliverer.wallet!.id },
        data: {
          balance: {
            decrement: validatedData.amount
          },
          pendingBalance: {
            increment: validatedData.amount
          }
        }
      })

      // Créer la transaction
      await tx.walletTransaction.create({
        data: {
          walletId: deliverer.wallet!.id,
          type: 'WITHDRAWAL',
          amount: -validatedData.amount,
          description: `Withdrawal request to ${validatedData.bankAccount.iban}`,
          referenceId: newWithdrawal.id,
          balanceBefore: deliverer.wallet!.balance,
          balanceAfter: deliverer.wallet!.balance - validatedData.amount
        }
      })

      return newWithdrawal
    })

    return NextResponse.json({
      withdrawal,
      message: 'Withdrawal request submitted successfully',
      estimatedProcessingTime: '1-3 business days'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error processing withdrawal request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
