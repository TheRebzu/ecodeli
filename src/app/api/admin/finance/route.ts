import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { handleApiError, createError } from '@/lib/errors'
import jsPDF from 'jspdf'

const financeQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.enum(['revenue', 'commissions', 'expenses', 'summary']).default('summary')
})

// GET - Gestion financière globale de la plateforme
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const { searchParams } = new URL(request.url)
    const filters = financeQuerySchema.parse({
      period: searchParams.get('period') || 'monthly',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      type: searchParams.get('type') || 'summary'
    })

    // Définir les dates par défaut selon la période
    const { startDate, endDate } = getDateRange(filters.period, filters.startDate, filters.endDate)

    let data
    switch (filters.type) {
      case 'revenue':
        data = await getRevenueAnalytics(startDate, endDate, filters.period)
        break
      case 'commissions':
        data = await getCommissionAnalytics(startDate, endDate, filters.period)
        break
      case 'expenses':
        data = await getExpenseAnalytics(startDate, endDate, filters.period)
        break
      default:
        data = await getFinancialSummary(startDate, endDate, filters.period)
    }

    return NextResponse.json({
      success: true,
      data: {
        period: filters.period,
        dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        ...data
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// POST - Générer des rapports financiers
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return handleApiError(createError.auth.insufficientPermissions())
    }

    const body = await request.json()
    const reportSchema = z.object({
      type: z.enum(['monthly-report', 'yearly-report', 'tax-report', 'commission-report']),
      period: z.string(), // Format: YYYY-MM ou YYYY
      format: z.enum(['pdf', 'json']).default('pdf'),
      includeDetails: z.boolean().default(true)
    })

    const { type, period, format, includeDetails } = reportSchema.parse(body)

    const reportData = await generateFinancialReport(type, period, includeDetails)

    if (format === 'pdf') {
      const pdfBuffer = await generateFinancialReportPDF(reportData, type, period)
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ecodeli-${type}-${period}.pdf"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: reportData
    })

  } catch (error) {
    return handleApiError(error)
  }
}

// Fonction utilitaire pour calculer les plages de dates
function getDateRange(period: string, startDateStr?: string, endDateStr?: string) {
  let startDate: Date, endDate: Date

  if (startDateStr && endDateStr) {
    startDate = new Date(startDateStr)
    endDate = new Date(endDateStr)
  } else {
    endDate = new Date()
    
    switch (period) {
      case 'daily':
        startDate = new Date()
        startDate.setDate(endDate.getDate() - 30) // 30 jours
        break
      case 'weekly':
        startDate = new Date()
        startDate.setDate(endDate.getDate() - 84) // 12 semaines
        break
      case 'monthly':
        startDate = new Date()
        startDate.setMonth(endDate.getMonth() - 12) // 12 mois
        break
      case 'yearly':
        startDate = new Date()
        startDate.setFullYear(endDate.getFullYear() - 5) // 5 ans
        break
      default:
        startDate = new Date()
        startDate.setMonth(endDate.getMonth() - 12)
    }
  }

  return { startDate, endDate }
}

// Analyse des revenus
async function getRevenueAnalytics(startDate: Date, endDate: Date, period: string) {
  const [
    totalRevenue,
    revenueBySource,
    revenueTimeline,
    topClients,
    growthRate
  ] = await Promise.all([
    // Revenus totaux
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true },
      _count: { id: true }
    }),

    // Revenus par source
    prisma.payment.groupBy({
      by: ['type'],
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true },
      _count: { id: true }
    }),

    // Timeline des revenus
    getRevenueTimeline(startDate, endDate, period),

    // Top clients contributeurs
    prisma.payment.groupBy({
      by: ['userId'],
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10
    }).then(async (results) => {
      const userIds = results.map(r => r.userId).filter(Boolean)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true }
      })
      
      return results.map(result => {
        const user = users.find(u => u.id === result.userId)
        return {
          userId: result.userId,
          name: user ? `${user.firstName} ${user.lastName}` : 'Utilisateur supprimé',
          email: user?.email,
          totalAmount: result._sum.amount || 0,
          transactionCount: result._count.id
        }
      })
    }),

    // Taux de croissance
    calculateGrowthRate(startDate, endDate)
  ])

  return {
    summary: {
      total: totalRevenue._sum.amount || 0,
      transactions: totalRevenue._count.id || 0,
      average: totalRevenue._count.id > 0 ? (totalRevenue._sum.amount || 0) / totalRevenue._count.id : 0,
      growthRate
    },
    bySource: revenueBySource.map(source => ({
      type: source.type,
      amount: source._sum.amount || 0,
      count: source._count.id,
      percentage: ((source._sum.amount || 0) / (totalRevenue._sum.amount || 1)) * 100
    })),
    timeline: revenueTimeline,
    topClients
  }
}

