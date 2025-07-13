import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    console.log("🔍 Recherche booking avec:");
    console.log("- Booking ID:", id);
    console.log("- User ID (session):", user.id);
    console.log("- User role:", user.role);

    // Récupérer le profil client
    const client = await db.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      console.log("❌ Aucun profil client trouvé pour userId:", user.id);
      return NextResponse.json(
        { error: "Client profile not found" },
        { status: 404 },
      );
    }

    console.log("- User has Client profile: Yes (" + client.id + ")");

    // Récupérer la réservation avec tous les détails
    const booking = await db.booking.findFirst({
      where: {
        id: id,
        clientId: client.id,
      },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            paymentMethod: true,
            paidAt: true,
          },
        },
      },
    });

    if (!booking) {
      console.log(
        "❌ Booking non trouvé avec ID:",
        id,
        "pour client:",
        client.id,
      );
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    console.log("✅ Booking trouvé:", booking.id);

    // Transformer les données pour le frontend
    const bookingDetails = {
      id: booking.id,
      providerName: booking.provider.user.profile
        ? `${booking.provider.user.profile.firstName || ""} ${booking.provider.user.profile.lastName || ""}`.trim()
        : "Prestataire",
      serviceType: booking.service?.type || "HOME_SERVICE",
      serviceName: booking.service?.name || "Service",
      scheduledDate: booking.scheduledDate.toISOString().split("T")[0],
      scheduledTime: booking.scheduledTime,
      location:
        typeof booking.address === "object" &&
        booking.address &&
        "address" in booking.address
          ? `${booking.address.address}, ${booking.address.city}`
          : booking.address?.toString() || "Non spécifié",
      price: booking.totalPrice,
      status: booking.status.toLowerCase(),
      notes: booking.notes,
      payment: booking.payment,
      isPaid: booking.payment?.status === "COMPLETED",
    };

    return NextResponse.json({
      success: true,
      booking: bookingDetails,
    });
  } catch (error) {
    console.error("Error fetching booking details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // V�rifier que la r�servation appartient au client
    const existingBooking = await db.booking.findFirst({
      where: {
        id: id,
        client: {
          userId: session.user.id,
        },
      },
    });

    if (!existingBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // V�rifier que la r�servation peut �tre modifi�e
    if (
      existingBooking.status !== "PENDING" &&
      existingBooking.status !== "CONFIRMED"
    ) {
      return NextResponse.json(
        { error: "Booking cannot be modified" },
        { status: 400 },
      );
    }

    // Mettre � jour la r�servation
    const updatedBooking = await db.booking.update({
      where: { id: id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
      include: {
        client: {
          select: {
            id: true,
            userId: true,
          },
        },
        provider: {
          select: {
            id: true,
            averageRating: true,
            businessName: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                profile: {
                  select: {
                    phone: true,
                  },
                },
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
          },
        },
      },
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
