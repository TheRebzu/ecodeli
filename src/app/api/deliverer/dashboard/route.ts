import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

/**
 * GET - Dashboard complet du livreur
 * Informations centralisées : profil, statistiques, livraisons, gains, planning
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer access required' }, { status: 403 })
    }

    // Récupérer le profil complet du livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        wallet: true,
        documents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Période pour les statistiques (30 derniers jours)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Statistiques des livraisons
    const deliveriesStats = await prisma.delivery.groupBy({
      by: ['status'],
      where: {
        delivererId: deliverer.id,
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        status: true
      }
    })

    const totalDeliveries = await prisma.delivery.count({
      where: { delivererId: deliverer.id }
    })

    const completedDeliveries = await prisma.delivery.count({
      where: {
        delivererId: deliverer.id,
        status: 'DELIVERED'
      }
    })

    const successRate = totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0

    // Livraisons récentes (5 dernières)
    const recentDeliveries = await prisma.delivery.findMany({
      where: { delivererId: deliverer.id },
      include: {
        announcement: {
          select: {
            title: true,
            type: true,
            price: true,
            pickupLocation: true,
            deliveryLocation: true
          }
        },
        client: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Livraisons en cours
    const activeDeliveries = await prisma.delivery.findMany({
      where: {
        delivererId: deliverer.id,
        status: {
          in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']
        }
      },
      include: {
        announcement: {
          select: {
            title: true,
            type: true,
            pickupLocation: true,
            deliveryLocation: true,
            scheduledPickupTime: true
          }
        },
        client: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { scheduledPickupTime: 'asc' }
    })

    // Opportunités disponibles (matching)
    const availableOpportunities = await prisma.announcement.findMany({
      where: {
        status: 'ACTIVE',
        type: {
          in: ['PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'AIRPORT_TRANSFER']
        },
        scheduledPickupTime: {
          gte: new Date()
        },
        // Exclure les annonces déjà acceptées
        deliveries: {
          none: {
            status: {
              in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']
            }
          }
        }
      },
      include: {
        author: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Gains du mois en cours
    const currentMonth = new Date()
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    const monthlyEarnings = await prisma.delivery.findMany({
      where: {
        delivererId: deliverer.id,
        status: 'DELIVERED',
        completedAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        announcement: {
          select: {
            price: true
          }
        }
      }
    })

    const totalMonthlyEarnings = monthlyEarnings.reduce((sum, delivery) => {
      const price = parseFloat(delivery.announcement.price.toString())
      return sum + (price * 0.85) // 85% pour le livreur
    }, 0)

    // Planning de la semaine
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)

    const weeklyPlanning = await prisma.availability.findMany({
      where: {
        delivererId: deliverer.id,
        date: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      },
      orderBy: { date: 'asc' }
    })

    // Routes planifiées
    const plannedRoutes = await prisma.route.findMany({
      where: {
        delivererId: deliverer.id,
        departureDate: {
          gte: new Date()
        },
        isActive: true
      },
      include: {
        matchedAnnouncements: {
          include: {
            announcement: {
              select: {
                title: true,
                type: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: { departureDate: 'asc' },
      take: 5
    })

    // Notifications non lues
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false
      }
    })

    // Note moyenne du livreur
    const ratings = await prisma.rating.findMany({
      where: {
        delivery: {
          delivererId: deliverer.id
        }
      }
    })

    const averageRating = ratings.length > 0 ? 
      ratings.reduce((sum, rating) => sum + rating.overallRating, 0) / ratings.length : 0

    // Statut de validation des documents
    const documentValidation = {
      identity: deliverer.documents.find(d => d.type === 'IDENTITY')?.status || 'MISSING',
      drivingLicense: deliverer.documents.find(d => d.type === 'DRIVING_LICENSE')?.status || 'MISSING',
      insurance: deliverer.documents.find(d => d.type === 'INSURANCE')?.status || 'MISSING'
    }

    const allDocumentsApproved = Object.values(documentValidation).every(status => status === 'APPROVED')

    // Actions rapides recommandées
    const quickActions = []

    if (!allDocumentsApproved) {
      quickActions.push({
        type: 'UPLOAD_DOCUMENTS',
        title: 'Compléter les documents',
        description: 'Téléchargez vos pièces justificatives pour activer votre compte',
        priority: 'HIGH',
        url: '/deliverer/documents'
      })
    }

    if (activeDeliveries.length === 0 && availableOpportunities.length > 0) {
      quickActions.push({
        type: 'BROWSE_OPPORTUNITIES',
        title: 'Nouvelles opportunités disponibles',
        description: `${availableOpportunities.length} livraisons disponibles`,
        priority: 'MEDIUM',
        url: '/deliverer/opportunities'
      })
    }

    if (weeklyPlanning.length === 0) {
      quickActions.push({
        type: 'SET_AVAILABILITY',
        title: 'Définir vos disponibilités',
        description: 'Configurez votre planning pour recevoir plus d\'opportunités',
        priority: 'MEDIUM',
        url: '/deliverer/planning'
      })
    }

    if (deliverer.wallet && deliverer.wallet.balance > 50) {
      quickActions.push({
        type: 'WITHDRAW_EARNINGS',
        title: 'Retirer vos gains',
        description: `${deliverer.wallet.balance.toFixed(2)}€ disponibles`,
        priority: 'LOW',
        url: '/deliverer/wallet'
      })
    }

    return NextResponse.json({
      profile: {
        id: deliverer.id,
        name: `${deliverer.user.profile?.firstName} ${deliverer.user.profile?.lastName}`,
        email: deliverer.user.email,
        phone: deliverer.user.profile?.phone,
        validationStatus: deliverer.validationStatus,
        vehicleType: deliverer.vehicleType,
        vehiclePlate: deliverer.vehiclePlate,
        maxWeight: deliverer.maxWeight,
        maxVolume: deliverer.maxVolume,
        memberSince: deliverer.createdAt,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length
      },
      statistics: {
        totalDeliveries,
        completedDeliveries,
        successRate: Math.round(successRate * 10) / 10,
        monthlyEarnings: Math.round(totalMonthlyEarnings * 100) / 100,
        walletBalance: deliverer.wallet?.balance || 0,
        deliveriesStats: deliveriesStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.status
          return acc
        }, {} as Record<string, number>)
      },
      activeDeliveries,
      recentDeliveries,
      availableOpportunities: availableOpportunities.slice(0, 5),
      plannedRoutes,
      weeklyPlanning,
      documentValidation,
      quickActions,
      notifications: {
        unreadCount: unreadNotifications
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching deliverer dashboard')
  }
} 