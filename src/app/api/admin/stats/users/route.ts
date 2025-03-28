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
    let startDate = new Date();
    
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
    
    // Get total user count
    const totalUsers = await prisma.user.count();
    
    // Get new users in the specified period
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    });
    
    // Get users by role
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: true
    });
    
    // Get users by status
    const usersByStatus = await prisma.user.groupBy({
      by: ["status"],
      _count: true
    });
    
    // Get users by verification status
    const verifiedUsers = await prisma.user.count({
      where: {
        emailVerified: {
          not: null
        }
      }
    });
    
    const unverifiedUsers = totalUsers - verifiedUsers;
    
    // Get active users (those who have logged in recently)
    const recentlyActiveUsers = await prisma.session.count({
      where: {
        expires: {
          gte: new Date()
        }
      },
      distinct: ["userId"]
    });
    
    // Get growth rate compared to previous period
    const previousPeriodStart = new Date(startDate);
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
    
    const newUsersInPreviousPeriod = await prisma.user.count({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate
        }
      }
    });
    
    // Calculate growth percentage
    const growthRate = newUsersInPreviousPeriod > 0 
      ? ((newUsers - newUsersInPreviousPeriod) / newUsersInPreviousPeriod) * 100 
      : 100;
    
    // Get signups over time
    let timeInterval;
    let dateFormat;
    
    switch (period) {
      case "day":
        timeInterval = "hour";
        dateFormat = "%Y-%m-%d %H:00";
        break;
      case "week":
        timeInterval = "day";
        dateFormat = "%Y-%m-%d";
        break;
      case "month":
        timeInterval = "day";
        dateFormat = "%Y-%m-%d";
        break;
      case "year":
        timeInterval = "month";
        dateFormat = "%Y-%m";
        break;
      default:
        timeInterval = "day";
        dateFormat = "%Y-%m-%d";
    }
    
    // Get all users created in the period
    const usersInPeriod = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    
    // Process signups by time interval
    const signupsByTime = usersInPeriod.reduce((acc, user) => {
      let timeKey;
      const date = new Date(user.createdAt);
      
      switch (timeInterval) {
        case "hour":
          timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case "day":
          timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case "month":
          timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }
      
      if (!acc[timeKey]) {
        acc[timeKey] = 0;
      }
      
      acc[timeKey]++;
      return acc;
    }, {});
    
    // Convert to array format for charts
    const signupTrend = Object.entries(signupsByTime).map(([date, count]) => ({
      date,
      count
    }));
    
    return NextResponse.json({
      data: {
        overview: {
          totalUsers,
          newUsers,
          activeUsers: recentlyActiveUsers,
          growthRate: parseFloat(growthRate.toFixed(2))
        },
        usersByRole: usersByRole.map(item => ({
          role: item.role,
          count: item._count
        })),
        usersByStatus: usersByStatus.map(item => ({
          status: item.status,
          count: item._count
        })),
        verificationStats: {
          verified: verifiedUsers,
          unverified: unverifiedUsers
        },
        signupTrend
      },
      meta: {
        period,
        startDate,
        endDate: today
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques utilisateurs:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques utilisateurs" },
      { status: 500 }
    );
  }
} 