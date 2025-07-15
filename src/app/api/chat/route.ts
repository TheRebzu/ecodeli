import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ChatContextType } from '@prisma/client';

const chatMessageSchema = z.object({
  contextType: z.nativeEnum(ChatContextType),
  contextId: z.string().min(1),
  message: z.string().min(1, 'Message requis'),
});

// Helper: vérifie l'accès au contexte (ex: livraison)
async function canAccessContext(user, contextType: ChatContextType, contextId: string) {
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
  // TODO: autres contextes (BOOKING, SUPPORT, ...)
  return false;
}

// POST: envoyer un message
export async function POST(req: NextRequest) {
  try {
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
        contextType,
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
    console.error('Error chat POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: historique des messages
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user;
    const { searchParams } = new URL(req.url);
    const contextType = searchParams.get('contextType') as ChatContextType;
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
      where: { contextType, contextId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, role: true, profile: true } },
      },
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error chat GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 