import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le provider
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Date actuelle pour filtrer les réservations à venir
    const now = new Date();

    // Récupérer les réservations à venir (dans les 30 prochains jours)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        providerId: provider.id,
        scheduledDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
        status: {
          in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
        },
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
        service: true,
        review: true,
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
    });

    return NextResponse.json({
      bookings: upcomingBookings,
      count: upcomingBookings.length,
    });
  } catch (error) {
    console.error("Error fetching upcoming bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
