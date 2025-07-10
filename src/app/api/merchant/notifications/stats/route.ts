import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { MerchantNotificationsService } from '@/features/merchant/services/notifications.service'

export async function GET(request: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérification du rôle
    if (session.user.role !== 'MERCHANT' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId') || session.user.id

    // Vérification des permissions
    if (session.user.role === 'MERCHANT' && session.user.id !== merchantId) {
      return NextResponse.json(
        { error: 'Accès refusé à ces données' },
        { status: 403 }
      )
    }

    // Récupération des statistiques
    const stats = await MerchantNotificationsService.getNotificationStats(merchantId)

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Erreur API stats notifications:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 