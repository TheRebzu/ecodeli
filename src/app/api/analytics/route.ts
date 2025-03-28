import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  period: z.enum(["day", "week", "month", "year"]).default("month"),
  metric: z.enum(["deliveries", "revenue", "users", "performance"]).default("deliveries"),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
  deliveryPersonId: z.string().optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

// GET: Generate analytics data
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
      metric: searchParams.get("metric") || "deliveries",
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      deliveryPersonId: searchParams.get("deliveryPersonId"),
      format: searchParams.get("format") || "json",
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { period, metric, startDate, endDate, deliveryPersonId, format } = validatedParams.data;

    // Determine date range based on period
    const now = new Date();
    let dateFrom = startDate ? new Date(startDate) : new Date();
    const dateTo = endDate ? new Date(endDate) : new Date();

    if (!startDate) {
      switch (period) {
        case "day":
          dateFrom.setHours(0, 0, 0, 0);
          break;
        case "week":
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case "year":
          dateFrom = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
      }
    }

    // Generate analytics based on the metric requested
    let analyticsData;

    switch (metric) {
      case "deliveries":
        // Determine grouping based on period - left for future reference
        (() => {
          switch (period) {
            case "day":
              return { hour: { hour: "$hour" } };
            case "week":
              return { dayOfWeek: { dayOfWeek: "$dayOfWeek" } };
            case "month":
              return { day: { day: "$day" } };
            case "year":
              return { month: { month: "$month" } };
          }
        })();

        // Get delivery statistics
        const deliveryStats = await prisma.delivery.groupBy({
          by: ["status"],
          where: {
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
            ...(deliveryPersonId && { deliveryPersonId }),
          },
          _count: true,
        });

        // Get delivery counts over time
        const deliveryTrends = await prisma.delivery.findMany({
          where: {
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
            ...(deliveryPersonId && { deliveryPersonId }),
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
            price: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        // Process data for visualization
        const deliveryByStatus = {};
        deliveryStats.forEach(stat => {
          deliveryByStatus[stat.status] = stat._count;
        });

        // Process trend data
        const timeIntervals = getTimeIntervals(period, dateFrom, dateTo);
        const deliveryTrendsByInterval = timeIntervals.map(interval => {
          const deliveriesInInterval = deliveryTrends.filter(delivery => {
            const deliveryDate = new Date(delivery.createdAt);
            return isDateInInterval(deliveryDate, interval.start, interval.end);
          });

          return {
            interval: interval.label,
            totalDeliveries: deliveriesInInterval.length,
            completed: deliveriesInInterval.filter(d => d.status === "DELIVERED").length,
            pending: deliveriesInInterval.filter(d => d.status === "PENDING").length,
            inTransit: deliveriesInInterval.filter(d => d.status === "IN_TRANSIT").length,
            revenue: deliveriesInInterval.reduce((sum, d) => sum + (d.price || 0), 0),
          };
        });

        analyticsData = {
          totalDeliveries: deliveryTrends.length,
          byStatus: deliveryByStatus,
          trends: deliveryTrendsByInterval,
          period,
          dateRange: {
            from: dateFrom,
            to: dateTo,
          },
        };
        break;

      case "revenue":
        // Get revenue statistics
        const completedDeliveries = await prisma.delivery.findMany({
          where: {
            status: "DELIVERED",
            completedAt: {
              gte: dateFrom,
              lte: dateTo,
            },
            ...(deliveryPersonId && { deliveryPersonId }),
          },
          select: {
            id: true,
            price: true,
            completedAt: true,
          },
        });

        // Process revenue data
        let totalRevenue = 0;
        const revenueByDay = {};

        completedDeliveries.forEach(delivery => {
          const date = new Date(delivery.completedAt);
          const dateString = date.toISOString().split("T")[0];
          
          totalRevenue += delivery.price || 0;
          
          if (!revenueByDay[dateString]) {
            revenueByDay[dateString] = 0;
          }
          revenueByDay[dateString] += delivery.price || 0;
        });

        // Format for trend visualization
        const revenueTrends = Object.keys(revenueByDay).map(date => ({
          date,
          revenue: revenueByDay[date],
        })).sort((a, b) => a.date.localeCompare(b.date));

        analyticsData = {
          totalRevenue,
          averageOrderValue: completedDeliveries.length > 0 ? totalRevenue / completedDeliveries.length : 0,
          trends: revenueTrends,
          period,
          dateRange: {
            from: dateFrom,
            to: dateTo,
          },
        };
        break;

      case "users":
        // Get user statistics
        const userStats = await prisma.user.groupBy({
          by: ["role"],
          where: {
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
          _count: true,
        });

        // Get user registration trends
        const userRegistrations = await prisma.user.findMany({
          where: {
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
          select: {
            id: true,
            role: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        // Process user data
        const usersByRole = {};
        userStats.forEach(stat => {
          usersByRole[stat.role] = stat._count;
        });

        // Process trend data
        const userTimeIntervals = getTimeIntervals(period, dateFrom, dateTo);
        const userTrendsByInterval = userTimeIntervals.map(interval => {
          const usersInInterval = userRegistrations.filter(user => {
            const registrationDate = new Date(user.createdAt);
            return isDateInInterval(registrationDate, interval.start, interval.end);
          });

          return {
            interval: interval.label,
            totalUsers: usersInInterval.length,
            customers: usersInInterval.filter(u => u.role === "CUSTOMER").length,
            deliveryPersons: usersInInterval.filter(u => u.role === "DELIVERY_PERSON").length,
            merchants: usersInInterval.filter(u => u.role === "MERCHANT").length,
          };
        });

        analyticsData = {
          totalUsers: userRegistrations.length,
          byRole: usersByRole,
          trends: userTrendsByInterval,
          period,
          dateRange: {
            from: dateFrom,
            to: dateTo,
          },
        };
        break;

      case "performance":
        // Check if specific delivery person is requested
        if (!deliveryPersonId) {
          return NextResponse.json(
            { error: "deliveryPersonId is required for performance metrics" },
            { status: 400 }
          );
        }

        // Get delivery person details
        const deliveryPerson = await prisma.deliveryPerson.findUnique({
          where: {
            id: deliveryPersonId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                rating: true,
              },
            },
          },
        });

        if (!deliveryPerson) {
          return NextResponse.json(
            { error: "Delivery person not found" },
            { status: 404 }
          );
        }

        // Get performance metrics
        const completedDeliveriesPerformance = await prisma.delivery.findMany({
          where: {
            deliveryPersonId,
            status: "DELIVERED",
            completedAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
          select: {
            id: true,
            distance: true,
            pickupTime: true,
            deliveryTime: true,
            createdAt: true,
            completedAt: true,
            reviews: {
              select: {
                rating: true,
              },
            },
          },
        });

        // Process performance metrics
        const totalDeliveries = completedDeliveriesPerformance.length;
        let totalDistance = 0;
        let totalTime = 0;
        let onTimeCount = 0;
        let totalRating = 0;
        let ratingCount = 0;

        completedDeliveriesPerformance.forEach(delivery => {
          // Calculate distance and time metrics
          totalDistance += delivery.distance || 0;
          
          if (delivery.completedAt && delivery.createdAt) {
            const deliveryTimeMs = new Date(delivery.completedAt).getTime() - new Date(delivery.createdAt).getTime();
            const deliveryTimeHours = deliveryTimeMs / (1000 * 60 * 60);
            totalTime += deliveryTimeHours;
            
            // Check if delivery was on time (assuming 2 hours for short distances is on time)
            if (deliveryTimeHours <= 2) {
              onTimeCount++;
            }
          }
          
          // Calculate average rating
          delivery.reviews.forEach(review => {
            totalRating += review.rating;
            ratingCount++;
          });
        });

        analyticsData = {
          deliveryPerson: {
            id: deliveryPerson.id,
            name: deliveryPerson.user.name,
            overallRating: deliveryPerson.user.rating,
          },
          metrics: {
            totalDeliveries,
            totalDistance,
            averageDistance: totalDeliveries > 0 ? totalDistance / totalDeliveries : 0,
            averageDeliveryTime: totalDeliveries > 0 ? totalTime / totalDeliveries : 0,
            onTimePercentage: totalDeliveries > 0 ? (onTimeCount / totalDeliveries) * 100 : 0,
            averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
            efficiencyScore: calculateEfficiencyScore(totalDeliveries, onTimeCount, totalDistance, ratingCount > 0 ? totalRating / ratingCount : 0),
          },
          period,
          dateRange: {
            from: dateFrom,
            to: dateTo,
          },
        };
        break;
    }

    // Format response based on requested format
    if (format === "csv") {
      const csvData = convertJsonToCsv(analyticsData);
      return new NextResponse(csvData, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=analytics_${metric}_${period}.csv`,
        },
      });
    }

    return NextResponse.json({
      data: analyticsData,
    });
  } catch (error: unknown) {
    console.error("Error generating analytics:", error);
    return NextResponse.json(
      { error: "Failed to generate analytics" },
      { status: 500 }
    );
  }
}

// Helper function to determine time intervals based on period
function getTimeIntervals(period: string, startDate: Date, endDate: Date) {
  const intervals = [];
  const current = new Date(startDate);

  switch (period) {
    case "day":
      // Hourly intervals
      while (current <= endDate) {
        const startHour = new Date(current);
        const endHour = new Date(current);
        endHour.setHours(endHour.getHours() + 1, 0, 0, 0);
        
        intervals.push({
          start: new Date(startHour),
          end: new Date(endHour),
          label: `${startHour.getHours()}:00`,
        });
        
        current.setHours(current.getHours() + 1);
      }
      break;
    
    case "week":
      // Daily intervals
      while (current <= endDate) {
        const startDay = new Date(current);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(current);
        endDay.setHours(23, 59, 59, 999);
        
        intervals.push({
          start: new Date(startDay),
          end: new Date(endDay),
          label: startDay.toISOString().split("T")[0],
        });
        
        current.setDate(current.getDate() + 1);
      }
      break;
    
    case "month":
      // Daily intervals for a month
      while (current <= endDate) {
        const startDay = new Date(current);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(current);
        endDay.setHours(23, 59, 59, 999);
        
        intervals.push({
          start: new Date(startDay),
          end: new Date(endDay),
          label: startDay.toISOString().split("T")[0],
        });
        
        current.setDate(current.getDate() + 1);
      }
      break;
    
    case "year":
      // Monthly intervals
      while (current <= endDate) {
        const startMonth = new Date(current.getFullYear(), current.getMonth(), 1);
        const endMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
        
        intervals.push({
          start: new Date(startMonth),
          end: new Date(endMonth),
          label: `${startMonth.toLocaleString('default', { month: 'short' })} ${startMonth.getFullYear()}`,
        });
        
        current.setMonth(current.getMonth() + 1);
      }
      break;
  }

  return intervals;
}

// Helper function to check if a date is within an interval
function isDateInInterval(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

// Helper function to calculate efficiency score
function calculateEfficiencyScore(
  totalDeliveries: number,
  onTimeDeliveries: number,
  totalDistance: number,
  averageRating: number
) {
  if (totalDeliveries === 0) return 0;
  
  const onTimeScore = (onTimeDeliveries / totalDeliveries) * 40; // 40% weight
  const distanceScore = Math.min(totalDistance / 100, 1) * 20; // 20% weight
  const ratingScore = (averageRating / 5) * 40; // 40% weight
  
  return onTimeScore + distanceScore + ratingScore;
}

// Helper function to convert JSON to CSV
function convertJsonToCsv(data: Record<string, unknown>) {
  // Simple CSV conversion for demonstration
  // In a real app, you'd use a more robust CSV library
  let csv = '';
  
  // For metrics
  if (data.metrics && typeof data.metrics === 'object') {
    csv += 'Metric,Value\n';
    for (const [key, value] of Object.entries(data.metrics as Record<string, unknown>)) {
      csv += `${key},${value}\n`;
    }
    return csv;
  }
  
  // For trends
  if (data.trends && Array.isArray(data.trends) && data.trends.length > 0) {
    // Get headers
    const headers = Object.keys(data.trends[0] as Record<string, unknown>);
    csv += headers.join(',') + '\n';
    
    // Add data rows
    data.trends.forEach((item: Record<string, unknown>) => {
      const row = headers.map(header => item[header]);
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }
  
  // Fallback for other data structures
  csv += 'Key,Value\n';
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'object') {
      csv += `${key},${value}\n`;
    }
  }
  
  return csv;
} 