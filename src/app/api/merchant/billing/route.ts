import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'

/**
 * GET - Informations de facturation et historique du commerçant
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

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current' // current, last, year
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Récupérer le profil commerçant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id },
      include: { contract: true }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 })
    }

    // Calculer les dates selon la période
    const now = new Date()
    let startDate: Date, endDate: Date

    switch (period) {
      case 'current':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'last':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    // Récupérer les livraisons facturables de la période
    const deliveriesInPeriod = await prisma.delivery.findMany({
      where: {
        announcement: {
          authorId: session.user.id
        },
        status: 'DELIVERED',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        announcement: {
          select: {
            title: true,
            type: true,
            price: true,
            pickupAddress: true,
            deliveryAddress: true
          }
        },
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
        },
        payment: true
      },
      orderBy: { completedAt: 'desc' }
    })

    // Calculer les métriques financières
    const totalRevenue = deliveriesInPeriod.reduce((sum, delivery) => {
      return sum + parseFloat(delivery.announcement.price.toString())
    }, 0)

    const commissionRate = merchant.commissionRate
    const totalCommission = totalRevenue * commissionRate
    const netRevenue = totalRevenue - totalCommission

    // Statistiques par type de service
    const revenueByType = deliveriesInPeriod.reduce((acc, delivery) => {
      const type = delivery.announcement.type
      const amount = parseFloat(delivery.announcement.price.toString())
      
      if (!acc[type]) {
        acc[type] = { count: 0, revenue: 0, commission: 0 }
      }
      
      acc[type].count += 1
      acc[type].revenue += amount
      acc[type].commission += amount * commissionRate
      
      return acc
    }, {} as Record<string, { count: number, revenue: number, commission: number }>)

    // Récupérer les factures existantes
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const totalInvoices = await prisma.invoice.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Évolution mensuelle (12 derniers mois)
    const monthlyEvolution = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthDeliveries = await prisma.delivery.count({
        where: {
          announcement: {
            authorId: session.user.id
          },
          status: 'DELIVERED',
          completedAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })

      const monthRevenue = await prisma.delivery.findMany({
        where: {
          announcement: {
            authorId: session.user.id
          },
          status: 'DELIVERED',
          completedAt: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        include: {
          announcement: {
            select: { price: true }
          }
        }
      })

      const monthTotal = monthRevenue.reduce((sum, delivery) => {
        return sum + parseFloat(delivery.announcement.price.toString())
      }, 0)

      monthlyEvolution.push({
        month: monthStart.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' }),
        deliveries: monthDeliveries,
        revenue: monthTotal,
        commission: monthTotal * commissionRate,
        net: monthTotal - (monthTotal * commissionRate)
      })
    }

    // Prochaine facturation (le 30 de chaque mois)
    const nextBilling = new Date(now.getFullYear(), now.getMonth() + 1, 30)
    if (now.getDate() >= 30) {
      nextBilling.setMonth(nextBilling.getMonth() + 1)
    }

    const response = {
      merchant: {
        id: merchant.id,
        companyName: merchant.companyName,
        siret: merchant.siret,
        vatNumber: merchant.vatNumber,
        commissionRate: merchant.commissionRate,
        contractStatus: merchant.contractStatus
      },
      currentPeriod: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalDeliveries: deliveriesInPeriod.length,
        totalRevenue,
        totalCommission,
        netRevenue,
        averageOrderValue: deliveriesInPeriod.length > 0 ? totalRevenue / deliveriesInPeriod.length : 0
      },
      revenueByType,
      deliveries: deliveriesInPeriod.map(delivery => ({
        id: delivery.id,
        announcementTitle: delivery.announcement.title,
        type: delivery.announcement.type,
        price: delivery.announcement.price,
        commission: parseFloat(delivery.announcement.price.toString()) * commissionRate,
        net: parseFloat(delivery.announcement.price.toString()) * (1 - commissionRate),
        delivererName: `${delivery.deliverer.user.profile?.firstName} ${delivery.deliverer.user.profile?.lastName}`,
        completedAt: delivery.completedAt,
        paymentStatus: delivery.payment?.status || 'PENDING'
      })),
      invoices: invoices.map(invoice => ({
        id: invoice.id,
        number: invoice.invoiceNumber,
        amount: invoice.amount,
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        downloadUrl: invoice.pdfUrl,
        createdAt: invoice.createdAt
      })),
      pagination: {
        page,
        limit,
        total: totalInvoices,
        totalPages: Math.ceil(totalInvoices / limit)
      },
      monthlyEvolution,
      nextBilling: {
        date: nextBilling.toISOString(),
        estimatedAmount: totalCommission,
        status: 'PENDING'
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    return handleApiError(error, 'fetching merchant billing')
  }
}

/**
 * POST - Demander une facture ou effectuer une action de facturation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden - Merchant access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, deliveryIds, period } = body

    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 })
    }

    if (action === 'generate_invoice') {
      // Générer une facture pour les livraisons spécifiées
      if (!deliveryIds || !Array.isArray(deliveryIds)) {
        return NextResponse.json({ error: 'deliveryIds required' }, { status: 400 })
      }

      const deliveries = await prisma.delivery.findMany({
        where: {
          id: { in: deliveryIds },
          announcement: {
            authorId: session.user.id
          },
          status: 'DELIVERED'
        },
        include: {
          announcement: {
            select: {
              title: true,
              type: true,
              price: true
            }
          }
        }
      })

      if (deliveries.length === 0) {
        return NextResponse.json({ error: 'No valid deliveries found' }, { status: 404 })
      }

      const totalAmount = deliveries.reduce((sum, delivery) => {
        return sum + parseFloat(delivery.announcement.price.toString())
      }, 0)

      const commissionAmount = totalAmount * merchant.commissionRate

      // Générer le numéro de facture
      const invoiceCount = await prisma.invoice.count({
        where: { userId: session.user.id }
      })
      const invoiceNumber = `FAC-${merchant.siret.slice(-4)}-${String(invoiceCount + 1).padStart(4, '0')}`

      // Créer la facture
      const invoice = await prisma.invoice.create({
        data: {
          userId: session.user.id,
          invoiceNumber,
          amount: commissionAmount,
          status: 'PENDING',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
          description: `Commission EcoDeli - ${deliveries.length} livraison(s)`,
          items: deliveries.map(delivery => ({
            description: delivery.announcement.title,
            type: delivery.announcement.type,
            amount: parseFloat(delivery.announcement.price.toString()),
            commission: parseFloat(delivery.announcement.price.toString()) * merchant.commissionRate,
            deliveryId: delivery.id
          }))
        }
      })

      return NextResponse.json({
        invoice: {
          id: invoice.id,
          number: invoice.invoiceNumber,
          amount: invoice.amount,
          status: invoice.status,
          dueDate: invoice.dueDate,
          createdAt: invoice.createdAt
        },
        message: 'Facture générée avec succès'
      }, { status: 201 })

    } else if (action === 'download_invoice') {
      const { invoiceId } = body
      
      if (!invoiceId) {
        return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
      }

      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          userId: session.user.id
        }
      })

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      }

      // TODO: Générer le PDF de la facture avec jsPDF
      // Pour l'instant, retourner l'URL de téléchargement
      
      return NextResponse.json({
        downloadUrl: `/api/merchant/invoices/${invoice.id}/download`,
        invoice: {
          id: invoice.id,
          number: invoice.invoiceNumber,
          amount: invoice.amount,
          status: invoice.status
        }
      })

    } else if (action === 'request_payment') {
      // Demander le paiement d'une facture
      const { invoiceId } = body
      
      if (!invoiceId) {
        return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
      }

      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          userId: session.user.id,
          status: 'PENDING'
        }
      })

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found or already paid' }, { status: 404 })
      }

      // Marquer comme en attente de paiement
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAYMENT_REQUESTED',
          paymentRequestedAt: new Date()
        }
      })

      return NextResponse.json({
        message: 'Demande de paiement envoyée',
        invoice: {
          id: invoice.id,
          status: 'PAYMENT_REQUESTED'
        }
      })
    }

    return NextResponse.json({ error: 'Action not recognized' }, { status: 400 })

  } catch (error) {
    return handleApiError(error, 'processing merchant billing action')
  }
}
