import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/utils';
import { prisma } from '@/lib/db';

// POST - Annuler l'abonnement de l'utilisateur
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est un client
    if (user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Only clients can cancel subscriptions' },
        { status: 403 }
      );
    }

    // Récupérer l'abonnement actuel
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: {
          in: ['active', 'pending']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Si c'est un abonnement gratuit, le supprimer
    if (currentSubscription.plan === 'FREE') {
      await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: 'cancelled',
          endDate: new Date(),
        }
      });
    } else {
      // Pour les abonnements payants, marquer comme annulé mais garder jusqu'à la fin de la période
      await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: 'cancelled',
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Fin de la période actuelle
        }
      });

      // Créer un abonnement gratuit pour remplacer
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'FREE',
          status: 'active',
          startDate: new Date(),
        }
      });
    }

    // Récupérer l'abonnement mis à jour
    const updatedSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: {
          in: ['active', 'pending']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      subscription: {
        id: updatedSubscription!.id,
        plan: updatedSubscription!.plan,
        status: updatedSubscription!.status,
        startDate: updatedSubscription!.startDate.toISOString(),
        endDate: updatedSubscription!.endDate?.toISOString(),
        nextBillingDate: null,
        amount: 0,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 