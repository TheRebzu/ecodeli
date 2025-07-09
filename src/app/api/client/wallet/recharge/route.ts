import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Montant invalide' },
        { status: 400 }
      )
    }

    // Récupération ou création du portefeuille
    let wallet = await prisma.wallet.findUnique({
      where: { userId: session.id }
    })

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

    // Création du paiement pour la recharge
    const payment = await prisma.payment.create({
      data: {
        userId: session.id,
        amount: amount,
        currency: 'EUR',
        status: 'PENDING',
        type: 'WALLET_RECHARGE'
      }
    })

    // Création de la transaction de portefeuille
    const transaction = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEPOSIT',
        amount: amount,
        description: 'Recharge du portefeuille',
        status: 'PENDING',
        paymentId: payment.id
      }
    })

    // Mise à jour du portefeuille
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: amount
        },
        totalDeposits: {
          increment: amount
        }
      }
    })

    // URL de paiement Stripe (à implémenter)
    const paymentUrl = `/api/payments/stripe/create-session?paymentId=${payment.id}`

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        description: transaction.description,
        status: transaction.status,
        createdAt: transaction.createdAt.toISOString()
      },
      paymentUrl
    })

  } catch (error) {
    console.error('Error recharging wallet:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recharge du portefeuille' },
      { status: 500 }
    )
  }
} 