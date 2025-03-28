import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Query parameters schema
const queryParamsSchema = z.object({
  period: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).default("monthly"),
  startDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)),
    { message: "Invalid start date format" }
  ),
  endDate: z.string().optional().refine(
    value => !value || !isNaN(Date.parse(value)),
    { message: "Invalid end date format" }
  ),
  compareWithPrevious: z.enum(["true", "false"]).default("false"),
  activityType: z.enum([
    "all", 
    "deliveries", 
    "user_signups", 
    "user_logins", 
    "announcement_posts", 
    "orders",
    "services"
  ]).default("all"),
  userType: z.enum(["all", "customer", "merchant", "delivery_person", "service_provider"]).default("all"),
  groupBy: z.enum(["day", "week", "month", "quarter", "year", "user_type", "status"]).default("day"),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate user and check admin rights
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Only administrators can access activity reports" }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const params = {
      period: searchParams.get("period") || "monthly",
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      compareWithPrevious: searchParams.get("compareWithPrevious") || "false",
      activityType: searchParams.get("activityType") || "all",
      userType: searchParams.get("userType") || "all",
      groupBy: searchParams.get("groupBy") || "day",
    };

    const validatedParams = queryParamsSchema.parse(params);

    // Calculate date range based on period or custom dates
    const endDate = validatedParams.endDate ? new Date(validatedParams.endDate) : new Date();
    let startDate: Date;

    if (validatedParams.startDate) {
      startDate = new Date(validatedParams.startDate);
    } else {
      switch (validatedParams.period) {
        case "daily":
          startDate = new Date();
          startDate.setDate(endDate.getDate() - 14); // Last 14 days
          break;
        case "weekly":
          startDate = new Date();
          startDate.setDate(endDate.getDate() - 90); // Last ~13 weeks
          break;
        case "monthly":
          startDate = new Date();
          startDate.setMonth(endDate.getMonth() - 6); // Last 6 months
          break;
        case "quarterly":
          startDate = new Date();
          startDate.setMonth(endDate.getMonth() - 12); // Last 4 quarters
          break;
        case "yearly":
          startDate = new Date();
          startDate.setFullYear(endDate.getFullYear() - 3); // Last 3 years
          break;
        default:
          startDate = new Date();
          startDate.setMonth(endDate.getMonth() - 6);
      }
    }

    // Initialize data structure to hold activity data
    const activityData: Record<string, any> = {};

    // Gather activity data based on selected activity type
    if (validatedParams.activityType === "all" || validatedParams.activityType === "deliveries") {
      activityData.deliveries = await getDeliveryActivityData(
        startDate, 
        endDate, 
        validatedParams.groupBy, 
        validatedParams.userType
      );
    }

    if (validatedParams.activityType === "all" || validatedParams.activityType === "user_signups") {
      activityData.userSignups = await getUserSignupData(
        startDate, 
        endDate, 
        validatedParams.groupBy, 
        validatedParams.userType
      );
    }

    if (validatedParams.activityType === "all" || validatedParams.activityType === "user_logins") {
      activityData.userLogins = await getUserLoginData(
        startDate, 
        endDate, 
        validatedParams.groupBy, 
        validatedParams.userType
      );
    }

    if (validatedParams.activityType === "all" || validatedParams.activityType === "announcement_posts") {
      activityData.announcementPosts = await getAnnouncementPostData(
        startDate, 
        endDate, 
        validatedParams.groupBy, 
        validatedParams.userType
      );
    }

    if (validatedParams.activityType === "all" || validatedParams.activityType === "orders") {
      activityData.orders = await getOrderActivityData(
        startDate, 
        endDate, 
        validatedParams.groupBy
      );
    }

    if (validatedParams.activityType === "all" || validatedParams.activityType === "services") {
      activityData.services = await getServiceActivityData(
        startDate, 
        endDate, 
        validatedParams.groupBy, 
        validatedParams.userType
      );
    }

    // Get comparison data if requested
    let comparisonData = null;
    if (validatedParams.compareWithPrevious === "true") {
      comparisonData = {};
      const timeSpan = endDate.getTime() - startDate.getTime();
      const comparisonStartDate = new Date(startDate.getTime() - timeSpan);
      const comparisonEndDate = new Date(endDate.getTime() - timeSpan);
      
      // Get comparison data for each activity type
      if (validatedParams.activityType === "all" || validatedParams.activityType === "deliveries") {
        comparisonData.deliveries = await getDeliveryActivityData(
          comparisonStartDate, 
          comparisonEndDate, 
          validatedParams.groupBy, 
          validatedParams.userType
        );
      }

      if (validatedParams.activityType === "all" || validatedParams.activityType === "user_signups") {
        comparisonData.userSignups = await getUserSignupData(
          comparisonStartDate, 
          comparisonEndDate, 
          validatedParams.groupBy, 
          validatedParams.userType
        );
      }

      // Add other activity types as needed for comparison
    }

    // Calculate summary statistics
    const summary = calculateActivitySummary(activityData, comparisonData);

    // Prepare response data
    return NextResponse.json({
      data: {
        timeframe: {
          start: startDate,
          end: endDate,
          period: validatedParams.period,
        },
        summary,
        activity: activityData,
        comparison: comparisonData,
      },
    });
  } catch (error: unknown) {
    console.error("Error generating activity report:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate activity report" },
      { status: 500 }
    );
  }
}

