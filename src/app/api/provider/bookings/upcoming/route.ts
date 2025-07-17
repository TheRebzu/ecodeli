import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [GET /api/provider/bookings/upcoming] Récupération des réservations à venir");

    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      console.log("❌ Utilisateur non authentifié ou non prestataire");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Prestataire authentifié:", session.user.id, session.user.role);

    // Récupérer le provider
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });

    if (!provider) {
      console.log("❌ Profil prestataire non trouvé");
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });
    }

    console.log("✅ Profil prestataire trouvé:", provider.id);

    // Date actuelle pour filtrer les réservations à venir
    const now = new Date();

    // Récupérer les réservations à venir (dans les 30 prochains jours)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    console.log("🔍 Recherche de réservations entre:", now.toISOString(), "et", thirtyDaysFromNow.toISOString());

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
        service: {
          select: {
            id: true,
            name: true,
            type: true,
            basePrice: true,
            description: true,
          },
        },
        review: true,
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
    });

    console.log(`✅ Réservations à venir trouvées: ${upcomingBookings.length}`);

    // Debug : vérifier la structure des données
    upcomingBookings.forEach((booking, index) => {
      console.log(`📋 Booking ${index}:`, {
        id: booking.id,
        hasClient: !!booking.client,
        hasUser: !!booking.client?.user,
        hasProfile: !!booking.client?.user?.profile,
        clientId: booking.clientId,
      });
    });

    // Transformer les données pour correspondre à l'interface frontend
    const transformedBookings = upcomingBookings.map((booking) => {
      // Vérifications sécurisées pour éviter les erreurs
      const client = booking.client;
      const user = client?.user;
      const profile = user?.profile;

      return {
        id: booking.id,
        scheduledDate: booking.scheduledDate.toISOString(),
        scheduledTime: booking.scheduledTime,
        duration: booking.duration,
        totalPrice: booking.totalPrice,
        status: booking.status,
        notes: booking.notes,
        address: booking.address,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
        client: {
          id: client?.id || '',
          user: {
            id: user?.id || '',
            name: user?.name || 'Client inconnu',
            email: user?.email || '',
            profile: {
              firstName: profile?.firstName || '',
              lastName: profile?.lastName || '',
              phone: profile?.phone || '',
              avatar: profile?.avatar || null,
            },
          },
        },
        service: {
          id: booking.service.id,
          name: booking.service.name,
          type: booking.service.type,
          basePrice: booking.service.basePrice,
          description: booking.service.description,
        },
        review: booking.review ? {
          id: booking.review.id,
          rating: booking.review.rating,
          comment: booking.review.comment,
          createdAt: booking.review.createdAt.toISOString(),
        } : null,
      };
    });

    console.log("✅ Données transformées avec succès");

    return NextResponse.json({
      bookings: transformedBookings,
      count: transformedBookings.length,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des réservations à venir:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
