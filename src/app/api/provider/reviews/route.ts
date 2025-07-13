import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { ReviewService } from "@/features/reviews/services/review.service";

const reviewFiltersSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
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

const respondSchema = z.object({
  reviewId: z.string(),
  response: z.string().min(1, "Réponse requise"),
});

/**
 * GET - Récupérer les évaluations du prestataire
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil prestataire
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Profil prestataire non trouvé" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = reviewFiltersSchema.parse({
      rating: searchParams.get("rating")
        ? parseInt(searchParams.get("rating")!)
        : undefined,
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 20,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!)
        : 0,
    });

    const result = await ReviewService.getProviderReviews(provider.id, filters);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error getting provider reviews:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Paramètres invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
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

/**
 * POST - Répondre à une évaluation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reviewId, response } = respondSchema.parse(body);

    const updatedReview = await ReviewService.respondToReview(
      reviewId,
      session.user.id,
      response,
    );

    return NextResponse.json({
      success: true,
      message: "Réponse ajoutée avec succès",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Error responding to review:", error);

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
      { error: "Erreur lors de la réponse à l'évaluation" },
      { status: 500 },
    );
  }
}
