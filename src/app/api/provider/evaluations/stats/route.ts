import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 },
      );
    }

    // Dates pour les calculs
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Vérifier que le provider existe
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Récupérer toutes les évaluations directement liées au prestataire
    const allReviews = await prisma.review.findMany({
      where: {
        providerId: providerId,
      },
      include: {
        booking: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Calculer les statistiques globales
    const totalEvaluations = allReviews.length;
    const averageRating =
      totalEvaluations > 0
        ? allReviews.reduce((sum, review) => sum + review.rating, 0) /
          totalEvaluations
        : 0;

    // Distribution des notes
    const ratingDistribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    allReviews.forEach((review) => {
      if (review.rating >= 1 && review.rating <= 5) {
        ratingDistribution[review.rating]++;
      }
    });

    // Évaluations du mois en cours
    const currentMonthReviews = allReviews.filter(
      (review) =>
        review.createdAt >= currentMonthStart &&
        review.createdAt <= currentMonthEnd,
    );
    const monthlyAverage =
      currentMonthReviews.length > 0
        ? currentMonthReviews.reduce((sum, review) => sum + review.rating, 0) /
          currentMonthReviews.length
        : 0;

    // Évaluations du mois précédent
    const previousMonthReviews = allReviews.filter(
      (review) =>
        review.createdAt >= previousMonthStart &&
        review.createdAt <= previousMonthEnd,
    );
    const previousMonthAverage =
      previousMonthReviews.length > 0
        ? previousMonthReviews.reduce((sum, review) => sum + review.rating, 0) /
          previousMonthReviews.length
        : 0;

    // Déterminer la tendance
    let trend: "up" | "down" | "stable" = "stable";
    if (monthlyAverage > previousMonthAverage + 0.1) {
      trend = "up";
    } else if (monthlyAverage < previousMonthAverage - 0.1) {
      trend = "down";
    }

    // Évaluations récentes
    const recentEvaluations = await prisma.review.findMany({
      where: {
        providerId: providerId,
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
        booking: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    const formattedRecentEvaluations = recentEvaluations.map((review) => ({
      id: review.id,
      serviceId: review.booking?.serviceId || null,
      serviceName: review.booking?.service?.name || "Service non spécifié",
      clientId: review.clientId,
      clientName:
        review.client?.user?.profile?.firstName &&
        review.client?.user?.profile?.lastName
          ? `${review.client.user.profile.firstName} ${review.client.user.profile.lastName}`
          : "Client anonyme",
      clientAvatar: review.client?.user?.profile?.avatar || null,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      response: review.response,
      respondedAt: review.respondedAt?.toISOString(),
      isVerified: review.isVerified,
    }));

    return NextResponse.json({
      averageRating,
      totalEvaluations,
      ratingDistribution,
      monthlyAverage,
      previousMonthAverage,
      trend,
      recentEvaluations: formattedRecentEvaluations,
    });
  } catch (error) {
    console.error("Error fetching evaluation stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
