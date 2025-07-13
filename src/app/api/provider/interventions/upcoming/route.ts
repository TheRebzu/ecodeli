import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId") || session.user.id;
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID required" },
        { status: 400 },
      );
    }

    // Vérifier que le provider existe et appartient à l'utilisateur
    const provider = await prisma.provider.findFirst({
      where: {
        OR: [{ id: providerId }, { userId: session.user.id }],
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Récupérer les interventions à venir (prochains 30 jours)
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const upcomingInterventions = await prisma.booking.findMany({
      where: {
        providerId: provider.id,
        status: "CONFIRMED",
        scheduledDate: {
          gte: new Date(),
          lte: nextMonth,
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
      },
      orderBy: {
        scheduledDate: "asc",
      },
      take: limit,
    });

    // Formatter les données pour correspondre à l'interface attendue
    const formattedInterventions = upcomingInterventions.map((booking) => {
      // Extraire les données d'adresse du JSON
      const addressData =
        typeof booking.address === "object" && booking.address
          ? (booking.address as any)
          : {};
      const fullAddress = [
        addressData.address || "",
        addressData.city || "",
        addressData.postalCode || "",
      ]
        .filter(Boolean)
        .join(", ");

      return {
        id: booking.id,
        serviceName: booking.service?.name || "Service",
        clientName:
          `${booking.client.user.profile?.firstName || ""} ${booking.client.user.profile?.lastName || ""}`.trim() ||
          booking.client.user.email,
        scheduledAt: booking.scheduledDate.toISOString(),
        location: fullAddress || "Adresse non spécifiée",
        price: Number(booking.totalPrice) || 0,
        status: booking.status,
        duration: booking.duration || 60,
        notes: booking.notes || "",
        clientPhone: booking.client.user.profile?.phone,
        clientEmail: booking.client.user.email,
        timeSlot: booking.scheduledTime || "09:00",
      };
    });

    return NextResponse.json({
      interventions: formattedInterventions,
      total: formattedInterventions.length,
    });
  } catch (error) {
    console.error("Error fetching upcoming interventions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
