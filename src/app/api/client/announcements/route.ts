import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Simple cache implementation
const cache = new Map<string, { data: any; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getFromCache(key: string): any | null {
  const item = cache.get(key)
  if (!item || Date.now() > item.expires) {
    cache.delete(key)
    return null
  }
  return item.data
}

function setCache(key: string, data: any, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, expires: Date.now() + ttl })
}

function invalidateAnnouncementCache(userId: string): void {
  // Remove all cache entries for this user's announcements
  for (const key of cache.keys()) {
    if (key.includes(`announcements:${userId}`)) {
      cache.delete(key)
    }
  }
}

const querySchema = z.object({
  page: z.string().optional().transform(val => parseInt(val || '1')),
  limit: z.string().optional().transform(val => Math.min(parseInt(val || '10'), 50)),
  search: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'price']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// Schema pour les annonces clients
const createAnnouncementSchema = z.object({
  title: z.string().min(5, 'Le titre doit faire au moins 5 caractères'),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères'),
  type: z.enum(['PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'AIRPORT_TRANSFER', 'SHOPPING', 'INTERNATIONAL_PURCHASE']),
  price: z.number().positive('Le prix doit être positif').max(10000, 'Prix maximum 10,000€'),
  pickupAddress: z.string().min(10, 'Adresse de récupération requise'),
  deliveryAddress: z.string().min(10, 'Adresse de livraison requise'),
  scheduledAt: z.string().datetime('Date invalide'),
  weight: z.number().optional(),
  dimensions: z.object({
    length: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  }).optional(),
  specialInstructions: z.string().optional(),
  urgent: z.boolean().optional().default(false)
})

// Limites par plan
const PLAN_LIMITS = {
  FREE: { maxAnnouncementsPerMonth: 5, maxActiveAnnouncements: 3 },
  STARTER: { maxAnnouncementsPerMonth: 20, maxActiveAnnouncements: 10 },
  PREMIUM: { maxAnnouncementsPerMonth: -1, maxActiveAnnouncements: -1 }
}

// GET - Liste des annonces du client
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams)
    const { page, limit, search, type, status, sortBy, sortOrder } = querySchema.parse(queryParams)

    // Generate cache key
    const cacheKey = `announcements:${session.user.id}:${JSON.stringify({ page, limit, search, type, status, sortBy, sortOrder })}`
    
    // Check cache first
    const cachedResult = getFromCache(cacheKey)
    if (cachedResult) {
      const response = NextResponse.json(cachedResult)
      response.headers.set('X-Cache', 'HIT')
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
      return response
    }

    // Build where clause
    const where: any = {
      authorId: session.user.id
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (type) {
      where.type = type
    }

    if (status) {
      where.status = status
    }

    // Get subscription limits (with caching)
    const subscriptionCacheKey = `subscription:${session.user.id}`
    let planLimits = getFromCache(subscriptionCacheKey)
    
    if (!planLimits) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id }
      })

      planLimits = {
        maxAnnouncementsPerMonth: subscription?.plan === 'FREE' ? 3 :
                                 subscription?.plan === 'STARTER' ? 10 :
                                 subscription?.plan === 'PREMIUM' ? -1 : 3
      }
      
      setCache(subscriptionCacheKey, planLimits, 30 * 60 * 1000) // 30 minutes
    }

    // Optimize database queries with parallel execution
    const [announcements, totalCount, monthlyCount] = await Promise.all([
      // Main query with optimized includes
      prisma.announcement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          price: true,
          pickupAddress: true,
          deliveryAddress: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              deliveries: true
            }
          }
        }
      }),
      
      // Total count
      prisma.announcement.count({ where }),
      
      // Monthly count for subscription limits
      prisma.announcement.count({
        where: {
          authorId: session.user.id,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ])

    const result = {
      announcements: announcements.map(announcement => ({
        ...announcement,
        deliveryCount: announcement._count.deliveries
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount
      },
      stats: {
        monthly: {
          total: monthlyCount,
          remaining: planLimits.maxAnnouncementsPerMonth === -1 
            ? -1 
            : Math.max(0, planLimits.maxAnnouncementsPerMonth - monthlyCount),
          limit: planLimits.maxAnnouncementsPerMonth
        }
      },
      cache: {
        hit: false,
        key: cacheKey.substring(0, 50) + '...',
        ttl: CACHE_TTL / 1000 // in seconds
      }
    }

    // Cache the result
    setCache(cacheKey, result)

    const response = NextResponse.json(result)
    response.headers.set('X-Cache', 'MISS')
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
    response.headers.set('Cache-Control', 'public, max-age=300') // 5 minutes browser cache
    
    return response

  } catch (error) {
    return handleApiError(error, 'fetching announcements')
  }
}

// POST - Créer une nouvelle annonce
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input
    const body = await request.json()
    const validatedData = createAnnouncementSchema.parse(body)

    // Check subscription limits with caching
    const subscriptionCacheKey = `subscription:${session.user.id}`
    let planLimits = getFromCache(subscriptionCacheKey)
    
    if (!planLimits) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id }
      })

      planLimits = {
        maxAnnouncementsPerMonth: subscription?.plan === 'FREE' ? 3 :
                                 subscription?.plan === 'STARTER' ? 10 :
                                 subscription?.plan === 'PREMIUM' ? -1 : 3
      }
      
      setCache(subscriptionCacheKey, planLimits, 30 * 60 * 1000)
    }

    // Check monthly limit
    if (planLimits.maxAnnouncementsPerMonth !== -1) {
      const monthlyCount = await prisma.announcement.count({
        where: {
          authorId: session.user.id,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })

      if (monthlyCount >= planLimits.maxAnnouncementsPerMonth) {
        return NextResponse.json({
          error: 'Monthly announcement limit reached',
          details: {
            current: monthlyCount,
            limit: planLimits.maxAnnouncementsPerMonth
          }
        }, { status: 429 })
      }
    }

    // Create announcement with transaction for data integrity
    const announcement = await prisma.$transaction(async (tx) => {
      const newAnnouncement = await tx.announcement.create({
        data: {
          ...validatedData,
          authorId: session.user.id,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          price: true,
          pickupAddress: true,
          deliveryAddress: true,
          scheduledAt: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      })

      // Create activity log
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'ANNOUNCEMENT_CREATED',
          entityType: 'ANNOUNCEMENT',
          entityId: newAnnouncement.id,
          metadata: {
            title: newAnnouncement.title,
            type: newAnnouncement.type,
            price: newAnnouncement.price
          }
        }
      })

      return newAnnouncement
    })

    // Invalidate cache for this user
    invalidateAnnouncementCache(session.user.id)

    // TODO: Send notification to nearby deliverers (implement matching algorithm)
    // TODO: Add to matching queue for automatic pairing

    const response = NextResponse.json({
      announcement,
      message: 'Annonce créée avec succès'
    }, { status: 201 })
    
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)
    
    return response

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    return handleApiError(error, 'creating announcement')
  }
}