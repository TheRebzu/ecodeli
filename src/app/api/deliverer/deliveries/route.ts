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
  sortBy: z.enum(['createdAt', 'scheduledPickupTime', 'estimatedDeliveryTime']).default('createdAt'),
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
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
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
      delivererId: deliverer.id
    }

    if (params.status) {
      where.status = params.status
    }

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {}
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom)
      if (params.dateTo) where.createdAt.lte = new Date(params.dateTo)
    }

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
            packageAnnouncement: {
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
        proofOfDelivery: {
          select: {
            id: true,
            recipientName: true,
            validatedWithCode: true,
            createdAt: true
          }
        },
        tracking: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            message: true,
            location: true,
            createdAt: true
          }
        }
      },
      orderBy: params.sortBy === 'createdAt' ? { createdAt: params.sortOrder } :
               params.sortBy === 'scheduledPickupTime' ? { scheduledPickupTime: params.sortOrder } :
               { scheduledDeliveryTime: params.sortOrder },
      skip: (params.page - 1) * params.limit,
      take: params.limit
    })

    // Formater les données
    const formattedDeliveries = deliveries.map(delivery => ({
      id: delivery.id,
      status: delivery.status,
      validationCode: delivery.validationCode,
      pickupLocation: delivery.pickupLocation,
      deliveryLocation: delivery.deliveryLocation,
      scheduledPickupTime: delivery.scheduledPickupTime?.toISOString(),
      scheduledDeliveryTime: delivery.scheduledDeliveryTime?.toISOString(),
      actualPickupTime: delivery.actualPickupTime?.toISOString(),
      actualDeliveryTime: delivery.actualDeliveryTime?.toISOString(),
      notes: delivery.notes,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
      
      announcement: {
        id: delivery.announcement.id,
        title: delivery.announcement.title,
        description: delivery.announcement.description,
        type: delivery.announcement.type,
        basePrice: Number(delivery.announcement.basePrice),
        finalPrice: Number(delivery.announcement.finalPrice || delivery.announcement.basePrice),
        currency: delivery.announcement.currency,
        isUrgent: delivery.announcement.isUrgent,
        pickupAddress: delivery.announcement.pickupAddress,
        deliveryAddress: delivery.announcement.deliveryAddress,
        packageDetails: delivery.announcement.packageAnnouncement,
        
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
        amount: Number(delivery.payment.amount),
        status: delivery.payment.status,
        paidAt: delivery.payment.paidAt?.toISOString()
      } : null,
      
      proofOfDelivery: delivery.proofOfDelivery,
      tracking: delivery.tracking
    }))

    const total = await db.delivery.count({ where })

    // Statistiques
    const stats = await db.delivery.groupBy({
      by: ['status'],
      where: { delivererId: deliverer.id },
      _count: { _all: true }
    })

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count._all
      return acc
    }, {} as Record<string, number>)

    console.log(`✅ Trouvé ${formattedDeliveries.length} livraisons sur ${total} total`)

    const result = {
      deliveries: formattedDeliveries,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
        hasNext: params.page < Math.ceil(total / params.limit),
        hasPrev: params.page > 1
      },
      stats: {
        total,
        byStatus: statusStats,
        activeDeliveries: (statusStats['ACCEPTED'] || 0) + (statusStats['PICKED_UP'] || 0) + (statusStats['IN_TRANSIT'] || 0),
        completedDeliveries: statusStats['DELIVERED'] || 0,
        totalEarnings: formattedDeliveries
          .filter(d => d.status === 'DELIVERED' && d.payment?.status === 'PAID')
          .reduce((sum, d) => sum + (d.payment?.amount || 0), 0)
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Erreur récupération livraisons:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}