import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Vérifier que la réservation appartient au client
    const booking = await db.booking.findFirst({
      where: {
        id: params.id,
        clientId: session.user.id
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Récupérer les messages
    const messages = await db.message.findMany({
      where: { bookingId: params.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Transformer les données
    const transformedMessages = messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.sender.name,
      message: msg.content,
      timestamp: msg.createdAt.toISOString()
    }))

    return NextResponse.json({ messages: transformedMessages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 })
    }

    // Vérifier que la réservation appartient au client
    const booking = await db.booking.findFirst({
      where: {
        id: params.id,
        clientId: session.user.id
      },
      include: {
        provider: true
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Créer le message
    const newMessage = await db.message.create({
      data: {
        bookingId: params.id,
        senderId: session.user.id,
        content: message.trim()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Créer une notification pour le prestataire
    await db.notification.create({
      data: {
        userId: booking.providerId,
        type: 'NEW_MESSAGE',
        title: 'Nouveau message',
        message: `Nouveau message de ${newMessage.sender.name}`,
        status: 'UNREAD'
      }
    })

    // Transformer les données pour la réponse
    const transformedMessage = {
      id: newMessage.id,
      senderId: newMessage.senderId,
      senderName: newMessage.sender.name,
      message: newMessage.content,
      timestamp: newMessage.createdAt.toISOString()
    }

    return NextResponse.json(transformedMessage, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}