import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Vérifier que la réservation existe
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            user: true,
          },
        },
        service: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Vérifier que le provider est autorisé
    if (booking.providerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Mettre à jour le statut de la réservation
    await prisma.booking.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        updatedAt: new Date(),
      },
    });

    // Tenter d'envoyer une notification push (optionnel)
    try {
      // Import conditionnel pour éviter les erreurs si OneSignal n'est pas configuré
      if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_API_KEY) {
        const { OneSignalService } = await import("@/lib/onesignal");
        await OneSignalService.sendToUser(booking.client.user.id, {
          title: "Réservation confirmée",
          message: `Votre réservation pour ${booking.service.name} a été confirmée`,
          data: { bookingId: id },
        });
      }
    } catch (notificationError) {
      console.warn("Failed to send push notification:", notificationError);
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: "CONFIRMED",
      },
    });
  } catch (error) {
    console.error("Error accepting booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
