import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the provider record for this user
    const provider = await prisma.provider.findUnique({
      where: { userId: userId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Get historical bookings (completed, cancelled, or past scheduled date)
    const now = new Date();

    const bookings = await prisma.booking.findMany({
      where: {
        providerId: provider.id, // Utiliser directement providerId
        OR: [
          { status: "COMPLETED" },
          { status: "CANCELLED" },
          {
            AND: [
              { status: { not: "COMPLETED" } },
              { scheduledDate: { lt: now } },
            ],
          },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            user: {
              select: {
                email: true,
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
            type: true, // Corriger 'category' en 'type' selon le schéma
          },
        },
      },
      orderBy: {
        scheduledDate: "desc",
      },
    });

    // Transform bookings to match the expected interface
    const historicalBookings = bookings.map((booking) => {
      const clientName = booking.client.user.profile
        ? `${booking.client.user.profile.firstName || ""} ${booking.client.user.profile.lastName || ""}`.trim()
        : booking.client.user.email.split("@")[0];

      // Determine status - if it's past the scheduled time and not completed/cancelled, mark as NO_SHOW
      let status = booking.status;
      if (
        booking.scheduledDate < now &&
        status !== "COMPLETED" &&
        status !== "CANCELLED"
      ) {
        status = "NO_SHOW";
      }

      return {
        id: booking.id,
        clientName: clientName || "Client",
        clientEmail: booking.client.user.email,
        serviceName: booking.service.name,
        serviceType: booking.service.type, // Ajouter le type de service
        status: status,
        scheduledAt: booking.scheduledDate.toISOString(),
        scheduledTime: booking.scheduledTime,
        completedAt: booking.completedAt?.toISOString(),
        duration: booking.duration || 60, // Default duration if not set
        address: booking.address || { address: "À domicile" }, // Corriger 'location' en 'address'
        totalAmount: booking.totalPrice || 0,
        rating: booking.rating,
        review: booking.review,
        notes: booking.notes,
      };
    });

    return NextResponse.json({ bookings: historicalBookings });
  } catch (error) {
    console.error("Error fetching booking history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
