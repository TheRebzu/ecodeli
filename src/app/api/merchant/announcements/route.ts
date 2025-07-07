import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { z } from 'zod'

// Schema pour création d'annonce commerçant
const createMerchantAnnouncementSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().min(1, 'La description est requise'),
  type: z.enum(['CART_DROP', 'BULK_DELIVERY', 'SCHEDULED_PICKUP', 'RETURN_SERVICE']),
  pickupAddress: z.string().min(1, 'L\'adresse d\'enlèvement est requise'),
  pickupLatitude: z.number(),
  pickupLongitude: z.number(),
  deliveryAddress: z.string().min(1, 'L\'adresse de livraison est requise'),
  deliveryLatitude: z.number(),
  deliveryLongitude: z.number(),
  basePrice: z.number().min(0),
  isUrgent: z.boolean().default(false),
  pickupDate: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().optional(),
  specialInstructions: z.string().optional(),
  
  // Spécifique aux commerçants
  customerInfo: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional()
  }),
  orderReference: z.string().optional(),
  packageCount: z.number().min(1).default(1),
  totalWeight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0)
  }).optional(),
  fragile: z.boolean().default(false),
  insuredValue: z.number().min(0).optional()
})

// Schema pour filtres
const announcementsFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  status: z.string().optional(),
  type: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'pickupDate', 'basePrice']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export async function GET(request: NextRequest) {
  try {
    console.log('🏪 [GET /api/merchant/announcements] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = announcementsFiltersSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    })

    // Construire la clause WHERE
    const where: any = {
      authorId: user.id,
      author: {
        role: 'MERCHANT'
      }
    }

    if ((await params).status) where.status = (await params).status
    if ((await params).type) where.type = (await params).type
    if ((await params).dateFrom || (await params).dateTo) {
      where.createdAt = {}
      if ((await params).dateFrom) where.createdAt.gte = new Date((await params).dateFrom)
      if ((await params).dateTo) where.createdAt.lte = new Date((await params).dateTo)
    }

    // Récupérer les annonces
    const announcements = await db.announcement.findMany({
      where,
      include: {
        delivery: {
          include: {
            deliverer: {
              include: {
                user: {
                  include: {
                    profile: true
                  }
                }
              }
            },
            payment: true,
            tracking: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        },
        packageAnnouncement: true,
        _count: {
          select: {
            matches: true,
            views: true
          }
        }
      },
      orderBy: (await params).sortBy === 'createdAt' ? { createdAt: (await params).sortOrder } :
               (await params).sortBy === 'pickupDate' ? { pickupDate: (await params).sortOrder } :
               { basePrice: (await params).sortOrder },
      skip: ((await params).page - 1) * (await params).limit,
      take: (await params).limit
    })

    // Formater les données
    const formattedAnnouncements = announcements.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      description: announcement.description,
      type: announcement.type,
      status: announcement.status,
      basePrice: Number(announcement.basePrice),
      finalPrice: Number(announcement.finalPrice || announcement.basePrice),
      currency: announcement.currency,
      isUrgent: announcement.isUrgent,
      pickupAddress: announcement.pickupAddress,
      deliveryAddress: announcement.deliveryAddress,
      pickupDate: announcement.pickupDate?.toISOString(),
      deliveryDate: announcement.deliveryDate?.toISOString(),
      specialInstructions: announcement.specialInstructions,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
      
      // Informations client
      customerInfo: announcement.customerInfo,
      orderReference: announcement.orderReference,
      
      // Détails du package
      packageDetails: announcement.packageAnnouncement,
      
      // Statistiques
      stats: {
        views: announcement._count.views,
        matches: announcement._count.matches
      },
      
      // Livraison associée
      delivery: announcement.delivery ? {
        id: announcement.delivery.id,
        status: announcement.delivery.status,
        validationCode: announcement.delivery.validationCode,
        actualPickupTime: announcement.delivery.actualPickupTime?.toISOString(),
        actualDeliveryTime: announcement.delivery.actualDeliveryTime?.toISOString(),
        
        deliverer: announcement.delivery.deliverer ? {
          id: announcement.delivery.deliverer.id,
          name: announcement.delivery.deliverer.user.profile 
            ? `${announcement.delivery.deliverer.user.profile.firstName || ''} ${announcement.delivery.deliverer.user.profile.lastName || ''}`.trim()
            : announcement.delivery.deliverer.user.email,
          phone: announcement.delivery.deliverer.user.profile?.phone
        } : null,
        
        payment: announcement.delivery.payment ? {
          amount: Number(announcement.delivery.payment.amount),
          status: announcement.delivery.payment.status,
          paidAt: announcement.delivery.payment.paidAt?.toISOString()
        } : null,
        
        lastTracking: announcement.delivery.tracking.length > 0 ? {
          status: announcement.delivery.tracking[0].status,
          message: announcement.delivery.tracking[0].message,
          createdAt: announcement.delivery.tracking[0].createdAt.toISOString()
        } : null
      } : null
    }))

    const total = await db.announcement.count({ where })

    // Statistiques rapides
    const statusStats = await db.announcement.groupBy({
      by: ['status'],
      where: {
        authorId: user.id,
        author: { role: 'MERCHANT' }
      },
      _count: { _all: true }
    })

    const stats = statusStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count._all
      return acc
    }, {} as Record<string, number>)

    console.log(`✅ Trouvé ${formattedAnnouncements.length} annonces sur ${total} total`)

    return NextResponse.json({
      announcements: formattedAnnouncements,
      pagination: {
        page: (await params).page,
        limit: (await params).limit,
        total,
        totalPages: Math.ceil(total / (await params).limit),
        hasNext: (await params).page < Math.ceil(total / (await params).limit),
        hasPrev: (await params).page > 1
      },
      stats: {
        total,
        byStatus: stats
      }
    })

  } catch (error) {
    console.error('❌ Erreur récupération annonces commerçant:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏪 [POST /api/merchant/announcements] Création annonce')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Vérifier que le commerçant existe et est validé
    const merchant = await db.merchant.findUnique({
      where: { userId: user.id }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Profil commerçant non trouvé' }, { status: 404 })
    }

    if (!merchant.isValidated) {
      return NextResponse.json({ 
        error: 'Votre compte commerçant doit être validé avant de pouvoir créer des annonces' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createMerchantAnnouncementSchema.parse(body)

    // Créer l'annonce
    const newAnnouncement = await db.$transaction(async (tx) => {
      // Créer l'annonce principale
      const announcement = await tx.announcement.create({
        data: {
          authorId: user.id,
          title: validatedData.title,
          description: validatedData.description,
          type: validatedData.type,
          status: 'ACTIVE',
          basePrice: validatedData.basePrice,
          currency: 'EUR',
          isUrgent: validatedData.isUrgent,
          pickupAddress: validatedData.pickupAddress,
          pickupLatitude: validatedData.pickupLatitude,
          pickupLongitude: validatedData.pickupLongitude,
          deliveryAddress: validatedData.deliveryAddress,
          deliveryLatitude: validatedData.deliveryLatitude,
          deliveryLongitude: validatedData.deliveryLongitude,
          pickupDate: validatedData.pickupDate ? new Date(validatedData.pickupDate) : null,
          deliveryDate: validatedData.deliveryDate ? new Date(validatedData.deliveryDate) : null,
          specialInstructions: validatedData.specialInstructions,
          customerInfo: validatedData.customerInfo as any,
          orderReference: validatedData.orderReference
        }
      })

      // Créer les détails du package si fournis
      if (validatedData.dimensions || validatedData.totalWeight) {
        await tx.packageAnnouncement.create({
          data: {
            announcementId: announcement.id,
            weight: validatedData.totalWeight,
            length: validatedData.dimensions?.length,
            width: validatedData.dimensions?.width,
            height: validatedData.dimensions?.height,
            fragile: validatedData.fragile,
            insuredValue: validatedData.insuredValue,
            packageCount: validatedData.packageCount
          }
        })
      }

      return announcement
    })

    console.log('✅ Annonce commerçant créée:', newAnnouncement.id)

    return NextResponse.json({
      success: true,
      announcement: {
        id: newAnnouncement.id,
        title: newAnnouncement.title,
        description: newAnnouncement.description,
        type: newAnnouncement.type,
        status: newAnnouncement.status,
        basePrice: Number(newAnnouncement.basePrice),
        isUrgent: newAnnouncement.isUrgent,
        pickupAddress: newAnnouncement.pickupAddress,
        deliveryAddress: newAnnouncement.deliveryAddress,
        createdAt: newAnnouncement.createdAt.toISOString()
      },
      message: 'Annonce créée avec succès'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('❌ Erreur création annonce commerçant:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}