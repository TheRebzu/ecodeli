import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Statistiques du dashboard Provider
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId') || session.user.id;

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID required' }, { status: 400 });
    }

    // Vérifier que le provider existe et appartient à l'utilisateur
    const provider = await prisma.provider.findFirst({
      where: {
        OR: [
          { id: providerId },
          { userId: session.user.id }
        ]
      }
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Statistiques des réservations
    const totalBookings = await prisma.booking.count({
      where: {
        providerId: provider.id
      }
    });

    const activeBookings = await prisma.booking.count({
      where: {
        providerId: provider.id,
        status: 'CONFIRMED'
      }
    });

    const completedBookings = await prisma.booking.count({
      where: {
        providerId: provider.id,
        status: 'COMPLETED'
      }
    });

    // Revenus du mois en cours
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const monthlyEarnings = await prisma.booking.aggregate({
      where: {
        providerId: provider.id,
        status: 'COMPLETED',
        scheduledDate: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth
        }
      },
      _sum: {
        totalPrice: true
      }
    });

    // Revenus totaux
    const totalEarnings = await prisma.booking.aggregate({
      where: {
        providerId: provider.id,
        status: 'COMPLETED'
      },
      _sum: {
        totalPrice: true
      }
    });

    // Note moyenne
    const averageRating = await prisma.review.aggregate({
      where: {
        providerId: provider.id
      },
      _avg: {
        rating: true
      }
    });

    // Solde disponible (simulé - gains moins retraits)
    const withdrawalsResult = await prisma.walletOperation.aggregate({
      where: {
        userId: provider.userId,
        type: "WITHDRAWAL",
        status: "COMPLETED"
      },
      _sum: {
        amount: true
      }
    });

    const totalWithdrawals = withdrawalsResult._sum.amount || 0;
    const availableBalance = (totalEarnings._sum.totalPrice || 0) - totalWithdrawals;

    // Évolution des réservations sur les 6 derniers mois
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyBookings = await prisma.booking.groupBy({
      by: ['scheduledDate'],
      where: {
        providerId: provider.id,
        scheduledDate: {
          gte: sixMonthsAgo
        }
      },
      _count: {
        id: true
      }
    });

    // Prochaines réservations (7 prochains jours)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingBookings = await prisma.booking.count({
      where: {
        providerId: provider.id,
        status: 'CONFIRMED',
        scheduledDate: {
          gte: new Date(),
          lte: nextWeek
        }
      }
    });

    return NextResponse.json({
      totalBookings,
      activeBookings,
      completedBookings,
      upcomingBookings,
      monthlyEarnings: monthlyEarnings._sum.totalPrice || 0,
      totalEarnings: totalEarnings._sum.totalPrice || 0,
      availableBalance,
      averageRating: averageRating._avg.rating || 0,
      monthlyBookingsData: monthlyBookings
    });
  } catch (error) {
    console.error('Error fetching provider dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 