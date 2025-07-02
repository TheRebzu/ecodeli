import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { delivererId, status } = await request.json();
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

    // Vérifier que l'annonce existe et appartient au livreur
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

    if (announcement.delivererId !== deliverer.id) {
      return NextResponse.json({ 
        error: 'You are not assigned to this announcement' 
      }, { status: 403 });
    }

    // Valider les transitions de statut autorisées
    const allowedTransitions: Record<string, string[]> = {
      'ACCEPTED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
      'COMPLETED': [], // Statut final
      'CANCELLED': [] // Statut final
    };

    if (!allowedTransitions[announcement.status]?.includes(status)) {
      return NextResponse.json({ 
        error: `Cannot change status from ${announcement.status} to ${status}` 
      }, { status: 400 });
    }

    // Mettre à jour l'annonce
    const updateData: any = { status };
    
    if (status === 'IN_PROGRESS') {
      updateData.startedAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updatedAnnouncement = await db.announcement.update({
      where: { id: announcementId },
      data: updateData
    });

    // Mettre à jour la livraison correspondante
    const delivery = await db.delivery.findFirst({
      where: { announcementId: announcementId }
    });

    if (delivery) {
      const deliveryUpdateData: any = { status };
      
      if (status === 'IN_PROGRESS') {
        deliveryUpdateData.pickedUpAt = new Date();
      } else if (status === 'COMPLETED') {
        deliveryUpdateData.deliveredAt = new Date();
        deliveryUpdateData.actualDelivery = new Date();
      }

      await db.delivery.update({
        where: { id: delivery.id },
        data: deliveryUpdateData
      });
    }

    // Créer des notifications selon le statut
    let notificationTitle = '';
    let notificationMessage = '';
    
    switch (status) {
      case 'IN_PROGRESS':
        notificationTitle = 'Livraison en cours';
        notificationMessage = `Votre colis "${announcement.title}" est en cours de livraison`;
        break;
      case 'COMPLETED':
        notificationTitle = 'Livraison terminée';
        notificationMessage = `Votre colis "${announcement.title}" a été livré avec succès`;
        // Mettre à jour les statistiques du livreur
        await db.deliverer.update({
          where: { id: deliverer.id },
          data: {
            completedDeliveries: { increment: 1 },
            totalEarnings: { increment: announcement.finalPrice || announcement.basePrice }
          }
        });
        break;
      case 'CANCELLED':
        notificationTitle = 'Livraison annulée';
        notificationMessage = `La livraison de "${announcement.title}" a été annulée`;
        break;
    }

    if (notificationTitle) {
      await db.notification.create({
        data: {
          userId: announcement.client.userId,
          type: 'DELIVERY',
          title: notificationTitle,
          message: notificationMessage,
          priority: status === 'COMPLETED' ? 'LOW' : 'MEDIUM',
          metadata: {
            announcementId: announcementId,
            deliveryId: delivery?.id,
            status: status
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Status updated successfully',
      announcement: {
        id: updatedAnnouncement.id,
        status: updatedAnnouncement.status,
        startedAt: updatedAnnouncement.startedAt?.toISOString(),
        completedAt: updatedAnnouncement.completedAt?.toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating announcement status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}