// Analyse des commissions
async function getCommissionAnalytics(startDate: Date, endDate: Date, period: string) {
  const [
    totalCommissions,
    commissionsByRole,
    commissionTimeline,
    topEarners
  ] = await Promise.all([
    // Commissions totales
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { platformFee: true }
    }),

    // Commissions par type d'utilisateur
    prisma.$queryRaw`
      SELECT 
        u.role,
        SUM(p.platform_fee) as total_commission,
        COUNT(p.id) as transaction_count
      FROM payments p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'COMPLETED' 
        AND p.paid_at >= ${startDate}
        AND p.paid_at <= ${endDate}
      GROUP BY u.role
    `,

    // Timeline des commissions
    getCommissionTimeline(startDate, endDate, period),

    // Top générateurs de commissions
    prisma.monthlyProviderInvoice.findMany({
      where: {
        invoiceDate: { gte: startDate, lte: endDate }
      },
      include: {
        provider: {
          select: { firstName: true, lastName: true, role: true }
        }
      },
      orderBy: { commissionAmount: 'desc' },
      take: 10
    })
  ])

  return {
    summary: {
      total: totalCommissions._sum.platformFee || 0,
      averageRate: 15, // 15% moyen
      projectedMonthly: ((totalCommissions._sum.platformFee || 0) / Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) * 30
    },
    byRole: commissionsByRole,
    timeline: commissionTimeline,
    topEarners: topEarners.map(invoice => ({
      name: `${invoice.provider.firstName} ${invoice.provider.lastName}`,
      role: invoice.provider.role,
      commission: invoice.commissionAmount,
      revenue: invoice.subtotalAmount
    }))
  }
}

// Analyse des dépenses
async function getExpenseAnalytics(startDate: Date, endDate: Date, period: string) {
  // Les dépenses incluent les paiements aux prestataires, frais Stripe, etc.
  const [
    providerPayouts,
    stripeFeess,
    operationalExpenses
  ] = await Promise.all([
    // Paiements aux prestataires
    prisma.monthlyProviderInvoice.aggregate({
      where: {
        invoiceDate: { gte: startDate, lte: endDate },
        status: { in: ['SENT', 'PAID'] }
      },
      _sum: { totalAmount: true },
      _count: { id: true }
    }),

    // Frais Stripe (estimés à 2.9% + 0.25¬)
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    }).then(result => {
      const totalAmount = result._sum.amount || 0
      return {
        estimated: totalAmount * 0.029 + 0.25, // 2.9% + 0.25¬ par transaction
        percentage: 2.9
      }
    }),

    // Dépenses opérationnelles (simulées - à remplacer par vraies données)
    Promise.resolve({
      hosting: 500,
      marketing: 2000,
      staff: 15000,
      legal: 800,
      other: 1200
    })
  ])

  const totalExpenses = (providerPayouts._sum.totalAmount || 0) + stripeFeess.estimated + 
    Object.values(operationalExpenses).reduce((sum, expense) => sum + expense, 0)

  return {
    summary: {
      total: totalExpenses,
      providerPayouts: providerPayouts._sum.totalAmount || 0,
      stripeFees: stripeFeess.estimated,
      operational: Object.values(operationalExpenses).reduce((sum, expense) => sum + expense, 0)
    },
    breakdown: {
      providerPayouts: {
        amount: providerPayouts._sum.totalAmount || 0,
        count: providerPayouts._count.id,
        percentage: ((providerPayouts._sum.totalAmount || 0) / totalExpenses) * 100
      },
      stripeFees: {
        amount: stripeFeess.estimated,
        percentage: (stripeFeess.estimated / totalExpenses) * 100
      },
      operational: operationalExpenses
    }
  }
}

// Résumé financier complet
async function getFinancialSummary(startDate: Date, endDate: Date, period: string) {
  const [revenue, commissions, expenses] = await Promise.all([
    getRevenueAnalytics(startDate, endDate, period),
    getCommissionAnalytics(startDate, endDate, period),
    getExpenseAnalytics(startDate, endDate, period)
  ])

  const netProfit = revenue.summary.total - expenses.summary.total
  const profitMargin = revenue.summary.total > 0 ? (netProfit / revenue.summary.total) * 100 : 0

  return {
    revenue: revenue.summary,
    commissions: commissions.summary,
    expenses: expenses.summary,
    profit: {
      net: netProfit,
      margin: profitMargin,
      roa: 0, // Return on Assets - à calculer avec les actifs
      growth: await calculateProfitGrowth(startDate, endDate)
    },
    kpis: {
      revenuePerUser: await calculateRevenuePerUser(startDate, endDate),
      customerLifetimeValue: await calculateCLV(startDate, endDate),
      churnRate: await calculateChurnRate(startDate, endDate),
      acquisitionCost: 0 // À calculer avec les données marketing
    }
  }
}

