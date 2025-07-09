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

    // Récupération du portefeuille
    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.id }
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'Portefeuille non trouvé' },
        { status: 404 }
      )
    }

    // Vérification du solde
    if (Number(wallet.balance) < amount) {
      return NextResponse.json(
        { error: 'Solde insuffisant' },
        { status: 400 }
      )
    }

    // Création de la transaction de retrait
    const transaction = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'WITHDRAWAL',
        amount: amount,
        description: 'Retrait vers compte bancaire',
        status: 'PENDING'
      }
    })

    // Mise à jour du portefeuille
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          decrement: amount
        },
        totalWithdrawals: {
          increment: amount
        }
      }
    })

    // Simulation du virement bancaire (en production, intégrer avec un service bancaire)
    // Pour l'instant, on marque comme complété après un délai
    setTimeout(async () => {
      await prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: { status: 'COMPLETED' }
      })
    }, 5000) // 5 secondes de délai pour simuler le traitement

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
      message: 'Demande de retrait enregistrée. Le virement sera traité sous 2-3 jours ouvrés.'
    })

  } catch (error) {
    console.error('Error withdrawing from wallet:', error)
    return NextResponse.json(
      { error: 'Erreur lors du retrait du portefeuille' },
      { status: 500 }
    )
  }
} 