import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { handleApiError, createError } from '@/lib/errors'

// Schéma de validation pour les créneaux de disponibilité
const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6), // 0 = Dimanche, 6 = Samedi
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // Format HH:MM
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  isAvailable: z.boolean().default(true),
  maxSlots: z.number().min(1).max(10).default(1), // Nombre max de rdv simultanés
})

const updateAvailabilitySchema = z.object({
  weeklySchedule: z.array(availabilitySlotSchema),
  vacations: z.array(z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    reason: z.string().optional()
  })).optional(),
  specialDates: z.array(z.object({
    date: z.string().datetime(),
    slots: z.array(availabilitySlotSchema),
    isExceptionDay: z.boolean().default(true)
  })).optional()
})

// GET - Récupérer les disponibilités du prestataire
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // Format: YYYY-MM
    const year = searchParams.get('year')

    // Récupérer les disponibilités générales
    const providerAvailability = await prisma.providerAvailability.findFirst({
      where: { userId: session.user.id },
      include: {
        weeklySchedule: true,
        vacations: {
          where: month ? {
            OR: [
              {
                startDate: {
                  gte: new Date(`${month}-01`),
                  lt: new Date(`${month}-31`)
                }
              },
              {
                endDate: {
                  gte: new Date(`${month}-01`),
                  lt: new Date(`${month}-31`)
                }
              }
            ]
          } : undefined
        },
        specialDates: {
          where: month ? {
            date: {
              gte: new Date(`${month}-01`),
              lt: new Date(`${month}-31`)
            }
          } : undefined
        }
      }
    })

    // Récupérer les rendez-vous existants pour calculer les créneaux disponibles
    const bookings = await prisma.serviceBooking.findMany({
      where: {
        providerId: session.user.id,
        scheduledDate: month ? {
          gte: new Date(`${month}-01`),
          lt: new Date(`${month}-31`)
        } : {
          gte: new Date(),
          lt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 3 mois
        },
        status: {
          in: ['CONFIRMED', 'IN_PROGRESS']
        }
      },
      select: {
        scheduledDate: true,
        duration: true,
        status: true
      }
    })

    // Générer le calendrier avec disponibilités
    const calendar = generateAvailabilityCalendar(
      providerAvailability,
      bookings,
      month || new Date().toISOString().slice(0, 7)
    )

    return NextResponse.json({
      success: true,
      data: {
        availability: providerAvailability,
        calendar,
        statistics: {
          totalSlots: calendar.reduce((sum, day) => sum + day.availableSlots, 0),
          bookedSlots: bookings.length,
          occupancyRate: bookings.length / Math.max(1, calendar.reduce((sum, day) => sum + day.totalSlots, 0))
        }
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// POST - Créer ou mettre à jour les disponibilités
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const body = await request.json()
    const validatedData = updateAvailabilitySchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      // Supprimer les anciennes disponibilités
      await tx.providerAvailability.deleteMany({
        where: { userId: session.user.id }
      })

      // Créer les nouvelles disponibilités
      const availability = await tx.providerAvailability.create({
        data: {
          userId: session.user.id,
          isActive: true,
          weeklySchedule: {
            create: validatedData.weeklySchedule.map(slot => ({
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              isAvailable: slot.isAvailable,
              maxSlots: slot.maxSlots
            }))
          },
          vacations: validatedData.vacations ? {
            create: validatedData.vacations.map(vacation => ({
              startDate: new Date(vacation.startDate),
              endDate: new Date(vacation.endDate),
              reason: vacation.reason
            }))
          } : undefined,
          specialDates: validatedData.specialDates ? {
            create: validatedData.specialDates.map(special => ({
              date: new Date(special.date),
              isExceptionDay: special.isExceptionDay,
              slots: {
                create: special.slots.map(slot => ({
                  dayOfWeek: slot.dayOfWeek,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  isAvailable: slot.isAvailable,
                  maxSlots: slot.maxSlots
                }))
              }
            }))
          } : undefined
        },
        include: {
          weeklySchedule: true,
          vacations: true,
          specialDates: {
            include: { slots: true }
          }
        }
      })

      return availability
    })

    return NextResponse.json({
      success: true,
      message: 'Disponibilités mises à jour avec succès',
      data: result
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// PUT - Mettre à jour des créneaux spécifiques
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'PROVIDER') {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const body = await request.json()

    switch (action) {
      case 'toggle-slot':
        const { slotId, isAvailable } = body
        await prisma.availabilitySlot.update({
          where: { id: slotId },
          data: { isAvailable }
        })
        break

      case 'add-vacation':
        const vacationData = z.object({
          startDate: z.string().datetime(),
          endDate: z.string().datetime(),
          reason: z.string().optional()
        }).parse(body)

        await prisma.providerVacation.create({
          data: {
            ...vacationData,
            startDate: new Date(vacationData.startDate),
            endDate: new Date(vacationData.endDate),
            providerId: session.user.id
          }
        })
        break

      case 'remove-vacation':
        const { vacationId } = body
        await prisma.providerVacation.delete({
          where: { id: vacationId }
        })
        break

      default:
        return handleApiError(createError.validation.required('action'))
    }

    return NextResponse.json({
      success: true,
      message: 'Modification effectuée avec succès'
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// Fonction utilitaire pour générer le calendrier
function generateAvailabilityCalendar(
  availability: any,
  bookings: any[],
  month: string
) {
  const [year, monthNum] = month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNum, 0).getDate()
  const calendar = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthNum - 1, day)
    const dayOfWeek = date.getDay()
    
    // Récupérer les créneaux du jour de la semaine
    const daySchedule = availability?.weeklySchedule?.filter(
      (slot: any) => slot.dayOfWeek === dayOfWeek && slot.isAvailable
    ) || []

    // Vérifier les jours d'exception
    const specialDay = availability?.specialDates?.find(
      (special: any) => new Date(special.date).getDate() === day
    )

    // Vérifier les vacances
    const isOnVacation = availability?.vacations?.some((vacation: any) => {
      const start = new Date(vacation.startDate)
      const end = new Date(vacation.endDate)
      return date >= start && date <= end
    })

    // Calculer les créneaux disponibles
    const effectiveSchedule = specialDay ? specialDay.slots : daySchedule
    const totalSlots = effectiveSchedule.reduce(
      (sum: number, slot: any) => sum + slot.maxSlots, 0
    )

    // Compter les réservations du jour
    const dayBookings = bookings.filter(booking => 
      new Date(booking.scheduledDate).getDate() === day
    ).length

    calendar.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek,
      totalSlots: isOnVacation ? 0 : totalSlots,
      bookedSlots: dayBookings,
      availableSlots: Math.max(0, totalSlots - dayBookings),
      isAvailable: !isOnVacation && totalSlots > dayBookings,
      isVacation: isOnVacation,
      isSpecialDay: !!specialDay,
      schedule: effectiveSchedule
    })
  }

  return calendar
}