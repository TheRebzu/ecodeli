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
    
    // Calculate previous period for comparison
    const previousPeriodEnd = new Date(startDate.getTime());
    const previousPeriodStart = new Date(startDate.getTime());
    
    switch (period) {
      case "day":
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
        break;
      case "week":
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
        break;
      case "month":
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
        break;
      case "year":
        previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
        break;
    }
    
    // Calculate total revenue from all shipments
    const shipmentRevenue = await prisma.shipment.aggregate({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _sum: {
        price: true
      }
    });
    
    // Calculate total revenue from all payments
    const paymentRevenue = await prisma.payment.aggregate({
      where: {
        createdAt: {
          gte: startDate
        },
        status: "COMPLETED"
      },
      _sum: {
        amount: true
      }
    });
    
    // Calculate previous period revenue
    const previousShipmentRevenue = await prisma.shipment.aggregate({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd
        }
      },
      _sum: {
        price: true
      }
    });
    
    const previousPaymentRevenue = await prisma.payment.aggregate({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd
        },
        status: "COMPLETED"
      },
      _sum: {
        amount: true
      }
    });
    
    // Get time-based revenue data
    const timeInterval = period === "day" ? "hour" : "day";
    
    // Get all shipments in the period
    const shipmentsInPeriod = await prisma.shipment.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: {
        price: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    
    // Process revenue by time interval
    const revenueByTime = shipmentsInPeriod.reduce((acc, shipment) => {
      const date = new Date(shipment.createdAt);
      let timeKey;
      
      if (timeInterval === "hour") {
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      } else {
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }
      
      if (!acc[timeKey]) {
        acc[timeKey] = 0;
      }
      
      acc[timeKey] += shipment.price;
      return acc;
    }, {});
    
    // Convert to array format for charts
    const revenueTrend = Object.entries(revenueByTime).map(([date, amount]) => ({
      date,
      amount
    }));
    
    // Calculate total revenue and growth
    const totalRevenue = (shipmentRevenue._sum.price || 0) + (paymentRevenue._sum.amount || 0);
    const previousTotalRevenue = (previousShipmentRevenue._sum.price || 0) + (previousPaymentRevenue._sum.amount || 0);
    
    const revenueGrowth = previousTotalRevenue > 0 
      ? ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100 
      : 100;
    
    // Get revenue by service type
    // This would require additional data model fields to categorize revenue
    // For now, we'll use a placeholder
    const revenueByServiceType = [
      { type: "Livraison standard", amount: shipmentRevenue._sum.price || 0 },
      { type: "Services additionnels", amount: paymentRevenue._sum.amount || 0 }
    ];
    
    return NextResponse.json({
      data: {
        overview: {
          totalRevenue,
          revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
          shipmentRevenue: shipmentRevenue._sum.price || 0,
          serviceRevenue: paymentRevenue._sum.amount || 0
        },
        revenueTrend,
        revenueByServiceType,
        periodComparison: {
          current: totalRevenue,
          previous: previousTotalRevenue,
          growth: parseFloat(revenueGrowth.toFixed(2))
        }
      },
      meta: {
        period,
        startDate,
        endDate: today,
        previousPeriodStart,
        previousPeriodEnd
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques de revenus:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques de revenus" },
      { status: 500 }
    );
  }
} 