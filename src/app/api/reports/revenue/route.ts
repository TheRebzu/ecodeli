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
  entityType: z.enum(["all", "delivery", "service", "subscription", "product"]).default("all"),
  userType: z.enum(["all", "customer", "merchant", "delivery_person", "service_provider"]).default("all"),
  includeRefunds: z.enum(["true", "false"]).default("true"),
  sortBy: z.enum(["date", "amount"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  groupBy: z.enum(["day", "week", "month", "quarter", "year", "entity_type", "payment_method"]).default("month"),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate user and check admin rights
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Only administrators can access revenue reports" }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const params = {
      period: searchParams.get("period") || "monthly",
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      compareWithPrevious: searchParams.get("compareWithPrevious") || "false",
      entityType: searchParams.get("entityType") || "all",
      userType: searchParams.get("userType") || "all",
      includeRefunds: searchParams.get("includeRefunds") || "true",
      sortBy: searchParams.get("sortBy") || "date",
      sortOrder: searchParams.get("sortOrder") || "desc",
      groupBy: searchParams.get("groupBy") || "month",
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
          startDate.setDate(endDate.getDate() - 30); // Last 30 days
          break;
        case "weekly":
          startDate = new Date();
          startDate.setDate(endDate.getDate() - 90); // Last ~13 weeks
          break;
        case "monthly":
          startDate = new Date();
          startDate.setMonth(endDate.getMonth() - 12); // Last 12 months
          break;
        case "quarterly":
          startDate = new Date();
          startDate.setMonth(endDate.getMonth() - 24); // Last 8 quarters (2 years)
          break;
        case "yearly":
          startDate = new Date();
          startDate.setFullYear(endDate.getFullYear() - 5); // Last 5 years
          break;
        default:
          startDate = new Date();
          startDate.setMonth(endDate.getMonth() - 12);
      }
    }

    // Build where clause for payments query
    const paymentWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: "COMPLETED", // Only consider completed payments
    };

    // Filter by entity type if specified
    if (validatedParams.entityType !== "all") {
      paymentWhere.entityType = validatedParams.entityType.toUpperCase();
    }

    // Filter by user type if specified
    if (validatedParams.userType !== "all") {
      switch (validatedParams.userType) {
        case "customer":
          paymentWhere.customerId = { not: null };
          break;
        case "merchant":
          paymentWhere.merchantId = { not: null };
          break;
        case "delivery_person":
          paymentWhere.deliveryPersonId = { not: null };
          break;
        case "service_provider":
          paymentWhere.serviceProviderId = { not: null };
          break;
      }
    }

    // Get revenue data
    const revenueData = await getRevenueData(
      paymentWhere,
      validatedParams.groupBy,
      validatedParams.sortBy,
      validatedParams.sortOrder
    );

    // Get comparison data if requested
    let comparisonData = null;
    if (validatedParams.compareWithPrevious === "true") {
      const comparisonStartDate = new Date(startDate);
      const comparisonEndDate = new Date(endDate);
      const timeSpan = endDate.getTime() - startDate.getTime();
      
      comparisonStartDate.setTime(startDate.getTime() - timeSpan);
      comparisonEndDate.setTime(endDate.getTime() - timeSpan);
      
      const comparisonWhere = {
        ...paymentWhere,
        createdAt: {
          gte: comparisonStartDate,
          lte: comparisonEndDate,
        },
      };
      
      comparisonData = await getRevenueData(
        comparisonWhere,
        validatedParams.groupBy,
        validatedParams.sortBy,
        validatedParams.sortOrder
      );
    }

    // Get refund data if requested
    let refundData = null;
    if (validatedParams.includeRefunds === "true") {
      const refundWhere: any = {
        processedAt: {
          gte: startDate,
          lte: endDate,
        },
        status: "COMPLETED",
      };
      
      refundData = await getRefundData(
        refundWhere,
        validatedParams.groupBy,
        validatedParams.sortBy,
        validatedParams.sortOrder
      );
    }

    // Calculate summary statistics
    const summary = calculateSummary(revenueData, refundData, comparisonData);

    // Prepare response data
    return NextResponse.json({
      data: {
        timeframe: {
          start: startDate,
          end: endDate,
          period: validatedParams.period,
        },
        summary,
        revenue: revenueData,
        refunds: refundData,
        comparison: comparisonData,
      },
    });
  } catch (error: unknown) {
    console.error("Error generating revenue report:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate revenue report" },
      { status: 500 }
    );
  }
}

