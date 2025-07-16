import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/lib/auth';
import { InterventionsService } from '@/features/provider/services/interventions.service';
import { prisma } from '@/lib/db';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  console.log('[API] /api/provider/interventions/[id]/complete params:', context.params);
  const { id } = await context.params;
  if (!id || id === 'undefined') {
    console.error('[API] Invalid or missing id param:', id);
    return NextResponse.json({ error: 'ID manquant ou invalide' }, { status: 400 });
  }
  try {
    const session = await auth();
    if (!session || session.user.role !== 'PROVIDER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[API] Session user id:', session.user.id);
    // Récupérer le provider lié à l'utilisateur courant
    const provider = await prisma.provider.findUnique({ where: { userId: session.user.id } });
    if (!provider) {
      console.error('[API] No provider profile for user', session.user.id);
      return NextResponse.json({ error: 'Provider profile not found' }, { status: 403 });
    }
    // Try to find intervention by id and providerId
    let intervention = await prisma.intervention.findFirst({
      where: { id, providerId: provider.id },
    });
    if (!intervention) {
      // Try to find by id only (for debugging)
      const interventionById = await prisma.intervention.findUnique({ where: { id } });
      if (interventionById) {
        if (interventionById.providerId !== provider.id) {
          // Récupérer les emails pour debug
          const interventionProvider = await prisma.provider.findUnique({ where: { id: interventionById.providerId }, include: { user: true } });
          console.error('[API] Intervention found by id but providerId does not match:', {
            interventionProviderId: interventionById.providerId,
            interventionProviderEmail: interventionProvider?.user?.email,
            sessionProviderId: provider.id,
            sessionProviderEmail: session.user.email,
          });
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      // Try by bookingId and providerId
      intervention = await prisma.intervention.findFirst({
        where: { bookingId: id, providerId: provider.id },
      });
      if (!intervention) {
        // Try by bookingId only (for debugging)
        const interventionByBooking = await prisma.intervention.findFirst({ where: { bookingId: id } });
        if (interventionByBooking) {
          if (interventionByBooking.providerId !== provider.id) {
            // Récupérer les emails pour debug
            const interventionProvider = await prisma.provider.findUnique({ where: { id: interventionByBooking.providerId }, include: { user: true } });
            console.error('[API] Intervention found by bookingId but providerId does not match:', {
              interventionProviderId: interventionByBooking.providerId,
              interventionProviderEmail: interventionProvider?.user?.email,
              sessionProviderId: provider.id,
              sessionProviderEmail: session.user.email,
            });
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }
      }
    }
    if (!intervention) {
      console.error('[API] Intervention not found for id or bookingId:', id);
      return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });
    }
    // Complete the intervention using the service
    if (!intervention.startTime) {
      // Start the intervention if not already started
      await InterventionsService.startIntervention(intervention.id, provider.id);
      // Refresh the intervention object after starting
      intervention = await prisma.intervention.findFirst({
        where: { id: intervention.id, providerId: provider.id },
      });
    }
    const updatedIntervention = await InterventionsService.completeIntervention(intervention.id, provider.id, {});
    return NextResponse.json({ success: true, intervention: updatedIntervention });
  } catch (error: any) {
    const message = error?.message || 'Internal server error';
    const status = message.includes('non trouvée') ? 404 : message.includes('déjà terminée') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Endpoint not implemented" });
}
