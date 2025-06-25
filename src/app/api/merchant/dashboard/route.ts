import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

/**
 * GET - Dashboard complet du commerçant
 * Informations centralisées : contrat, annonces, commandes, facturation, paiements
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden - Merchant access required' }, { status: 403 })
    }

    // Récupérer le profil commerçant complet
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        contract: true,
        business: true
      }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 })
    }

    // Période pour les statistiques (30 derniers jours)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Statistiques des annonces
    const announcementStats = await prisma.announcement.groupBy({
      by: ['status'],
      where: {
        authorId: session.user.id,
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        status: true
      }
    })

    const totalAnnouncements = await prisma.announcement.count({
      where: { authorId: session.user.id }
    })

    const activeAnnouncements = await prisma.announcement.count({
      where: {
        authorId: session.user.id,
        status: 'ACTIVE'
      }
    })

    // Annonces récentes (5 dernières)
    const recentAnnouncements = await prisma.announcement.findMany({
      where: { authorId: session.user.id },
      include: {
        deliveries: {
          include: {
            deliverer: {
              select: {
                user: {
                  select: {
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            deliveries: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Commandes récentes (lâcher de chariot)
    const recentOrders = await prisma.cartDropOrder.findMany({
      where: { merchantId: merchant.id },
      include: {
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
        },
        delivery: {
          select: {
            status: true,
            deliverer: {
              select: {
                user: {
                  select: {
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Statistiques financières du mois en cours
    const currentMonth = new Date()
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    const monthlyRevenue = await prisma.announcement.findMany({
      where: {
        authorId: session.user.id,
        deliveries: {
          some: {
            status: 'DELIVERED',
            completedAt: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          }
        }
      },
      include: {
        deliveries: {
          where: {
            status: 'DELIVERED',
            completedAt: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          }
        }
      }
    })

    const totalMonthlyRevenue = monthlyRevenue.reduce((sum, announcement) => {
      return sum + announcement.deliveries.length * parseFloat(announcement.price.toString())
    }, 0)

    // Commission EcoDeli (15% par défaut, ou selon contrat)
    const commissionRate = merchant.contract?.commissionRate || 0.15
    const ecoDeliCommission = totalMonthlyRevenue * commissionRate
    const merchantEarnings = totalMonthlyRevenue - ecoDeliCommission

    // Facturation en attente
    const pendingBills = await prisma.merchantBill.findMany({
      where: {
        merchantId: merchant.id,
        status: 'PENDING'
      },
      orderBy: { dueDate: 'asc' },
      take: 5
    })

    // Statistiques lâcher de chariot
    const cartDropStats = await prisma.cartDropOrder.groupBy({
      by: ['status'],
      where: {
        merchantId: merchant.id,
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        status: true
      }
    })

    // Évaluations récentes
    const recentReviews = await prisma.review.findMany({
      where: {
        revieweeId: session.user.id,
        revieweeType: 'MERCHANT'
      },
      include: {
        reviewer: {
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

    const averageRating = await prisma.review.aggregate({
      where: {
        revieweeId: session.user.id,
        revieweeType: 'MERCHANT'
      },
      _avg: {
        overallRating: true
      }
    })

    // Alertes et notifications importantes
    const alerts = []

    // Vérifier le statut du contrat
    if (!merchant.contract) {
      alerts.push({
        type: 'WARNING',
        title: 'Contrat manquant',
        message: 'Aucun contrat EcoDeli n\'est associé à votre compte',
        actionUrl: '/merchant/contract'
      })
    } else if (merchant.contract.status === 'PENDING') {
      alerts.push({
        type: 'INFO',
        title: 'Contrat en attente',
        message: 'Votre contrat est en cours de validation par EcoDeli',
        actionUrl: '/merchant/contract'
      })
    } else if (merchant.contract.expiresAt && merchant.contract.expiresAt < new Date()) {
      alerts.push({
        type: 'ERROR',
        title: 'Contrat expiré',
        message: 'Votre contrat EcoDeli a expiré, veuillez le renouveler',
        actionUrl: '/merchant/contract'
      })
    }

    // Vérifier les factures en retard
    const overdueBills = pendingBills.filter(bill => bill.dueDate < new Date())
    if (overdueBills.length > 0) {
      alerts.push({
        type: 'ERROR',
        title: 'Factures en retard',
        message: `${overdueBills.length} facture(s) en retard de paiement`,
        actionUrl: '/merchant/billing'
      })
    }

    // Recommandations intelligentes
    const recommendations = []

    // Recommandation basée sur les performances
    if (activeAnnouncements < 3) {
      recommendations.push({
        type: 'GROWTH',
        title: 'Augmentez votre visibilité',
        description: 'Créez plus d\'annonces pour attirer plus de clients',
        actionText: 'Créer une annonce',
        actionUrl: '/merchant/announcements/create'
      })
    }

    // Recommandation lâcher de chariot
    const cartDropCount = cartDropStats.reduce((sum, stat) => sum + stat._count.status, 0)
    if (cartDropCount === 0) {
      recommendations.push({
        type: 'FEATURE',
        title: 'Activez le lâcher de chariot',
        description: 'Proposez la livraison à domicile directement en caisse',
        actionText: 'Configurer',
        actionUrl: '/merchant/cart-drop/setup'
      })
    }

    // Actions rapides basées sur le statut
    const quickActions = [
      {
        title: 'Créer une annonce',
        description: 'Publier un nouveau service',
        icon: 'plus',
        url: '/merchant/announcements/create',
        color: 'blue'
      },
      {
        title: 'Voir les commandes',
        description: 'Gérer les commandes en cours',
        icon: 'shopping-cart',
        url: '/merchant/orders',
        color: 'green',
        badge: recentOrders.filter(order => order.status === 'PENDING').length
      },
      {
        title: 'Facturation',
        description: 'Consulter les factures',
        icon: 'file-text',
        url: '/merchant/billing',
        color: 'orange',
        badge: pendingBills.length
      },
      {
        title: 'Analytics',
        description: 'Voir les statistiques',
        icon: 'bar-chart',
        url: '/merchant/analytics',
        color: 'purple'
      }
    ]

    // Formater les données pour l'affichage
    const dashboardData = {
      merchant: {
        businessName: merchant.business?.name || merchant.user.profile?.firstName + ' ' + merchant.user.profile?.lastName,
        businessType: merchant.business?.type,
        logo: merchant.business?.logo,
        address: merchant.business?.address,
        phone: merchant.business?.phone,
        email: merchant.user.email,
        memberSince: merchant.createdAt,
        verificationStatus: merchant.verificationStatus,
        rating: averageRating._avg.overallRating || 0,
        totalReviews: recentReviews.length
      },
      contract: merchant.contract ? {
        type: merchant.contract.type,
        status: merchant.contract.status,
        commissionRate: merchant.contract.commissionRate,
        signedAt: merchant.contract.signedAt,
        expiresAt: merchant.contract.expiresAt,
        renewalDate: merchant.contract.renewalDate
      } : null,
      stats: {
        announcements: {
          total: totalAnnouncements,
          active: activeAnnouncements,
          byStatus: announcementStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.status
            return acc
          }, {} as Record<string, number>)
        },
        orders: {
          total: recentOrders.length,
          byStatus: cartDropStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.status
            return acc
          }, {} as Record<string, number>)
        },
        financial: {
          monthlyRevenue: totalMonthlyRevenue,
          merchantEarnings,
          ecoDeliCommission,
          commissionRate,
          pendingBills: pendingBills.length,
          overdueBills: overdueBills.length
        }
      },
      recentActivity: {
        announcements: recentAnnouncements.map(announcement => ({
          id: announcement.id,
          title: announcement.title,
          type: announcement.type,
          price: announcement.price,
          status: announcement.status,
          createdAt: announcement.createdAt,
          deliveriesCount: announcement._count.deliveries,
          latestDelivery: announcement.deliveries[0] || null
        })),
        orders: recentOrders.map(order => ({
          id: order.id,
          clientName: `${order.client.profile?.firstName} ${order.client.profile?.lastName}`,
          items: order.items,
          totalAmount: order.totalAmount,
          deliveryAddress: order.deliveryAddress,
          status: order.status,
          createdAt: order.createdAt,
          delivery: order.delivery
        })),
        reviews: recentReviews.map(review => ({
          id: review.id,
          reviewerName: `${review.reviewer.profile?.firstName} ${review.reviewer.profile?.lastName}`,
          rating: review.overallRating,
          comment: review.comment,
          createdAt: review.createdAt
        }))
      },
      pendingBills: pendingBills.map(bill => ({
        id: bill.id,
        amount: bill.amount,
        dueDate: bill.dueDate,
        description: bill.description,
        isOverdue: bill.dueDate < new Date()
      })),
      alerts,
      recommendations,
      quickActions
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    return handleApiError(error, 'fetching merchant dashboard')
  }
} 