import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  period: z.enum(["day", "week", "month", "quarter", "year"]).default("month"),
  groupBy: z.enum(["day", "week", "month", "status"]).default("day"),
  filter: z.enum(["all", "completed", "failed", "active"]).default("all"),
});

// GET: Analyze delivery metrics
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
      groupBy: searchParams.get("groupBy") || "day",
      filter: searchParams.get("filter") || "all",
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { period, groupBy, filter } = validatedParams.data;

    // Determine date range based on period
    const now = new Date();
    const dateFrom = new Date();
    
    switch (period) {
      case "day":
        dateFrom.setHours(0, 0, 0, 0);
        break;
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

    // Build filter for deliveries based on filter parameter
    const deliveryFilter: Record<string, unknown> = {
      createdAt: {
        gte: dateFrom,
        lte: now,
      },
    };

    switch (filter) {
      case "completed":
        deliveryFilter.status = "DELIVERED";
        break;
      case "failed":
        deliveryFilter.status = { in: ["CANCELLED", "FAILED"] };
        break;
      case "active":
        deliveryFilter.status = { in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] };
        break;
    }

    // Get deliveries for the selected period and filter
    const deliveries = await prisma.delivery.findMany({
      where: deliveryFilter,
      include: {
        deliveryPerson: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        reviews: {
          select: {
            rating: true,
            comment: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Calculate overall metrics
    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter(d => d.status === "DELIVERED").length;
    const failedDeliveries = deliveries.filter(d => ["CANCELLED", "FAILED"].includes(d.status as string)).length;
    const activeDeliveries = deliveries.filter(d => ["PENDING", "ASSIGNED", "IN_TRANSIT"].includes(d.status as string)).length;
    
    // Calculate average metrics
    const deliveryTimes = deliveries
      .filter(d => d.status === "DELIVERED" && d.assignedAt && d.completedAt)
      .map(d => {
        const assignedAt = new Date(d.assignedAt!);
        const completedAt = new Date(d.completedAt!);
        return (completedAt.getTime() - assignedAt.getTime()) / (1000 * 60); // minutes
      });
    
    const avgDeliveryTime = deliveryTimes.length > 0 
      ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length 
      : 0;
    
    // Calculate on-time metrics
    const onTimeDeliveries = deliveries
      .filter(d => {
        if (d.status !== "DELIVERED" || !d.completedAt || !d.expectedDeliveryTime) return false;
        const completedAt = new Date(d.completedAt);
        const expected = new Date(d.expectedDeliveryTime);
        return completedAt <= expected;
      })
      .length;
    
    const onTimeRate = completedDeliveries > 0 
      ? (onTimeDeliveries / completedDeliveries) * 100 
      : 0;
    
    // Calculate distance metrics
    const totalDistance = deliveries.reduce((sum, d) => sum + (d.distance || 0), 0);
    const avgDistance = totalDeliveries > 0 ? totalDistance / totalDeliveries : 0;
    
    // Calculate customer satisfaction
    const ratings = deliveries
      .flatMap(d => d.reviews)
      .map(r => r.rating);
    
    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;
    
    // Group data based on groupBy parameter
    const groupedData = (() => {
      switch (groupBy) {
        case "day": {
          const groups: Record<string, Array<typeof deliveries[0]>> = {};
          deliveries.forEach(delivery => {
            const date = new Date(delivery.createdAt);
            const day = date.toISOString().split("T")[0];
            if (!groups[day]) groups[day] = [];
            groups[day].push(delivery);
          });
          
          return Object.entries(groups).map(([day, dayDeliveries]) => {
            const completed = dayDeliveries.filter(d => d.status === "DELIVERED").length;
            const failed = dayDeliveries.filter(d => ["CANCELLED", "FAILED"].includes(d.status as string)).length;
            
            return {
              date: day,
              total: dayDeliveries.length,
              completed,
              failed,
              active: dayDeliveries.length - completed - failed,
              distance: dayDeliveries.reduce((sum, d) => sum + (d.distance || 0), 0),
            };
          });
        }
        
        case "week": {
          const groups: Record<string, Array<typeof deliveries[0]>> = {};
          deliveries.forEach(delivery => {
            const date = new Date(delivery.createdAt);
            const year = date.getFullYear();
            const weekNumber = getWeekNumber(date);
            const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
            
            if (!groups[weekKey]) groups[weekKey] = [];
            groups[weekKey].push(delivery);
          });
          
          return Object.entries(groups).map(([week, weekDeliveries]) => {
            const completed = weekDeliveries.filter(d => d.status === "DELIVERED").length;
            const failed = weekDeliveries.filter(d => ["CANCELLED", "FAILED"].includes(d.status as string)).length;
            
            return {
              week,
              total: weekDeliveries.length,
              completed,
              failed,
              active: weekDeliveries.length - completed - failed,
              distance: weekDeliveries.reduce((sum, d) => sum + (d.distance || 0), 0),
            };
          });
        }
        
        case "month": {
          const groups: Record<string, Array<typeof deliveries[0]>> = {};
          deliveries.forEach(delivery => {
            const date = new Date(delivery.createdAt);
            const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!groups[yearMonth]) groups[yearMonth] = [];
            groups[yearMonth].push(delivery);
          });
          
          return Object.entries(groups).map(([month, monthDeliveries]) => {
            const completed = monthDeliveries.filter(d => d.status === "DELIVERED").length;
            const failed = monthDeliveries.filter(d => ["CANCELLED", "FAILED"].includes(d.status as string)).length;
            
            return {
              month,
              total: monthDeliveries.length,
              completed,
              failed,
              active: monthDeliveries.length - completed - failed,
              distance: monthDeliveries.reduce((sum, d) => sum + (d.distance || 0), 0),
            };
          });
        }
        
        case "status": {
          const statusGroups: Record<string, number> = {
            PENDING: 0,
            ASSIGNED: 0,
            IN_TRANSIT: 0,
            DELIVERED: 0,
            CANCELLED: 0,
            FAILED: 0,
          };
          
          deliveries.forEach(delivery => {
            statusGroups[delivery.status as string] = (statusGroups[delivery.status as string] || 0) + 1;
          });
          
          return Object.entries(statusGroups).map(([status, count]) => ({
            status,
            count,
            percentage: totalDeliveries > 0 ? (count / totalDeliveries) * 100 : 0,
          }));
        }
        
        default:
          return [];
      }
    })();
    
    // Return the analytics data
    return NextResponse.json({
      summary: {
        totalDeliveries,
        completedDeliveries,
        failedDeliveries,
        activeDeliveries,
        completionRate: totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0,
        failureRate: totalDeliveries > 0 ? (failedDeliveries / totalDeliveries) * 100 : 0,
        avgDeliveryTime,
        onTimeRate,
        avgDistance,
        totalDistance,
        avgRating,
      },
      trends: groupedData,
      meta: {
        period,
        groupBy,
        filter,
        dateRange: {
          from: dateFrom,
          to: now,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error analyzing deliveries:", error);
    return NextResponse.json(
      { error: "Failed to analyze deliveries" },
      { status: 500 }
    );
  }
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
} 