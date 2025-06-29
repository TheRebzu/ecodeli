import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { z } from 'zod'

// Schema pour créer une route
const createRouteSchema = z.object({
  name: z.string().min(1, 'Le nom de la route est requis'),
  description: z.string().optional(),
  departureLocation: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number()
  }),
  arrivalLocation: z.object({
    address: z.string(), 
    latitude: z.number(),
    longitude: z.number()
  }),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(), // DAILY, WEEKLY, MONTHLY
  recurringDays: z.array(z.number()).optional(), // jours de la semaine
  maxCapacity: z.number().min(1).default(5),
  vehicleType: z.string().default('CAR'),
  pricePerKm: z.number().min(0).optional(),
  isActive: z.boolean().default(true)
})

// Schema pour filtres
const routesFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  isActive: z.coerce.boolean().optional(),
  isRecurring: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'departureTime', 'name']).default('departureTime'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

export async function GET(request: NextRequest) {
  try {
    console.log('🛣️ [GET /api/deliverer/routes] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil livreur
    const deliverer = await db.deliverer.findUnique({
      where: { userId: user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Profil livreur non trouvé' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const params = routesFiltersSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      isActive: searchParams.get('isActive'),
      isRecurring: searchParams.get('isRecurring'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    })

    // Construire la clause WHERE
    const where: any = {
      delivererId: deliverer.id
    }

    if (params.isActive !== undefined) where.isActive = params.isActive
    if (params.isRecurring !== undefined) where.isRecurring = params.isRecurring

    // Récupérer les routes
    const routes = await db.route.findMany({
      where,
      include: {
        announcements: {
          include: {
            announcement: {
              select: {
                id: true,
                title: true,
                type: true,
                basePrice: true,
                pickupAddress: true,
                deliveryAddress: true,
                status: true
              }
            }
          }
        },
        _count: {
          select: {
            announcements: true
          }
        }
      },
      orderBy: params.sortBy === 'createdAt' ? { createdAt: params.sortOrder } :
               params.sortBy === 'departureTime' ? { departureTime: params.sortOrder } :
               { name: params.sortOrder },
      skip: (params.page - 1) * params.limit,
      take: params.limit
    })

    // Formater les données
    const formattedRoutes = routes.map(route => ({
      id: route.id,
      name: route.name,
      description: route.description,
      departureLocation: route.departureLocation,
      arrivalLocation: route.arrivalLocation,
      departureTime: route.departureTime.toISOString(),
      arrivalTime: route.arrivalTime.toISOString(),
      isRecurring: route.isRecurring,
      recurringPattern: route.recurringPattern,
      recurringDays: route.recurringDays,
      maxCapacity: route.maxCapacity,
      vehicleType: route.vehicleType,
      pricePerKm: route.pricePerKm ? Number(route.pricePerKm) : null,
      isActive: route.isActive,
      createdAt: route.createdAt.toISOString(),
      
      // Statistiques
      currentLoad: route.announcements.length,
      availableSpots: route.maxCapacity - route.announcements.length,
      totalEarnings: route.announcements.reduce((sum, match) => 
        sum + Number(match.announcement.basePrice || 0), 0
      ),
      
      // Annonces associées
      announcements: route.announcements.map(match => ({
        id: match.announcement.id,
        title: match.announcement.title,
        type: match.announcement.type,
        price: Number(match.announcement.basePrice),
        pickupAddress: match.announcement.pickupAddress,
        deliveryAddress: match.announcement.deliveryAddress,
        status: match.announcement.status,
        matchScore: match.matchScore
      }))
    }))

    const total = await db.route.count({ where })

    // Statistiques
    const stats = {
      total,
      active: await db.route.count({ where: { ...where, isActive: true } }),
      recurring: await db.route.count({ where: { ...where, isRecurring: true } }),
      totalCapacity: routes.reduce((sum, route) => sum + route.maxCapacity, 0),
      totalMatches: routes.reduce((sum, route) => sum + route.announcements.length, 0)
    }

    console.log(`✅ Trouvé ${formattedRoutes.length} routes sur ${total} total`)

    return NextResponse.json({
      routes: formattedRoutes,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
        hasNext: params.page < Math.ceil(total / params.limit),
        hasPrev: params.page > 1
      },
      stats
    })

  } catch (error) {
    console.error('❌ Erreur récupération routes:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🛣️ [POST /api/deliverer/routes] Création de route')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil livreur
    const deliverer = await db.deliverer.findUnique({
      where: { userId: user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Profil livreur non trouvé' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = createRouteSchema.parse(body)

    // Créer la route
    const newRoute = await db.route.create({
      data: {
        delivererId: deliverer.id,
        name: validatedData.name,
        description: validatedData.description,
        departureLocation: validatedData.departureLocation as any,
        arrivalLocation: validatedData.arrivalLocation as any,
        departureTime: new Date(validatedData.departureTime),
        arrivalTime: new Date(validatedData.arrivalTime),
        isRecurring: validatedData.isRecurring,
        recurringPattern: validatedData.recurringPattern,
        recurringDays: validatedData.recurringDays,
        maxCapacity: validatedData.maxCapacity,
        vehicleType: validatedData.vehicleType,
        pricePerKm: validatedData.pricePerKm,
        isActive: validatedData.isActive
      }
    })

    console.log('✅ Route créée:', newRoute.id)

    return NextResponse.json({
      success: true,
      route: {
        id: newRoute.id,
        name: newRoute.name,
        description: newRoute.description,
        departureLocation: newRoute.departureLocation,
        arrivalLocation: newRoute.arrivalLocation,
        departureTime: newRoute.departureTime.toISOString(),
        arrivalTime: newRoute.arrivalTime.toISOString(),
        isRecurring: newRoute.isRecurring,
        recurringPattern: newRoute.recurringPattern,
        recurringDays: newRoute.recurringDays,
        maxCapacity: newRoute.maxCapacity,
        vehicleType: newRoute.vehicleType,
        pricePerKm: newRoute.pricePerKm ? Number(newRoute.pricePerKm) : null,
        isActive: newRoute.isActive,
        createdAt: newRoute.createdAt.toISOString()
      },
      message: 'Route créée avec succès'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('❌ Erreur création route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}