// Timeline des revenus
async function getRevenueTimeline(startDate: Date, endDate: Date, period: string) {
  const groupBy = period === 'daily' ? 'DATE(paid_at)' : 
                  period === 'weekly' ? 'YEARWEEK(paid_at)' :
                  period === 'monthly' ? 'DATE_FORMAT(paid_at, "%Y-%m")' :
                  'YEAR(paid_at)'

  const results = await prisma.$queryRaw`
    SELECT 
      ${groupBy} as period,
      SUM(amount) as revenue,
      COUNT(id) as transactions
    FROM payments 
    WHERE status = 'COMPLETED' 
      AND paid_at >= ${startDate}
      AND paid_at <= ${endDate}
    GROUP BY ${groupBy}
    ORDER BY period
  `

  return results
}

// Timeline des commissions
async function getCommissionTimeline(startDate: Date, endDate: Date, period: string) {
  const groupBy = period === 'daily' ? 'DATE(paid_at)' : 
                  period === 'weekly' ? 'YEARWEEK(paid_at)' :
                  period === 'monthly' ? 'DATE_FORMAT(paid_at, "%Y-%m")' :
                  'YEAR(paid_at)'

  const results = await prisma.$queryRaw`
    SELECT 
      ${groupBy} as period,
      SUM(platform_fee) as commission
    FROM payments 
    WHERE status = 'COMPLETED' 
      AND paid_at >= ${startDate}
      AND paid_at <= ${endDate}
    GROUP BY ${groupBy}
    ORDER BY period
  `

  return results
}

// Calculer le taux de croissance
async function calculateGrowthRate(startDate: Date, endDate: Date) {
  const periodDuration = endDate.getTime() - startDate.getTime()
  const previousStart = new Date(startDate.getTime() - periodDuration)
  
  const [current, previous] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: previousStart, lte: startDate }
      },
      _sum: { amount: true }
    })
  ])

  const currentAmount = current._sum.amount || 0
  const previousAmount = previous._sum.amount || 0

  return previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0
}

// Générer un rapport financier complet
async function generateFinancialReport(type: string, period: string, includeDetails: boolean) {
  // Implémentation selon le type de rapport
  const [year, month] = period.includes('-') ? period.split('-').map(Number) : [parseInt(period), null]
  
  const startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1)
  const endDate = month ? new Date(year, month, 0) : new Date(year, 11, 31)

  return await getFinancialSummary(startDate, endDate, month ? 'monthly' : 'yearly')
}

// Générer PDF du rapport financier
async function generateFinancialReportPDF(data: any, type: string, period: string): Promise<Buffer> {
  const doc = new jsPDF()
  
  // En-tête
  doc.setFontSize(20)
  doc.text('EcoDeli - Rapport Financier', 20, 30)
  
  doc.setFontSize(12)
  doc.text(`Type: ${type}`, 20, 45)
  doc.text(`Période: ${period}`, 20, 55)
  doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 65)
  
  // Résumé
  let yPos = 90
  doc.setFontSize(16)
  doc.text('Résumé Financier', 20, yPos)
  
  yPos += 20
  doc.setFontSize(12)
  doc.text(`Revenus totaux: ${data.revenue.total.toFixed(2)} ¬`, 20, yPos)
  doc.text(`Dépenses totales: ${data.expenses.total.toFixed(2)} ¬`, 20, yPos + 10)
  doc.text(`Profit net: ${data.profit.net.toFixed(2)} ¬`, 20, yPos + 20)
  doc.text(`Marge bénéficiaire: ${data.profit.margin.toFixed(1)}%`, 20, yPos + 30)
  
  return Buffer.from(doc.output('arraybuffer'))
}

// Fonctions utilitaires supplémentaires
async function calculateRevenuePerUser(startDate: Date, endDate: Date) {
  const [revenue, users] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: 'COMPLETED', paidAt: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    }),
    prisma.user.count({
      where: { createdAt: { lte: endDate } }
    })
  ])
  
  return users > 0 ? (revenue._sum.amount || 0) / users : 0
}

async function calculateCLV(startDate: Date, endDate: Date) {
  // Customer Lifetime Value simplifié
  const avgOrderValue = await prisma.payment.aggregate({
    where: { status: 'COMPLETED', paidAt: { gte: startDate, lte: endDate } },
    _avg: { amount: true }
  })
  
  return (avgOrderValue._avg.amount || 0) * 12 // Estimation 12 commandes par an
}

async function calculateChurnRate(startDate: Date, endDate: Date) {
  // Taux de désabonnement simplifié
  const [activeStart, activeEnd] = await Promise.all([
    prisma.user.count({
      where: { lastLoginAt: { gte: startDate }, createdAt: { lt: startDate } }
    }),
    prisma.user.count({
      where: { lastLoginAt: { gte: endDate } }
    })
  ])
  
  return activeStart > 0 ? ((activeStart - activeEnd) / activeStart) * 100 : 0
}

async function calculateProfitGrowth(startDate: Date, endDate: Date) {
  // Calculer la croissance du profit par rapport à la période précédente
  return 0 // Placeholder
}