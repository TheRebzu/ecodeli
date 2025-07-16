import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const intervention = await prisma.intervention.findFirst({
      where: { bookingId: id, providerId: session.user.id },
      include: {
        booking: {
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            service: true,
          },
        },
      },
    });
    if (!intervention) {
      return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });
    }
    // Format response for the validation page
    return NextResponse.json({
      id: intervention.id,
      service: intervention.booking.service,
      scheduledAt: intervention.booking.scheduledDate,
      client: intervention.booking.client.user,
      status: intervention.isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth();
    console.log('[API] Session:', session);
    if (!session || session.user.role !== 'PROVIDER') {
      console.error('[API] Session absente ou mauvais rôle', session);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Récupérer le provider lié à ce user
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id }
    });
    if (!provider) {
      console.error('[API] Aucun provider lié à ce user');
      return NextResponse.json({ error: 'Provider introuvable' }, { status: 400 });
    }
    let booking = await prisma.booking.findUnique({ where: { id } });
    console.log('[API] Booking trouvé:', booking);
    if (!booking) {
      console.error('[API] Booking non trouvé', id);
      return NextResponse.json({ error: 'Booking non trouvé' }, { status: 404 });
    }
    console.log('[API] Provider courant:', provider.id);
    console.log('[API] ProviderId AVANT update:', booking.providerId);
    // Forcer la réattribution au provider courant si déjà assigné à un autre
    if (booking.providerId && booking.providerId !== provider.id) {
      console.log('[API] Booking déjà assigné à un autre provider, on réassigne');
      await prisma.booking.update({
        where: { id },
        data: { providerId: provider.id }
      });
    }
    if (!booking.providerId) {
      console.log('[API] Booking sans provider, on assigne');
      await prisma.booking.update({
        where: { id },
        data: { providerId: provider.id }
      });
    }
    // Refetch booking to confirm update
    booking = await prisma.booking.findUnique({ where: { id } });
    console.log('[API] ProviderId APRÈS update:', booking?.providerId);
    // Vérifier si une intervention existe déjà pour ce booking
    let intervention = await prisma.intervention.findUnique({
      where: { bookingId: booking.id }
    });
    if (intervention) {
      console.log('[API] Intervention déjà existante pour ce booking:', intervention.id);
      return NextResponse.json({ id: intervention.id });
    }
    // Créer l'intervention si elle n'existe pas
    intervention = await prisma.intervention.create({
      data: {
        bookingId: booking.id,
        providerId: provider.id,
        startTime: null,
        endTime: null,
        actualDuration: null,
        report: null,
        photos: [],
        clientSignature: null,
        isCompleted: false,
        completedAt: null,
      }
    });
    console.log('[API] Intervention créée:', intervention);
    return NextResponse.json({ id: intervention.id });
  } catch (e) {
    console.error('[API] Erreur création intervention', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 