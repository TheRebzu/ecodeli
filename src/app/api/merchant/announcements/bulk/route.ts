import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { announcementService } from '@/features/announcements/services/announcement.service'
import { matchingService } from '@/features/announcements/services/matching.service'

const bulkImportSchema = z.object({
  announcements: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    type: z.enum(['PACKAGE', 'SERVICE', 'CART_DROP']),
    price: z.number().min(0),
    pickupAddress: z.string().min(1),
    deliveryAddress: z.string().min(1),
    pickupDate: z.string().datetime(),
    urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    tags: z.array(z.string()).optional(),
    packageDetails: z.object({
      weight: z.number().min(0).optional(),
      dimensions: z.string().optional(),
      fragile: z.boolean().default(false),
      requiresSignature: z.boolean().default(false)
    }).optional(),
    serviceDetails: z.object({
      duration: z.number().min(0).optional(),
      serviceType: z.string().optional(),
      requirements: z.array(z.string()).optional()
    }).optional()
  })).max(100)
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        subscription: true,
        merchantProfile: true
      }
    })

    if (!user || user.role !== 'MERCHANT' || !user.merchantProfile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { announcements } = bulkImportSchema.parse(body)

    const currentCount = await db.announcement.count({
      where: {
        authorId: session.user.id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    })

    const subscriptionLimits = {
      FREE: 5,
      STARTER: 50,
      PREMIUM: 500,
      ENTERPRISE: 10000
    }

    const userTier = user.subscription?.tier || 'FREE'
    const monthlyLimit = subscriptionLimits[userTier as keyof typeof subscriptionLimits]

    if (currentCount + announcements.length > monthlyLimit) {
      return NextResponse.json({
        error: 'Bulk import would exceed monthly limit',
        details: {
          currentCount,
          attemptedImport: announcements.length,
          monthlyLimit,
          tier: userTier
        }
      }, { status: 402 })
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      total: announcements.length
    }

    for (let i = 0; i < announcements.length; i++) {
      const announcementData = announcements[i]
      
      try {
        const announcement = await announcementService.createAnnouncement({
          ...announcementData,
          authorId: session.user.id
        })

        await matchingService.triggerRouteMatching(announcement.id)
        
        results.successful.push({
          index: i,
          id: announcement.id,
          title: announcement.title
        })
      } catch (error) {
        results.failed.push({
          index: i,
          title: announcementData.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: `Bulk import completed: ${results.successful.length}/${results.total} successful`,
      results
    })
  } catch (error) {
    console.error('Error in bulk import:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid import data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const template = {
      announcements: [
        {
          title: "Example Package Delivery",
          description: "Delivery of electronic device",
          type: "PACKAGE",
          price: 15.50,
          pickupAddress: "123 Sender Street, City, Country",
          deliveryAddress: "456 Recipient Avenue, City, Country",
          pickupDate: "2024-01-15T10:00:00Z",
          urgency: "MEDIUM",
          tags: ["electronics", "fragile"],
          packageDetails: {
            weight: 2.5,
            dimensions: "30x20x10cm",
            fragile: true,
            requiresSignature: true
          }
        }
      ]
    }

    return NextResponse.json({
      template,
      instructions: {
        maxRecords: 100,
        requiredFields: ["title", "type", "price", "pickupAddress", "deliveryAddress", "pickupDate"],
        supportedTypes: ["PACKAGE", "SERVICE", "CART_DROP"],
        urgencyLevels: ["LOW", "MEDIUM", "HIGH", "URGENT"],
        dateFormat: "ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)"
      }
    })
  } catch (error) {
    console.error('Error getting bulk import template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}