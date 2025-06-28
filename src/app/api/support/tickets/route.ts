import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { TicketService } from '@/features/support/services/ticket.service'

const createTicketSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères'),
  category: z.enum([
    'DELIVERY_ISSUE',
    'PAYMENT_PROBLEM', 
    'ACCOUNT_ACCESS',
    'TECHNICAL_SUPPORT',
    'BILLING_INQUIRY',
    'FEATURE_REQUEST',
    'COMPLAINT',
    'PARTNERSHIP',
    'GENERAL_INQUIRY',
    'BUG_REPORT'
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  deliveryId: z.string().optional(),
  orderId: z.string().optional()
})

const ticketFiltersSchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  assignedToId: z.string().optional(),
  dateFrom: z.string().transform(str => str ? new Date(str) : undefined).optional(),
  dateTo: z.string().transform(str => str ? new Date(str) : undefined).optional(),
  page: z.string().transform(str => parseInt(str) || 1).optional(),
  limit: z.string().transform(str => parseInt(str) || 20).optional()
})

/**
 * POST - Créer un nouveau ticket de support
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTicketSchema.parse(body)

    const ticket = await TicketService.createTicket({
      ...validatedData,
      authorId: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Ticket créé avec succès',
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating support ticket:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de la création du ticket' },
      { status: 500 }
    )
  }
}

/**
 * GET - Récupérer les tickets avec filtres
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = ticketFiltersSchema.parse({
      status: searchParams.get('status'),
      category: searchParams.get('category'),
      priority: searchParams.get('priority'),
      assignedToId: searchParams.get('assignedToId'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    })

    // Si l'utilisateur n'est pas admin, ne montrer que ses tickets
    if (session.user.role !== 'ADMIN') {
      filters.authorId = session.user.id
    }

    const result = await TicketService.getTickets(
      filters,
      filters.page || 1,
      filters.limit || 20
    )

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('Error fetching support tickets:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Paramètres invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tickets' },
      { status: 500 }
    )
  }
}