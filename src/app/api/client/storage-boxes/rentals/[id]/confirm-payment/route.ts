import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Récupérer la location
    const rental = await prisma.storageBoxRental.findFirst({
      where: {
        id: id,
        client: {
          userId: session.user.id
        }
      },
      include: {
        payment: true,
        storageBox: true
      }
    })

    if (!rental) {
      return NextResponse.json(
        { error: 'Location non trouvée' },
        { status: 404 }
      )
    }

    // Mettre à jour le statut de la location et du paiement
    await prisma.$transaction([
      // Mettre à jour la location
      prisma.storageBoxRental.update({
        where: { id: id },
        data: {
          status: 'ACTIVE',
          paymentStatus: 'PAID'
        }
      }),
      // Mettre à jour le paiement
      prisma.payment.update({
        where: { id: rental.paymentId! },
        data: {
          status: 'COMPLETED',
          paidAt: new Date()
        }
      }),
      // Marquer la box comme occupée
      prisma.storageBox.update({
        where: { id: rental.storageBoxId },
        data: {
          isAvailable: false
        }
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'Paiement confirmé et location activée'
    })

  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la confirmation du paiement' },
      { status: 500 }
    )
  }
} 