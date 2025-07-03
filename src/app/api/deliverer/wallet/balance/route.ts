import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
      include: { user: true }
    });

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer not found' }, { status: 404 });
    }

    // Calculer le solde disponible
    const totalEarnings = await prisma.payment.aggregate({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        type: 'DELIVERY'
      },
      _sum: {
        amount: true
      }
    });

    const totalWithdrawals = await prisma.withdrawal.aggregate({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        type: 'WITHDRAWAL'
      },
      _sum: {
        amount: true
      }
    });

    const pendingWithdrawals = await prisma.withdrawal.aggregate({
      where: {
        userId: session.user.id,
        status: 'PENDING',
        type: 'WITHDRAWAL'
      },
      _sum: {
        amount: true
      }
    });

    const earnings = totalEarnings._sum.amount || 0;
    const withdrawals = totalWithdrawals._sum.amount || 0;
    const pending = pendingWithdrawals._sum.amount || 0;
    const availableBalance = earnings - withdrawals;

    // Statistiques du mois en cours
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const monthlyEarnings = await prisma.payment.aggregate({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        type: 'DELIVERY',
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    const monthlyWithdrawals = await prisma.withdrawal.aggregate({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        type: 'WITHDRAWAL',
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: {
        amount: true
      }
    });

    return NextResponse.json({
      availableBalance,
      totalEarnings: earnings,
      totalWithdrawn: withdrawals,
      pendingWithdrawals: pending,
      monthlyStats: {
        earnings: monthlyEarnings._sum.amount || 0,
        withdrawals: monthlyWithdrawals._sum.amount || 0,
        netEarnings: (monthlyEarnings._sum.amount || 0) - (monthlyWithdrawals._sum.amount || 0)
      },
      currency: 'EUR'
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 