import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ApiResponse } from '@/lib/utils/api-response'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val)).catch(1),
  limit: z.string().transform(val => parseInt(val)).catch(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'status', 'client']).catch('date'),
  sortOrder: z.enum(['asc', 'desc']).catch('desc')
})

const updateBookingSchema = z.object({
  status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  notes: z.string().optional()
})

// GET - Provider bookings
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    if (session.user.role !== 'PROVIDER') {
      return ApiResponse.forbidden('Access restricted to providers')
    }

    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    })

    if (!provider) {
      return ApiResponse.notFound('Provider not found')
    }

    const bookings = await prisma.booking.findMany({
      where: {
        service: {
          providerId: provider.id
        }
      },
      include: {
        client: {
          select: {
            id: true,
            user: {
              select: {
                email: true,
                profile: true
              }
            }
          }
        },
        service: true,
        review: true
      },
      orderBy: { scheduledAt: 'desc' }
    })

    return ApiResponse.success({ bookings })
  } catch (error) {
    console.error('Error fetching provider bookings:', error)
    return ApiResponse.serverError('Failed to fetch bookings')
  }
}

// PUT - Update booking status
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    if (session.user.role !== 'PROVIDER') {
      return ApiResponse.forbidden('Access restricted to providers')
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return ApiResponse.badRequest('Booking ID is required')
    }

    const body = await request.json()
    const validatedData = updateBookingSchema.parse(body)

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: validatedData.status,
        notes: validatedData.notes,
        completedAt: validatedData.status === 'COMPLETED' ? new Date() : undefined,
        updatedAt: new Date()
      }
    })

    return ApiResponse.success(updatedBooking, 'Booking updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest('Validation failed', error.errors)
    }

    console.error('Error updating booking:', error)
    return ApiResponse.serverError('Failed to update booking')
  }
}
