import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getUserFromSession(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Vérifier que l'utilisateur est un livreur
    if (user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Récupérer les livraisons actives
    const activeDeliveries = await db.delivery.count({
      where: {
        delivererId: user.id,
        status: 'IN_TRANSIT'
      }
    });

    // Récupérer les gains du mois en cours
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const monthlyEarnings = await db.payment.aggregate({
      where: {
        userId: user.id,
        deliveryId: { not: null }, // Only delivery-related payments
        status: 'COMPLETED',
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    // Récupérer les statistiques des livraisons
    const deliveryStats = await db.delivery.aggregate({
      where: {
        delivererId: user.id,
        status: 'DELIVERED'
      },
      _count: {
        _all: true
      },
      _avg: {
        rating: true
      }
    });

    // Récupérer les demandes en attente (annonces non acceptées)
    const pendingRequests = await db.announcement.count({
      where: {
        status: 'ACTIVE',
        // Ici on pourrait ajouter une logique de matching géographique
        // Pour l'instant, on compte toutes les annonces actives
      }
    });

    // Calculer la note moyenne
    const averageRating = deliveryStats._avg.rating || 0;
    const totalDeliveries = deliveryStats._count._all || 0;

    const stats = {
      activeDeliveries,
      monthlyEarnings: monthlyEarnings._sum.amount || 0,
      averageRating,
      totalDeliveries,
      pendingRequests
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching deliverer dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 