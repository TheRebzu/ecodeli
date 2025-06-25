import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { AnalyticsService, AnalyticsTimeframe } from '@/features/analytics/services/analytics.service'

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']).default('json'),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

/**
 * POST - Exporter les données analytiques
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user || !['ADMIN', 'MERCHANT', 'PROVIDER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const query = exportQuerySchema.parse(body)

    // Définir la période d'analyse
    const timeframe: AnalyticsTimeframe = getTimeframe(query)

    // Exporter les données
    const exportResult = await AnalyticsService.exportAnalytics(timeframe, query.format)

    return NextResponse.json({
      success: true,
      message: 'Export généré avec succès',
      export: {
        url: exportResult.url,
        filename: exportResult.filename,
        format: query.format,
        period: timeframe.period,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error exporting analytics:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Paramètres d\'export invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de l\'export des analytics' },
      { status: 500 }
    )
  }
}

/**
 * GET - Obtenir la liste des exports disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user || !['ADMIN', 'MERCHANT', 'PROVIDER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer les exports depuis la base de données ou le filesystem
    // Pour l'instant, retourner une liste vide
    const exports: any[] = []

    return NextResponse.json({
      success: true,
      exports
    })

  } catch (error) {
    console.error('Error getting exports list:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des exports' },
      { status: 500 }
    )
  }
}

/**
 * Définir la période d'analyse selon les paramètres
 */
function getTimeframe(query: any): AnalyticsTimeframe {
  const now = new Date()
  let start: Date, end: Date = now

  if (query.startDate && query.endDate) {
    start = new Date(query.startDate)
    end = new Date(query.endDate)
  } else {
    switch (query.period) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        break
      case 'weekly':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        break
      case 'yearly':
        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    }
  }

  return { start, end, period: query.period }
}