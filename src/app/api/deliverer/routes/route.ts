import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { z } from 'zod'

// Schema pour créer une route
const createRouteSchema = z.object({
  name: z.string().min(1, 'Le nom de la route est requis'),
  description: z.string().optional(),
  startAddress: z.string().min(1, 'L\'adresse de départ est requise'),
  startLatitude: z.number(),
  startLongitude: z.number(),
  endAddress: z.string().min(1, 'L\'adresse d\'arrivée est requise'),
  endLatitude: z.number(),
  endLongitude: z.number(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(), // DAILY, WEEKLY, MONTHLY
  maxPackages: z.number().min(1).default(5),
  maxWeight: z.number().min(0).optional(),
  maxVolume: z.number().min(0).optional(),
  vehicleType: z.string().default('CAR'),
  isActive: z.boolean().default(true),
  autoAccept: z.boolean().default(false),
  maxDetour: z.number().min(0).default(5.0),
  acceptedTypes: z.array(z.string()).default([])
})

// Schema pour filtres
const routesFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  isActive: z.coerce.boolean().optional(),
  isRecurring: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'startDate', 'title']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

export async function GET(request: NextRequest) {
  try {
    console.log('🛣️ [GET /api/deliverer/routes] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      delivererId: user.id
    }

    if ((await params).isActive !== undefined) where.isActive = (await params).isActive
    if ((await params).isRecurring !== undefined) where.isRecurring = (await params).isRecurring

    // Récupérer les routes
    const routes = await db.delivererRoute.findMany({
      where,
      include: {
        matches: {
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
            matches: true
          }
        }
      },
      orderBy: (await params).sortBy === 'createdAt' ? { createdAt: (await params).sortOrder } :
               (await params).sortBy === 'startDate' ? { startDate: (await params).sortOrder } :
               { title: (await params).sortOrder },
      skip: ((await params).page - 1) * (await params).limit,
      take: (await params).limit
    })

    // Formater les données
    const formattedRoutes = routes.map(route => ({
      id: route.id,
      name: route.title || 'Route sans titre',
      description: route.description,
      departureLocation: {
        address: route.startAddress,
        latitude: route.startLatitude,
        longitude: route.startLongitude
      },
      arrivalLocation: {
        address: route.endAddress,
        latitude: route.endLatitude,
        longitude: route.endLongitude
      },
      departureTime: route.startDate.toISOString(),
      arrivalTime: route.endDate.toISOString(),
      isRecurring: route.isRecurring,
      recurringPattern: route.recurringPattern,
      maxCapacity: route.maxPackages,
      vehicleType: route.vehicleType,
      isActive: route.isActive,
      createdAt: route.createdAt.toISOString(),
      
      // Statistiques
      currentLoad: route.matches.length,
      availableSpots: route.maxPackages - route.matches.length,
      totalEarnings: route.matches.reduce((sum, match) => 
        sum + Number(match.announcement.basePrice || 0), 0
      ),
      
      // Annonces associées
      announcements: route.matches.map(match => ({
        id: match.announcement.id,
        title: match.announcement.title,
        type: match.announcement.type,
        price: Number(match.announcement.basePrice),
        pickupAddress: match.announcement.pickupAddress,
        deliveryAddress: match.announcement.deliveryAddress,
        status: match.announcement.status,
        matchScore: match.globalScore
      }))
    }))

    const total = await db.delivererRoute.count({ where })

    // Statistiques
    const stats = {
      total,
      active: await db.delivererRoute.count({ where: { ...where, isActive: true } }),
      recurring: await db.delivererRoute.count({ where: { ...where, isRecurring: true } }),
      totalCapacity: routes.reduce((sum, route) => sum + route.maxPackages, 0),
      totalMatches: routes.reduce((sum, route) => sum + route.matches.length, 0)
    }

    console.log(`✅ Trouvé ${formattedRoutes.length} routes sur ${total} total`)

    return NextResponse.json({
      routes: formattedRoutes,
      pagination: {
        page: (await params).page,
        limit: (await params).limit,
        total,
        totalPages: Math.ceil(total / (await params).limit),
        hasNext: (await params).page < Math.ceil(total / (await params).limit),
        hasPrev: (await params).page > 1
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

    const body = await request.json()
    const validatedData = createRouteSchema.parse(body)

    // Créer la route
    const newRoute = await db.delivererRoute.create({
      data: {
        delivererId: user.id,
        title: validatedData.name,
        description: validatedData.description,
        startAddress: validatedData.startAddress,
        startLatitude: validatedData.startLatitude,
        startLongitude: validatedData.startLongitude,
        endAddress: validatedData.endAddress,
        endLatitude: validatedData.endLatitude,
        endLongitude: validatedData.endLongitude,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        isRecurring: validatedData.isRecurring,
        recurringPattern: validatedData.recurringPattern,
        maxPackages: validatedData.maxPackages,
        maxWeight: validatedData.maxWeight,
        maxVolume: validatedData.maxVolume,
        vehicleType: validatedData.vehicleType,
        isActive: validatedData.isActive,
        autoAccept: validatedData.autoAccept,
        maxDetour: validatedData.maxDetour,
        acceptedTypes: validatedData.acceptedTypes as any
      }
    })

    console.log('✅ Route créée:', newRoute.id)

    return NextResponse.json({
      success: true,
      route: {
        id: newRoute.id,
        name: newRoute.title,
        description: newRoute.description,
        departureLocation: {
          address: newRoute.startAddress,
          latitude: newRoute.startLatitude,
          longitude: newRoute.startLongitude
        },
        arrivalLocation: {
          address: newRoute.endAddress,
          latitude: newRoute.endLatitude,
          longitude: newRoute.endLongitude
        },
        departureTime: newRoute.startDate.toISOString(),
        arrivalTime: newRoute.endDate.toISOString(),
        isRecurring: newRoute.isRecurring,
        recurringPattern: newRoute.recurringPattern,
        maxCapacity: newRoute.maxPackages,
        vehicleType: newRoute.vehicleType,
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