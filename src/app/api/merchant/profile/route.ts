import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ApiResponse } from '@/lib/utils/api-response'
import { z } from 'zod'

const updateProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').optional(),
  businessType: z.enum(['RETAIL', 'RESTAURANT', 'SERVICE', 'E_COMMERCE', 'OTHER']).optional(),
  siretNumber: z.string().regex(/^\d{14}$/, 'SIRET must be 14 digits').optional(),
  vatNumber: z.string().optional(),
  businessAddress: z.string().min(10, 'Business address must be at least 10 characters').optional(),
  businessCity: z.string().min(2, 'City must be at least 2 characters').optional(),
  businessPostalCode: z.string().regex(/^\d{5}$/, 'Postal code must be 5 digits').optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email('Invalid email format').optional(),
  website: z.string().url('Invalid URL format').optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  logoUrl: z.string().url('Invalid logo URL').optional(),
  bankAccountIban: z.string().optional(),
  bankAccountBic: z.string().optional(),
  deliveryZones: z.array(z.string()).optional(),
  operatingHours: z.record(z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    close: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    isOpen: z.boolean()
  })).optional(),
  settings: z.object({
    autoAcceptOrders: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    publicProfile: z.boolean().optional()
  }).optional()
})

// GET - Merchant profile
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    if (session.user.role !== 'MERCHANT') {
      return ApiResponse.forbidden('Access restricted to merchants')
    }

    // Get merchant profile with contract and statistics
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
                verified: true
              }
            }
          }
        },
        contract: {
          select: {
            id: true,
            type: true,
            status: true,
            commissionRate: true,
            signedAt: true,
            validUntil: true
          }
        },
        _count: {
          select: {
            announcements: true,
            cartDropConfigurations: true,
            orders: true
          }
        }
      }
    })

    if (!merchant) {
      return ApiResponse.notFound('Merchant profile not found')
    }

    // Get recent performance stats
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const monthlyStats = await prisma.order.aggregate({
      where: {
        merchantId: merchant.id,
        createdAt: {
          gte: currentMonth
        }
      },
      _sum: {
        totalAmount: true,
        deliveryFee: true
      },
      _count: {
        id: true
      }
    })

    // Get cart drop stats
    const cartDropStats = await prisma.cartDropConfiguration.findMany({
      where: {
        merchantId: merchant.id
      },
      select: {
        isActive: true,
        _count: {
          select: {
            requests: true
          }
        }
      }
    })

    const totalCartDropRequests = cartDropStats.reduce((sum, config) => 
      sum + config._count.requests, 0
    )

    const activeCartDropConfigs = cartDropStats.filter(config => config.isActive).length

    const profile = {
      id: merchant.id,
      businessName: merchant.businessName,
      businessType: merchant.businessType,
      siretNumber: merchant.siretNumber,
      vatNumber: merchant.vatNumber,
      businessAddress: merchant.businessAddress,
      businessCity: merchant.businessCity,
      businessPostalCode: merchant.businessPostalCode,
      businessPhone: merchant.businessPhone,
      businessEmail: merchant.businessEmail,
      website: merchant.website,
      description: merchant.description,
      logoUrl: merchant.logoUrl,
      bankAccountIban: merchant.bankAccountIban,
      bankAccountBic: merchant.bankAccountBic,
      deliveryZones: merchant.deliveryZones,
      operatingHours: merchant.operatingHours,
      settings: merchant.settings,
      user: merchant.user,
      contract: merchant.contract,
      statistics: {
        totalAnnouncements: merchant._count.announcements,
        totalCartDropConfigs: merchant._count.cartDropConfigurations,
        totalOrders: merchant._count.orders,
        activeCartDropConfigs,
        totalCartDropRequests,
        monthlyOrders: monthlyStats._count.id,
        monthlyRevenue: monthlyStats._sum.totalAmount || 0,
        monthlyDeliveryFees: monthlyStats._sum.deliveryFee || 0
      },
      createdAt: merchant.createdAt,
      updatedAt: merchant.updatedAt
    }

    return ApiResponse.success(profile)
  } catch (error) {
    console.error('Error fetching merchant profile:', error)
    return ApiResponse.serverError('Failed to fetch merchant profile')
  }
}

// PUT - Update merchant profile
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    if (session.user.role !== 'MERCHANT') {
      return ApiResponse.forbidden('Access restricted to merchants')
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // Check if merchant exists
    const existingMerchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id }
    })

    if (!existingMerchant) {
      return ApiResponse.notFound('Merchant profile not found')
    }

    // Check for SIRET uniqueness if provided
    if (validatedData.siretNumber && validatedData.siretNumber !== existingMerchant.siretNumber) {
      const existingBySiret = await prisma.merchant.findFirst({
        where: {
          siretNumber: validatedData.siretNumber,
          id: { not: existingMerchant.id }
        }
      })

      if (existingBySiret) {
        return ApiResponse.badRequest('SIRET number already exists')
      }
    }

    // Check for business email uniqueness if provided
    if (validatedData.businessEmail && validatedData.businessEmail !== existingMerchant.businessEmail) {
      const existingByEmail = await prisma.merchant.findFirst({
        where: {
          businessEmail: validatedData.businessEmail,
          id: { not: existingMerchant.id }
        }
      })

      if (existingByEmail) {
        return ApiResponse.badRequest('Business email already exists')
      }
    }

    // Update merchant profile
    const updatedMerchant = await prisma.merchant.update({
      where: { id: existingMerchant.id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
                verified: true
              }
            }
          }
        },
        contract: {
          select: {
            id: true,
            type: true,
            status: true,
            commissionRate: true,
            signedAt: true,
            validUntil: true
          }
        }
      }
    })

    // TODO: Send notification for significant profile changes
    // TODO: Log profile changes for audit trail

    return ApiResponse.success(updatedMerchant, 'Profile updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest('Validation failed', error.errors)
    }

    console.error('Error updating merchant profile:', error)
    return ApiResponse.serverError('Failed to update merchant profile')
  }
}
