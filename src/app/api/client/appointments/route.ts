import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour créer un rendez-vous
const createAppointmentSchema = z.object({
  providerId: z.string().cuid(),
  serviceId: z.string().cuid(),
  scheduledAt: z.string().datetime(),
  duration: z.number().min(30).max(480), // 30 min à 8h
  address: z.string().min(10),
  city: z.string().min(2),
  postalCode: z.string().min(5),
  notes: z.string().max(1000).optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  contactPhone: z.string().min(10)
})

const updateAppointmentSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'RESCHEDULED']).optional()
})

const rateAppointmentSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().max(500).optional(),
  wouldRecommend: z.boolean().default(true),
  punctuality: z.number().min(1).max(5),
  quality: z.number().min(1).max(5),
  communication: z.number().min(1).max(5)
})

/**
 * GET - Liste des rendez-vous du client
 */
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'
    const providerId = searchParams.get('providerId')

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Construire les filtres
    const where: any = { clientId: client.id }
    
    if (status) where.status = status
    if (providerId) where.providerId = providerId
    if (upcoming) {
      where.scheduledAt = { gte: new Date() }
    }

    const [appointments, totalCount] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledAt: upcoming ? 'asc' : 'desc' },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              category: true,
              description: true,
              pricePerHour: true
            }
          },
          provider: {
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                  avatar: true
                }
              },
              providerProfile: {
                select: {
                  businessName: true,
                  rating: true,
                  completedBookings: true,
                  specialties: true,
                  isVerified: true
                }
              }
            }
          }
        }
      }),
      prisma.booking.count({ where })
    ])

    // Calculer les statistiques
    const stats = await calculateAppointmentStats(client.id)

    return NextResponse.json({
      appointments: appointments.map(appointment => ({
        id: appointment.id,
        status: appointment.status,
        scheduledAt: appointment.scheduledAt,
        duration: appointment.duration,
        totalPrice: appointment.totalPrice,
        address: appointment.address,
        city: appointment.city,
        postalCode: appointment.postalCode,
        notes: appointment.notes,
        urgency: appointment.urgency,
        contactPhone: appointment.contactPhone,
        rating: appointment.rating,
        review: appointment.review,
        createdAt: appointment.createdAt,
        service: appointment.service,
        provider: {
          id: appointment.provider.id,
          name: `${appointment.provider.profile?.firstName} ${appointment.provider.profile?.lastName}`,
          businessName: appointment.provider.providerProfile?.businessName,
          phone: appointment.provider.profile?.phone,
          avatar: appointment.provider.profile?.avatar,
          rating: appointment.provider.providerProfile?.rating || 0,
          completedBookings: appointment.provider.providerProfile?.completedBookings || 0,
          specialties: appointment.provider.providerProfile?.specialties || [],
          isVerified: appointment.provider.providerProfile?.isVerified || false
        },
        canCancel: canCancelAppointment(appointment.scheduledAt, appointment.status),
        canReschedule: canRescheduleAppointment(appointment.scheduledAt, appointment.status),
        timeUntilAppointment: getTimeUntilAppointment(appointment.scheduledAt)
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats
    })

  } catch (error) {
    return handleApiError(error, 'fetching appointments')
  }
}

/**
 * POST - Créer un nouveau rendez-vous
 */
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
    const validatedData = createAppointmentSchema.parse(body)

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
      include: { subscription: true }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Vérifier que le prestataire et le service existent
    const [provider, service] = await Promise.all([
      prisma.provider.findFirst({
        where: { 
          userId: validatedData.providerId,
          providerProfile: { isVerified: true, isAvailable: true }
        },
        include: { providerProfile: true }
      }),
      prisma.service.findFirst({
        where: {
          id: validatedData.serviceId,
          providerId: validatedData.providerId,
          isActive: true
        }
      })
    ])

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found or unavailable' },
        { status: 404 }
      )
    }

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found or inactive' },
        { status: 404 }
      )
    }

    // Vérifier la disponibilité du prestataire
    const scheduledAt = new Date(validatedData.scheduledAt)
    const endTime = new Date(scheduledAt.getTime() + validatedData.duration * 60000)

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        providerId: validatedData.providerId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        OR: [
          {
            scheduledAt: { lte: scheduledAt },
            endTime: { gt: scheduledAt }
          },
          {
            scheduledAt: { lt: endTime },
            endTime: { gte: endTime }
          },
          {
            scheduledAt: { gte: scheduledAt },
            endTime: { lte: endTime }
          }
        ]
      }
    })

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'Provider not available at this time' },
        { status: 409 }
      )
    }

    // Calculer le prix avec réduction d'abonnement
    const basePrice = service.pricePerHour * (validatedData.duration / 60)
    const subscriptionPlan = client.subscriptionPlan || 'FREE'
    const discounts = { FREE: 0, STARTER: 5, PREMIUM: 10 }
    const discount = discounts[subscriptionPlan as keyof typeof discounts]
    const finalPrice = Math.round(basePrice * (1 - discount / 100) * 100) / 100

    // Créer le rendez-vous
    const appointment = await prisma.booking.create({
      data: {
        clientId: client.id,
        providerId: validatedData.providerId,
        serviceId: validatedData.serviceId,
        scheduledAt,
        endTime,
        duration: validatedData.duration,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        notes: validatedData.notes,
        urgency: validatedData.urgency,
        contactPhone: validatedData.contactPhone,
        totalPrice: finalPrice,
        status: 'PENDING'
      },
      include: {
        service: true,
        provider: {
          include: {
            profile: true,
            providerProfile: true
          }
        }
      }
    })

    // TODO: Envoyer notifications
    // await notificationService.sendToProvider(validatedData.providerId, {
    //   type: 'NEW_APPOINTMENT',
    //   title: 'Nouveau rendez-vous',
    //   body: `Nouvelle demande pour ${service.name}`,
    //   data: { appointmentId: appointment.id }
    // })

    return NextResponse.json({
      success: true,
      message: 'Appointment created successfully',
      appointment: {
        id: appointment.id,
        status: appointment.status,
        scheduledAt: appointment.scheduledAt,
        totalPrice: appointment.totalPrice,
        service: appointment.service,
        provider: {
          name: `${appointment.provider.profile?.firstName} ${appointment.provider.profile?.lastName}`,
          businessName: appointment.provider.providerProfile?.businessName,
          phone: appointment.provider.profile?.phone
        }
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'creating appointment')
  }
}

