import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour recherche de services
const searchServicesSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
  category: z.enum(['CLEANING', 'GARDENING', 'HANDYMAN', 'TUTORING', 'HEALTHCARE', 'BEAUTY', 'PET_CARE', 'OTHER']).optional(),
  city: z.string().optional(),
  priceMin: z.string().transform(Number).pipe(z.number().positive()).optional(),
  priceMax: z.string().transform(Number).pipe(z.number().positive()).optional(),
  rating: z.string().transform(Number).pipe(z.number().min(1).max(5)).optional(),
  sortBy: z.enum(['price', 'rating', 'distance', 'popularity']).default('rating'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional()
})

// Schema pour réservation de service
const bookServiceSchema = z.object({
  serviceId: z.string().cuid(),
  scheduledAt: z.string().datetime(),
  duration: z.number().min(30).max(480),
  address: z.string().min(10),
  city: z.string().min(2),
  specialRequests: z.string().max(500).optional(),
  contactPhone: z.string().min(10).optional()
})

// GET - Rechercher des services disponibles
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const validatedParams = searchServicesSchema.parse(Object.fromEntries(searchParams))

    // Construire les filtres
    const where: any = {
      isActive: true,
      provider: {
        validationStatus: 'APPROVED',
        isActive: true
      }
    }

    if (validatedParams.category) {
      where.category = validatedParams.category
    }

    if (validatedParams.priceMin || validatedParams.priceMax) {
      where.price = {}
      if (validatedParams.priceMin) where.price.gte = validatedParams.priceMin
      if (validatedParams.priceMax) where.price.lte = validatedParams.priceMax
    }

    if (validatedParams.search) {
      where.OR = [
        { name: { contains: validatedParams.search, mode: 'insensitive' } },
        { description: { contains: validatedParams.search, mode: 'insensitive' } }
      ]
    }

    const skip = (validatedParams.page - 1) * validatedParams.limit

    const [services, totalCount] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: validatedParams.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  city: true
                }
              },
              provider: {
                select: {
                  averageRating: true,
                  totalBookings: true
                }
              }
            }
          },
          _count: {
            select: { bookings: true }
          }
        }
      }),
      prisma.service.count({ where })
    ])

    return NextResponse.json({
      services: services.map(service => ({
        ...service,
        estimatedPrice: (service.price * 60) / 60, // prix par heure
        isPopular: service._count.bookings > 10
      })),
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / validatedParams.limit)
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'searching services')
  }
}

// POST - Réserver un service
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = bookServiceSchema.parse(body)

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Vérifier service disponible
    const service = await prisma.service.findUnique({
      where: { id: validatedData.serviceId },
      include: {
        provider: {
          include: { provider: true }
        }
      }
    })

    if (!service || !service.isActive) {
      return NextResponse.json({ error: 'Service not available' }, { status: 404 })
    }

    // Calculer prix final avec réduction abonnement
    const basePrice = (service.price * validatedData.duration) / 60
    const discounts = { FREE: 0, STARTER: 3, PREMIUM: 7 }
    const discount = discounts[client.subscriptionPlan as keyof typeof discounts] || 0
    const finalPrice = Math.round(basePrice * (1 - discount / 100) * 100) / 100

    // Créer la réservation
    const booking = await prisma.booking.create({
      data: {
        clientId: client.id,
        serviceId: service.id,
        scheduledAt: new Date(validatedData.scheduledAt),
        duration: validatedData.duration,
        address: validatedData.address,
        city: validatedData.city,
        specialRequests: validatedData.specialRequests,
        contactPhone: validatedData.contactPhone,
        finalPrice,
        status: 'PENDING'
      }
    })

    // TODO: Notifier le prestataire
    // await notifyProvider(service.providerId, booking)

    return NextResponse.json({
      success: true,
      message: 'Réservation créée avec succès',
      booking: {
        ...booking,
        confirmationCode: `ECO${booking.id.slice(-6).toUpperCase()}`
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'booking service')
  }
}