import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || userId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the provider record for this user
    const provider = await prisma.provider.findUnique({
      where: { userId: userId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Calculate stats for the current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // Get total and active services count
    const [totalServices, activeServices] = await Promise.all([
      prisma.service.count({
        where: { providerId: provider.id },
      }),
      prisma.service.count({
        where: {
          providerId: provider.id,
          isActive: true,
        },
      }),
    ]);

    // Get average rating from reviews
    const ratingsAggregate = await prisma.review.aggregate({
      where: {
        providerId: provider.id,
        rating: {
          not: null,
        },
      },
      _avg: {
        rating: true,
      },
    });

    // Get this month's bookings count
    const monthlyBookings = await prisma.booking.count({
      where: {
        service: {
          providerId: provider.id,
        },
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    // Calculate monthly revenue from completed bookings
    const revenueAggregate = await prisma.booking.aggregate({
      where: {
        service: {
          providerId: provider.id,
        },
        status: "COMPLETED",
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      _sum: {
        totalPrice: true,
      },
    });

    const stats = {
      totalServices,
      activeServices,
      averageRating: ratingsAggregate._avg.rating || 0,
      totalBookings: monthlyBookings,
      monthlyRevenue: revenueAggregate._sum.totalPrice || 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching service stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
