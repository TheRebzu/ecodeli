import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { AvailabilityService } from '@/features/calendar/services/availability.service'

const recurringAvailabilitySchema = z.object({
  availabilities: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isActive: z.boolean().default(true)
  }))
})

const generateSlotsSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  serviceDuration: z.number().min(15).max(480).default(60)
})

const blockSlotsSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  reason: z.string().optional()
})

/**
 * GET - Récupérer les disponibilités du prestataire
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil prestataire
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Profil prestataire non trouvé' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    switch (action) {
      case 'recurring':
        // Récupérer les disponibilités récurrentes
        const recurringAvailabilities = await prisma.providerAvailability.findMany({
          where: { providerId: provider.id },
          orderBy: { dayOfWeek: 'asc' }
        })

        return NextResponse.json({
          success: true,
          availabilities: recurringAvailabilities
        })

      case 'slots':
        // Récupérer les créneaux pour une période
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'Dates de début et fin requises' },
            { status: 400 }
          )
        }

        const slots = await AvailabilityService.getAvailableSlots(
          provider.id,
          new Date(startDate),
          new Date(endDate)
        )

        return NextResponse.json({
          success: true,
          slots
        })

      case 'stats':
        // Statistiques de disponibilité
        const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1 + '')
        const year = parseInt(searchParams.get('year') || new Date().getFullYear() + '')

        const stats = await AvailabilityService.getAvailabilityStats(
          provider.id,
          month,
          year
        )

        return NextResponse.json({
          success: true,
          stats
        })

      case 'templates':
        // Templates prédéfinis
        const templates = AvailabilityService.getDefaultTemplates()

        return NextResponse.json({
          success: true,
          templates
        })

      default:
        // Récupérer toutes les disponibilités
        const [recurring, currentSlots] = await Promise.all([
          prisma.providerAvailability.findMany({
            where: { providerId: provider.id },
            orderBy: { dayOfWeek: 'asc' }
          }),
          startDate && endDate ? AvailabilityService.getAvailableSlots(
            provider.id,
            new Date(startDate),
            new Date(endDate)
          ) : []
        ])

        return NextResponse.json({
          success: true,
          recurring,
          slots: currentSlots
        })
    }

  } catch (error) {
    console.error('Error getting provider availability:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des disponibilités' },
      { status: 500 }
    )
  }
}

/**
 * POST - Créer/mettre à jour les disponibilités
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Profil prestataire non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'recurring':
        // Mettre à jour les disponibilités récurrentes
        const { availabilities } = recurringAvailabilitySchema.parse(body)

        await AvailabilityService.setRecurringAvailability(
          provider.id,
          availabilities
        )

        return NextResponse.json({
          success: true,
          message: 'Disponibilités récurrentes mises à jour'
        })

      case 'generate':
        // Générer les créneaux pour une période
        const generateData = generateSlotsSchema.parse(body)

        const slots = await AvailabilityService.generateTimeSlots(
          provider.id,
          generateData.startDate,
          generateData.endDate,
          generateData.serviceDuration
        )

        return NextResponse.json({
          success: true,
          message: `${slots.length} créneaux générés`,
          slots
        })

      case 'block':
        // Bloquer des créneaux
        const blockData = blockSlotsSchema.parse(body)

        await AvailabilityService.blockTimeSlots(
          provider.id,
          blockData.startDate,
          blockData.endDate,
          blockData.reason
        )

        return NextResponse.json({
          success: true,
          message: 'Créneaux bloqués avec succès'
        })

      case 'template':
        // Appliquer un template
        const { templateName } = z.object({
          templateName: z.string()
        }).parse(body)

        const templates = AvailabilityService.getDefaultTemplates()
        const template = templates.find(t => t.name === templateName)

        if (!template) {
          return NextResponse.json(
            { error: 'Template non trouvé' },
            { status: 404 }
          )
        }

        await AvailabilityService.applyAvailabilityTemplate(provider.id, template)

        return NextResponse.json({
          success: true,
          message: `Template "${templateName}" appliqué avec succès`
        })

      default:
        return NextResponse.json(
          { error: 'Action non spécifiée' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error updating provider availability:', error)
    
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
      { error: 'Erreur lors de la mise à jour des disponibilités' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Réserver ou libérer un créneau
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { timeSlotId, action, bookingId } = z.object({
      timeSlotId: z.string(),
      action: z.enum(['book', 'release']),
      bookingId: z.string().optional()
    }).parse(body)

    switch (action) {
      case 'book':
        if (!bookingId) {
          return NextResponse.json(
            { error: 'ID de réservation requis' },
            { status: 400 }
          )
        }

        await AvailabilityService.bookTimeSlot(timeSlotId, bookingId)

        return NextResponse.json({
          success: true,
          message: 'Créneau réservé avec succès'
        })

      case 'release':
        await AvailabilityService.releaseTimeSlot(timeSlotId)

        return NextResponse.json({
          success: true,
          message: 'Créneau libéré avec succès'
        })
    }

  } catch (error) {
    console.error('Error managing time slot:', error)
    
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
      { error: 'Erreur lors de la gestion du créneau' },
      { status: 500 }
    )
  }
}