import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET - Exporter les gains en CSV
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json(
        { error: 'Profil livreur non trouvé' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = searchParams.get('format') || 'csv'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Dates de début et fin requises' },
        { status: 400 }
      )
    }

    // Récupérer les livraisons avec gains
    const deliveries = await prisma.delivery.findMany({
      where: {
        delivererId: deliverer.userId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        announcement: {
          select: {
            title: true,
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
          }
        },
        payment: {
          select: {
            amount: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculer les gains
    const earnings = deliveries.map(delivery => {
      const amount = delivery.payment?.amount || 0
      const commission = amount * 0.15 // 15% de commission
      const netAmount = amount - commission
      
      return {
        id: delivery.id,
        deliveryId: delivery.id,
        announcementTitle: delivery.announcement.title,
        clientName: `${delivery.announcement.author.profile?.firstName || ''} ${delivery.announcement.author.profile?.lastName || ''}`.trim(),
        amount: amount,
        commission: commission,
        netAmount: netAmount,
        status: delivery.status,
        date: delivery.createdAt.toISOString(),
        paidAt: delivery.payment?.createdAt?.toISOString()
      }
    })

    if (format === 'csv') {
      // Générer CSV
      const csvHeaders = [
        'ID Livraison',
        'Titre Annonce',
        'Client',
        'Montant Total',
        'Commission',
        'Gain Net',
        'Statut',
        'Date Livraison',
        'Date Paiement'
      ]

      const csvRows = earnings.map(earning => [
        earning.deliveryId,
        `"${earning.announcementTitle}"`,
        `"${earning.clientName}"`,
        earning.amount.toFixed(2),
        earning.commission.toFixed(2),
        earning.netAmount.toFixed(2),
        earning.status,
        new Date(earning.date).toLocaleDateString('fr-FR'),
        earning.paidAt ? new Date(earning.paidAt).toLocaleDateString('fr-FR') : ''
      ])

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.join(','))
        .join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="gains-${startDate}-${endDate}.csv"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      earnings
    })

  } catch (error) {
    console.error('Error exporting earnings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export' },
      { status: 500 }
    )
  }
} 