// Helper function to get delivery activity data
async function getDeliveryActivityData(
  startDate: Date,
  endDate: Date,
  groupBy: string,
  userType: string
): Promise<any[]> {
  // Build the where clause based on parameters
  const whereClause: Record<string, any> = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Filter by user type if specified
  if (userType !== "all") {
    if (userType === "customer") {
      whereClause.customerId = { not: null };
    } else if (userType === "delivery_person") {
      whereClause.deliveryPersonId = { not: null };
    } else if (userType === "merchant") {
      whereClause.merchantId = { not: null };
    }
  }

  // Get data based on grouping
  if (groupBy === "status") {
    const statusResults = await prisma.delivery.groupBy({
      by: ["status"],
      where: whereClause,
      _count: true,
    });

    return statusResults.map(item => ({
      status: item.status,
      count: item._count,
    }));
  } else if (groupBy === "user_type") {
    // For user type grouping, we need separate queries for each user type
    const customerDeliveries = await prisma.delivery.count({
      where: {
        ...whereClause,
        customerId: { not: null },
      },
    });

    const merchantDeliveries = await prisma.delivery.count({
      where: {
        ...whereClause,
        merchantId: { not: null },
      },
    });

    const deliveryPersonDeliveries = await prisma.delivery.count({
      where: {
        ...whereClause,
        deliveryPersonId: { not: null },
      },
    });

    return [
      { userType: "customer", count: customerDeliveries },
      { userType: "merchant", count: merchantDeliveries },
      { userType: "delivery_person", count: deliveryPersonDeliveries },
    ];
  } else {
    // For time-based groupings (day, week, month, etc.), query all deliveries
    const deliveries = await prisma.delivery.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        status: true,
      },
    });

    // Group by time period
    return groupByTimePeriod(deliveries, groupBy, "createdAt");
  }
}

// Helper function to get user signup data
async function getUserSignupData(
  startDate: Date,
  endDate: Date,
  groupBy: string,
  userType: string
): Promise<any[]> {
  // Build the where clause based on parameters
  const whereClause: Record<string, any> = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Filter by user type if specified
  if (userType !== "all") {
    whereClause.role = userType.toUpperCase();
  }

  // Get data based on grouping
  if (groupBy === "user_type") {
    const roleResults = await prisma.user.groupBy({
      by: ["role"],
      where: whereClause,
      _count: true,
    });

    return roleResults.map(item => ({
      userType: item.role.toLowerCase(),
      count: item._count,
    }));
  } else {
    // For time-based groupings, query all users
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        role: true,
      },
    });

    // Group by time period
    return groupByTimePeriod(users, groupBy, "createdAt");
  }
}

