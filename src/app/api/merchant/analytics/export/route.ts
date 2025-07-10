import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const exportRequestSchema = z.object({
  merchantId: z.string(),
  timeRange: z.object({
    startDate: z.string().transform(str => new Date(str)),
    endDate: z.string().transform(str => new Date(str)),
    period: z.enum(['day', 'week', 'month', 'quarter', 'year'])
  }),
  format: z.enum(['csv', 'pdf', 'excel']),
  data: z.object({}).passthrough() // Dashboard data
})

export async function POST(request: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérification du rôle
    if (session.user.role !== 'MERCHANT' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    // Validation des données
    const body = await request.json()
    const { merchantId, timeRange, format, data } = exportRequestSchema.parse(body)

    // Vérification des permissions
    if (session.user.role === 'MERCHANT' && session.user.id !== merchantId) {
      return NextResponse.json(
        { error: 'Accès refusé à ces données' },
        { status: 403 }
      )
    }

    // Génération du fichier selon le format
    let fileContent: Buffer
    let mimeType: string
    let filename: string

    const timestamp = new Date().toISOString().split('T')[0]

    switch (format) {
      case 'csv':
        fileContent = await generateCSV(data)
        mimeType = 'text/csv'
        filename = `analytics-${timestamp}.csv`
        break

      case 'excel':
        fileContent = await generateExcel(data)
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = `analytics-${timestamp}.xlsx`
        break

      case 'pdf':
        fileContent = await generatePDF(data, timeRange)
        mimeType = 'application/pdf'
        filename = `analytics-${timestamp}.pdf`
        break

      default:
        throw new Error('Format non supporté')
    }

    // Retour du fichier
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileContent.length.toString()
      }
    })

  } catch (error) {
    console.error('Erreur API export analytics:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * Génère un fichier CSV des analytics
 */
async function generateCSV(data: any): Promise<Buffer> {
  const lines: string[] = []
  
  // En-têtes
  lines.push('Métrique,Valeur,Période')
  
  // Données de revenus
  if (data.overview?.revenue) {
    const revenue = data.overview.revenue
    lines.push(`Chiffre d'affaires total,${revenue.totalRevenue},${formatPeriod(data.lastUpdated)}`)
    lines.push(`Nombre de commandes,${revenue.totalOrders},${formatPeriod(data.lastUpdated)}`)
    lines.push(`Panier moyen,${revenue.averageOrderValue.toFixed(2)},${formatPeriod(data.lastUpdated)}`)
    lines.push(`Taux de croissance,${revenue.growthRate.toFixed(2)}%,${formatPeriod(data.lastUpdated)}`)
  }
  
  // Données clients
  if (data.overview?.customers) {
    const customers = data.overview.customers
    lines.push(`Nombre total de clients,${customers.totalCustomers},${formatPeriod(data.lastUpdated)}`)
    lines.push(`Nouveaux clients,${customers.newCustomers},${formatPeriod(data.lastUpdated)}`)
    lines.push(`Clients récurrents,${customers.returningCustomers},${formatPeriod(data.lastUpdated)}`)
    lines.push(`Taux de rétention,${customers.customerRetentionRate.toFixed(2)}%,${formatPeriod(data.lastUpdated)}`)
  }
  
  // Données livraisons
  if (data.overview?.deliveries) {
    const deliveries = data.overview.deliveries
    lines.push(`Total livraisons,${deliveries.totalDeliveries},${formatPeriod(data.lastUpdated)}`)
    lines.push(`Livraisons réussies,${deliveries.successfulDeliveries},${formatPeriod(data.lastUpdated)}`)
    lines.push(`Temps de livraison moyen,${deliveries.averageDeliveryTime.toFixed(2)}h,${formatPeriod(data.lastUpdated)}`)
    lines.push(`Taux de ponctualité,${deliveries.onTimeDeliveryRate.toFixed(2)}%,${formatPeriod(data.lastUpdated)}`)
  }

  return Buffer.from(lines.join('\n'), 'utf-8')
}

/**
 * Génère un fichier Excel des analytics
 */
async function generateExcel(data: any): Promise<Buffer> {
  // Pour l'instant, on retourne un CSV formaté
  // Dans une vraie app, utiliser une lib comme 'exceljs'
  return generateCSV(data)
}

/**
 * Génère un PDF des analytics
 */
async function generatePDF(data: any, timeRange: any): Promise<Buffer> {
  // Simulation d'un PDF simple
  // Dans une vraie app, utiliser jsPDF ou puppeteer
  
  const content = `
RAPPORT ANALYTICS ECODELI
========================

Période: ${formatDate(timeRange.startDate)} - ${formatDate(timeRange.endDate)}
Généré le: ${formatDate(new Date())}

REVENUS
-------
Chiffre d'affaires: ${data.overview?.revenue?.totalRevenue || 0}€
Nombre de commandes: ${data.overview?.revenue?.totalOrders || 0}
Panier moyen: ${(data.overview?.revenue?.averageOrderValue || 0).toFixed(2)}€
Croissance: ${(data.overview?.revenue?.growthRate || 0).toFixed(2)}%

CLIENTS
-------
Total clients: ${data.overview?.customers?.totalCustomers || 0}
Nouveaux clients: ${data.overview?.customers?.newCustomers || 0}
Clients récurrents: ${data.overview?.customers?.returningCustomers || 0}
Taux de rétention: ${(data.overview?.customers?.customerRetentionRate || 0).toFixed(2)}%

LIVRAISONS
----------
Total livraisons: ${data.overview?.deliveries?.totalDeliveries || 0}
Livraisons réussies: ${data.overview?.deliveries?.successfulDeliveries || 0}
Temps moyen: ${(data.overview?.deliveries?.averageDeliveryTime || 0).toFixed(2)}h
Taux de ponctualité: ${(data.overview?.deliveries?.onTimeDeliveryRate || 0).toFixed(2)}%

INSIGHTS PRÉDICTIFS
------------------
${data.insights?.opportunities?.map((opp: any) => 
  `- ${opp.opportunity}: ${opp.potentialRevenue}€ (${opp.timeline})`
).join('\n') || 'Aucune opportunité identifiée'}

RISQUES IDENTIFIÉS
------------------
${data.insights?.riskFactors?.map((risk: any) => 
  `- ${risk.factor} (${risk.impact}, ${(risk.probability * 100).toFixed(0)}%)`
).join('\n') || 'Aucun risque identifié'}
`

  return Buffer.from(content, 'utf-8')
}

/**
 * Formate une date
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR')
}

/**
 * Formate une période
 */
function formatPeriod(date: Date | string): string {
  return formatDate(date)
} 