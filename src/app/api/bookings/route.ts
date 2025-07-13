import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bookingSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
  scheduledAt: z.string().datetime("Invalid date format"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  notes: z.string().optional(),
});

// GET - Liste des réservations de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const skip = (page - 1) * limit;

    // Construire les conditions de filtrage
    const whereConditions: any = {
      clientId: user.id,
    };

    if (status) {
      whereConditions.status = status;
    }

    // Récupérer les réservations avec les informations du service et du prestataire
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: whereConditions,
        include: {
          service: {
            include: {
              provider: {
                include: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      city: true,
                    },
                  },
                },
              },
            },
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          scheduledAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.booking.count({
        where: whereConditions,
      }),
    ]);

    return NextResponse.json({
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST - Créer une nouvelle réservation
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un client
    if (user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Only clients can create bookings" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = bookingSchema.parse(body);

    // Vérifier que le service existe et est actif
    const service = await prisma.service.findUnique({
      where: {
        id: validatedData.serviceId,
        isActive: true,
      },
      include: {
        provider: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found or inactive" },
        { status: 404 },
      );
    }

    // Vérifier que la date est dans le futur
    const scheduledDate = new Date(validatedData.scheduledAt);
    const now = new Date();

    if (scheduledDate <= now) {
      return NextResponse.json(
        { error: "Scheduled date must be in the future" },
        { status: 400 },
      );
    }

    // Vérifier la disponibilité du prestataire (simplifié)
    const conflictingBookings = await prisma.booking.findFirst({
      where: {
        serviceId: validatedData.serviceId,
        status: {
          in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
        },
        scheduledAt: {
          gte: new Date(scheduledDate.getTime() - service.duration * 60 * 1000),
          lte: new Date(scheduledDate.getTime() + service.duration * 60 * 1000),
        },
      },
    });

    if (conflictingBookings) {
      return NextResponse.json(
        { error: "Service provider is not available at this time" },
        { status: 409 },
      );
    }

    // Créer la réservation
    const booking = await prisma.booking.create({
      data: {
        serviceId: validatedData.serviceId,
        clientId: user.id,
        scheduledAt: scheduledDate,
        address: validatedData.address,
        notes: validatedData.notes || "",
        status: "PENDING",
      },
      include: {
        service: {
          include: {
            provider: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    // Créer le paiement associé
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: service.price,
        currency: "EUR",
        status: "PENDING",
        type: "SERVICE",
        stripePaymentId: null, // Sera mis à jour lors du paiement Stripe
      },
    });

    // Associer le paiement à la réservation
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentId: payment.id },
    });

    // Envoyer une notification au prestataire (optionnel)
    // await sendNotificationToProvider(service.provider.id, booking);

    return NextResponse.json(
      {
        ...booking,
        payment,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
