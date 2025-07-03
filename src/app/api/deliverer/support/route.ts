import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const supportTicketSchema = z.object({
  subject: z.string().min(5, 'Le sujet doit faire au moins 5 caractères'),
  message: z.string().min(20, 'Le message doit faire au moins 20 caractères'),
  priority: z.enum(['low', 'medium', 'high']),
  category: z.enum(['general', 'technical', 'delivery', 'payment', 'account'])
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedTicket = supportTicketSchema.parse(body);

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: { user: true }
    });

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer not found' }, { status: 404 });
    }

    // Créer le ticket de support
    const supportTicket = await prisma.supportTicket.create({
      data: {
        userId: session.user.id,
        subject: validatedTicket.subject,
        message: validatedTicket.message,
        priority: validatedTicket.priority.toUpperCase(),
        category: validatedTicket.category.toUpperCase(),
        status: 'OPEN',
        userEmail: session.user.email,
        userRole: 'DELIVERER'
      }
    });

    // TODO: Envoyer une notification email à l'équipe support
    // TODO: Envoyer une confirmation email au livreur

    return NextResponse.json({ 
      message: 'Support ticket created successfully',
      ticketId: supportTicket.id
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const whereClause: any = { userId: session.user.id };
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.supportTicket.count({
      where: whereClause
    });

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 