import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 },
      );
    }

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

    // Récupérer les évaluations directement liées au prestataire
    const evaluations = await prisma.review.findMany({
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
      skip: (page - 1) * limit,
      take: limit,
    });

    // Transformer les données pour le frontend
    const formattedEvaluations = evaluations.map((review) => ({
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

    // Compter le total
    const totalCount = await prisma.review.count({
      where: {
        providerId: providerId,
      },
    });

    return NextResponse.json({
      evaluations: formattedEvaluations,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
