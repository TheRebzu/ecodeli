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
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');

    if (!userId || userId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 });
    }

    // Calculate billing period
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Get completed bookings for the month
    const bookings = await prisma.booking.findMany({
      where: {
        service: {
          providerId: userId
        },
        status: 'COMPLETED',
        scheduledDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        client: {
          select: {
            user: {
              select: {
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        service: {
          select: {
            name: true,
            basePrice: true
          }
        }
      }
    });

    // Calculate totals
    const totalRevenue = bookings.reduce((sum, booking) => {
      return sum + (booking.totalPrice || booking.service.basePrice || 0);
    }, 0);

    const platformCommissionRate = 0.15; // 15% commission
    const platformFee = totalRevenue * platformCommissionRate;
    const processingFees = totalRevenue * 0.029; // 2.9% processing
    const taxRate = 0.20; // 20% VAT
    const taxAmount = (totalRevenue - platformFee) * taxRate;
    const netAmount = totalRevenue - platformFee - processingFees - taxAmount;

    // Transform bookings for response
    const bookingBreakdown = bookings.map(booking => {
      const amount = booking.totalPrice || booking.service.basePrice || 0;
      const commission = amount * platformCommissionRate;
      const clientName = booking.client.user.profile 
        ? `${booking.client.user.profile.firstName || ''} ${booking.client.user.profile.lastName || ''}`.trim()
        : booking.client.user.email.split('@')[0];

      return {
        id: booking.id,
        clientName: clientName || 'Client',
        serviceName: booking.service.name,
        date: booking.scheduledDate.toISOString(),
        amount: amount,
        commission: commission,
        netAmount: amount - commission
      };
    });

    // Determine status
    const currentDate = new Date();
    const isCurrentMonth = currentDate.getMonth() === month - 1 && currentDate.getFullYear() === year;
    const isPastMonth = endDate < currentDate;
    
    let status: 'DRAFT' | 'PENDING' | 'GENERATED' | 'SENT' | 'PAID' = 'DRAFT';
    if (isPastMonth) {
      status = 'GENERATED'; // Past months are typically generated
    } else if (isCurrentMonth && currentDate.getDate() >= 28) {
      status = 'PENDING'; // Ready for generation
    }

    const monthlyBilling = {
      month: new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long' }),
      year: year,
      status: status,
      totalRevenue: totalRevenue,
      platformFee: platformFee + processingFees,
      netAmount: netAmount,
      taxAmount: taxAmount,
      completedBookings: bookings.length,
      invoiceNumber: isPastMonth ? `INV-${year}-${month.toString().padStart(2, '0')}-${userId.slice(-6)}` : undefined,
      generatedAt: isPastMonth ? endDate.toISOString() : undefined,
      billingPeriod: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      bookingBreakdown: bookingBreakdown,
      feeBreakdown: {
        platformCommission: platformFee,
        processingFees: processingFees,
        taxAmount: taxAmount,
        otherFees: 0
      }
    };

    return NextResponse.json(monthlyBilling);

  } catch (error) {
    console.error('Error fetching monthly billing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 