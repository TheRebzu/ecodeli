import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Schema pour créer une réservation
const createBookingSchema = z.object({
  serviceId: z.string().cuid('ID service invalide'),
  providerId: z.string().cuid('ID prestataire invalide'),
  scheduledAt: z.string().datetime('Date/heure invalide'),
  duration: z.number().min(30, 'Durée minimum 30 minutes').max(480, 'Durée maximum 8 heures'),
  notes: z.string().max(1000, 'Notes trop longues').optional(),
  address: z.string().min(10, 'Adresse complète requise'),
  phone: z.string().min(10, 'Numéro de téléphone requis')
})

const updateBookingSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
  notes: z.string().max(1000).optional(),
  rating: z.number().min(1).max(5).optional(),
  review: z.string().max(500).optional()
})

/**
 * GET - Liste des réservations du client
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
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

    const skip = (page - 1) * limit

    // Construire les filtres
    const where: any = {
      clientId: session.user.id
    }

    if (status && ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      where.status = status
    }

    // Récupérer les réservations
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: {
            include: {
              provider: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  providerProfile: {
                    select: {
                      businessName: true,
                      rating: true,
                      completedBookings: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.booking.count({ where })
    ])

    return NextResponse.json({
      bookings: bookings.map(booking => ({
        id: booking.id,
        status: booking.status,
        scheduledAt: booking.scheduledAt,
        duration: booking.duration,
        totalPrice: booking.totalPrice,
        address: booking.address,
        notes: booking.notes,
        rating: booking.rating,
        review: booking.review,
        createdAt: booking.createdAt,
        service: {
          id: booking.service.id,
          name: booking.service.name,
          description: booking.service.description,
          category: booking.service.category,
          pricePerHour: booking.service.pricePerHour
        },
        provider: {
          id: booking.service.provider.id,
          name: `${booking.service.provider.firstName} ${booking.service.provider.lastName}`,
          businessName: booking.service.provider.providerProfile?.businessName,
          rating: booking.service.provider.providerProfile?.rating || 0,
          completedBookings: booking.service.provider.providerProfile?.completedBookings || 0
        }
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST - Créer une nouvelle réservation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const data = createBookingSchema.parse(body)

    // Vérifier que le service existe et est actif
    const service = await prisma.service.findFirst({
      where: {
        id: data.serviceId,
        providerId: data.providerId,
        isActive: true
      },
      include: {
        provider: {
          select: {
            id: true,
            providerProfile: {
              select: {
                isVerified: true,
                isAvailable: true
              }
            }
          }
        }
      }
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Service non trouvé ou inactif' },
        { status: 404 }
      )
    }

    if (!service.provider.providerProfile?.isVerified) {
      return NextResponse.json(
        { error: 'Prestataire non vérifié' },
        { status: 400 }
      )
    }

    if (!service.provider.providerProfile?.isAvailable) {
      return NextResponse.json(
        { error: 'Prestataire indisponible' },
        { status: 400 }
      )
    }

    // Vérifier la disponibilité du prestataire
    const scheduledDate = new Date(data.scheduledAt)
    const endDate = new Date(scheduledDate.getTime() + data.duration * 60000)

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        service: {
          providerId: data.providerId
        },
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        OR: [
          {
            scheduledAt: { lte: scheduledDate },
            AND: {
              scheduledAt: {
                gte: new Date(scheduledDate.getTime() - data.duration * 60000)
              }
            }
          }
        ]
      }
    })

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'Créneau non disponible' },
        { status: 409 }
      )
    }

    // Calculer le prix total
    const pricePerMinute = service.pricePerHour / 60
    const totalPrice = pricePerMinute * data.duration

    // Créer la réservation
    const booking = await prisma.booking.create({
      data: {
        clientId: session.user.id,
        serviceId: data.serviceId,
        scheduledAt: scheduledDate,
        duration: data.duration,
        totalPrice,
        address: data.address,
        phone: data.phone,
        notes: data.notes,
        status: 'PENDING'
      },
      include: {
        service: {
          include: {
            provider: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    // TODO: Envoyer notification au prestataire
    // TODO: Créer l'intention de paiement Stripe

    console.log(`Nouvelle réservation créée: ${booking.id} pour le client ${session.user.id}`)

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        scheduledAt: booking.scheduledAt,
        duration: booking.duration,
        totalPrice: booking.totalPrice,
        service: booking.service,
        provider: booking.service.provider
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating booking:', error)

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

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
