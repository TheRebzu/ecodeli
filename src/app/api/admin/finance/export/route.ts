import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET - Exporter les données financières en CSV (Admin seulement)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'revenue'
    const period = searchParams.get('period') || 'last12months'

    const dateRange = getDateRange(period)
    const csvData = await generateCSVData(type, dateRange)

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="financial_${type}_${period}.csv"`
      }
    })

  } catch (error) {
    console.error('Error exporting financial data:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export' },
      { status: 500 }
    )
  }
}

function getDateRange(period: string) {
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case 'last30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'last3months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      break
    case 'last6months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      break
    case 'last12months':
      startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1)
      break
    case 'currentyear':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1)
  }
  
  return { startDate, endDate: now }
}

async function generateCSVData(type: string, dateRange: { startDate: Date; endDate: Date }) {
  const { startDate, endDate } = dateRange

  switch (type) {
    case 'revenue':
      return await generateRevenueCSV(startDate, endDate)
    case 'commissions':
      return await generateCommissionsCSV(startDate, endDate)
    case 'transactions':
      return await generateTransactionsCSV(startDate, endDate)
    default:
      throw new Error('Type d\'export non supporté')
  }
}

async function generateRevenueCSV(startDate: Date, endDate: Date) {
  const interventions = await prisma.intervention.findMany({
    where: {
      isCompleted: true,
      completedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      booking: {
        include: {
          service: true,
          provider: {
            include: {
              user: true
            }
          },
          client: {
            include: {
              user: true
            }
          }
        }
      }
    },
    orderBy: {
      completedAt: 'desc'
    }
  })

  let csv = 'Date,Prestataire,Client,Service,Durée (min),Prix Horaire,Montant Total,Commission,Net Prestataire\\n'

  interventions.forEach(intervention => {
    const duration = intervention.actualDuration || intervention.booking.duration
    const hourlyRate = intervention.booking.service.basePrice
    const totalAmount = (duration / 60) * hourlyRate
    const commission = totalAmount * 0.10
    const netAmount = totalAmount - commission

    csv += [
      intervention.completedAt?.toLocaleDateString('fr-FR') || '',
      `"${intervention.booking.provider.user.name}"`,
      `"${intervention.booking.client.user.name}"`,
      `"${intervention.booking.service.name}"`,
      duration,
      hourlyRate.toFixed(2),
      totalAmount.toFixed(2),
      commission.toFixed(2),
      netAmount.toFixed(2)
    ].join(',') + '\\n'
  })

  return csv
}

async function generateCommissionsCSV(startDate: Date, endDate: Date) {
  const interventions = await prisma.intervention.findMany({
    where: {
      isCompleted: true,
      completedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      booking: {
        include: {
          service: true,
          provider: {
            include: {
              user: true
            }
          }
        }
      }
    },
    orderBy: {
      completedAt: 'desc'
    }
  })

  // Grouper par prestataire
  const providerData = new Map()

  interventions.forEach(intervention => {
    const providerId = intervention.booking.provider.id
    const providerName = intervention.booking.provider.user.name
    const duration = intervention.actualDuration || intervention.booking.duration
    const hourlyRate = intervention.booking.service.basePrice
    const totalAmount = (duration / 60) * hourlyRate
    const commission = totalAmount * 0.10

    if (!providerData.has(providerId)) {
      providerData.set(providerId, {
        name: providerName,
        totalRevenue: 0,
        totalCommission: 0,
        interventionsCount: 0
      })
    }

    const current = providerData.get(providerId)
    current.totalRevenue += totalAmount
    current.totalCommission += commission
    current.interventionsCount += 1
  })

  let csv = 'Prestataire,Nombre Interventions,Chiffre d\\'Affaires Total,Commission Total,Taux Commission\\n'

  Array.from(providerData.values()).forEach(provider => {
    const commissionRate = provider.totalRevenue > 0 
      ? (provider.totalCommission / provider.totalRevenue) * 100 
      : 0

    csv += [
      `"${provider.name}"`,
      provider.interventionsCount,
      provider.totalRevenue.toFixed(2),
      provider.totalCommission.toFixed(2),
      `${commissionRate.toFixed(1)}%`
    ].join(',') + '\\n'
  })

  return csv
}

async function generateTransactionsCSV(startDate: Date, endDate: Date) {
  const payments = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      booking: {
        include: {
          client: {
            include: {
              user: true
            }
          },
          provider: {
            include: {
              user: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  let csv = 'Date,Client,Prestataire,Montant,Statut,Méthode,Référence\\n'

  payments.forEach(payment => {
    csv += [
      payment.createdAt.toLocaleDateString('fr-FR'),
      `"${payment.booking.client.user.name}"`,
      `"${payment.booking.provider.user.name}"`,
      payment.amount.toFixed(2),
      payment.status,
      payment.method || 'CARD',
      payment.stripePaymentIntentId || ''
    ].join(',') + '\\n'
  })

  return csv
}