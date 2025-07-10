import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const zoneSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  postalCodes: z.array(z.string()).min(1, 'Au moins un code postal requis'),
  cities: z.array(z.string()).min(1, 'Au moins une ville requise'),
  priceStructure: z.object({
    basePrice: z.number().min(0, 'Prix de base positif requis'),
    pricePerKm: z.number().min(0, 'Prix par km positif requis'),
    freeThreshold: z.number().min(0, 'Seuil gratuit positif requis'),
    maxDistance: z.number().min(1, 'Distance maximale requise')
  }),
  timeSlots: z.array(z.object({
    day: z.string(),
    slots: z.array(z.object({
      start: z.string(),
      end: z.string(),
      capacity: z.number().min(1)
    }))
  })),
  specialRules: z.object({
    minOrderAmount: z.number().min(0),
    expressFee: z.number().min(0),
    bulkyItemFee: z.number().min(0),
    weekendSurcharge: z.number().min(0)
  })
})

// GET - Récupérer les zones de livraison du commerçant
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est un commerçant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer le merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: user.id },
      include: {
        deliveryZones: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Profil commerçant non trouvé' }, { status: 404 })
    }

    // Transformer les zones pour l'interface
    const zones = merchant.deliveryZones.map(zone => ({
      id: zone.id,
      name: zone.name,
      description: zone.description || '',
      isActive: zone.isActive,
      postalCodes: zone.postalCodes || [],
      cities: zone.cities || [],
      priceStructure: zone.priceStructure || {
        basePrice: 5.00,
        pricePerKm: 0.50,
        freeThreshold: 50.00,
        maxDistance: 25
      },
      timeSlots: zone.timeSlots || [],
      specialRules: zone.specialRules || {
        minOrderAmount: 20.00,
        expressFee: 3.00,
        bulkyItemFee: 5.00,
        weekendSurcharge: 2.00
      },
      stats: {
        totalDeliveries: zone.totalDeliveries || 0,
        averageRating: zone.averageRating || 0,
        lastDelivery: zone.lastDeliveryAt?.toISOString() || new Date().toISOString()
      }
    }))

    return NextResponse.json({ zones })

  } catch (error) {
    console.error('Erreur récupération zones merchant:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle zone de livraison
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = zoneSchema.parse(body)

    // Vérifier que le merchant existe
    const merchant = await prisma.merchant.findUnique({
      where: { userId: user.id }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Profil commerçant non trouvé' }, { status: 404 })
    }

    // Vérifier qu'il n'y a pas déjà une zone avec le même nom
    const existingZone = await prisma.merchantDeliveryZone.findFirst({
      where: {
        merchantId: merchant.id,
        name: validatedData.name
      }
    })

    if (existingZone) {
      return NextResponse.json(
        { error: 'Une zone avec ce nom existe déjà' },
        { status: 409 }
      )
    }

    // Créer la zone
    const zone = await prisma.merchantDeliveryZone.create({
      data: {
        merchantId: merchant.id,
        name: validatedData.name,
        description: validatedData.description,
        isActive: validatedData.isActive,
        postalCodes: validatedData.postalCodes,
        cities: validatedData.cities,
        priceStructure: validatedData.priceStructure,
        timeSlots: validatedData.timeSlots,
        specialRules: validatedData.specialRules,
        totalDeliveries: 0,
        averageRating: 0
      }
    })

    // Transformer pour l'interface
    const formattedZone = {
      id: zone.id,
      name: zone.name,
      description: zone.description || '',
      isActive: zone.isActive,
      postalCodes: zone.postalCodes || [],
      cities: zone.cities || [],
      priceStructure: zone.priceStructure,
      timeSlots: zone.timeSlots,
      specialRules: zone.specialRules,
      stats: {
        totalDeliveries: 0,
        averageRating: 0,
        lastDelivery: new Date().toISOString()
      }
    }

    return NextResponse.json(formattedZone, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erreur création zone:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 