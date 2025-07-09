import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { z } from 'zod'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

const paymentSchema = z.object({
  paymentMethod: z.enum(['CARD', 'WALLET', 'BANK_TRANSFER']),
  amount: z.number().positive(),
  currency: z.string().default('EUR')
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 [POST /api/client/applications/[id]/pay] Paiement service par client')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'CLIENT') {
      console.log('❌ Utilisateur non authentifié ou non client')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Client authentifié:', user.id, user.role)

    const { id: applicationId } = await params
    const body = await request.json()
    
    try {
      const validatedData = paymentSchema.parse(body)
      console.log('✅ Données de paiement validées:', validatedData)
      
      // Vérifier que la candidature existe et a été acceptée
      const application = await db.serviceApplication.findUnique({
        where: { id: applicationId },
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

      // Vérifier que la candidature a été acceptée
      if (application.status !== 'ACCEPTED') {
        console.log('❌ Candidature non acceptée')
        return NextResponse.json({ 
          error: 'Cette candidature n\'a pas été acceptée' 
        }, { status: 400 })
      }

      // Vérifier que le service n'a pas déjà été payé
      const existingPayment = await db.payment.findFirst({
        where: {
          userId: user.id,
          type: 'SERVICE',
          metadata: {
            path: ['applicationId'],
            equals: applicationId
          }
        }
      })

      if (existingPayment) {
        console.log('❌ Service déjà payé')
        return NextResponse.json({ 
          error: 'Ce service a déjà été payé' 
        }, { status: 400 })
      }

      console.log('🔍 Création du paiement Stripe...')

      // Créer le PaymentIntent Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(validatedData.amount * 100), // Stripe utilise les centimes
        currency: validatedData.currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          applicationId: applicationId,
          serviceRequestId: application.serviceRequestId,
          providerId: application.providerId,
          proposedPrice: application.proposedPrice.toString(),
          estimatedDuration: application.estimatedDuration.toString(),
          type: 'service_payment'
        },
        description: `Paiement service - ${application.serviceRequest.title}`,
        receipt_email: user.email
      })

      // Créer l'enregistrement de paiement en base
      const payment = await db.payment.create({
        data: {
          userId: user.id,
          amount: validatedData.amount,
          currency: validatedData.currency,
          status: 'PENDING',
          type: 'SERVICE',
          paymentMethod: validatedData.paymentMethod,
          stripePaymentId: paymentIntent.id,
          metadata: {
            applicationId: applicationId,
            serviceRequestId: application.serviceRequestId,
            providerId: application.providerId,
            proposedPrice: application.proposedPrice,
            estimatedDuration: application.estimatedDuration,
            stripePaymentIntentId: paymentIntent.id
          }
        }
      })

      console.log('✅ PaymentIntent Stripe créé:', paymentIntent.id)
      console.log('✅ Paiement en base créé:', payment.id)

      // Mettre à jour le statut de la candidature (en attente de confirmation Stripe)
      await db.serviceApplication.update({
        where: { id: applicationId },
        data: {
          status: 'PAYMENT_PENDING'
        }
      })

      console.log('✅ Candidature mise à jour: PAYMENT_PENDING')

      // Créer une notification pour le prestataire
      await db.notification.create({
        data: {
          userId: application.provider.user.id,
          title: 'Paiement en cours',
          message: `Le client a initié le paiement pour le service "${application.serviceRequest.title}".`,
          type: 'SERVICE_PAYMENT_PENDING',
          data: {
            applicationId: applicationId,
            serviceRequestId: application.serviceRequestId,
            paymentId: payment.id,
            amount: validatedData.amount
          }
        }
      })

      console.log('✅ Notification créée pour le prestataire')

      // Créer une intervention pour le prestataire (en attente de confirmation)
      const intervention = await db.serviceIntervention.create({
        data: {
          providerId: application.providerId,
          clientId: user.id,
          serviceRequestId: application.serviceRequestId,
          title: application.serviceRequest.title,
          description: application.serviceRequest.description,
          scheduledDate: new Date(), // À adapter selon les besoins
          estimatedDuration: application.estimatedDuration,
          status: 'PAYMENT_PENDING',
          paymentId: payment.id
        }
      })

      console.log('✅ Intervention créée (en attente):', intervention.id)

      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status
        },
        stripe: {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret
        },
        intervention: {
          id: intervention.id,
          status: intervention.status
        }
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