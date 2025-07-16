import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const chatMessageSchema = z.object({
  contextType: z.enum(['DELIVERY','BOOKING','SUPPORT','CONTRACT','GENERAL','ANNOUNCEMENT','DISPUTE','GROUP']),
  contextId: z.string().min(1),
  message: z.string().min(1, 'Message requis'),
});

// Helper: vérifie l'accès au contexte (ex: livraison)
async function canAccessContext(user: any, contextType: string, contextId: string) {
  try {
    if (!prisma) {
      console.error('[Chat] Prisma instance not available');
      throw new Error('Database not available');
    }
    
    if (user.role === 'ADMIN') return true;
    
    if (contextType === 'DELIVERY') {
      const delivery = await prisma.delivery.findUnique({
        where: { id: contextId },
        select: { delivererId: true, announcement: { select: { authorId: true } } },
      });
      if (!delivery) return false;
      if (user.id === delivery.delivererId) return true;
      if (user.id === delivery.announcement.authorId) return true;
      return false;
    }
    
    if (contextType === 'BOOKING') {
      const booking = await prisma.booking.findUnique({
        where: { id: contextId },
        select: { clientId: true, providerId: true },
      });
      if (!booking) return false;
      if (user.id === booking.clientId) return true;
      if (user.id === booking.providerId) return true;
      return false;
    }
    
    if (contextType === 'SUPPORT') {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: contextId },
        select: { authorId: true, assignedToId: true },
      });
      if (!ticket) return false;
      if (user.id === ticket.authorId) return true;
      if (user.id === ticket.assignedToId) return true;
      return false;
    }
    
    if (contextType === 'ANNOUNCEMENT') {
      const announcement = await prisma.announcement.findUnique({
        where: { id: contextId },
        select: { authorId: true },
      });
      if (!announcement) return false;
      if (user.id === announcement.authorId) return true;
      return false;
    }
    
    // Pour les autres contextes, autoriser par défaut
    return true;
  } catch (error) {
    console.error('[Chat] Error in canAccessContext:', error);
    throw error;
  }
}

// POST: envoyer un message
export async function POST(req: NextRequest) {
  try {
    if (!prisma) {
      console.error('[Chat POST] Prisma instance not available');
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;
    const body = await req.json();
    const parsed = chatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }
    const { contextType, contextId, message } = parsed.data;
    
    // Vérifier l'accès
    const canAccess = await canAccessContext(user, contextType, contextId);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Créer le message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        contextType: contextType as any,
        contextId,
        senderId: user.id,
        message,
      },
      include: {
        sender: { select: { id: true, name: true, role: true, profile: true } },
      },
    });
    return NextResponse.json(chatMessage, { status: 201 });
  } catch (error) {
    console.error('[Chat POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: historique des messages
export async function GET(req: NextRequest) {
  try {
    if (!prisma) {
      console.error('[Chat GET] Prisma instance not available');
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;
    const { searchParams } = new URL(req.url);
    const contextType = searchParams.get('contextType') as string;
    const contextId = searchParams.get('contextId') || '';
    
    if (!contextType || !contextId) {
      return NextResponse.json({ error: 'contextType et contextId requis' }, { status: 400 });
    }
    
    // Vérifier l'accès
    const canAccess = await canAccessContext(user, contextType, contextId);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Récupérer l'historique
    const messages = await prisma.chatMessage.findMany({
      where: { 
        contextType: contextType as any, 
        contextId 
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, role: true, profile: true } },
      },
    });
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('[Chat GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 