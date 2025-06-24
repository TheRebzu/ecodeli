import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Plans d'abonnement EcoDeli selon les spécifications
const SUBSCRIPTION_PLANS = {
  FREE: {
    price: 0,
    insurance: 0, // €
    discount: 0, // %
    priorityShipping: 15, // % de surcoût
    name: 'Free'
  },
  STARTER: {
    price: 9.90, // €/mois
    insurance: 115, // €/envoi max
    discount: 5, // %
    priorityShipping: 5, // % de surcoût
    permanentDiscount: 5, // % sur petits colis
    name: 'Starter'
  },
  PREMIUM: {
    price: 19.99, // €/mois
    insurance: 3000, // €/envoi max (75€ si dépassement)
    discount: 9, // %
    priorityShipping: 3, // envois offerts/mois puis +5%
    firstShipmentFree: true, // si < 150€
    permanentDiscount: 5, // % sur tous colis
    name: 'Premium'
  }
} as const

const subscriptionSchema = z.object({
  plan: z.enum(['FREE', 'STARTER', 'PREMIUM']),
  paymentMethodId: z.string().optional() // Stripe payment method
})

/**
 * GET - Récupérer l'abonnement actuel
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer l'abonnement client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
      select: {
        subscriptionPlan: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Profil client non trouvé' }, { status: 404 })
    }

    const currentPlan = SUBSCRIPTION_PLANS[client.subscriptionPlan]

    return NextResponse.json({
      currentPlan: {
        type: client.subscriptionPlan,
        ...currentPlan,
        startDate: client.subscriptionStart,
        endDate: client.subscriptionEnd,
        isActive: !client.subscriptionEnd || client.subscriptionEnd > new Date()
      },
      availablePlans: SUBSCRIPTION_PLANS,
      userInfo: client.user
    })

  } catch (error) {
    console.error('Error getting subscription:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST - Changer d'abonnement
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { plan, paymentMethodId } = subscriptionSchema.parse(body)

    // Récupérer le client actuel
    const currentClient = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentClient) {
      return NextResponse.json({ error: 'Profil client non trouvé' }, { status: 404 })
    }

    // Si c'est le même plan, pas de changement
    if (currentClient.subscriptionPlan === plan) {
      return NextResponse.json({
        success: true,
        message: `Vous êtes déjà abonné au plan ${SUBSCRIPTION_PLANS[plan].name}`
      })
    }

    const newPlan = SUBSCRIPTION_PLANS[plan]
    let updateData: any = {
      subscriptionPlan: plan,
      subscriptionStart: new Date()
    }

    // Gestion selon le nouveau plan
    if (plan === 'FREE') {
      // Rétrogradation vers Free : pas de paiement requis
      updateData.subscriptionEnd = null
      
    } else {
      // Upgrade vers Starter ou Premium : paiement requis
      if (!paymentMethodId) {
        return NextResponse.json(
          { error: 'Méthode de paiement requise pour les plans payants' },
          { status: 400 }
        )
      }

      // TODO: Intégrer Stripe pour créer l'abonnement récurrent
      // const stripeSubscription = await stripe.subscriptions.create({...})
      
      // Pour l'instant, simuler l'abonnement
      updateData.subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
    }

    // Mettre à jour l'abonnement
    await prisma.client.update({
      where: { userId: session.user.id },
      data: updateData
    })

    // Log de l'activité
    console.log(`Client ${session.user.id} upgraded to ${plan} plan`)

    return NextResponse.json({
      success: true,
      message: `Abonnement ${newPlan.name} activé avec succès !`,
      newPlan: {
        type: plan,
        ...newPlan,
        startDate: updateData.subscriptionStart,
        endDate: updateData.subscriptionEnd
      }
    })

  } catch (error) {
    console.error('Error changing subscription:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: error.errors.map(e => ({ 
            field: e.path.join('.'), 
            message: e.message 
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Annuler l'abonnement (retour au Free)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Annuler l'abonnement (retour au plan gratuit)
    await prisma.client.update({
      where: { userId: session.user.id },
      data: {
        subscriptionPlan: 'FREE',
        subscriptionEnd: null
      }
    })

    // Log de l'activité
    console.log(`Client ${session.user.id} canceled subscription`)

    return NextResponse.json({
      success: true,
      message: 'Abonnement annulé. Vous êtes maintenant sur le plan gratuit.'
    })

  } catch (error) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 