import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour créer un ticket de support
const createTicketSchema = z.object({
  subject: z.string().min(5).max(100),
  description: z.string().min(20).max(2000),
  category: z.enum([
    'DELIVERY_ISSUE',
    'PAYMENT_PROBLEM',
    'ACCOUNT_ACCESS',
    'SERVICE_QUALITY',
    'TECHNICAL_ISSUE',
    'BILLING_QUESTION',
    'FEATURE_REQUEST',
    'OTHER'
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  deliveryId: z.string().cuid().optional(),
  bookingId: z.string().cuid().optional(),
  attachments: z.array(z.string().url()).max(5).optional()
})

// Schema pour répondre à un ticket
const respondTicketSchema = z.object({
  message: z.string().min(10).max(1000),
  isInternal: z.boolean().default(false),
  attachments: z.array(z.string().url()).max(3).optional()
})

// Schema pour fermer un ticket
const closeTicketSchema = z.object({
  reason: z.enum(['RESOLVED', 'DUPLICATE', 'INVALID', 'NO_RESPONSE']),
  finalMessage: z.string().max(500).optional(),
  rating: z.number().min(1).max(5).optional()
})

// GET - Liste des tickets de support du client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const where: any = { clientId: client.id }
    if (status) where.status = status
    if (category) where.category = category
    if (priority) where.priority = priority

    const [tickets, totalCount] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          responses: {
            orderBy: { createdAt: 'asc' },
            where: { isInternal: false }, // Ne pas exposer les messages internes
            include: {
              author: {
                select: {
                  profile: {
                    select: { firstName: true, lastName: true }
                  }
                }
              }
            }
          },
          assignedAgent: {
            select: {
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        }
      }),
      prisma.supportTicket.count({ where })
    ])

    // Statistiques rapides
    const statusStats = await prisma.supportTicket.groupBy({
      by: ['status'],
      where: { clientId: client.id },
      _count: { id: true }
    })

    return NextResponse.json({
      tickets: tickets.map(ticket => ({
        ...ticket,
        responseCount: ticket.responses.length,
        lastResponseAt: ticket.responses.length > 0 ? 
          ticket.responses[ticket.responses.length - 1].createdAt : null,
        isAwaitingResponse: ticket.status === 'OPEN' && 
          ticket.responses.length > 0 && 
          ticket.responses[ticket.responses.length - 1].authorId !== client.userId,
        timeAgo: getTimeAgo(ticket.createdAt),
        urgencyIndicator: getUrgencyIndicator(ticket.priority, ticket.createdAt)
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats: {
        byStatus: statusStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id
          return acc
        }, {} as Record<string, number>),
        totalTickets: totalCount,
        openTickets: statusStats.find(s => s.status === 'OPEN')?._count.id || 0
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching support tickets')
  }
}

// POST - Créer un nouveau ticket de support
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createTicketSchema.parse(body)

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
      include: { subscription: true }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Déterminer la priorité automatique selon l'abonnement
    const subscriptionPlan = client.subscriptionPlan || 'FREE'
    let adjustedPriority = validatedData.priority

    // Les clients Premium ont une priorité plus élevée
    if (subscriptionPlan === 'PREMIUM' && validatedData.priority === 'MEDIUM') {
      adjustedPriority = 'HIGH'
    }

    // Générer un numéro de ticket unique
    const ticketNumber = await generateTicketNumber()

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        clientId: client.id,
        subject: validatedData.subject,
        description: validatedData.description,
        category: validatedData.category,
        priority: adjustedPriority,
        status: 'OPEN',
        deliveryId: validatedData.deliveryId,
        bookingId: validatedData.bookingId,
        metadata: {
          subscriptionPlan,
          attachments: validatedData.attachments || []
        }
      }
    })

    // Assigner automatiquement selon la catégorie et priorité
    await autoAssignTicket(ticket.id, validatedData.category, adjustedPriority)

    // Envoyer notification au support
    await notifySupportTeam(ticket)

    return NextResponse.json({
      success: true,
      message: 'Ticket créé avec succès',
      ticket: {
        ...ticket,
        expectedResponseTime: getExpectedResponseTime(adjustedPriority, subscriptionPlan)
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'creating support ticket')
  }
}

// PUT - Répondre à un ticket ou le fermer
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('id')
    const action = searchParams.get('action') // 'respond' ou 'close'

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 })
    }

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        clientId: client.id
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    if (ticket.status === 'CLOSED') {
      return NextResponse.json({ error: 'Cannot modify closed ticket' }, { status: 400 })
    }

    const body = await request.json()

    if (action === 'respond') {
      const validatedData = respondTicketSchema.parse(body)

      const response = await prisma.ticketResponse.create({
        data: {
          ticketId: ticket.id,
          authorId: session.user.id,
          message: validatedData.message,
          isInternal: false,
          metadata: {
            attachments: validatedData.attachments || []
          }
        }
      })

      // Mettre à jour le statut du ticket
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { 
          status: 'AWAITING_SUPPORT',
          lastResponseAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Réponse ajoutée avec succès',
        response
      })

    } else if (action === 'close') {
      const validatedData = closeTicketSchema.parse(body)

      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          resolution: validatedData.reason,
          clientRating: validatedData.rating,
          metadata: {
            ...ticket.metadata,
            finalMessage: validatedData.finalMessage,
            closedByClient: true
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Ticket fermé avec succès'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'updating support ticket')
  }
}

// Fonctions utilitaires
async function generateTicketNumber(): Promise<string> {
  const today = new Date()
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '')
  
  const count = await prisma.supportTicket.count({
    where: {
      createdAt: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    }
  })

  return `ECO-${datePrefix}-${(count + 1).toString().padStart(4, '0')}`
}

async function autoAssignTicket(ticketId: string, category: string, priority: string) {
  // TODO: Implémenter l'assignation automatique selon les règles métier
  // Par exemple, assigner les tickets PAYMENT_PROBLEM à l'équipe finance
  // Les tickets TECHNICAL_ISSUE à l'équipe technique, etc.
}

async function notifySupportTeam(ticket: any) {
  // TODO: Envoyer notification à l'équipe support via email/slack
  // Utiliser OneSignal ou autre service de notification
}

function getExpectedResponseTime(priority: string, subscriptionPlan: string): string {
  const baseTimes = {
    'URGENT': { FREE: '2h', STARTER: '1h', PREMIUM: '30min' },
    'HIGH': { FREE: '4h', STARTER: '2h', PREMIUM: '1h' },
    'MEDIUM': { FREE: '24h', STARTER: '12h', PREMIUM: '4h' },
    'LOW': { FREE: '48h', STARTER: '24h', PREMIUM: '12h' }
  }

  return baseTimes[priority as keyof typeof baseTimes]?.[subscriptionPlan as keyof typeof baseTimes.URGENT] || '24h'
}

function getUrgencyIndicator(priority: string, createdAt: Date): 'GREEN' | 'YELLOW' | 'RED' {
  const hoursElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
  
  const thresholds = {
    'URGENT': { yellow: 1, red: 2 },
    'HIGH': { yellow: 4, red: 8 },
    'MEDIUM': { yellow: 12, red: 24 },
    'LOW': { yellow: 24, red: 48 }
  }

  const threshold = thresholds[priority as keyof typeof thresholds] || thresholds.MEDIUM

  if (hoursElapsed >= threshold.red) return 'RED'
  if (hoursElapsed >= threshold.yellow) return 'YELLOW'
  return 'GREEN'
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
  if (diffHours > 0) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`
  return 'À l\'instant'
} 