// Helper function to get user login data (simplified implementation)
async function getUserLoginData(
  startDate: Date,
  endDate: Date,
  groupBy: string,
  userType: string
): Promise<any[]> {
  // Note: This would require a session or login tracking table
  // This is a placeholder implementation
  
  // For a real implementation, you would query your session or login tracking table
  // and apply similar filtering/grouping as the other functions
  
  return [];
}

// Helper function to get announcement post data
async function getAnnouncementPostData(
  startDate: Date,
  endDate: Date,
  groupBy: string,
  userType: string
): Promise<any[]> {
  // Build the where clause based on parameters
  const whereClause: Record<string, any> = {
    datePosted: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Filter by user type if specified
  if (userType !== "all") {
    if (userType === "customer") {
      whereClause.merchantId = null;
    } else if (userType === "merchant") {
      whereClause.merchantId = { not: null };
    }
  }

  // Get data based on grouping
  if (groupBy === "status") {
    const statusResults = await prisma.announcement.groupBy({
      by: ["status"],
      where: whereClause,
      _count: true,
    });

    return statusResults.map(item => ({
      status: item.status,
      count: item._count,
    }));
  } else if (groupBy === "user_type") {
    // For user type grouping, separate queries for each user type
    const customerAnnouncements = await prisma.announcement.count({
      where: {
        ...whereClause,
        merchantId: null,
      },
    });

    const merchantAnnouncements = await prisma.announcement.count({
      where: {
        ...whereClause,
        merchantId: { not: null },
      },
    });

    return [
      { userType: "customer", count: customerAnnouncements },
      { userType: "merchant", count: merchantAnnouncements },
    ];
  } else {
    // For time-based groupings, query all announcements
    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      select: {
        id: true,
        datePosted: true,
        status: true,
      },
    });

    // Group by time period
    return groupByTimePeriod(announcements, groupBy, "datePosted");
  }
}

// Helper function to get order activity data
async function getOrderActivityData(
  startDate: Date,
  endDate: Date,
  groupBy: string
): Promise<any[]> {
  // Build the where clause
  const whereClause: Record<string, any> = {
    orderDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Get data based on grouping
  if (groupBy === "status") {
    const statusResults = await prisma.cartDrop.groupBy({
      by: ["status"],
      where: whereClause,
      _count: true,
    });

    return statusResults.map(item => ({
      status: item.status,
      count: item._count,
    }));
  } else {
    // For time-based groupings, query all orders
    const orders = await prisma.cartDrop.findMany({
      where: whereClause,
      select: {
        id: true,
        orderDate: true,
        status: true,
      },
    });

    // Group by time period
    return groupByTimePeriod(orders, groupBy, "orderDate");
  }
}

// Helper function to get service activity data
async function getServiceActivityData(
  startDate: Date,
  endDate: Date,
  groupBy: string,
  userType: string
): Promise<any[]> {
  // Build the where clause
  const whereClause: Record<string, any> = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Filter by user type if specified
  if (userType !== "all") {
    if (userType === "customer") {
      whereClause.customerId = { not: null };
    } else if (userType === "service_provider") {
      whereClause.serviceProviderId = { not: null };
    }
  }

  // Get data based on grouping
  if (groupBy === "status") {
    const statusResults = await prisma.service.groupBy({
      by: ["status"],
      where: whereClause,
      _count: true,
    });

    return statusResults.map(item => ({
      status: item.status,
      count: item._count,
    }));
  } else if (groupBy === "user_type") {
    // This doesn't make much sense for services, as they always have both
    // customer and service provider, but included for completeness
    const services = await prisma.service.count({
      where: whereClause,
    });

    return [
      { userType: "customer", count: services },
      { userType: "service_provider", count: services },
    ];
  } else {
    // For time-based groupings, query all services
    const services = await prisma.service.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        status: true,
      },
    });

    // Group by time period
    return groupByTimePeriod(services, groupBy, "createdAt");
  }
}

