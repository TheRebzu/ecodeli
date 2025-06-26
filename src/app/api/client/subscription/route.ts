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
      where: { userId: user.id },
      include: {
        subscription: true
      }
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
      const originalPrice = delivery.announcement.price
      const subscriptionDiscount = clientProfile.subscription?.plan === 'STARTER' ? 0.05 : 
                                   clientProfile.subscription?.plan === 'PREMIUM' ? 0.09 : 0
      return total + (originalPrice * subscriptionDiscount)
    }, 0)

    const lastMonthSavings = lastMonthStats.reduce((total, delivery) => {
      const originalPrice = delivery.announcement.price
      const subscriptionDiscount = clientProfile.subscription?.plan === 'STARTER' ? 0.05 : 
                                   clientProfile.subscription?.plan === 'PREMIUM' ? 0.09 : 0
      return total + (originalPrice * subscriptionDiscount)
    }, 0)

    // Compter les envois prioritaires
    const priorityShipments = thisMonthStats.filter(delivery => 
      delivery.announcement.priority === 'HIGH'
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
    const subscription = clientProfile.subscription ? {
      id: clientProfile.subscription.id,
      plan: clientProfile.subscription.plan,
      status: clientProfile.subscription.status,
      startDate: clientProfile.subscription.startDate.toISOString(),
      endDate: clientProfile.subscription.endDate?.toISOString(),
      autoRenew: clientProfile.subscription.autoRenew
    } : {
      id: 'free',
      plan: 'FREE',
      status: 'active',
      startDate: clientProfile.createdAt.toISOString(),
      endDate: null,
      autoRenew: false
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
      where: { userId: user.id },
      include: {
        subscription: true
      }
    })

    if (!clientProfile) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    let subscription

    if (plan === 'FREE') {
      // Annuler l'abonnement payant
      if (clientProfile.subscription) {
        await db.subscription.update({
          where: { id: clientProfile.subscription.id },
          data: {
            status: 'cancelled',
            endDate: new Date()
          }
        })
      }
      subscription = {
        id: 'free',
        plan: 'FREE',
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: null,
        autoRenew: false
      }
    } else {
      // Créer ou mettre à jour l'abonnement payant
      const price = plan === 'STARTER' ? 9.90 : 19.99
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1)

      if (clientProfile.subscription) {
        // Mettre à jour l'abonnement existant
        const updatedSubscription = await db.subscription.update({
          where: { id: clientProfile.subscription.id },
          data: {
            plan,
            status: 'active',
            endDate,
            autoRenew: true
          }
        })
        subscription = {
          id: updatedSubscription.id,
          plan: updatedSubscription.plan,
          status: updatedSubscription.status,
          startDate: updatedSubscription.startDate.toISOString(),
          endDate: updatedSubscription.endDate?.toISOString(),
          autoRenew: updatedSubscription.autoRenew
        }
      } else {
        // Créer un nouvel abonnement
        const newSubscription = await db.subscription.create({
          data: {
            clientId: clientProfile.id,
            plan,
            status: 'active',
            startDate: new Date(),
            endDate,
            autoRenew: true
          }
        })
        subscription = {
          id: newSubscription.id,
          plan: newSubscription.plan,
          status: newSubscription.status,
          startDate: newSubscription.startDate.toISOString(),
          endDate: newSubscription.endDate?.toISOString(),
          autoRenew: newSubscription.autoRenew
        }
      }

      // Créer un paiement pour l'abonnement
      await db.payment.create({
        data: {
          payerId: user.id,
          recipientId: 'system',
          amount: price,
          currency: 'EUR',
          type: 'SUBSCRIPTION',
          status: 'COMPLETED',
          description: `Abonnement ${plan} - ${new Date().toLocaleDateString('fr-FR')}`
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
      where: { userId: user.id },
      include: {
        subscription: true
      }
    })

    if (!clientProfile?.subscription) {
      return NextResponse.json({ error: 'No subscription to cancel' }, { status: 404 })
    }

    // Annuler l'abonnement (il reste actif jusqu'à la fin de la période)
    await db.subscription.update({
      where: { id: clientProfile.subscription.id },
      data: {
        autoRenew: false,
        status: 'cancelled'
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