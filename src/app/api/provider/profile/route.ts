import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Récupérer le profil provider complet
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur a le rôle PROVIDER
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "User is not a provider" },
        { status: 403 }
      );
    }

    // Récupérer le profil provider complet
    const provider = await prisma.provider.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
        services: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
            services: true,
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json({
        provider: null,
        message: "Provider profile not found",
      });
    }

    // Calculer les statistiques
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Réservations du mois en cours
    const monthlyBookings = await prisma.booking.count({
      where: {
        providerId: provider.id,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Revenus du mois
    const monthlyRevenue = await prisma.booking.aggregate({
      where: {
        providerId: provider.id,
        status: "COMPLETED",
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        totalPrice: true,
      },
    });

    // Note moyenne et tendance
    const reviews = await prisma.review.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    // Calculer la tendance (comparer les 10 dernières vs les 10 précédentes)
    const recentReviews = reviews.slice(0, 10);
    const olderReviews = reviews.slice(10, 20);
    
    const recentAvg = recentReviews.length > 0 
      ? recentReviews.reduce((sum, review) => sum + review.rating, 0) / recentReviews.length
      : 0;
    
    const olderAvg = olderReviews.length > 0 
      ? olderReviews.reduce((sum, review) => sum + review.rating, 0) / olderReviews.length
      : 0;

    let trend = "stable";
    if (recentAvg > olderAvg + 0.2) trend = "up";
    else if (recentAvg < olderAvg - 0.2) trend = "down";

    return NextResponse.json({
      provider: {
        ...provider,
        averageRating: parseFloat(averageRating.toFixed(1)),
        trend,
        monthlyStats: {
          bookings: monthlyBookings,
          revenue: monthlyRevenue._sum.totalPrice || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching provider profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour le profil provider
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      businessName, 
      siret, 
      description, 
      specialties, 
      hourlyRate,
      zone 
    } = body;

    // Trouver le provider existant
    const existingProvider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
    });

    if (!existingProvider) {
      return NextResponse.json(
        { error: "Provider profile not found" },
        { status: 404 }
      );
    }

    // Mettre à jour le profil
    const updatedProvider = await prisma.provider.update({
      where: { userId: session.user.id },
      data: {
        businessName,
        siret,
        description,
        specialties,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        zone,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedProvider);
  } catch (error) {
    console.error("Error updating provider profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 