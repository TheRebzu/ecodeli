import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/utils';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const range = searchParams.get('range') || 'month';

    if (!userId || userId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Get current month bookings
    const currentMonthBookings = await prisma.booking.findMany({
      where: {
        service: {
          providerId: userId
        },
        status: 'COMPLETED',
        scheduledDate: {
          gte: currentMonthStart,
          lte: currentMonthEnd
        }
      },
      include: {
        service: {
          select: {
            name: true,
            basePrice: true
          }
        }
      }
    });

    // Get previous month bookings
    const previousMonthBookings = await prisma.booking.findMany({
      where: {
        service: {
          providerId: userId
        },
        status: 'COMPLETED',
        scheduledDate: {
          gte: previousMonthStart,
          lte: previousMonthEnd
        }
      }
    });

    // Get year to date bookings
    const yearBookings = await prisma.booking.findMany({
      where: {
        service: {
          providerId: userId
        },
        status: 'COMPLETED',
        scheduledDate: {
          gte: yearStart,
          lte: now
        }
      },
      include: {
        service: {
          select: {
            name: true,
            basePrice: true
          }
        }
      }
    });

    // Calculate current month stats
    const currentMonthEarnings = currentMonthBookings.reduce((sum, booking) => {
      return sum + (booking.totalPrice || booking.service.basePrice || 0);
    }, 0);

    const currentMonthNet = currentMonthEarnings * 0.85; // After 15% commission
    const averageBookingValue = currentMonthBookings.length > 0 ? currentMonthEarnings / currentMonthBookings.length : 0;

    // Calculate previous month stats
    const previousMonthEarnings = previousMonthBookings.reduce((sum, booking) => {
      return sum + (booking.totalPrice || 50); // Default amount if not set
    }, 0);

    // Calculate year stats
    const yearEarnings = yearBookings.reduce((sum, booking) => {
      return sum + (booking.totalPrice || booking.service.basePrice || 0);
    }, 0);

    // Find best month (mock calculation)
    const bestMonth = 'Octobre';
    const bestMonthAmount = yearEarnings * 0.3; // Assume best month is 30% of year total

    // Generate weekly breakdown (last 4 weeks)
    const weeklyBreakdown = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7 + 7));
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (i * 7));

      const weekBookings = currentMonthBookings.filter(booking => {
        const bookingDate = new Date(booking.scheduledDate);
        return bookingDate >= weekStart && bookingDate <= weekEnd;
      });

      const weekEarnings = weekBookings.reduce((sum, booking) => {
        return sum + (booking.totalPrice || booking.service.basePrice || 0);
      }, 0);

      weeklyBreakdown.push({
        week: `Semaine ${4 - i}`,
        earnings: weekEarnings * 0.85, // After commission
        bookings: weekBookings.length
      });
    }

    // Calculate top services
    const serviceStats = new Map();
    currentMonthBookings.forEach(booking => {
      const serviceName = booking.service.name;
      const amount = booking.totalPrice || booking.service.basePrice || 0;
      
      if (!serviceStats.has(serviceName)) {
        serviceStats.set(serviceName, { earnings: 0, bookings: 0, totalAmount: 0 });
      }
      
      const stats = serviceStats.get(serviceName);
      stats.earnings += amount * 0.85; // After commission
      stats.bookings += 1;
      stats.totalAmount += amount;
    });

    const topServices = Array.from(serviceStats.entries())
      .map(([serviceName, stats]) => ({
        serviceName,
        earnings: stats.earnings,
        bookings: stats.bookings,
        averageValue: stats.bookings > 0 ? stats.totalAmount / stats.bookings : 0
      }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);

    const summary = {
      currentMonth: {
        totalEarnings: currentMonthNet,
        completedBookings: currentMonthBookings.length,
        averageBookingValue: averageBookingValue,
        pendingPayments: currentMonthNet * 0.1 // 10% pending
      },
      previousMonth: {
        totalEarnings: previousMonthEarnings * 0.85,
        completedBookings: previousMonthBookings.length
      },
      yearToDate: {
        totalEarnings: yearEarnings * 0.85,
        completedBookings: yearBookings.length,
        bestMonth: bestMonth,
        bestMonthAmount: bestMonthAmount
      },
      weeklyBreakdown: weeklyBreakdown,
      topServices: topServices,
      paymentStatus: {
        available: currentMonthNet * 0.7,
        pending: currentMonthNet * 0.2,
        processing: currentMonthNet * 0.1
      }
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Error fetching earnings summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 