import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema de validation pour mise à jour du profil livreur
const updateProfileSchema = z.object({
  vehicleType: z.string().optional(),
  vehiclePlate: z.string().optional(),
  maxWeight: z.number().positive().optional(),
  maxVolume: z.number().positive().optional(),
  bio: z.string().max(500).optional(),
  languages: z.array(z.string()).optional(),
  specializations: z.array(z.string()).optional(),
  workingHours: z.object({
    monday: z.object({ start: z.string(), end: z.string() }).optional(),
    tuesday: z.object({ start: z.string(), end: z.string() }).optional(),
    wednesday: z.object({ start: z.string(), end: z.string() }).optional(),
    thursday: z.object({ start: z.string(), end: z.string() }).optional(),
    friday: z.object({ start: z.string(), end: z.string() }).optional(),
    saturday: z.object({ start: z.string(), end: z.string() }).optional(),
    sunday: z.object({ start: z.string(), end: z.string() }).optional()
  }).optional()
})

// GET - Récupérer le profil complet du livreur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    // Récupérer le profil complet
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        nfcCard: {
          select: {
            cardNumber: true,
            isActive: true,
            issuedAt: true,
            lastUsedAt: true
          }
        },
        wallet: {
          select: {
            balance: true,
            pendingWithdrawals: true
          }
        }
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Statistiques de performance
    const stats = await prisma.$transaction(async (tx) => {
      const totalDeliveries = await tx.delivery.count({
        where: {
          delivererId: deliverer.id,
          status: 'DELIVERED'
        }
      })

      const completedThisMonth = await tx.delivery.count({
        where: {
          delivererId: deliverer.id,
          status: 'DELIVERED',
          completedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })

      const averageRating = await tx.deliveryRating.aggregate({
        where: {
          delivery: {
            delivererId: deliverer.id
          }
        },
        _avg: {
          rating: true
        }
      })

      const totalEarnings = await tx.walletTransaction.aggregate({
        where: {
          wallet: {
            delivererId: deliverer.id
          },
          type: 'CREDIT',
          category: 'DELIVERY_FEE'
        },
        _sum: {
          amount: true
        }
      })

      const thisMonthEarnings = await tx.walletTransaction.aggregate({
        where: {
          wallet: {
            delivererId: deliverer.id
          },
          type: 'CREDIT',
          category: 'DELIVERY_FEE',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: {
          amount: true
        }
      })

      return {
        totalDeliveries,
        completedThisMonth,
        averageRating: averageRating._avg.rating || 0,
        totalEarnings: totalEarnings._sum.amount || 0,
        thisMonthEarnings: thisMonthEarnings._sum.amount || 0
      }
    })

    // Récupérer les documents de validation
    const documents = await prisma.document.findMany({
      where: {
        profile: {
          userId: session.user.id
        }
      },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        validatedAt: true
      }
    })

    // Récupérer les dernières livraisons
    const recentDeliveries = await prisma.delivery.findMany({
      where: {
        delivererId: deliverer.id
      },
      include: {
        announcement: {
          select: {
            title: true,
            type: true,
            price: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    return NextResponse.json({
      deliverer: {
        ...deliverer,
        user: {
          ...deliverer.user,
          password: undefined // Ne jamais retourner le mot de passe
        }
      },
      stats,
      documents,
      recentDeliveries,
      completionRate: stats.totalDeliveries > 0 ? 
        (stats.totalDeliveries / (stats.totalDeliveries + 0)) * 100 : 0, // TODO: Inclure les annulations
      badges: [
        ...(stats.totalDeliveries >= 10 ? ['Livreur Expérimenté'] : []),
        ...(stats.averageRating >= 4.5 ? ['Service Excellent'] : []),
        ...(stats.completedThisMonth >= 20 ? ['Top Performer'] : []),
        ...(deliverer.nfcCard ? ['Carte NFC Active'] : [])
      ]
    })
  } catch (error) {
    return handleApiError(error, 'fetching deliverer profile')
  }
}

// PUT - Mettre à jour le profil livreur
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // Récupérer le profil existant
    const existingDeliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!existingDeliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Mettre à jour le profil livreur
    const updatedDeliverer = await prisma.deliverer.update({
      where: { userId: session.user.id },
      data: {
        vehicleType: validatedData.vehicleType,
        vehiclePlate: validatedData.vehiclePlate,
        maxWeight: validatedData.maxWeight,
        maxVolume: validatedData.maxVolume
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    // Mettre à jour les préférences dans une table séparée si nécessaire
    if (validatedData.bio || validatedData.languages || validatedData.specializations || validatedData.workingHours) {
      await prisma.delivererPreferences.upsert({
        where: { delivererId: existingDeliverer.id },
        update: {
          bio: validatedData.bio,
          languages: validatedData.languages,
          specializations: validatedData.specializations,
          workingHours: validatedData.workingHours
        },
        create: {
          delivererId: existingDeliverer.id,
          bio: validatedData.bio,
          languages: validatedData.languages || [],
          specializations: validatedData.specializations || [],
          workingHours: validatedData.workingHours || {}
        }
      })
    }

    return NextResponse.json({
      success: true,
      deliverer: {
        ...updatedDeliverer,
        user: {
          ...updatedDeliverer.user,
          password: undefined
        }
      },
      message: 'Profil mis à jour avec succès'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'updating deliverer profile')
  }
}