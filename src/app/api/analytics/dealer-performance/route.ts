import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  period: z.enum(["week", "month", "quarter", "year"]).default("month"),
  limit: z.coerce.number().int().positive().max(50).default(10),
  sortBy: z.enum(["rating", "deliveries", "onTime", "efficiency"]).default("efficiency"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// GET: Analyze delivery personnel performance
export async function GET(req: NextRequest) {
  try {
    // Authenticate user and verify admin permission
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      period: searchParams.get("period") || "month",
      limit: searchParams.get("limit") || 10,
      sortBy: searchParams.get("sortBy") || "efficiency",
      sortOrder: searchParams.get("sortOrder") || "desc",
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { period, limit, sortBy, sortOrder } = validatedParams.data;

    // Determine date range based on period
    const now = new Date();
    const dateFrom = new Date();
    
    switch (period) {
      case "week":
        dateFrom.setDate(now.getDate() - 7);
        break;
      case "month":
        dateFrom.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        dateFrom.setMonth(now.getMonth() - 3);
        break;
      case "year":
        dateFrom.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get all delivery persons with their users
    const deliveryPersons = await prisma.deliveryPerson.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            rating: true,
          },
        },
      },
    });

    // Get deliveries for all delivery persons in the period
    const deliveries = await prisma.delivery.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: now,
        },
        deliveryPersonId: {
          in: deliveryPersons.map(dp => dp.id),
        },
      },
      select: {
        id: true,
        deliveryPersonId: true,
        status: true,
        distance: true,
        createdAt: true,
        completedAt: true,
        expectedDeliveryTime: true,
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    // Calculate performance metrics for each delivery person
    const performanceData = deliveryPersons.map(deliveryPerson => {
      const personDeliveries = deliveries.filter(
        delivery => delivery.deliveryPersonId === deliveryPerson.id
      );
      
      const totalDeliveries = personDeliveries.length;
      const completedDeliveries = personDeliveries.filter(
        delivery => delivery.status === "DELIVERED"
      );
      const completedCount = completedDeliveries.length;
      
      // Calculate on-time rate
      let onTimeCount = 0;
      completedDeliveries.forEach(delivery => {
        if (delivery.completedAt && delivery.expectedDeliveryTime) {
          const completedAt = new Date(delivery.completedAt);
          const expected = new Date(delivery.expectedDeliveryTime);
          if (completedAt <= expected) {
            onTimeCount++;
          }
        }
      });
      
      // Calculate distance covered
      const totalDistance = personDeliveries.reduce(
        (sum, delivery) => sum + (delivery.distance || 0),
        0
      );
      
      // Calculate average rating from reviews
      let totalRating = 0;
      let ratingCount = 0;
      personDeliveries.forEach(delivery => {
        delivery.reviews.forEach(review => {
          totalRating += review.rating;
          ratingCount++;
        });
      });
      
      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
      
      // Calculate efficiency score (0-100)
      const completionRate = totalDeliveries > 0 ? (completedCount / totalDeliveries) * 100 : 0;
      const onTimeRate = completedCount > 0 ? (onTimeCount / completedCount) * 100 : 0;
      const ratingScore = averageRating * 20; // Scale 0-5 to 0-100
      
      const efficiencyScore = (completionRate * 0.4) + (onTimeRate * 0.4) + (ratingScore * 0.2);
      
      return {
        id: deliveryPerson.id,
        name: deliveryPerson.user.name,
        image: deliveryPerson.user.image,
        totalDeliveries,
        completedDeliveries: completedCount,
        onTimeDeliveries: onTimeCount,
        totalDistance,
        averageRating,
        metrics: {
          completionRate,
          onTimeRate,
          efficiencyScore: Math.round(efficiencyScore),
          averageDistancePerDelivery: completedCount > 0 ? totalDistance / completedCount : 0,
        },
      };
    });
    
    // Filter out delivery persons with no deliveries if requested
    // and sort by the requested metric
    const filteredData = performanceData.filter(
      dp => dp.totalDeliveries > 0
    );
    
    // Sort data based on requested criteria
    const sortedData = filteredData.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortBy) {
        case "rating":
          valueA = a.averageRating;
          valueB = b.averageRating;
          break;
        case "deliveries":
          valueA = a.completedDeliveries;
          valueB = b.completedDeliveries;
          break;
        case "onTime":
          valueA = a.metrics.onTimeRate;
          valueB = b.metrics.onTimeRate;
          break;
        case "efficiency":
        default:
          valueA = a.metrics.efficiencyScore;
          valueB = b.metrics.efficiencyScore;
      }
      
      return sortOrder === "asc" 
        ? valueA - valueB 
        : valueB - valueA;
    });
    
    // Limit the number of results
    const limitedData = sortedData.slice(0, limit);

    return NextResponse.json({
      data: limitedData,
      meta: {
        totalDeliveryPersons: filteredData.length,
        period,
        dateRange: {
          from: dateFrom,
          to: now,
        },
        sortBy,
        sortOrder,
      },
    });
  } catch (error: unknown) {
    console.error("Error analyzing delivery personnel performance:", error);
    return NextResponse.json(
      { error: "Failed to analyze delivery personnel performance" },
      { status: 500 }
    );
  }
} 