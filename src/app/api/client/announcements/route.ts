import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Schema de validation pour création d'annonce
const createAnnouncementSchema = z.object({
  title: z.string().min(5, 'Le titre doit faire au moins 5 caractères'),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères'),
  serviceType: z.enum([
    'PACKAGE_DELIVERY',
    'PERSON_TRANSPORT', 
    'AIRPORT_TRANSFER',
    'SHOPPING',
    'INTERNATIONAL_PURCHASE',
    'PET_SITTING',
    'HOME_SERVICE',
    'CART_DROP'
  ]),
  pickupAddress: z.string().min(10, 'Adresse de récupération requise'),
  deliveryAddress: z.string().min(10, 'Adresse de livraison requise'),
  weight: z.number().positive('Le poids doit être positif').optional(),
  dimensions: z.string().optional(),
  pickupDate: z.string().datetime('Date de récupération invalide'),
  deliveryDeadline: z.string().datetime('Date limite de livraison invalide'),
  price: z.number().positive('Le prix doit être positif'),
  isFragile: z.boolean().default(false),
  requiresSpecialHandling: z.boolean().default(false),
  instructions: z.string().optional()
})

// GET - Liste des annonces du client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')

    const where = {
      authorId: session.user.id,
      ...(status && { status })
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: {
          _count: {
            select: { applications: true }
          },
          deliveries: {
            select: {
              id: true,
              status: true,
              deliverer: {
                select: {
                  id: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      avatar: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.announcement.count({ where })
    ])

    return NextResponse.json({
      data: announcements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erreur récupération annonces:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle annonce
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createAnnouncementSchema.parse(body)

    // Vérifier que la date de récupération est future
    const pickupDate = new Date(validatedData.pickupDate)
    const deliveryDeadline = new Date(validatedData.deliveryDeadline)
    const now = new Date()

    if (pickupDate <= now) {
      return NextResponse.json(
        { error: 'La date de récupération doit être future' },
        { status: 400 }
      )
    }

    if (deliveryDeadline <= pickupDate) {
      return NextResponse.json(
        { error: 'La date limite doit être après la récupération' },
        { status: 400 }
      )
    }

    // Récupérer l'abonnement client pour vérifier les limites
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId: session.user.id },
      include: { subscription: true }
    })

    if (!clientProfile) {
      return NextResponse.json(
        { error: 'Profil client non trouvé' },
        { status: 404 }
      )
    }

    // Calculer le prix selon l'abonnement
    let finalPrice = validatedData.price
    if (clientProfile.subscription) {
      const plan = clientProfile.subscription.plan
      if (plan === 'STARTER') {
        finalPrice = validatedData.price * 0.95 // 5% de réduction
      } else if (plan === 'PREMIUM') {
        finalPrice = validatedData.price * 0.91 // 9% de réduction
      }
    }

    // Créer l'annonce
    const announcement = await prisma.announcement.create({
      data: {
        ...validatedData,
        price: finalPrice,
        authorId: session.user.id,
        status: 'ACTIVE'
      },
      include: {
        _count: {
          select: { applications: true }
        }
      }
    })

    // TODO: Déclencher le matching automatique avec les trajets livreurs
    // TODO: Envoyer notifications OneSignal aux livreurs compatibles

    return NextResponse.json(announcement, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erreur création annonce:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
