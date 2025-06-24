import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema de validation pour création de route
const createRouteSchema = z.object({
  startLocation: z.object({
    address: z.string().min(10, 'Adresse de départ requise'),
    city: z.string().min(2, 'Ville requise'),
    postalCode: z.string().min(5, 'Code postal requis'),
    lat: z.number().optional(),
    lng: z.number().optional()
  }),
  endLocation: z.object({
    address: z.string().min(10, 'Adresse d\'arrivée requise'),
    city: z.string().min(2, 'Ville requise'),
    postalCode: z.string().min(5, 'Code postal requis'),
    lat: z.number().optional(),
    lng: z.number().optional()
  }),
  departureDate: z.string().datetime('Date de départ invalide'),
  arrivalDate: z.string().datetime('Date d\'arrivée invalide'),
  availableWeight: z.number().positive().optional(),
  availableVolume: z.number().positive().optional(),
  pricePerKg: z.number().positive().optional()
})

// GET - Liste des routes du livreur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const isActive = searchParams.get('active') === 'true'

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    const routes = await prisma.route.findMany({
      where: {
        delivererId: deliverer.id,
        ...(isActive !== undefined && { isActive })
      },
      include: {
        matchedAnnouncements: {
          include: {
            announcement: {
              select: {
                id: true,
                title: true,
                type: true,
                price: true,
                status: true
              }
            }
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { departureDate: 'desc' }
    })

    const total = await prisma.route.count({
      where: {
        delivererId: deliverer.id,
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json({
      routes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return handleApiError(error, 'fetching deliverer routes')
  }
}

// POST - Créer une nouvelle route
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createRouteSchema.parse(body)

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    if (deliverer.validationStatus !== 'APPROVED') {
      return NextResponse.json({ 
        error: 'Deliverer account not validated. Please complete document validation.' 
      }, { status: 403 })
    }

    // Vérifier que la date de départ est dans le futur
    const departureDate = new Date(validatedData.departureDate)
    if (departureDate <= new Date()) {
      return NextResponse.json({ 
        error: 'Departure date must be in the future' 
      }, { status: 400 })
    }

    // Vérifier que l'arrivée est après le départ
    const arrivalDate = new Date(validatedData.arrivalDate)
    if (arrivalDate <= departureDate) {
      return NextResponse.json({ 
        error: 'Arrival date must be after departure date' 
      }, { status: 400 })
    }

    const route = await prisma.route.create({
      data: {
        delivererId: deliverer.id,
        startLocation: validatedData.startLocation,
        endLocation: validatedData.endLocation,
        departureDate,
        arrivalDate,
        availableWeight: validatedData.availableWeight,
        availableVolume: validatedData.availableVolume,
        pricePerKg: validatedData.pricePerKg
      },
      include: {
        matchedAnnouncements: true
      }
    })

    // Déclencher le matching automatique avec les annonces
    // TODO: Implémenter le service de matching
    // await matchingService.findMatchingAnnouncements(route.id)

    return NextResponse.json(route, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'creating deliverer route')
  }
}