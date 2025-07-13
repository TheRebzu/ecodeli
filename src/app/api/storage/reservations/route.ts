import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";
import { z } from "zod";

const reservationSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  boxSize: z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]),
  startDate: z.string().datetime("Invalid start date format"),
  endDate: z.string().datetime("Invalid end date format"),
});

// GET - Récupérer les réservations de l'utilisateur
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

    // Récupérer les réservations avec les informations du box et de l'entrepôt
    const [reservations, total] = await Promise.all([
      prisma.storageReservation.findMany({
        where: whereConditions,
        include: {
          storageBox: {
            include: {
              warehouse: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  city: true,
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
          startDate: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.storageReservation.count({
        where: whereConditions,
      }),
    ]);

    return NextResponse.json({
      reservations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching storage reservations:", error);
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
        { error: "Only clients can create storage reservations" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = reservationSchema.parse(body);

    // Vérifier que les dates sont valides
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);
    const now = new Date();

    if (startDate < now) {
      return NextResponse.json(
        { error: "Start date must be in the future" },
        { status: 400 },
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    // Trouver un box disponible
    const availableBox = await prisma.storageBox.findFirst({
      where: {
        warehouseId: validatedData.warehouseId,
        size: validatedData.boxSize,
        status: "AVAILABLE",
        // Vérifier qu'il n'y a pas de conflit de réservation
        reservations: {
          none: {
            OR: [
              {
                startDate: { lte: endDate },
                endDate: { gte: startDate },
                status: { in: ["ACTIVE", "PENDING"] },
              },
            ],
          },
        },
      },
      include: {
        warehouse: true,
      },
    });

    if (!availableBox) {
      return NextResponse.json(
        { error: "No available box found for the specified criteria" },
        { status: 404 },
      );
    }

    // Calculer le prix total
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const months = Math.ceil(days / 30);
    const totalPrice = availableBox.monthlyPrice * months;

    // Créer la réservation
    const reservation = await prisma.storageReservation.create({
      data: {
        clientId: user.id,
        storageBoxId: availableBox.id,
        startDate,
        endDate,
        totalPrice,
        status: "PENDING",
        accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(), // Code d'accès aléatoire
      },
      include: {
        storageBox: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    // Créer le paiement associé
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: totalPrice,
        currency: "EUR",
        status: "PENDING",
        type: "STORAGE",
        stripePaymentId: null, // Sera mis à jour lors du paiement Stripe
      },
    });

    // Associer le paiement à la réservation
    await prisma.storageReservation.update({
      where: { id: reservation.id },
      data: { paymentId: payment.id },
    });

    // Marquer le box comme occupé
    await prisma.storageBox.update({
      where: { id: availableBox.id },
      data: { status: "OCCUPIED" },
    });

    // Ici, vous pourriez intégrer Stripe pour le paiement
    // Pour l'instant, on simule un paiement réussi
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED" },
    });

    await prisma.storageReservation.update({
      where: { id: reservation.id },
      data: { status: "ACTIVE" },
    });

    // Récupérer la réservation mise à jour
    const updatedReservation = await prisma.storageReservation.findUnique({
      where: { id: reservation.id },
      include: {
        storageBox: {
          include: {
            warehouse: true,
          },
        },
        payment: true,
      },
    });

    return NextResponse.json(
      {
        reservation: updatedReservation,
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

    console.error("Error creating storage reservation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
