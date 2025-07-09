import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { z } from 'zod'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

const checkoutSessionSchema = z.object({
  applicationId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
  description: z.string(),
  paymentIntentId: z.string()
})

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [POST /api/client/applications/create-checkout-session] Création session Stripe Checkout')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'CLIENT') {
      console.log('❌ Utilisateur non authentifié ou non client')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Client authentifié:', user.id, user.role)

    const body = await request.json()
    
    try {
      const validatedData = checkoutSessionSchema.parse(body)
      console.log('✅ Données de session validées:', validatedData)
      
      // Vérifier que la candidature existe et appartient au client
      const application = await db.serviceApplication.findUnique({
        where: { id: validatedData.applicationId },
        include: {
          serviceRequest: {
            include: {
              author: true
            }
          },
          provider: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          }
        }
      })

      if (!application) {
        console.log('❌ Candidature non trouvée')
        return NextResponse.json({ error: 'Candidature non trouvée' }, { status: 404 })
      }

      // Vérifier que le client est bien l'auteur de la demande de service
      if (application.serviceRequest.authorId !== user.id) {
        console.log('❌ Accès non autorisé à cette candidature')
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
      }

      console.log('🔍 Création de la session Stripe Checkout...')

      // Créer la session Stripe Checkout
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: validatedData.currency.toLowerCase(),
              product_data: {
                name: validatedData.description,
                description: `Service avec ${application.provider.user.profile?.firstName} ${application.provider.user.profile?.lastName}`,
              },
              unit_amount: Math.round(validatedData.amount * 100), // Montant en centimes
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/fr/client/applications/payment-success?session_id={CHECKOUT_SESSION_ID}&application_id=${validatedData.applicationId}`,
        cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/fr/client/applications?cancelled=true`,
        metadata: {
          applicationId: validatedData.applicationId,
          serviceRequestId: application.serviceRequestId,
          providerId: application.providerId,
          paymentIntentId: validatedData.paymentIntentId,
          type: 'service_payment'
        },
        customer_email: user.email || undefined,
        billing_address_collection: 'required',
      })

      console.log('✅ Session Stripe Checkout créée:', session.id)

      return NextResponse.json({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id
      })

    } catch (validationError) {
      console.error('❌ Erreur de validation:', validationError)
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Données invalides', details: validationError.errors },
          { status: 400 }
        )
      }
      throw validationError
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 