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

// Schema pour créer une livraison (accepter une annonce)
const createDeliverySchema = z.object({
  announcementId: z.string().min(1, 'ID de l\'annonce requis'),
  proposedPrice: z.number().min(0).optional(),
  estimatedPickupTime: z.string().optional(),
  notes: z.string().max(500).optional()
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

    if ((await params).status) {
      where.status = (await params).status
    }

    if ((await params).dateFrom || (await params).dateTo) {
      where.createdAt = {}
      if ((await params).dateFrom) where.createdAt.gte = new Date((await params).dateFrom)
      if ((await params).dateTo) where.createdAt.lte = new Date((await params).dateTo)
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
      orderBy: (await params).sortBy === 'createdAt' ? { createdAt: (await params).sortOrder } :
               (await params).sortBy === 'pickupDate' ? { pickupDate: (await params).sortOrder } :
               { deliveryDate: (await params).sortOrder },
      skip: ((await params).page - 1) * (await params).limit,
      take: (await params).limit
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
        page: (await params).page,
        limit: (await params).limit,
        total,
        totalPages: Math.ceil(total / (await params).limit)
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

// POST - Accepter une annonce et créer une livraison
export async function POST(request: NextRequest) {
  try {
    console.log('🚚 [POST /api/deliverer/deliveries] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user) {
      console.log('❌ Utilisateur non authentifié')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'DELIVERER') {
      console.log('❌ Rôle incorrect:', user.role)
      return NextResponse.json({ error: 'Forbidden - DELIVERER role required' }, { status: 403 })
    }

    // Vérifier que le livreur existe et est validé
    const deliverer = await db.deliverer.findUnique({
      where: { userId: user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Profil livreur non trouvé' }, { status: 404 })
    }

    if (deliverer.validationStatus !== 'VALIDATED') {
      return NextResponse.json({ 
        error: 'Votre profil doit être validé pour accepter des livraisons' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createDeliverySchema.parse(body)

    console.log('📝 Données de création de livraison:', validatedData)

    // Vérifier que l'annonce existe et est disponible
    const announcement = await db.announcement.findUnique({
      where: { id: validatedData.announcementId },
      include: {
        author: {
          include: {
            profile: true
          }
        }
      }
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Annonce non trouvée' }, { status: 404 })
    }

    if (announcement.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Cette annonce n\'est plus disponible' 
      }, { status: 400 })
    }

    // Vérifier qu'il n'y a pas déjà une livraison pour cette annonce
    const existingDelivery = await db.delivery.findFirst({
      where: { 
        announcementId: validatedData.announcementId,
        status: { not: 'CANCELLED' }
      }
    })

    if (existingDelivery) {
      return NextResponse.json({ 
        error: 'Cette annonce a déjà été acceptée par un autre livreur' 
      }, { status: 400 })
    }

    // Générer un code de validation à 6 chiffres
    const validationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Créer la livraison
    const delivery = await db.delivery.create({
      data: {
        announcementId: validatedData.announcementId,
        clientId: announcement.authorId, // ID du client depuis l'annonce
        delivererId: user.id,
        status: 'ACCEPTED',
        price: validatedData.proposedPrice || announcement.finalPrice || announcement.basePrice,
        delivererFee: (validatedData.proposedPrice || announcement.finalPrice || announcement.basePrice) * 0.8, // 80% pour le livreur
        platformFee: (validatedData.proposedPrice || announcement.finalPrice || announcement.basePrice) * 0.15, // 15% pour la plateforme
        insuranceFee: (validatedData.proposedPrice || announcement.finalPrice || announcement.basePrice) * 0.05, // 5% pour l'assurance
        validationCode: validationCode,
        pickupDate: validatedData.estimatedPickupTime ? new Date(validatedData.estimatedPickupTime) : null,
        deliveryDate: validatedData.estimatedPickupTime 
          ? new Date(new Date(validatedData.estimatedPickupTime).getTime() + 2 * 60 * 60 * 1000) // +2h par défaut
          : null
      }
    })

    // Récupérer la livraison créée avec ses relations
    const createdDelivery = await db.delivery.findUnique({
      where: { id: delivery.id },
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    })

    // Mettre à jour le statut de l'annonce
    await db.announcement.update({
      where: { id: validatedData.announcementId },
      data: { status: 'IN_PROGRESS' }
    })

    // Créer un tracking initial
    await db.trackingUpdate.create({
      data: {
        deliveryId: delivery.id,
        status: 'ACCEPTED',
        message: 'Livraison acceptée par le livreur',
        location: 'En attente de récupération',
        timestamp: new Date()
      }
    })

    console.log(`✅ Livraison créée avec succès: ${delivery.id}`)
    console.log(`📧 Code de validation: ${validationCode}`)

    // TODO: Envoyer une notification au client
    // TODO: Envoyer le code de validation au client par SMS/email

    return NextResponse.json({
      delivery: {
        id: delivery.id,
        status: delivery.status,
        price: delivery.price,
        delivererFee: delivery.delivererFee,
        validationCode: validationCode,
        estimatedPickupTime: delivery.pickupDate?.toISOString(),
        createdAt: delivery.createdAt.toISOString(),
        announcement: {
          id: createdDelivery.announcement.id,
          title: createdDelivery.announcement.title,
          pickupAddress: createdDelivery.announcement.pickupAddress,
          deliveryAddress: createdDelivery.announcement.deliveryAddress,
          client: {
            name: createdDelivery.announcement.author.profile 
              ? `${createdDelivery.announcement.author.profile.firstName || ''} ${createdDelivery.announcement.author.profile.lastName || ''}`.trim()
              : createdDelivery.announcement.author.email
          }
        }
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Données invalides',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Erreur création livraison:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}