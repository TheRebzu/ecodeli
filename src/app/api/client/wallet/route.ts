import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupération du portefeuille de l'utilisateur
    let wallet = await prisma.wallet.findUnique({
      where: { userId: session.id }
    })

    // Créer un portefeuille s'il n'existe pas
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: session.id,
          balance: 0,
          totalDeposits: 0,
          totalWithdrawals: 0
        }
      })
    }

    // Récupération des transactions récentes
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json({
      balance: Number(wallet.balance),
      totalDeposits: Number(wallet.totalDeposits),
      totalWithdrawals: Number(wallet.totalWithdrawals),
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        status: t.status,
        createdAt: t.createdAt.toISOString()
      }))
    })

  } catch (error) {
    console.error('Error fetching wallet:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement du portefeuille' },
      { status: 500 }
    )
  }
} 