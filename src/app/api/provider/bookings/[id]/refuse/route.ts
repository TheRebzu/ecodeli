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
    const body = await request.json();
    const { reason } = body;

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
          error: "Booking cannot be refused in current status",
        },
        { status: 400 },
      );
    }

    // Mettre à jour le statut de la réservation
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        notes: `Cancelled: ${reason || "Refused by provider"}`,
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
        "Booking Update",
        `Unfortunately, your booking for "${booking.service.name}" has been declined by the provider. You can browse other available services.`,
        {
          type: "BOOKING_CANCELLED",
          bookingId: booking.id,
          serviceId: booking.service.id,
          providerId: booking.service.providerId,
          reason: reason || "Declined by provider",
        },
        {
          url: `/client/services`,
        },
      );
      console.log(
        "✅ Notification push envoyée au client pour refus de réservation",
      );
    } catch (error) {
      console.error("❌ Erreur envoi notification push:", error);
    }

    // Envoyer email au client
    try {
      console.log(
        "📧 Tentative d'envoi email de refus au client:",
        booking.client.user.email,
      );

      if (booking.client.user.email) {
        const subject = `Booking Update - ${booking.service.name}`;
        const html = `
          <h2>📅 Booking Update</h2>
          <p>Dear ${booking.client.user.profile.firstName} ${booking.client.user.profile.lastName},</p>
          <p>We regret to inform you that your booking for "${booking.service.name}" has been declined by the provider.</p>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3>Booking Details:</h3>
            <p><strong>Service:</strong> ${booking.service.name}</p>
            <p><strong>Provider:</strong> ${booking.service.provider.user.profile?.firstName} ${booking.service.provider.user.profile?.lastName}</p>
            <p><strong>Requested Date:</strong> ${new Date(booking.scheduledDate).toLocaleDateString()}</p>
            <p><strong>Requested Time:</strong> ${booking.scheduledTime}</p>
            <p><strong>Reason:</strong> ${reason || "The provider is not available at the requested time"}</p>
          </div>
          
          <p>Don't worry! There are many other great services available on EcoDeli.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/client/services" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">🔍 Browse Other Services</a></p>
          
          <p>We apologize for any inconvenience and thank you for using EcoDeli!</p>
        `;

        console.log("📧 Envoi email de refus en cours...");
        const result = await EmailService.sendGenericEmail(
          booking.client.user.email,
          subject,
          html,
        );
        console.log("✅ Email de refus envoyé au client:", result);
      } else {
        console.log("❌ Pas d'email client disponible pour le refus");
      }
    } catch (error) {
      console.error("❌ Erreur envoi email:", error);
    }

    // Créer une notification interne
    try {
      await prisma.notification.create({
        data: {
          userId: booking.client.userId,
          title: "Booking Declined",
          message: `Your booking for "${booking.service.name}" has been declined. Browse other available services.`,
          type: "BOOKING_CANCELLED",
          data: {
            bookingId: booking.id,
            serviceId: booking.service.id,
            providerId: booking.service.providerId,
            reason: reason || "Declined by provider",
          },
          isRead: false,
        },
      });
      console.log("✅ Notification interne créée pour refus");
    } catch (error) {
      console.error("❌ Erreur création notification interne:", error);
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: "Booking declined successfully. Client has been notified.",
    });
  } catch (error) {
    console.error("Error refusing booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
