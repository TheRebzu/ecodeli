import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { ReviewService } from "@/features/reviews/services/review.service";

const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  deliveryId: z.string().optional(),
  bookingId: z.string().optional(),
  type: z.enum(["DELIVERY", "SERVICE"]),
});

const reviewFiltersSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  type: z.enum(["DELIVERY", "SERVICE"]).optional(),
  startDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  endDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * POST - Créer une nouvelle évaluation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Profil client non trouvé" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { rating, comment, deliveryId, bookingId, type } =
      createReviewSchema.parse(body);

    // Déterminer le providerId ou delivererId selon le type
    let providerId: string | undefined;
    let delivererId: string | undefined;

    if (type === "DELIVERY" && deliveryId) {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: { delivererId: true },
      });
      delivererId = delivery?.delivererId;
    }

    if (type === "SERVICE" && bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { service: true },
      });
      providerId = booking?.service.providerId;
    }

    const review = await ReviewService.createReview({
      rating,
      comment,
      deliveryId,
      bookingId,
      providerId,
      delivererId,
      clientId: client.id,
      type,
    });

    return NextResponse.json({
      success: true,
      message: "Évaluation créée avec succès",
      review,
    });
  } catch (error) {
    console.error("Error creating review:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erreur lors de la création de l'évaluation" },
      { status: 500 },
    );
  }
}

/**
 * GET - Récupérer les évaluations du client
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "CLIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Profil client non trouvé" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = reviewFiltersSchema.parse({
      rating: searchParams.get("rating")
        ? Number.isNaN(Number(searchParams.get("rating")))
          ? undefined
          : Number(searchParams.get("rating"))
        : undefined,
      type: searchParams.get("type") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      limit: searchParams.get("limit")
        ? Number.isNaN(Number(searchParams.get("limit")))
          ? 20
          : Number(searchParams.get("limit"))
        : 20,
      offset: searchParams.get("offset")
        ? Number.isNaN(Number(searchParams.get("offset")))
          ? 0
          : Number(searchParams.get("offset"))
        : 0,
    });

    // Récupérer les évaluations du client
    const where: any = { clientId: client.id };
    if (filters.rating) where.rating = filters.rating;
    if (filters.type) where.type = filters.type;
    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          booking: {
            include: {
              service: {
                include: {
                  provider: {
                    include: {
                      user: { include: { profile: true } },
                    },
                  },
                },
              },
            },
          },
          // deliverer: { ... } supprimé car la relation n'existe pas sur Review
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit,
        skip: filters.offset,
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        pages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error getting client reviews:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: Array.isArray(error.errors)
            ? error.errors.map((e) => ({
                field: e.path.join("."),
                message: e.message,
              }))
            : [],
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la récupération des évaluations" },
      { status: 500 },
    );
  }
}
