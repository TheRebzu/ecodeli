import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ApiResponse } from '@/lib/utils/api-response'
import { z } from 'zod'

const updateProfileSchema = z.object({
  businessName: z.string().min(2).optional(),
  description: z.string().max(1000).optional(),
  specializations: z.array(z.enum(['CLEANING', 'GARDENING', 'HANDYMAN', 'TUTORING', 'HEALTHCARE', 'BEAUTY', 'OTHER'])).optional(),
  serviceAreas: z.array(z.string()).optional(),
  hourlyRates: z.record(z.number().positive()).optional(),
  maxDistance: z.number().min(1).max(100).optional(),
  settings: z.object({
    autoAcceptBookings: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    publicProfile: z.boolean().optional()
  }).optional()
})

// GET - Provider profile
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
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true
          }
        },
        certifications: true,
        services: true,
        _count: {
          select: {
            bookings: true,
            reviews: true
          }
        }
      }
    })

    if (!provider) {
      return ApiResponse.notFound('Provider profile not found')
    }

    return ApiResponse.success(provider)
  } catch (error) {
    console.error('Error fetching provider profile:', error)
    return ApiResponse.serverError('Failed to fetch provider profile')
  }
}

// PUT - Update provider profile
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    if (session.user.role !== 'PROVIDER') {
      return ApiResponse.forbidden('Access restricted to providers')
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    const existingProvider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    })

    if (!existingProvider) {
      return ApiResponse.notFound('Provider profile not found')
    }

    const updatedProvider = await prisma.provider.update({
      where: { id: existingProvider.id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      }
    })

    return ApiResponse.success(updatedProvider, 'Profile updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest('Validation failed', error.errors)
    }

    console.error('Error updating provider profile:', error)
    return ApiResponse.serverError('Failed to update provider profile')
  }
}
