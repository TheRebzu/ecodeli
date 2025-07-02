import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = await params

    // Récupérer le paiement avec les bonnes relations
    const payment = await db.payment.findFirst({
      where: { 
        id: paymentId,
        OR: [
          { userId: user.id },
          { clientId: user.id }
        ]
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        delivery: {
          include: {
            announcement: {
              select: {
                title: true,
                description: true
              }
            }
          }
        },
        booking: {
          include: {
            service: {
              select: {
                name: true,
                description: true
              }
            }
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json(payment)

  } catch (error) {
    console.error('Error fetching payment details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}