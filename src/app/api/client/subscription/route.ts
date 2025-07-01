import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const user = await getUserFromSession(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Récupérer l'abonnement client
    const clientProfile = await db.client.findUnique({
      where: { userId: user.id }
    })

    if (!clientProfile) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Calculer les statistiques d'utilisation
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const lastMonth = new Date(currentMonth)
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const [thisMonthStats, lastMonthStats] = await Promise.all([
      // Stats du mois en cours
      db.delivery.findMany({
        where: {
          announcement: {
            clientId: user.id
          },
          createdAt: {
            gte: currentMonth
          }
        },
        include: {
          announcement: true,
          payment: true
        }
      }),
      // Stats du mois dernier
      db.delivery.findMany({
        where: {
          announcement: {
            clientId: user.id
          },
          createdAt: {
            gte: lastMonth,
            lt: currentMonth
          }
        },
        include: {
          announcement: true,
          payment: true
        }
      })
    ])

    // Calculer les économies réalisées ce mois
    const thisMonthSavings = thisMonthStats.reduce((total, delivery) => {
      const originalPrice = delivery.announcement.finalPrice || delivery.announcement.basePrice
      const subscriptionDiscount = clientProfile.subscriptionPlan === 'STARTER' ? 0.05 : 
                                   clientProfile.subscriptionPlan === 'PREMIUM' ? 0.09 : 0
      return total + (originalPrice * subscriptionDiscount)
    }, 0)

    const lastMonthSavings = lastMonthStats.reduce((total, delivery) => {
      const originalPrice = delivery.announcement.finalPrice || delivery.announcement.basePrice
      const subscriptionDiscount = clientProfile.subscriptionPlan === 'STARTER' ? 0.05 : 
                                   clientProfile.subscriptionPlan === 'PREMIUM' ? 0.09 : 0
      return total + (originalPrice * subscriptionDiscount)
    }, 0)

    // Compter les envois prioritaires (urgents)
    const priorityShipments = thisMonthStats.filter(delivery => 
      delivery.announcement.isUrgent
    ).length

    // Calculer l'assurance utilisée
    const insuranceUsed = thisMonthStats.reduce((total, delivery) => {
      if (delivery.payment?.insuranceClaim) {
        return total + delivery.payment.insuranceClaim
      }
      return total
    }, 0)

    const usageStats = {
      thisMonth: {
        deliveries: thisMonthStats.length,
        savings: Math.round(thisMonthSavings * 100) / 100,
        priorityShipments,
        insuranceUsed: Math.round(insuranceUsed * 100) / 100
      },
      lastMonth: {
        deliveries: lastMonthStats.length,
        savings: Math.round(lastMonthSavings * 100) / 100
      }
    }

    // Transformer les données d'abonnement
    const subscription = {
      id: clientProfile.id,
      plan: clientProfile.subscriptionPlan,
      status: clientProfile.subscriptionEnd && clientProfile.subscriptionEnd < new Date() ? 'expired' : 'active',
      startDate: clientProfile.subscriptionStart.toISOString(),
      endDate: clientProfile.subscriptionEnd?.toISOString() || null,
      autoRenew: clientProfile.subscriptionPlan !== 'FREE'
    }

    return NextResponse.json({
      subscription,
      usageStats
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await request.json()

    if (!['FREE', 'STARTER', 'PREMIUM'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const clientProfile = await db.client.findUnique({
      where: { userId: user.id }
    })

    if (!clientProfile) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    let subscription
    const now = new Date()

    if (plan === 'FREE') {
      // Annuler l'abonnement payant
      await db.client.update({
        where: { id: clientProfile.id },
        data: {
          subscriptionPlan: 'FREE',
          subscriptionEnd: now
        }
      })
      subscription = {
        id: clientProfile.id,
        plan: 'FREE',
        status: 'active',
        startDate: now.toISOString(),
        endDate: null,
        autoRenew: false
      }
    } else {
      // Créer ou mettre à jour l'abonnement payant
      const price = plan === 'STARTER' ? 9.90 : 19.99
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1)

      // Mettre à jour l'abonnement
      const updatedClient = await db.client.update({
        where: { id: clientProfile.id },
        data: {
          subscriptionPlan: plan,
          subscriptionStart: now,
          subscriptionEnd: endDate
        }
      })
      
      subscription = {
        id: updatedClient.id,
        plan: updatedClient.subscriptionPlan,
        status: 'active',
        startDate: updatedClient.subscriptionStart.toISOString(),
        endDate: updatedClient.subscriptionEnd?.toISOString(),
        autoRenew: true
      }

      // Créer un paiement pour l'abonnement
      await db.payment.create({
        data: {
          userId: user.id,
          clientId: clientProfile.id,
          amount: price,
          currency: 'EUR',
          paymentMethod: 'STRIPE',
          status: 'COMPLETED',
          paidAt: now,
          metadata: {
            type: 'SUBSCRIPTION',
            plan: plan,
            description: `Abonnement ${plan} - ${new Date().toLocaleDateString('fr-FR')}`
          }
        }
      })
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientProfile = await db.client.findUnique({
      where: { userId: user.id }
    })

    if (clientProfile.subscriptionPlan === 'FREE') {
      return NextResponse.json({ error: 'No subscription to cancel' }, { status: 404 })
    }

    // Annuler l'abonnement (il reste actif jusqu'à la fin de la période)
    // On ne change pas immédiatement en FREE, on garde le plan actuel jusqu'à la fin
    // mais on note que c'est annulé en ajoutant une date de fin si elle n'existe pas
    const endDate = clientProfile.subscriptionEnd || new Date()
    await db.client.update({
      where: { id: clientProfile.id },
      data: {
        subscriptionEnd: endDate
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Subscription cancelled successfully'
    })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}