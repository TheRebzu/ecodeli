import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { TicketService } from '@/features/support/services/ticket.service'

const replySchema = z.object({
  content: z.string().min(1, 'Le contenu ne peut pas être vide'),
  isInternal: z.boolean().optional().default(false)
})

const updateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  assignedToId: z.string().optional()
})

const resolveTicketSchema = z.object({
  resolution: z.string().min(10, 'La résolution doit contenir au moins 10 caractères')
})

/**
 * GET - Récupérer les détails d'un ticket
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: id },
      include: {
        author: {
          include: { profile: true }
        },
        assignedTo: {
          include: { profile: true }
        },
        delivery: {
          include: {
            announcement: {
              select: {
                title: true,
                pickupAddress: true,
                deliveryAddress: true
              }
            }
          }
        },
        messages: {
          include: {
            author: {
              include: { profile: true }
            },
            attachments: true
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true,
        escalations: {
          include: {
            fromUser: { include: { profile: true } },
            toUser: { include: { profile: true } }
          },
          orderBy: { escalatedAt: 'desc' }
        },
        satisfactionSurvey: true
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier les permissions
    const canAccess = session.user.role === 'ADMIN' || 
                     ticket.authorId === session.user.id ||
                     ticket.assignedToId === session.user.id

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      ticket
    })

  } catch (error) {
    console.error('Error fetching ticket details:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du ticket' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Mettre à jour un ticket (statut, priorité, assignation)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Seuls les admins peuvent modifier les tickets
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { action, ...data } = body

    if (action === 'reply') {
      const validatedData = replySchema.parse(data)
      
      const message = await TicketService.replyToTicket(
        (await params).id,
        session.user.id,
        validatedData.content,
        validatedData.isInternal
      )

      return NextResponse.json({
        success: true,
        message: 'Réponse ajoutée avec succès',
        data: message
      })
    }

    if (action === 'resolve') {
      const validatedData = resolveTicketSchema.parse(data)
      
      const ticket = await TicketService.resolveTicket(
        (await params).id,
        session.user.id,
        validatedData.resolution
      )

      return NextResponse.json({
        success: true,
        message: 'Ticket résolu avec succès',
        ticket
      })
    }

    // Mise à jour générale
    const validatedData = updateTicketSchema.parse(data)
    const { id } = await params;

    const ticket = await prisma.supportTicket.update({
      where: { id: id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        author: { include: { profile: true } },
        assignedTo: { include: { profile: true } }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Ticket mis à jour avec succès',
      ticket
    })

  } catch (error) {
    console.error('Error updating ticket:', error)
    
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
      { error: 'Erreur lors de la mise à jour du ticket' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Supprimer un ticket (admin seulement)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params;
    await prisma.supportTicket.delete({
      where: { id: id }
    })

    return NextResponse.json({
      success: true,
      message: 'Ticket supprimé avec succès'
    })

  } catch (error) {
    console.error('Error deleting ticket:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du ticket' },
      { status: 500 }
    )
  }
}