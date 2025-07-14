import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NotificationService } from "@/features/notifications/services/notification.service";

/**
 * API pour la gestion des annonces de services à la personne par les prestataires
 * Mission 1 EcoDeli - Espace dédié aux prestataires
 */

// GET - Liste des annonces de services disponibles pour un prestataire
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const serviceType = searchParams.get("serviceType");
    const status = searchParams.get("status");
    const city = searchParams.get("city");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    // Récupérer le profil prestataire avec ses certifications
    const provider = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        providerProfile: {
          include: {
            certifications: true,
            services: true,
          },
        },
      },
    });

    if (!provider?.providerProfile) {
      return NextResponse.json(
        { error: "Profil prestataire non trouvé" },
        { status: 404 },
      );
    }

    // Construire les filtres
    const where: any = {
      type: {
        in: [
          "HOME_SERVICE",
          "PET_SITTING",
          "PERSON_TRANSPORT",
          "AIRPORT_TRANSFER",
        ],
      },
      status: status || "ACTIVE",
    };

    // Filtrer par types de services proposés par le prestataire
    if (serviceType) {
      where.serviceDetails = {
        path: ["serviceType"],
        equals: serviceType,
      };
    }

    // Filtres géographiques
    if (city) {
      where.OR = [
        { startLocation: { path: ["city"], string_contains: city } },
        { endLocation: { path: ["city"], string_contains: city } },
      ];
    }

    // Filtres de prix
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    const [announcements, totalCount] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ urgent: "desc" }, { createdAt: "desc" }],
        include: {
          client: {
            include: {
              profile: {
                select: { firstName: true, lastName: true, avatar: true },
              },
            },
          },
          serviceDetails: true,
          bookings: {
            where: { status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
            select: { id: true, providerId: true },
          },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return NextResponse.json({
      announcements,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching provider announcements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Candidater sur une annonce de service
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodySchema = z.object({
      announcementId: z.string().min(1),
      proposedPrice: z.number().positive().optional(),
      message: z.string().max(500).optional(),
      availableSlots: z
        .array(
          z.object({
            start: z.string().datetime(),
            end: z.string().datetime(),
          }),
        )
        .min(1, "Au moins un créneau requis"),
      estimatedDuration: z.number().positive().optional(),
    });

    const body = await request.json();
    const {
      announcementId,
      proposedPrice,
      message,
      availableSlots,
      estimatedDuration,
    } = bodySchema.parse(body);

    // Vérifier que l'annonce existe et est active
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        client: {
          include: { profile: true },
        },
        serviceDetails: true,
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Annonce non trouvée" },
        { status: 404 },
      );
    }

    if (announcement.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Cette annonce n'est plus disponible" },
        { status: 409 },
      );
    }

    // Find the provider record for this user
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Créer la candidature/booking
    const booking = await prisma.booking.create({
      data: {
        announcementId,
        clientId: announcement.clientId,
        providerId: provider.id,
        status: "PENDING",
        proposedPrice: proposedPrice || announcement.price,
        providerMessage: message,
        availableSlots,
        estimatedDuration,
        createdAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: "Candidature envoyée avec succès",
        booking: {
          id: booking.id,
          status: booking.status,
          proposedPrice: booking.proposedPrice,
          createdAt: booking.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating provider application:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
