import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createTicketSchema = z.object({
  title: z.string().min(5, 'Le titre doit faire au moins 5 caractères'),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères'),
  category: z.enum(['Configuration', 'Paiements', 'Livraisons', 'Intégrations', 'Facturation', 'Technique', 'Autre']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
})

// GET /api/merchant/support/tickets - Récupérer les tickets du commerçant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est un commerçant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    const where: any = {
      userId: session.user.id
    }

    if (status) {
      where.status = status
    }

    if (category) {
      where.category = category
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          assignedToUser: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true
                }
              }
            }
          },
          messages: {
            orderBy: {
              createdAt: 'asc'
            },
            include: {
              sender: {
                select: {
                  id: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              },
              attachments: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.supportTicket.count({ where })
    ])

    return NextResponse.json({
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        assignedTo: ticket.assignedToUser ? {
          name: `${ticket.assignedToUser.profile?.firstName || ''} ${ticket.assignedToUser.profile?.lastName || ''}`.trim(),
          avatar: ticket.assignedToUser.profile?.avatar
        } : null,
        messages: ticket.messages.map(message => ({
          id: message.id,
          content: message.content,
          sender: message.senderId === session.user.id ? 'merchant' : 'support',
          senderName: message.senderId === session.user.id ? 'Vous' : 
            `${message.sender.profile?.firstName || ''} ${message.sender.profile?.lastName || ''}`.trim(),
          timestamp: message.createdAt.toISOString(),
          attachments: message.attachments.map(att => ({
            name: att.filename,
            url: att.url,
            size: att.size
          }))
        }))
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erreur récupération tickets:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST /api/merchant/support/tickets - Créer un nouveau ticket
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est un commerçant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createTicketSchema.parse(body)

    // Créer le ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        priority: validatedData.priority,
        status: 'open',
        userId: session.user.id
      },
      include: {
        assignedToUser: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            attachments: true
          }
        }
      }
    })

    // Créer le premier message automatique
    await prisma.supportMessage.create({
      data: {
        content: validatedData.description,
        ticketId: ticket.id,
        senderId: session.user.id
      }
    })

    // Notification à l'équipe support (simulation)
    console.log(`Nouveau ticket support créé: ${ticket.id} - ${ticket.title}`)

    return NextResponse.json({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      assignedTo: ticket.assignedToUser ? {
        name: `${ticket.assignedToUser.profile?.firstName || ''} ${ticket.assignedToUser.profile?.lastName || ''}`.trim(),
        avatar: ticket.assignedToUser.profile?.avatar
      } : null,
      messages: []
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Erreur création ticket:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 