import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🏪 [GET /api/merchant/dashboard] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil commerçant
    const merchant = await db.merchant.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        contract: true,
        announcements: {
          include: {
            deliveries: {
              include: {
                payment: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Profil commerçant non trouvé' }, { status: 404 })
    }

    // Calculer les statistiques
    const allAnnouncements = await db.announcement.findMany({
      where: { 
        authorId: user.id,
        author: {
          role: 'MERCHANT'
        }
      },
      include: {
        deliveries: {
          include: {
            payment: true
          }
        }
      }
    })

    const stats = {
      totalAnnouncements: allAnnouncements.length,
      activeAnnouncements: allAnnouncements.filter(a => a.status === 'ACTIVE').length,
      completedDeliveries: allAnnouncements.filter(a => 
        a.deliveries.some(d => d.status === 'DELIVERED')
      ).length,
      totalRevenue: allAnnouncements.reduce((sum, announcement) => {
        const deliveredAmount = announcement.deliveries
          .filter(d => d.status === 'DELIVERED' && d.payment?.status === 'PAID')
          .reduce((deliverySum, delivery) => deliverySum + Number(delivery.payment?.amount || 0), 0)
        return sum + deliveredAmount
      }, 0),
      pendingDeliveries: allAnnouncements.filter(a => 
        a.deliveries.some(d => ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status))
      ).length
    }

    // Statistiques mensuelles
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const thisMonthAnnouncements = allAnnouncements.filter(a => 
      new Date(a.createdAt) >= thisMonth
    )

    const monthlyStats = {
      announcements: thisMonthAnnouncements.length,
      revenue: thisMonthAnnouncements.reduce((sum, announcement) => {
        const deliveredAmount = announcement.deliveries
          .filter(d => d.status === 'DELIVERED' && d.payment?.status === 'PAID')
          .reduce((deliverySum, delivery) => deliverySum + Number(delivery.payment?.amount || 0), 0)
        return sum + deliveredAmount
      }, 0),
      deliveries: thisMonthAnnouncements.filter(a => 
        a.deliveries.some(d => d.status === 'DELIVERED')
      ).length
    }

    // Récupérer les annonces récentes avec plus de détails
    const recentAnnouncements = await db.announcement.findMany({
      where: { 
        authorId: user.id,
        author: {
          role: 'MERCHANT'
        }
      },
      include: {
        deliveries: {
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
            payment: true
          }
        },
        _count: {
          select: {
            matches: true,
            views: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const result = {
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        businessType: merchant.businessType,
        siret: merchant.siret,
        status: merchant.status,
        isValidated: merchant.isValidated,
        validatedAt: merchant.validatedAt?.toISOString(),
        createdAt: merchant.createdAt.toISOString(),
        
        user: {
          id: merchant.user.id,
          email: merchant.user.email,
          profile: merchant.user.profile ? {
            firstName: merchant.user.profile.firstName,
            lastName: merchant.user.profile.lastName,
            phone: merchant.user.profile.phone,
            address: merchant.user.profile.address,
            city: merchant.user.profile.city,
            postalCode: merchant.user.profile.postalCode
          } : null
        },
        
        contract: merchant.contract ? {
          id: merchant.contract.id,
          type: merchant.contract.type,
          status: merchant.contract.status,
          startDate: merchant.contract.startDate.toISOString(),
          endDate: merchant.contract.endDate?.toISOString(),
          monthlyFee: Number(merchant.contract.monthlyFee),
          commissionRate: Number(merchant.contract.commissionRate)
        } : null
      },
      
      statistics: {
        ...stats,
        monthly: monthlyStats,
        conversionRate: stats.totalAnnouncements > 0 
          ? (stats.completedDeliveries / stats.totalAnnouncements * 100).toFixed(1)
          : '0.0',
        averageOrderValue: stats.completedDeliveries > 0 
          ? stats.totalRevenue / stats.completedDeliveries
          : 0
      },
      
      recentAnnouncements: recentAnnouncements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        description: announcement.description,
        type: announcement.type,
        status: announcement.status,
        basePrice: Number(announcement.basePrice),
        finalPrice: Number(announcement.finalPrice || announcement.basePrice),
        isUrgent: announcement.isUrgent,
        pickupAddress: announcement.pickupAddress,
        deliveryAddress: announcement.deliveryAddress,
        createdAt: announcement.createdAt.toISOString(),
        
        stats: {
          views: announcement._count.views,
          matches: announcement._count.matches,
          hasDeliverer: announcement.deliveries.length > 0
        },
        
        delivery: announcement.deliveries.length > 0 ? {
          id: announcement.deliveries[0].id,
          status: announcement.deliveries[0].status,
          deliverer: announcement.deliveries[0].deliverer ? {
            name: announcement.deliveries[0].deliverer.user.profile 
              ? `${announcement.deliveries[0].deliverer.user.profile.firstName || ''} ${announcement.deliveries[0].deliverer.user.profile.lastName || ''}`.trim()
              : announcement.deliveries[0].deliverer.user.email,
            phone: announcement.deliveries[0].deliverer.user.profile?.phone
          } : null,
          payment: announcement.deliveries[0].payment ? {
            amount: Number(announcement.deliveries[0].payment.amount),
            status: announcement.deliveries[0].payment.status,
            paidAt: announcement.deliveries[0].payment.paidAt?.toISOString()
          } : null
        } : null
      }))
    }

    console.log(`✅ Dashboard data récupéré pour commerçant ${merchant.id}`)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Erreur récupération dashboard commerçant:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}