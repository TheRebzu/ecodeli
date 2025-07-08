import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Validation du body de la requête avec gestion des cas vides
    let body = {}
    try {
      const contentLength = request.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > 0) {
        body = await request.json()
      }
    } catch (error) {
      console.log('⚠️ Parsing JSON échoué:', error instanceof Error ? error.message : 'Unknown error')
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    const { delivererId } = body as { delivererId?: string }
    const { id: announcementId } = await params;

    // Validation que delivererId est fourni
    if (!delivererId) {
      console.log('❌ delivererId manquant dans le body')
      return NextResponse.json(
        { error: 'delivererId is required in request body' },
        { status: 400 }
      )
    }

    console.log('🚚 Acceptation d\'annonce:', { announcementId, delivererId, userId: user.id });

    // Vérifier que l'utilisateur est bien le livreur
    const deliverer = await db.deliverer.findFirst({
      where: { 
        id: delivererId,
        userId: user.id 
      }
    });

    if (!deliverer) {
      console.log('❌ Livreur non trouvé');
      return NextResponse.json({ error: 'Deliverer not found' }, { status: 404 });
    }

    // Vérifier que l'annonce existe et est disponible
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    if (!announcement) {
      console.log('❌ Annonce non trouvée');
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    console.log('📋 Statut annonce:', announcement.status);

    // Corriger: vérifier que l'annonce est ACTIVE (pas PENDING)
    if (announcement.status !== 'ACTIVE') {
      console.log('❌ Annonce non active:', announcement.status);
      return NextResponse.json({ 
        error: 'Announcement is no longer available' 
      }, { status: 400 });
    }

    if (announcement.delivererId) {
      console.log('❌ Annonce déjà acceptée par un autre livreur');
      return NextResponse.json({ 
        error: 'Announcement already accepted by another deliverer' 
      }, { status: 400 });
    }

    // Vérifier qu'il n'y a pas déjà une livraison pour cette annonce
    const existingDelivery = await db.delivery.findFirst({
      where: { 
        announcementId: announcementId,
        status: { notIn: ['CANCELLED', 'FAILED'] }
      }
    });

    if (existingDelivery) {
      console.log('❌ Livraison déjà existante');
      return NextResponse.json({ 
        error: 'Delivery already exists for this announcement' 
      }, { status: 400 });
    }

    // Générer un code de validation à 6 chiffres
    const validationCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log('✅ Début de la transaction...');

    // Utiliser une transaction pour assurer la cohérence
    const result = await db.$transaction(async (tx) => {
      // Accepter l'annonce - Définir statut PENDING_PAYMENT pour attendre le paiement
      const updatedAnnouncement = await tx.announcement.update({
        where: { id: announcementId },
        data: {
          delivererId: user.id, // Utiliser directement l'ID utilisateur
          status: 'PENDING_PAYMENT' // Attendre le paiement du client
        }
      });

      // Créer une livraison avec statut PENDING (en attente de paiement)
      const delivery = await tx.delivery.create({
        data: {
          announcementId: announcementId,
          clientId: announcement.authorId, // Utiliser authorId directement
          delivererId: user.id, // Utiliser l'ID utilisateur directement
          status: 'PENDING', // En attente de paiement
          validationCode: validationCode,
          pickupDate: announcement.pickupDate || new Date(),
          deliveryDate: announcement.deliveryDate || new Date(Date.now() + 2 * 60 * 60 * 1000), // +2h par défaut
          price: announcement.finalPrice || announcement.basePrice,
          delivererFee: (announcement.finalPrice || announcement.basePrice) * 0.8,
          platformFee: (announcement.finalPrice || announcement.basePrice) * 0.15,
          insuranceFee: (announcement.finalPrice || announcement.basePrice) * 0.05
        }
      });

      // Notifier le client qu'il doit payer
      await tx.notification.create({
        data: {
          userId: announcement.authorId, // Utiliser authorId directement
          type: 'PAYMENT',
          title: 'Paiement requis - Livreur trouvé !',
          message: `Un livreur a accepté votre annonce "${announcement.title}". Procédez au paiement pour confirmer la livraison.`,
          data: {
            announcementId: announcementId,
            deliveryId: delivery.id,
            delivererId: user.id,
            paymentRequired: true,
            amount: announcement.finalPrice || announcement.basePrice,
            paymentUrl: `/client/deliveries/${delivery.id}/payment`,
            urgentAction: true
          }
        }
      });

      // Mettre à jour les statistiques du livreur
      await tx.deliverer.update({
        where: { id: deliverer.id },
        data: {
          totalDeliveries: { increment: 1 }
        }
      });

      return { announcement: updatedAnnouncement, delivery };
    });

    console.log('✅ Transaction réussie');

    return NextResponse.json({
      success: true,
      message: 'Announcement accepted successfully',
      delivery: {
        id: result.delivery.id,
        announcementId: announcementId,
        status: result.delivery.status,
        validationCode: validationCode,
        scheduledDate: result.delivery.pickupDate?.toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error accepting announcement:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}