import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pdfGeneratorService } from '@/features/documents/services/pdf-generator.service'
import { auth, authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const generateDocumentSchema = z.object({
  type: z.enum(['delivery-slip', 'contract', 'invoice', 'certificate']),
  entityId: z.string().min(1, 'ID de l\'entité requis'),
  options: z.object({
    includeQR: z.boolean().optional().default(true),
    language: z.enum(['fr', 'en']).optional().default('fr'),
    format: z.enum(['pdf', 'html']).optional().default('pdf')
  }).optional().default({})
})

interface DocumentGenerationLog {
  id: string
  userId: string
  documentType: string
  entityId: string
  fileName: string
  fileUrl: string
  createdAt: Date
  metadata?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = generateDocumentSchema.parse(body)

    let fileUrl: string
    let fileName: string

    // Générer le document selon le type
    switch (validated.type) {
      case 'delivery-slip':
        fileUrl = await pdfGeneratorService.generateDeliverySlip(validated.entityId)
        fileName = `bordereau-livraison-${validated.entityId}.pdf`
        break

      case 'contract':
        fileUrl = await pdfGeneratorService.generateServiceContract(validated.entityId)
        fileName = `contrat-${validated.entityId}.pdf`
        break

      case 'invoice':
        fileUrl = await pdfGeneratorService.generateInvoice(validated.entityId)
        fileName = `facture-${validated.entityId}.pdf`
        break

      case 'certificate':
        fileUrl = await pdfGeneratorService.generateDeliveryCertificate(validated.entityId)
        fileName = `certificat-livraison-${validated.entityId}.pdf`
        break

      default:
        return NextResponse.json(
          { error: 'Type de document non supporté' },
          { status: 400 }
        )
    }

    // Enregistrer la génération en base pour audit
    const generationLog = await logDocumentGeneration({
      userId: session.user.id,
      documentType: validated.type,
      entityId: validated.entityId,
      fileName,
      fileUrl,
      metadata: {
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        options: validated.options
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        fileUrl,
        fileName,
        documentType: validated.type,
        generatedAt: new Date().toISOString(),
        downloadUrl: `${process.env.NEXTAUTH_URL}${fileUrl}`,
        logId: generationLog.id
      }
    })

  } catch (error) {
    console.error('Document generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        type: 'GENERATION_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const documentType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construire les filtres
    const where: any = {}
    
    // Les utilisateurs non-admin ne peuvent voir que leurs propres documents
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id
    } else if (userId) {
      where.userId = userId
    }
    
    if (documentType) {
      where.documentType = documentType
    }

    // Récupérer l'historique des générations
    const [documentLogs, total] = await Promise.all([
      db.documentGeneration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      }),
      db.documentGeneration.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: documentLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching document history:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique' },
      { status: 500 }
    )
  }
}

// Fonction d'aide pour enregistrer les générations
async function logDocumentGeneration(data: {
  userId: string
  documentType: string
  entityId: string
  fileName: string
  fileUrl: string
  metadata?: Record<string, any>
}): Promise<{ id: string }> {
  try {
    const log = await db.documentGeneration.create({
      data: {
        userId: data.userId,
        documentType: data.documentType,
        entityId: data.entityId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        metadata: data.metadata || {},
        createdAt: new Date()
      }
    })

    return { id: log.id }
  } catch (error) {
    console.error('Error logging document generation:', error)
    // Ne pas faire échouer la génération si le log échoue
    return { id: 'log-failed' }
  }
}

// Endpoint pour les statistiques (admin seulement)
export async function GET_STATS(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès administrateur requis' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // day, week, month, year

    // Calculer la date de début selon la période
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
    }

    // Statistiques globales
    const [totalDocuments, documentsByType, documentsByPeriod, topUsers] = await Promise.all([
      // Total de documents générés
      db.documentGeneration.count({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      }),

      // Répartition par type de document
      db.documentGeneration.groupBy({
        by: ['documentType'],
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: true
      }),

      // Evolution dans le temps (par jour)
      db.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          document_type
        FROM document_generations 
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY DATE(created_at), document_type
        ORDER BY date DESC
      `,

      // Top utilisateurs
      db.documentGeneration.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: true,
        orderBy: {
          _count: {
            userId: 'desc'
          }
        },
        take: 10
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalDocuments,
          period,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        byType: documentsByType.map(item => ({
          type: item.documentType,
          count: item._count
        })),
        timeline: documentsByPeriod,
        topUsers: topUsers.map(item => ({
          userId: item.userId,
          count: item._count
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching document statistics:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}