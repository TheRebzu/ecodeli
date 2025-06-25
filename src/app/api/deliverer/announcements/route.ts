import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour créer une annonce de trajet livreur
const createRouteAnnouncementSchema = z.object({
  title: z.string().min(10, 'Le titre doit faire au moins 10 caractères'),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères'),
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
  availableWeight: z.number().positive('Poids disponible doit être positif').max(100, 'Maximum 100kg'),
  availableVolume: z.number().positive('Volume disponible doit être positif').max(2, 'Maximum 2m³'),
  pricePerKg: z.number().positive('Prix par kg doit être positif').max(10, 'Maximum 10€/kg'),
  vehicleType: z.enum(['CAR', 'VAN', 'TRUCK', 'MOTORBIKE', 'BIKE']),
  specialConditions: z.string().max(500).optional(),
  recurringDays: z.array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])).optional()
})

// GET - Liste des annonces/trajets du livreur  
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Construire les filtres
    const where: any = {
      delivererId: deliverer.id
    }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.departureDate = {}
      if (dateFrom) where.departureDate.gte = new Date(dateFrom)
      if (dateTo) where.departureDate.lte = new Date(dateTo)
    }

    // Récupérer les annonces avec pagination
    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        include: {
          matchedAnnouncements: {
            include: {
              announcement: {
                include: {
                  client: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          email: true,
                          profile: {
                            select: {
                              firstName: true,
                              lastName: true,
                              phone: true,
                              rating: true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { departureDate: 'desc' }
      }),
      prisma.route.count({ where })
    ])

    return NextResponse.json({
      routes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statistics: {
        activeRoutes: await prisma.route.count({
          where: { delivererId: deliverer.id, status: 'ACTIVE' }
        }),
        completedRoutes: await prisma.route.count({
          where: { delivererId: deliverer.id, status: 'COMPLETED' }
        }),
        totalMatches: await prisma.routeAnnouncementMatch.count({
          where: { 
            route: { delivererId: deliverer.id },
            status: 'ACCEPTED'
          }
        })
      }
    })
  } catch (error) {
    return handleApiError(error, 'fetching deliverer announcements')
  }
}

// POST - Créer une nouvelle annonce de trajet
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createRouteAnnouncementSchema.parse(body)

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

    // Vérifier que les dates sont cohérentes
    const departureDate = new Date(validatedData.departureDate)
    const arrivalDate = new Date(validatedData.arrivalDate)

    if (departureDate >= arrivalDate) {
      return NextResponse.json({ 
        error: 'Arrival date must be after departure date' 
      }, { status: 400 })
    }

    if (departureDate <= new Date()) {
      return NextResponse.json({ 
        error: 'Departure date must be in the future' 
      }, { status: 400 })
    }

    // Créer la nouvelle annonce/route
    const route = await prisma.route.create({
      data: {
        delivererId: deliverer.id,
        title: validatedData.title,
        description: validatedData.description,
        startAddress: validatedData.startLocation.address,
        startCity: validatedData.startLocation.city,
        startPostalCode: validatedData.startLocation.postalCode,
        startLat: validatedData.startLocation.lat,
        startLng: validatedData.startLocation.lng,
        endAddress: validatedData.endLocation.address,
        endCity: validatedData.endLocation.city,
        endPostalCode: validatedData.endLocation.postalCode,
        endLat: validatedData.endLocation.lat,
        endLng: validatedData.endLocation.lng,
        departureDate,
        arrivalDate,
        availableWeight: validatedData.availableWeight,
        availableVolume: validatedData.availableVolume,
        pricePerKg: validatedData.pricePerKg,
        vehicleType: validatedData.vehicleType,
        specialConditions: validatedData.specialConditions,
        recurringDays: validatedData.recurringDays,
        status: 'ACTIVE'
      },
      include: {
        deliverer: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    rating: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Déclencher le matching automatique avec les annonces existantes
    // TODO: Implémenter le service de matching
    // await matchingService.findMatchingAnnouncements(route.id)

    return NextResponse.json({
      route,
      message: 'Route announcement created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return handleApiError(error, 'creating route announcement')
  }
}