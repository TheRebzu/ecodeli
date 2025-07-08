import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Activités récentes du dashboard Provider
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
    const limit = parseInt(searchParams.get('limit') || '10');

    // Trouver le provider
    const provider = await prisma.provider.findFirst({
      where: {
        OR: [
          { id: providerId },
          { userId: session.user.id }
        ]
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    const activities = [];

    // Récupérer les réservations récentes
    const recentBookings = await prisma.booking.findMany({
      where: {
        providerId: provider.id
      },
      include: {
        client: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        service: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    for (const booking of recentBookings) {
      activities.push({
        id: `booking-${booking.id}`,
        type: 'booking_received',
        title: 'Nouvelle réservation',
        description: `${booking.client.user.profile?.firstName || 'Client'} a réservé ${booking.service.name}`,
        timestamp: booking.createdAt.toISOString(),
        status: booking.status
      });
    }

    // Récupérer les évaluations récentes
    const recentReviews = await prisma.review.findMany({
      where: {
        providerId: provider.id
      },
      include: {
        client: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        booking: {
          include: {
            service: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    for (const review of recentReviews) {
      activities.push({
        id: `review-${review.id}`,
        type: 'review_received',
        title: 'Nouvelle évaluation',
        description: `${review.client.user.profile?.firstName || 'Client'} vous a donné ${review.rating}/5 étoiles`,
        timestamp: review.createdAt.toISOString(),
        status: 'COMPLETED'
      });
    }

    // Récupérer les paiements récents
    const recentPayments = await prisma.payment.findMany({
      where: {
        booking: {
          providerId: provider.id
        },
        status: 'COMPLETED'
      },
      include: {
        booking: {
          include: {
            service: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    for (const payment of recentPayments) {
      if (payment.booking) {
        activities.push({
          id: `payment-${payment.id}`,
          type: 'payment_received',
          title: 'Paiement reçu',
          description: `Paiement de ${payment.amount}€ pour ${payment.booking.service?.name || 'service'}`,
          timestamp: payment.createdAt.toISOString(),
          status: 'COMPLETED'
        });
      }
    }

    // Récupérer les notifications de validation
    const recentNotifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        type: 'PROVIDER_VALIDATION'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    for (const notification of recentNotifications) {
      activities.push({
        id: `notification-${notification.id}`,
        type: 'validation_update',
        title: notification.title,
        description: notification.message,
        timestamp: notification.createdAt.toISOString(),
        status: notification.isRead ? 'READ' : 'UNREAD'
      });
    }

    // Trier toutes les activités par date
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      activities: activities.slice(0, limit)
    });
  } catch (error) {
    console.error("Error fetching provider dashboard activities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 