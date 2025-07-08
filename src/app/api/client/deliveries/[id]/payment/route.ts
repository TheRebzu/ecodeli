import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';
import { StripeService } from '@/features/payments/services/stripe.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { id: deliveryId } = await params;

    console.log('💳 Création paiement livraison:', { deliveryId, userId: user.id });

    // Vérifier que la livraison existe et appartient au client
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        announcement: true,
        client: { include: { user: true } },
        deliverer: { include: { user: { include: { profile: true } } } }
      }
    });

    if (!delivery) {
      console.log('❌ Livraison non trouvée');
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    if (delivery.clientId !== user.id) {
      console.log('❌ Accès non autorisé à cette livraison');
      return NextResponse.json({ error: 'Access denied to this delivery' }, { status: 403 });
    }

    // Vérifier que la livraison est en attente de paiement
    if (delivery.status !== 'PENDING') {
      console.log('❌ Livraison pas en attente de paiement:', delivery.status);
      return NextResponse.json({ 
        error: 'Delivery is not pending payment',
        currentStatus: delivery.status 
      }, { status: 400 });
    }

    // Vérifier que l'annonce est en attente de paiement
    if (delivery.announcement.status !== 'PENDING_PAYMENT') {
      console.log('❌ Annonce pas en attente de paiement:', delivery.announcement.status);
      return NextResponse.json({ 
        error: 'Announcement is not pending payment',
        currentStatus: delivery.announcement.status 
      }, { status: 400 });
    }

    // Créer le Payment Intent via le service Stripe
    const paymentIntent = await StripeService.createDeliveryPaymentIntent(
      deliveryId,
      user.id
    );

    console.log('✅ PaymentIntent créé:', paymentIntent.id);

    return NextResponse.json({
      success: true,
      payment: paymentIntent,
      delivery: {
        id: delivery.id,
        price: delivery.price,
        title: delivery.announcement.title,
        deliverer: {
          name: `${delivery.deliverer.user.profile?.firstName} ${delivery.deliverer.user.profile?.lastName}`,
          rating: delivery.deliverer.rating || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error creating delivery payment:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Récupérer les informations de paiement existant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { id: deliveryId } = await params;

    // Récupérer les informations de livraison et paiement
    const delivery = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        announcement: true,
        client: { include: { user: true } },
        deliverer: { include: { user: { include: { profile: true } } } },
        payment: true
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    if (delivery.clientId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      delivery: {
        id: delivery.id,
        status: delivery.status,
        price: delivery.price,
        title: delivery.announcement.title,
        deliverer: {
          name: `${delivery.deliverer.user.profile?.firstName} ${delivery.deliverer.user.profile?.lastName}`,
          rating: delivery.deliverer.rating || 0
        }
      },
      payment: delivery.payment ? {
        id: delivery.payment.id,
        status: delivery.payment.status,
        amount: delivery.payment.amount,
        stripePaymentId: delivery.payment.stripePaymentId
      } : null,
      announcement: {
        id: delivery.announcement.id,
        status: delivery.announcement.status
      }
    });

  } catch (error) {
    console.error('❌ Error fetching delivery payment info:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 