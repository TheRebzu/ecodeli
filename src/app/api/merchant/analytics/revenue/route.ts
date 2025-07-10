import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { MerchantAnalyticsService, analyticsTimeRangeSchema } from '@/features/merchant/services/analytics.service'
import { z } from 'zod'

const revenueRequestSchema = z.object({
  merchantId: z.string(),
  timeRange: analyticsTimeRangeSchema
})

export async function POST(request: NextRequest) {
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

    // Validation des données
    const body = await request.json()
    const { merchantId, timeRange } = revenueRequestSchema.parse(body)

    // Vérification des permissions
    if (session.user.role === 'MERCHANT' && session.user.id !== merchantId) {
      return NextResponse.json(
        { error: 'Accès refusé à ces données' },
        { status: 403 }
      )
    }

    // Récupération des métriques de revenus
    const revenueMetrics = await MerchantAnalyticsService.getRevenueMetrics(merchantId, timeRange)

    return NextResponse.json(revenueMetrics)

  } catch (error) {
    console.error('Erreur API métriques revenus:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 