// Helper function to get revenue data by grouping
async function getRevenueData(
  whereClause: any,
  groupBy: string,
  sortBy: string,
  sortOrder: string
) {
  let result;

  switch (groupBy) {
    case "day":
      result = await prisma.payment.groupBy({
        by: ["createdAt"],
        where: whereClause,
        _sum: {
          amount: true,
        },
        _count: true,
      });

      // Process and format daily data
      return result.map(item => ({
        date: item.createdAt,
        day: item.createdAt.toISOString().split("T")[0],
        amount: item._sum.amount || 0,
        count: item._count,
      }));

    case "week":
      // For week grouping, we need to use raw queries or calculate week numbers in JS
      const payments = await prisma.payment.findMany({
        where: whereClause,
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
      });

      // Group by week
      const weeklyData = payments.reduce((acc: any, payment) => {
        const date = new Date(payment.createdAt);
        const year = date.getFullYear();
        const weekNumber = getWeekNumber(date);
        const weekKey = `${year}-W${weekNumber.toString().padStart(2, "0")}`;

        if (!acc[weekKey]) {
          acc[weekKey] = {
            weekKey,
            year,
            week: weekNumber,
            startDate: getStartDateOfWeek(date),
            amount: 0,
            count: 0,
          };
        }

        acc[weekKey].amount += payment.amount;
        acc[weekKey].count += 1;
        
        return acc;
      }, {});

      return Object.values(weeklyData);

    case "month":
      // Group by month
      const monthlyPayments = await prisma.payment.findMany({
        where: whereClause,
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
      });

      const monthlyData = monthlyPayments.reduce((acc: any, payment) => {
        const date = new Date(payment.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthKey = `${year}-${month.toString().padStart(2, "0")}`;

        if (!acc[monthKey]) {
          acc[monthKey] = {
            monthKey,
            year,
            month,
            monthName: date.toLocaleString('default', { month: 'long' }),
            amount: 0,
            count: 0,
          };
        }

        acc[monthKey].amount += payment.amount;
        acc[monthKey].count += 1;
        
        return acc;
      }, {});

      return Object.values(monthlyData);

    case "entity_type":
      return prisma.payment.groupBy({
        by: ["entityType"],
        where: whereClause,
        _sum: {
          amount: true,
        },
        _count: true,
      });

    case "payment_method":
      return prisma.payment.groupBy({
        by: ["paymentMethod"],
        where: whereClause,
        _sum: {
          amount: true,
        },
        _count: true,
      });

    default:
      // Default to monthly if grouping is not recognized
      return getRevenueData(whereClause, "month", sortBy, sortOrder);
  }
}

// Helper function to get refund data
async function getRefundData(
  whereClause: any,
  groupBy: string,
  sortBy: string,
  sortOrder: string
) {
  // Refund grouping logic similar to revenue, but for refunds
  const refunds = await prisma.refund.findMany({
    where: whereClause,
    select: {
      id: true,
      amount: true,
      processedAt: true,
      reason: true,
    },
  });

  // Group refunds by the requested grouping
  switch (groupBy) {
    case "day":
      const dailyRefunds = refunds.reduce((acc: any, refund) => {
        if (!refund.processedAt) return acc;
        
        const dateStr = refund.processedAt.toISOString().split("T")[0];
        
        if (!acc[dateStr]) {
          acc[dateStr] = {
            date: refund.processedAt,
            day: dateStr,
            amount: 0,
            count: 0,
          };
        }
        
        acc[dateStr].amount += refund.amount;
        acc[dateStr].count += 1;
        
        return acc;
      }, {});
      
      return Object.values(dailyRefunds);
      
    case "month":
      const monthlyRefunds = refunds.reduce((acc: any, refund) => {
        if (!refund.processedAt) return acc;
        
        const date = new Date(refund.processedAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthKey = `${year}-${month.toString().padStart(2, "0")}`;
        
        if (!acc[monthKey]) {
          acc[monthKey] = {
            monthKey,
            year,
            month,
            monthName: date.toLocaleString('default', { month: 'long' }),
            amount: 0,
            count: 0,
          };
        }
        
        acc[monthKey].amount += refund.amount;
        acc[monthKey].count += 1;
        
        return acc;
      }, {});
      
      return Object.values(monthlyRefunds);
      
    case "reason":
      const reasonRefunds = refunds.reduce((acc: any, refund) => {
        const reason = refund.reason;
        
        if (!acc[reason]) {
          acc[reason] = {
            reason,
            amount: 0,
            count: 0,
          };
        }
        
        acc[reason].amount += refund.amount;
        acc[reason].count += 1;
        
        return acc;
      }, {});
      
      return Object.values(reasonRefunds);
      
    default:
      // Default to monthly grouping
      return getRefundData(whereClause, "month", sortBy, sortOrder);
  }
}

// Helper function to calculate summary statistics
function calculateSummary(revenueData: any[], refundData: any[] | null, comparisonData: any[] | null) {
  // Calculate total revenue
  const totalRevenue = revenueData.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalTransactions = revenueData.reduce((sum, item) => sum + (item.count || 0), 0);
  
  // Calculate total refunds if available
  const totalRefunds = refundData 
    ? refundData.reduce((sum, item) => sum + (item.amount || 0), 0)
    : 0;
  
  const totalRefundCount = refundData
    ? refundData.reduce((sum, item) => sum + (item.count || 0), 0)
    : 0;
  
  // Calculate net revenue
  const netRevenue = totalRevenue - totalRefunds;
  
  // Calculate refund rate
  const refundRate = totalRevenue > 0 ? (totalRefunds / totalRevenue) * 100 : 0;
  
  // Calculate comparison metrics if available
  let revenueChange = null;
  let revenueChangePercent = null;
  
  if (comparisonData) {
    const comparisonTotalRevenue = comparisonData.reduce(
      (sum, item) => sum + (item.amount || 0), 0
    );
    
    revenueChange = totalRevenue - comparisonTotalRevenue;
    revenueChangePercent = comparisonTotalRevenue > 0
      ? ((totalRevenue - comparisonTotalRevenue) / comparisonTotalRevenue) * 100
      : null;
  }
  
  return {
    totalRevenue,
    totalTransactions,
    averageTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
    totalRefunds,
    totalRefundCount,
    netRevenue,
    refundRate: refundRate.toFixed(2),
    revenueChange,
    revenueChangePercent: revenueChangePercent !== null ? revenueChangePercent.toFixed(2) : null,
  };
}

// Helper function to get week number
function getWeekNumber(date: Date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Helper function to get start date of a week
function getStartDateOfWeek(date: Date) {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(date.setDate(diff));
} 