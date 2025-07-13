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

    // Calculate stats for the current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // Get total and active services count
    const [totalServices, activeServices] = await Promise.all([
      prisma.service.count({
        where: { providerId: userId },
      }),
      prisma.service.count({
        where: {
          providerId: userId,
          isActive: true,
        },
      }),
    ]);

    // Get average rating from bookings
    const ratingsAggregate = await prisma.booking.aggregate({
      where: {
        service: {
          providerId: userId,
        },
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
          providerId: userId,
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
          providerId: userId,
        },
        status: "COMPLETED",
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const stats = {
      totalServices,
      activeServices,
      averageRating: ratingsAggregate._avg.rating || 0,
      totalBookings: monthlyBookings,
      monthlyRevenue: revenueAggregate._sum.totalAmount || 0,
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
