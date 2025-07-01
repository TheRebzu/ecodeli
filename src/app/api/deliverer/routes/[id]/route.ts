import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema de validation pour mise à jour de route
const updateRouteSchema = z.object({
  startLocation: z.object({
    address: z.string().min(10),
    city: z.string().min(2),
    postalCode: z.string().min(5),
    lat: z.number().optional(),
    lng: z.number().optional()
  }).optional(),
  endLocation: z.object({
    address: z.string().min(10),
    city: z.string().min(2),
    postalCode: z.string().min(5),
    lat: z.number().optional(),
    lng: z.number().optional()
  }).optional(),
  departureDate: z.string().datetime().optional(),
  arrivalDate: z.string().datetime().optional(),
  availableWeight: z.number().positive().optional(),
  availableVolume: z.number().positive().optional(),
  pricePerKg: z.number().positive().optional(),
  isActive: z.boolean().optional()
})

// GET - Récupérer une route spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    const route = await prisma.route.findFirst({
      where: {
        const { id } = await params;

        id: id,
        delivererId: deliverer.id
      },
      include: {
        matchedAnnouncements: {
          include: {
            announcement: {
              include: {
                author: {
                  select: {
                    id: true,
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                        phone: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    return NextResponse.json(route)
  } catch (error) {
    return handleApiError(error, 'fetching route')
  }
}

// PUT - Mettre à jour une route
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateRouteSchema.parse(body)

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Vérifier que la route appartient au livreur
    const existingRoute = await prisma.route.findFirst({
      where: {
        const { id } = await params;

        id: id,
        delivererId: deliverer.id
      }
    })

    if (!existingRoute) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    // Vérifier les contraintes de dates si elles sont modifiées
    if (validatedData.departureDate || validatedData.arrivalDate) {
      const departureDate = validatedData.departureDate 
        ? new Date(validatedData.departureDate)
        : existingRoute.departureDate
      const arrivalDate = validatedData.arrivalDate
        ? new Date(validatedData.arrivalDate)
        : existingRoute.arrivalDate

      if (departureDate <= new Date()) {
        return NextResponse.json({ 
          error: 'Departure date must be in the future' 
        }, { status: 400 })
      }

      if (arrivalDate <= departureDate) {
        return NextResponse.json({ 
          error: 'Arrival date must be after departure date' 
        }, { status: 400 })
      }
    }

    const updatedRoute = await prisma.route.update({
      where: { const { id } = await params;
 id: id },
      data: {
        ...validatedData,
        ...(validatedData.departureDate && { departureDate: new Date(validatedData.departureDate) }),
        ...(validatedData.arrivalDate && { arrivalDate: new Date(validatedData.arrivalDate) })
      },
      include: {
        matchedAnnouncements: {
          include: {
            announcement: true
          }
        }
      }
    })

    return NextResponse.json(updatedRoute)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'updating route')
  }
}

// DELETE - Supprimer une route
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Vérifier que la route appartient au livreur
    const existingRoute = await prisma.route.findFirst({
      where: {
        const { id } = await params;

        id: id,
        delivererId: deliverer.id
      }
    })

    if (!existingRoute) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }

    // Vérifier qu'il n'y a pas de livraisons en cours sur cette route
    const activeDeliveries = await prisma.delivery.count({
      where: {
        delivererId: session.user.id,
        status: {
          in: ['ACCEPTED', 'IN_TRANSIT']
        }
        // TODO: Ajouter relation route si nécessaire
      }
    })

    if (activeDeliveries > 0) {
      return NextResponse.json({
        error: 'Cannot delete route with active deliveries'
      }, { status: 400 })
    }

    await prisma.route.delete({
      where: { const { id } = await params;
 id: id }
    })

    return NextResponse.json({ message: 'Route deleted successfully' })
  } catch (error) {
    return handleApiError(error, 'deleting route')
  }
}