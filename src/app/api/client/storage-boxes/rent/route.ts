import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { StorageBoxService } from '@/features/storage/services/storage-box.service'
import { StripeService } from '@/features/payments/services/stripe.service'
import { PaymentType } from '@prisma/client'
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const rentalSchema = z.object({
  storageBoxId: z.string().cuid(),
  duration: z.number().positive(),
  durationType: z.enum(['hours', 'days', 'weeks', 'months']),
  startDate: z.string(), // Date au format YYYY-MM-DD
  startTime: z.string(), // Heure au format HH:MM
  autoExtend: z.boolean().default(false),
  items: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    value: z.number().min(0),
    fragile: z.boolean(),
    category: z.string()
  })).default([])
})

/**
 * POST - Créer une location de box de stockage avec paiement Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le client avec les informations utilisateur
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
      include: { user: true }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Profil client non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = rentalSchema.parse(body)

    // Calculer la date de début complète
    const startDateTime = new Date(`${validatedData.startDate}T${validatedData.startTime}`)
    
    // Calculer la date de fin basée sur la durée
    let endDateTime: Date
    switch (validatedData.durationType) {
      case 'hours':
        endDateTime = new Date(startDateTime.getTime() + validatedData.duration * 60 * 60 * 1000)
        break
      case 'days':
        endDateTime = new Date(startDateTime.getTime() + validatedData.duration * 24 * 60 * 60 * 1000)
        break
      case 'weeks':
        endDateTime = new Date(startDateTime.getTime() + validatedData.duration * 7 * 24 * 60 * 60 * 1000)
        break
      case 'months':
        endDateTime = new Date(startDateTime.getTime() + validatedData.duration * 30 * 24 * 60 * 60 * 1000)
        break
      default:
        endDateTime = new Date(startDateTime.getTime() + validatedData.duration * 24 * 60 * 60 * 1000)
    }

    // Récupérer les informations de la storage box pour calculer le prix
    const storageBox = await prisma.storageBox.findUnique({
      where: { id: validatedData.storageBoxId },
      include: { location: true }
    })

    if (!storageBox) {
      return NextResponse.json(
        { error: 'Box de stockage non trouvée' },
        { status: 404 }
      )
    }

    if (!storageBox.isAvailable) {
      return NextResponse.json(
        { error: 'Box de stockage non disponible' },
        { status: 400 }
      )
    }

    // Calculer le prix total
    const daysDiff = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24))
    const totalPrice = daysDiff * storageBox.pricePerDay

    // Créer la session Stripe Checkout
    const sessionStripe = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Location box ${storageBox.boxNumber}`,
              description: `Location du ${startDateTime.toLocaleDateString()} au ${endDateTime.toLocaleDateString()}`
            },
            unit_amount: Math.round(totalPrice * 100), // en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/fr/client/storage?success=true&rentalId=${storageRental.id}`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/fr/client/storage?cancelled=true`,
      metadata: {
        storageBoxId: validatedData.storageBoxId,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        clientId: client.id,
        userId: session.user.id
      }
    })

    // Créer l'entrée Payment en base (optionnel, à ajuster selon le flow)
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        clientId: client.id,
        amount: totalPrice,
        currency: 'EUR',
        status: 'PENDING',
        type: PaymentType.STORAGE_RENTAL,
        paymentMethod: 'CARD',
        stripeSessionId: sessionStripe.id,
        metadata: {
          storageBoxId: validatedData.storageBoxId,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          items: validatedData.items
        }
      }
    })

    // Créer la location StorageBoxRental avec statut PENDING_PAYMENT
    const storageRental = await prisma.storageBoxRental.create({
      data: {
        clientId: client.id,
        storageBoxId: validatedData.storageBoxId,
        startDate: startDateTime,
        endDate: endDateTime,
        totalCost: totalPrice,
        status: 'PENDING_PAYMENT',
        autoExtend: validatedData.autoExtend,
        items: validatedData.items,
        paymentId: payment.id
      }
    })

    // Retourner l'URL Stripe Checkout au front
    return NextResponse.json({
      success: true,
      url: sessionStripe.url,
      rentalId: storageRental.id
    })

  } catch (error) {
    console.error('Error creating rental:', error)
    
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

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de la création de la location' },
      { status: 500 }
    )
  }
}