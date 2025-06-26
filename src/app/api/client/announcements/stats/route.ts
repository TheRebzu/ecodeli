import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer toutes les annonces du client
    const announcements = await db.announcement.findMany({
      where: { authorId: session.user.id },
      include: {
        payments: {
          where: { status: 'COMPLETED' }
        }
      }
    })

    // Calculer les statistiques
    const stats = {
      active: announcements.filter(a => a.status === 'ACTIVE').length,
      matched: announcements.filter(a => a.status === 'MATCHED').length,
      completed: announcements.filter(a => a.status === 'COMPLETED').length,
      totalSaved: 0
    }

    // Calculer les économies réalisées (exemple: 20% d'économie par rapport aux services traditionnels)
    const totalSpent = announcements
      .filter(a => a.status === 'COMPLETED')
      .reduce((sum, announcement) => {
        const paid = announcement.payments.reduce((total, payment) => total + payment.amount, 0)
        return sum + paid
      }, 0)

    stats.totalSaved = Math.round(totalSpent * 0.2) // 20% d'économie

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching announcement stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}