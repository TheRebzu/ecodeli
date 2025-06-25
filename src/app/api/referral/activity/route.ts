import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit

    // Récupérer l'activité de parrainage
    const activities = await prisma.referralActivity.findMany({
      where: { userId: session.user.id },
      include: {
        referral: {
          include: {
            referredUser: {
              include: {
                profile: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    // Formater les activités pour l'affichage
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      amount: activity.metadata?.amount || 0,
      createdAt: activity.createdAt,
      referredUser: activity.referral?.referredUser ? {
        name: activity.referral.referredUser.profile?.firstName + ' ' + activity.referral.referredUser.profile?.lastName || activity.referral.referredUser.email,
        email: activity.referral.referredUser.email
      } : null
    }))

    // Compter le total pour la pagination
    const total = await prisma.referralActivity.count({
      where: { userId: session.user.id }
    })

    return NextResponse.json({
      activities: formattedActivities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erreur récupération activité parrainage:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'activité' },
      { status: 500 }
    )
  }
}