import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await request.json()

    // Vérifier que l'annonce appartient à l'utilisateur
    const { id } = await params;
    const announcement = await db.announcement.findFirst({
      where: {
        id: id,
        authorId: session.user.id,
        status: 'ACTIVE'
      }
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Récupérer le portefeuille de l'utilisateur
    const wallet = await db.wallet.findUnique({
      where: { userId: session.user.id }
    })

    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    // Transaction pour débiter le portefeuille et créer le paiement
    await db.$transaction(async (tx) => {
      // Débiter le portefeuille
      await tx.wallet.update({
        where: { userId: session.user.id },
        data: {
          balance: {
            decrement: amount
          }
        }
      })

      // Créer l'opération de portefeuille
      await tx.walletOperation.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount,
          description: `Paiement annonce: ${announcement.title}`,
          reference: `announcement_${announcement.id}`,
          status: 'COMPLETED'
        }
      })

      // Créer l'enregistrement de paiement
      await tx.payment.create({
        data: {
          announcementId: announcement.id,
          userId: session.user.id,
          amount,
          currency: 'EUR',
          status: 'COMPLETED',
          method: 'WALLET',
          completedAt: new Date()
        }
      })

      // Mettre à jour le statut de l'annonce
      await tx.announcement.update({
        where: { id: announcement.id },
        data: {
          status: 'MATCHED', // L'annonce devient payée et prête pour le matching
          updatedAt: new Date()
        }
      })
    })

    return NextResponse.json({ success: true, message: 'Payment completed' })
  } catch (error) {
    console.error('Error processing wallet payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}