// Helper function to group data by time period
function groupByTimePeriod(
  data: any[],
  groupBy: string,
  dateField: string
): any[] {
  if (groupBy === "day") {
    const dailyData: Record<string, any> = {};
    
    data.forEach(item => {
      const date = new Date(item[dateField]);
      const dateStr = date.toISOString().split("T")[0];
      
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = {
          date,
          day: dateStr,
          count: 0,
        };
      }
      
      dailyData[dateStr].count += 1;
    });
    
    return Object.values(dailyData);
  } else if (groupBy === "week") {
    const weeklyData: Record<string, any> = {};
    
    data.forEach(item => {
      const date = new Date(item[dateField]);
      const year = date.getFullYear();
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, "0")}`;
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekKey,
          year,
          week: weekNumber,
          startDate: getStartDateOfWeek(date),
          count: 0,
        };
      }
      
      weeklyData[weekKey].count += 1;
    });
    
    return Object.values(weeklyData);
  } else if (groupBy === "month") {
    const monthlyData: Record<string, any> = {};
    
    data.forEach(item => {
      const date = new Date(item[dateField]);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, "0")}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          monthKey,
          year,
          month,
          monthName: date.toLocaleString('default', { month: 'long' }),
          count: 0,
        };
      }
      
      monthlyData[monthKey].count += 1;
    });
    
    return Object.values(monthlyData);
  }
  
  // Default to daily if grouping not recognized
  return groupByTimePeriod(data, "day", dateField);
}

// Helper function to calculate summary statistics
function calculateActivitySummary(
  activityData: Record<string, any>,
  comparisonData: Record<string, any> | null
): Record<string, any> {
  const summary: Record<string, any> = {};
  
  // Calculate total deliveries
  if (activityData.deliveries) {
    summary.totalDeliveries = activityData.deliveries.reduce(
      (sum: number, item: any) => sum + item.count, 0
    );
    
    // Calculate delivery comparison if available
    if (comparisonData?.deliveries) {
      const previousTotalDeliveries = comparisonData.deliveries.reduce(
        (sum: number, item: any) => sum + item.count, 0
      );
      
      summary.deliveryChange = summary.totalDeliveries - previousTotalDeliveries;
      summary.deliveryChangePercent = previousTotalDeliveries > 0
        ? ((summary.totalDeliveries - previousTotalDeliveries) / previousTotalDeliveries) * 100
        : null;
    }
  }
  
  // Calculate total user signups
  if (activityData.userSignups) {
    summary.totalSignups = activityData.userSignups.reduce(
      (sum: number, item: any) => sum + item.count, 0
    );
    
    // Calculate signup comparison if available
    if (comparisonData?.userSignups) {
      const previousTotalSignups = comparisonData.userSignups.reduce(
        (sum: number, item: any) => sum + item.count, 0
      );
      
      summary.signupChange = summary.totalSignups - previousTotalSignups;
      summary.signupChangePercent = previousTotalSignups > 0
        ? ((summary.totalSignups - previousTotalSignups) / previousTotalSignups) * 100
        : null;
    }
  }
  
  // Calculate total orders
  if (activityData.orders) {
    summary.totalOrders = activityData.orders.reduce(
      (sum: number, item: any) => sum + item.count, 0
    );
  }
  
  // Calculate total services
  if (activityData.services) {
    summary.totalServices = activityData.services.reduce(
      (sum: number, item: any) => sum + item.count, 0
    );
  }
  
  return summary;
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Helper function to get start date of a week
function getStartDateOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(date.setDate(diff));
} 