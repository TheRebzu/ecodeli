import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET: Get delivery statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month"; // day, week, month, year, all
    const userId = session.user.id;

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case "day":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0); // Beginning of time
    }

    // Build query based on user role
    const baseQuery = {
      createdAt: {
        gte: startDate
      }
    };
    
    let roleSpecificQuery = {};
    
    if (session.user.role === "CUSTOMER") {
      // For customers, filter by their deliveries
      const customer = await prisma.customer.findUnique({
        where: { userId }
      });
      
      if (!customer) {
        return NextResponse.json({ error: "Profil client non trouvé" }, { status: 404 });
      }
      
      roleSpecificQuery = {
        customerId: customer.id
      };
    } else if (session.user.role === "MERCHANT") {
      // For merchants, filter by their deliveries
      const merchant = await prisma.merchant.findUnique({
        where: { userId }
      });
      
      if (!merchant) {
        return NextResponse.json({ error: "Profil commerçant non trouvé" }, { status: (404) });
      }
      
      roleSpecificQuery = {
        merchantId: merchant.id
      };
    } else if (session.user.role === "DELIVERY_PERSON") {
      // For delivery persons, filter by their deliveries
      const deliveryPerson = await prisma.deliveryPerson.findUnique({
        where: { userId }
      });
      
      if (!deliveryPerson) {
        return NextResponse.json({ error: "Profil livreur non trouvé" }, { status: 404 });
      }
      
      roleSpecificQuery = {
        deliveryPersonId: deliveryPerson.id
      };
    }
    
    // Combine base and role-specific queries
    const query = { ...baseQuery, ...roleSpecificQuery };

    // Get total counts
    const [
      totalDeliveries,
      totalPending,
      totalInProgress,
      totalCompleted,
      totalCancelled,
      totalFailed,
      totalExpress,
      averagePrice,
      statusCounts,
      dailyStats,
      completionTimeStats
    ] = await Promise.all([
      // Total deliveries
      prisma.delivery.count({
        where: query
      }),
      
      // Pending deliveries
      prisma.delivery.count({
        where: {
          ...query,
          status: "PENDING"
        }
      }),
      
      // In progress deliveries (assigned, picked up, in transit, out for delivery)
      prisma.delivery.count({
        where: {
          ...query,
          status: {
            in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"]
          }
        }
      }),
      
      // Completed deliveries
      prisma.delivery.count({
        where: {
          ...query,
          status: "DELIVERED"
        }
      }),
      
      // Cancelled deliveries
      prisma.delivery.count({
        where: {
          ...query,
          status: "CANCELLED"
        }
      }),
      
      // Failed deliveries
      prisma.delivery.count({
        where: {
          ...query,
          status: "FAILED"
        }
      }),
      
      // Express deliveries
      prisma.delivery.count({
        where: {
          ...query,
          isExpress: true
        }
      }),
      
      // Average price
      prisma.delivery.aggregate({
        where: query,
        _avg: {
          price: true
        }
      }),
      
      // Status breakdown
      prisma.$queryRaw`
        SELECT status, COUNT(*) as count
        FROM "Delivery"
        WHERE "createdAt" >= ${startDate}
        ${roleSpecificQuery.customerId ? `AND "customerId" = ${roleSpecificQuery.customerId}` : ''}
        ${roleSpecificQuery.merchantId ? `AND "merchantId" = ${roleSpecificQuery.merchantId}` : ''}
        ${roleSpecificQuery.deliveryPersonId ? `AND "deliveryPersonId" = ${roleSpecificQuery.deliveryPersonId}` : ''}
        GROUP BY status
      `,
      
      // Daily/weekly stats
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'DELIVERED') as completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled,
          COUNT(*) FILTER (WHERE status = 'FAILED') as failed
        FROM "Delivery"
        WHERE "createdAt" >= ${startDate}
        ${roleSpecificQuery.customerId ? `AND "customerId" = ${roleSpecificQuery.customerId}` : ''}
        ${roleSpecificQuery.merchantId ? `AND "merchantId" = ${roleSpecificQuery.merchantId}` : ''}
        ${roleSpecificQuery.deliveryPersonId ? `AND "deliveryPersonId" = ${roleSpecificQuery.deliveryPersonId}` : ''}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `,
      
      // Average completion time
      prisma.$queryRaw`
        SELECT
          AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt"))) as avg_completion_time,
          MIN(EXTRACT(EPOCH FROM ("completedAt" - "createdAt"))) as min_completion_time,
          MAX(EXTRACT(EPOCH FROM ("completedAt" - "createdAt"))) as max_completion_time
        FROM "Delivery"
        WHERE "completedAt" IS NOT NULL
        AND "createdAt" >= ${startDate}
        ${roleSpecificQuery.customerId ? `AND "customerId" = ${roleSpecificQuery.customerId}` : ''}
        ${roleSpecificQuery.merchantId ? `AND "merchantId" = ${roleSpecificQuery.merchantId}` : ''}
        ${roleSpecificQuery.deliveryPersonId ? `AND "deliveryPersonId" = ${roleSpecificQuery.deliveryPersonId}` : ''}
      `
    ]);

    // Format the time stats from seconds to hours
    const formattedTimeStats = {
      avgCompletionTime: completionTimeStats[0]?.avg_completion_time 
        ? Math.round((completionTimeStats[0].avg_completion_time / 3600) * 10) / 10 
        : 0,
      minCompletionTime: completionTimeStats[0]?.min_completion_time 
        ? Math.round((completionTimeStats[0].min_completion_time / 3600) * 10) / 10 
        : 0,
      maxCompletionTime: completionTimeStats[0]?.max_completion_time 
        ? Math.round((completionTimeStats[0].max_completion_time / 3600) * 10) / 10 
        : 0
    };

    // Format the response
    const statistics = {
      period,
      overview: {
        total: totalDeliveries,
        pending: totalPending,
        inProgress: totalInProgress,
        completed: totalCompleted,
        cancelled: totalCancelled,
        failed: totalFailed,
        express: totalExpress,
        regularDelivery: totalDeliveries - totalExpress,
        averagePrice: averagePrice._avg.price || 0
      },
      statusBreakdown: statusCounts,
      timeStats: formattedTimeStats,
      dailyStats,
      completionRate: totalDeliveries > 0 
        ? Math.round((totalCompleted / totalDeliveries) * 100) 
        : 0
    };

    return NextResponse.json(statistics);
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
} 