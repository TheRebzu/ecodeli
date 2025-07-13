import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OneSignalService } from "@/lib/onesignal";
import { EmailService } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Vérifier que le provider existe
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Récupérer la réservation avec toutes les informations nécessaires
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        service: {
          include: {
            provider: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Vérifier que la réservation appartient au provider
    if (booking.service.providerId !== provider.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Vérifier que la réservation est en attente
    if (booking.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "Booking cannot be accepted in current status",
        },
        { status: 400 },
      );
    }

    // Mettre à jour le statut de la réservation
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
      },
      include: {
        client: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        service: {
          include: {
            provider: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Envoyer notification push au client
    try {
      await OneSignalService.sendToUser(
        booking.client.userId,
        "Booking Confirmed! 🎉",
        `Your booking for "${booking.service.name}" has been accepted by the provider. Please proceed with payment to finalize your booking.`,
        {
          type: "BOOKING_CONFIRMED",
          bookingId: booking.id,
          serviceId: booking.service.id,
          providerId: booking.service.providerId,
          amount: booking.totalPrice.toString(),
          requiresPayment: true,
        },
        {
          url: `/client/bookings/${booking.id}/payment`,
        },
      );
      console.log(
        "✅ Notification push envoyée au client pour acceptation de réservation",
      );
    } catch (error) {
      console.error("❌ Erreur envoi notification push:", error);
    }

    // Envoyer email de confirmation au client
    try {
      console.log(
        "📧 Tentative d'envoi email au client:",
        booking.client.user.email,
      );

      if (booking.client.user.email) {
        const subject = `Booking Confirmed - ${booking.service.name}`;
        const html = `
          <h2>🎉 Your booking has been confirmed!</h2>
          <p>Dear ${booking.client.user.profile.firstName} ${booking.client.user.profile.lastName},</p>
          <p>Great news! Your booking for "${booking.service.name}" has been accepted by the provider.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Booking Details:</h3>
            <p><strong>Service:</strong> ${booking.service.name}</p>
            <p><strong>Provider:</strong> ${booking.service.provider.user.profile?.firstName} ${booking.service.provider.user.profile?.lastName}</p>
            <p><strong>Date:</strong> ${new Date(booking.scheduledDate).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${booking.scheduledTime}</p>
            <p><strong>Total Amount:</strong> €${booking.totalPrice}</p>
          </div>
          
          <p><strong>Next Step:</strong> Please complete your payment to finalize the booking.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/client/bookings/${booking.id}/payment" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">💳 Complete Payment</a></p>
          
          <p>You can also view your booking details <a href="${process.env.NEXT_PUBLIC_APP_URL}/client/bookings/${booking.id}">here</a>.</p>
          
          <p>Thank you for using EcoDeli!</p>
        `;

        console.log("📧 Envoi email en cours...");
        const result = await EmailService.sendGenericEmail(
          booking.client.user.email,
          subject,
          html,
        );
        console.log("✅ Email de confirmation envoyé au client:", result);
      } else {
        console.log("❌ Pas d'email client disponible");
      }
    } catch (error) {
      console.error("❌ Erreur envoi email:", error);
    }

    // Créer une notification interne
    try {
      await prisma.notification.create({
        data: {
          userId: booking.client.userId,
          title: "Booking Confirmed",
          message: `Your booking for "${booking.service.name}" has been accepted. Complete your payment to finalize the booking.`,
          type: "BOOKING_CONFIRMED",
          data: {
            bookingId: booking.id,
            serviceId: booking.service.id,
            providerId: booking.service.providerId,
          },
          isRead: false,
        },
      });
      console.log("✅ Notification interne créée");
    } catch (error) {
      console.error("❌ Erreur création notification interne:", error);
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message:
        "Booking accepted successfully. Client has been notified to proceed with payment.",
    });
  } catch (error) {
    console.error("Error accepting booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
