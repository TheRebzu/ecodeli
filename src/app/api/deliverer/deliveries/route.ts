import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { z } from 'zod'

// Schema pour filtres de livraisons
const deliveriesFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'pickupDate', 'deliveryDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export async function GET(request: NextRequest) {
  try {
    console.log('🚚 [GET /api/deliverer/deliveries] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user) {
      console.log('❌ Utilisateur non authentifié')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'DELIVERER') {
      console.log('❌ Rôle incorrect:', user.role)
      return NextResponse.json({ error: 'Forbidden - DELIVERER role required' }, { status: 403 })
    }

    console.log('✅ Livreur authentifié:', user.id)

    const { searchParams } = new URL(request.url)
    
    // Validation des paramètres
    const params = deliveriesFiltersSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    })

    console.log('📝 Paramètres livraisons:', params)

    // Récupérer le profil du livreur
    const deliverer = await db.deliverer.findUnique({
      where: { userId: user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Profil livreur non trouvé' }, { status: 404 })
    }

    // Construire la clause WHERE
    const where: any = {
      delivererId: user.id
    }

    if (params.status) {
      where.status = params.status
    }

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {}
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom)
      if (params.dateTo) where.createdAt.lte = new Date(params.dateTo)
    }

    console.log('🔍 Clause WHERE pour la requête:', JSON.stringify(where, null, 2))

    // Récupérer les livraisons
    const deliveries = await db.delivery.findMany({
      where,
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    phone: true
                  }
                }
              }
            },
            PackageAnnouncement: {
              select: {
                weight: true,
                length: true,
                width: true,
                height: true,
                fragile: true,
                insuredValue: true
              }
            }
          }
        },
        payment: {
          select: {
            amount: true,
            status: true,
            paidAt: true
          }
        },
        ProofOfDelivery: {
          select: {
            id: true,
            recipientName: true,
            validatedWithCode: true,
            createdAt: true
          }
        },
        tracking: {
          orderBy: { timestamp: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            message: true,
            location: true,
            timestamp: true
          }
        }
      },
      orderBy: params.sortBy === 'createdAt' ? { createdAt: params.sortOrder } :
               params.sortBy === 'pickupDate' ? { pickupDate: params.sortOrder } :
               { deliveryDate: params.sortOrder },
      skip: (params.page - 1) * params.limit,
      take: params.limit
    })

    console.log('📦 Livraisons trouvées:', deliveries.length)
    if (deliveries.length > 0) {
      console.log('📋 Première livraison:', {
        id: deliveries[0].id,
        status: deliveries[0].status,
        delivererId: deliveries[0].delivererId,
        announcementId: deliveries[0].announcementId
      })
    }

    // Formater les données
    const formattedDeliveries = deliveries.map(delivery => ({
      id: delivery.id,
      status: delivery.status,
      validationCode: delivery.validationCode,
      pickupDate: delivery.pickupDate?.toISOString(),
      deliveryDate: delivery.deliveryDate?.toISOString(),
      actualDeliveryDate: delivery.actualDeliveryDate?.toISOString(),
      price: delivery.price,
      delivererFee: delivery.delivererFee,
      platformFee: delivery.platformFee,
      insuranceFee: delivery.insuranceFee,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
      
      announcement: {
        id: delivery.announcement.id,
        title: delivery.announcement.title,
        description: delivery.announcement.description,
        type: delivery.announcement.type,
        basePrice: delivery.announcement.basePrice,
        finalPrice: delivery.announcement.finalPrice || delivery.announcement.basePrice,
        currency: delivery.announcement.currency,
        isUrgent: delivery.announcement.isUrgent,
        pickupAddress: delivery.announcement.pickupAddress,
        deliveryAddress: delivery.announcement.deliveryAddress,
        packageDetails: delivery.announcement.PackageAnnouncement,
        
        client: {
          id: delivery.announcement.author.id,
          name: delivery.announcement.author.profile 
            ? `${delivery.announcement.author.profile.firstName || ''} ${delivery.announcement.author.profile.lastName || ''}`.trim()
            : delivery.announcement.author.email,
          avatar: delivery.announcement.author.profile?.avatar,
          phone: delivery.announcement.author.profile?.phone
        }
      },
      
      payment: delivery.payment ? {
        amount: delivery.payment.amount,
        status: delivery.payment.status,
        paidAt: delivery.payment.paidAt?.toISOString()
      } : null,
      
      proofOfDelivery: delivery.ProofOfDelivery,
      tracking: delivery.tracking
    }))

    const total = await db.delivery.count({ where })

    // Statistiques
    const stats = await db.delivery.groupBy({
      by: ['status'],
      where: { delivererId: user.id },
      _count: { _all: true }
    })

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count._all
      return acc
    }, {} as Record<string, number>)

    console.log(`✅ Trouvé ${formattedDeliveries.length} livraisons sur ${total} total`)

    return NextResponse.json({
      deliveries: formattedDeliveries,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit)
      },
      stats: statusStats
    })

  } catch (error) {
    console.error('❌ Erreur récupération livraisons:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}