import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer les statistiques de parrainage de l'utilisateur
    const [referralStats, referralRewards, referralActivities] = await Promise.all([
      // Statistiques générales
      prisma.referralStats.findUnique({
        where: { userId: session.user.id }
      }),

      // Récompenses
      prisma.referralReward.findMany({
        where: { userId: session.user.id },
        select: {
          amount: true,
          status: true
        }
      }),

      // Activités récentes pour calculer le taux de conversion
      prisma.referralActivity.findMany({
        where: { userId: session.user.id },
        take: 100,
        orderBy: { createdAt: 'desc' }
      })
    ])

    // Calculer les métriques
    const totalEarnings = referralRewards
              .filter(reward => reward.status === 'COMPLETED')
      .reduce((sum, reward) => sum + reward.amount, 0)

    const pendingRewards = referralRewards
      .filter(reward => reward.status === 'PENDING')
      .reduce((sum, reward) => sum + reward.amount, 0)

    // Calculer le niveau basé sur les parrainages
    const totalReferrals = referralStats?.totalReferrals || 0
    const level = Math.floor(totalReferrals / 5) + 1 // Niveau tous les 5 parrainages
    const nextLevelReferrals = 5 // Parrainages nécessaires pour le niveau suivant

    // Calculer le taux de conversion
    const codeGenerations = referralActivities.filter(a => a.type === 'CODE_GENERATED').length
    const successfulReferrals = referralActivities.filter(a => a.type === 'REFERRAL_REGISTERED').length
    const conversionRate = codeGenerations > 0 ? (successfulReferrals / codeGenerations) * 100 : 0

    const stats = {
      totalReferrals: referralStats?.totalReferrals || 0,
      activeReferrals: referralStats?.activeReferrals || 0,
      totalEarnings,
      pendingRewards,
      level,
      nextLevelReferrals,
      conversionRate
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Erreur récupération stats parrainage:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}