/**
 * PUT - Modifier un rendez-vous
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('id')

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateAppointmentSchema.parse(body)

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Vérifier que le rendez-vous appartient au client
    const appointment = await prisma.booking.findFirst({
      where: {
        id: appointmentId,
        clientId: client.id
      }
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Vérifier si la modification est autorisée
    if (!canModifyAppointment(appointment.scheduledAt, appointment.status)) {
      return NextResponse.json(
        { error: 'Cannot modify this appointment' },
        { status: 400 }
      )
    }

    const updatedAppointment = await prisma.booking.update({
      where: { id: appointmentId },
      data: {
        ...validatedData,
        ...(validatedData.scheduledAt && {
          scheduledAt: new Date(validatedData.scheduledAt)
        })
      },
      include: {
        service: true,
        provider: {
          include: {
            profile: true,
            providerProfile: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'updating appointment')
  }
}

// Fonctions utilitaires
async function calculateAppointmentStats(clientId: string) {
  const [total, completed, upcoming, cancelled] = await Promise.all([
    prisma.booking.count({ where: { clientId } }),
    prisma.booking.count({ where: { clientId, status: 'COMPLETED' } }),
    prisma.booking.count({ 
      where: { 
        clientId, 
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { gte: new Date() }
      } 
    }),
    prisma.booking.count({ where: { clientId, status: 'CANCELLED' } })
  ])

  return { total, completed, upcoming, cancelled }
}

function canCancelAppointment(scheduledAt: Date, status: string): boolean {
  const now = new Date()
  const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60)
  return ['PENDING', 'CONFIRMED'].includes(status) && hoursUntil > 24
}

function canRescheduleAppointment(scheduledAt: Date, status: string): boolean {
  const now = new Date()
  const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60)
  return ['PENDING', 'CONFIRMED'].includes(status) && hoursUntil > 48
}

function canModifyAppointment(scheduledAt: Date, status: string): boolean {
  const now = new Date()
  const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60)
  return ['PENDING', 'CONFIRMED'].includes(status) && hoursUntil > 2
}

function getTimeUntilAppointment(scheduledAt: Date): string {
  const now = new Date()
  const diff = scheduledAt.getTime() - now.getTime()
  
  if (diff < 0) return 'Past'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `${days}j ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes}min`
} 