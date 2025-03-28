import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Check if the user is an administrator
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
    
    // Get period from query parameters
    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get("period") || "month"; // day, week, month, year
    
    // Calculate date range based on period
    const today = new Date();
    const startDate = new Date();
    
    switch (period) {
      case "day":
        startDate.setDate(today.getDate() - 1);
        break;
      case "week":
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(today.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(today.getMonth() - 1);
    }
    
    // Get total deliveries count
    const totalDeliveries = await prisma.shipment.count();
    
    // Get deliveries in the specified period
    const deliveriesInPeriod = await prisma.shipment.count({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    });
    
    // Get deliveries by status
    const deliveriesByStatus = await prisma.shipment.groupBy({
      by: ["status"],
      _count: true
    });
    
    // Calculate success rate (delivered / total)
    const successfulDeliveries = await prisma.shipment.count({
      where: {
        status: "DELIVERED",
        createdAt: {
          gte: startDate
        }
      }
    });
    
    const failedDeliveries = await prisma.shipment.count({
      where: {
        status: "FAILED",
        createdAt: {
          gte: startDate
        }
      }
    });
    
    const deliverySuccessRate = deliveriesInPeriod > 0 
      ? (successfulDeliveries / deliveriesInPeriod) * 100 
      : 0;
    
    // Get average delivery time for completed deliveries
    const completedDeliveries = await prisma.shipment.findMany({
      where: {
        status: "DELIVERED",
        createdAt: {
          gte: startDate
        },
        deliveryDate: {
          not: null
        }
      },
      select: {
        createdAt: true,
        deliveryDate: true
      }
    });
    
    let averageDeliveryTime = 0;
    
    if (completedDeliveries.length > 0) {
      const totalDeliveryTime = completedDeliveries.reduce((sum, delivery) => {
        const deliveryTime = delivery.deliveryDate!.getTime() - delivery.createdAt.getTime();
        return sum + deliveryTime;
      }, 0);
      
      averageDeliveryTime = totalDeliveryTime / completedDeliveries.length;
    }
    
    // Convert milliseconds to hours
    const avgDeliveryTimeHours = averageDeliveryTime / (1000 * 60 * 60);
    
    // Get deliveries over time
    const timeInterval = period === "day" ? "hour" : "day";
    
    // Get all deliveries created in the period
    const shipmentsInPeriod = await prisma.shipment.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: {
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    
    // Process deliveries by time interval
    const deliveriesByTime = shipmentsInPeriod.reduce((acc, shipment) => {
      const date = new Date(shipment.createdAt);
      let timeKey;
      
      if (timeInterval === "hour") {
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      } else {
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }
      
      if (!acc[timeKey]) {
        acc[timeKey] = { total: 0, byStatus: {} };
      }
      
      acc[timeKey].total++;
      
      if (!acc[timeKey].byStatus[shipment.status]) {
        acc[timeKey].byStatus[shipment.status] = 0;
      }
      
      acc[timeKey].byStatus[shipment.status]++;
      
      return acc;
    }, {});
    
    // Convert to array format for charts
    const deliveryTrend = Object.entries(deliveriesByTime).map(([date, data]) => ({
      date,
      total: data.total,
      byStatus: data.byStatus
    }));
    
    return NextResponse.json({
      data: {
        overview: {
          totalDeliveries,
          deliveriesInPeriod,
          successfulDeliveries,
          failedDeliveries,
          pendingDeliveries: deliveriesInPeriod - successfulDeliveries - failedDeliveries,
          deliverySuccessRate: parseFloat(deliverySuccessRate.toFixed(2)),
          averageDeliveryTimeHours: parseFloat(avgDeliveryTimeHours.toFixed(2))
        },
        deliveriesByStatus: deliveriesByStatus.map(item => ({
          status: item.status,
          count: item._count
        })),
        deliveryTrend
      },
      meta: {
        period,
        startDate,
        endDate: today
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques de livraison:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques de livraison" },
      { status: 500 }
    );
  }
} 