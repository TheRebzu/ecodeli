import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { delivererId } = await request.json();
    const { id: announcementId } = await params;

    // Vérifier que l'utilisateur est bien le livreur
    const deliverer = await db.deliverer.findFirst({
      where: { 
        id: delivererId,
        userId: user.id 
      }
    });

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer not found' }, { status: 404 });
    }

    // Vérifier que l'annonce existe et est disponible
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: {
        client: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    if (announcement.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Announcement is no longer available' 
      }, { status: 400 });
    }

    if (announcement.delivererId) {
      return NextResponse.json({ 
        error: 'Announcement already accepted by another deliverer' 
      }, { status: 400 });
    }

    // Accepter l'annonce
    const updatedAnnouncement = await db.announcement.update({
      where: { id: announcementId },
      data: {
        delivererId: deliverer.id,
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    });

    // Créer une livraison
    const delivery = await db.delivery.create({
      data: {
        announcementId: announcementId,
        delivererId: deliverer.id,
        status: 'ACCEPTED',
        scheduledDate: announcement.pickupDate || new Date(),
        estimatedDelivery: announcement.deliveryDate
      }
    });

    // Notifier le client
    await db.notification.create({
      data: {
        userId: announcement.client.userId,
        type: 'DELIVERY',
        title: 'Livreur assigné',
        message: `Un livreur a accepté votre annonce "${announcement.title}"`,
        priority: 'MEDIUM',
        metadata: {
          announcementId: announcementId,
          deliveryId: delivery.id,
          delivererId: deliverer.id
        }
      }
    });

    // Mettre à jour les statistiques du livreur
    await db.deliverer.update({
      where: { id: deliverer.id },
      data: {
        totalDeliveries: { increment: 1 }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Announcement accepted successfully',
      delivery: {
        id: delivery.id,
        announcementId: announcementId,
        status: delivery.status,
        scheduledDate: delivery.scheduledDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Error accepting announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}