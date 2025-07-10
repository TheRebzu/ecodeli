import { NextRequest, NextResponse } from 'next/server'
import { auth, authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const messageSchema = z.object({
  content: z.string().min(1, 'Le message ne peut pas être vide')
})

// POST /api/merchant/support/tickets/[id]/messages - Ajouter un message à un ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
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

    const ticketId = params.id
    
    // Vérifier que le ticket appartient au commerçant
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId: session.user.id
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le ticket n'est pas fermé
    if (ticket.status === 'closed') {
      return NextResponse.json(
        { error: 'Impossible d\'ajouter un message à un ticket fermé' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = messageSchema.parse(body)

    // Créer le message
    const message = await prisma.supportMessage.create({
      data: {
        content: validatedData.content,
        ticketId: ticketId,
        senderId: session.user.id
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
    })

    // Mettre à jour la date de dernière modification du ticket
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { 
        updatedAt: new Date(),
        status: ticket.status === 'waiting' ? 'in_progress' : ticket.status
      }
    })

    // Notification à l'équipe support (simulation)
    console.log(`Nouveau message sur ticket ${ticketId} de la part du commerçant ${session.user.id}`)

    return NextResponse.json({
      id: message.id,
      content: message.content,
      sender: 'merchant',
      senderName: 'Vous',
      timestamp: message.createdAt.toISOString(),
      attachments: message.attachments.map(att => ({
        name: att.filename,
        url: att.url,
        size: att.size
      }))
    })

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

    console.error('Erreur ajout message:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 