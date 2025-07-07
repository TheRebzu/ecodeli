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
            delivery: {
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
        delivery: {
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
        a.delivery && a.delivery.status === 'DELIVERED'
      ).length,
      totalRevenue: allAnnouncements.reduce((sum, announcement) => {
        if (announcement.delivery && 
            announcement.delivery.status === 'DELIVERED' && 
            announcement.delivery.payment?.status === 'PAID') {
          return sum + Number(announcement.delivery.payment?.amount || 0)
        }
        return sum
      }, 0),
      pendingDeliveries: allAnnouncements.filter(a => 
        a.delivery && ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(a.delivery.status)
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
        if (announcement.delivery && 
            announcement.delivery.status === 'DELIVERED' && 
            announcement.delivery.payment?.status === 'PAID') {
          return sum + Number(announcement.delivery.payment?.amount || 0)
        }
        return sum
      }, 0),
      deliveries: thisMonthAnnouncements.filter(a => 
        a.delivery && a.delivery.status === 'DELIVERED'
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
                  delivery: {
          include: {
            deliverer: {
              include: {
                profile: true
              }
            },
            payment: true
          }
        },
        _count: {
          select: {
            matches: true,
            reviews: true
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
          startDate: merchant.contract.startDate?.toISOString(),
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
          reviews: announcement._count.reviews,
          matches: announcement._count.matches,
          hasDeliverer: !!announcement.delivery
        },
        
        delivery: announcement.delivery ? {
          id: announcement.delivery.id,
          status: announcement.delivery.status,
          deliverer: announcement.delivery.deliverer ? {
            name: announcement.delivery.deliverer.profile 
              ? `${announcement.delivery.deliverer.profile.firstName || ''} ${announcement.delivery.deliverer.profile.lastName || ''}`.trim()
              : announcement.delivery.deliverer.email,
            phone: announcement.delivery.deliverer.profile?.phone
          } : null,
          payment: announcement.delivery.payment ? {
            amount: Number(announcement.delivery.payment.amount),
            status: announcement.delivery.payment.status,
            paidAt: announcement.delivery.payment.paidAt?.toISOString()
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