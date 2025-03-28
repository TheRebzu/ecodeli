import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  period: z.enum(["week", "month", "quarter", "year"]).default("month"),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
  includeDetails: z.enum(["true", "false"]).default("false"),
});

// Define interfaces for better type safety
interface OrderItem {
  price: number;
  quantity: number;
  product: {
    cost: number;
    category?: string;
  };
}

interface Delivery {
  id: string;
  cost: number;
  status: string;
}

interface Order {
  id: string;
  totalAmount: number;
  createdAt: Date;
  orderItems: OrderItem[];
  deliveries: Delivery[];
}

interface SubscriptionPlan {
  id: string;
  price: number;
}

interface Subscription {
  id: string;
  createdAt: Date;
  renewalDate: Date;
  plan: SubscriptionPlan;
  user: {
    id: string;
    name: string;
  };
}

// GET: Analyze financial metrics
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
      includeDetails: searchParams.get("includeDetails") || "false",
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { period, groupBy, includeDetails } = validatedParams.data;
    const showDetails = includeDetails === "true";

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

    // Get orders and subscriptions for the period
    const orders = await prisma.delivery.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: now,
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        deliveries: {
          select: {
            id: true,
            cost: true,
            status: true,
          },
        },
      },
    });

    const subscriptions = await prisma.customer.findMany({
      where: {
        OR: [
          {
            subscriptionStartDate: {
              gte: dateFrom,
              lte: now,
            },
          },
          {
            subscriptionEndDate: {
              gte: dateFrom,
              lte: now,
            },
          },
        ],
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        subscriptionPlan: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
      },
    });

    // Calculate financial metrics
    const revenueData = calculateRevenue(orders, subscriptions, dateFrom, now);
    const costData = calculateCosts(orders, dateFrom, now);
    const profitData = calculateProfit(revenueData, costData);

    // Group financial data by requested time period
    const groupedData = groupFinancialData(revenueData, costData, profitData, groupBy);

    // Prepare the response
    const response: Record<string, unknown> = {
      summary: {
        totalRevenue: revenueData.total,
        totalCosts: costData.total,
        totalProfit: profitData.total,
        profitMargin: profitData.total > 0 && revenueData.total > 0 
          ? (profitData.total / revenueData.total) * 100 
          : 0,
      },
      trends: groupedData,
      meta: {
        period,
        groupBy,
        dateRange: {
          from: dateFrom,
          to: now,
        },
      },
    };

    // Include detailed breakdowns if requested
    if (showDetails) {
      response.details = {
        revenue: {
          bySource: revenueData.bySource,
          byCategory: revenueData.byCategory,
        },
        costs: {
          byType: costData.byType,
        },
      };
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Error analyzing financial data:", error);
    return NextResponse.json(
      { error: "Failed to analyze financial data" },
      { status: 500 }
    );
  }
}

// Helper function to calculate revenue from orders and subscriptions
function calculateRevenue(
  orders: Order[],
  subscriptions: Subscription[],
  dateFrom: Date,
  dateTo: Date
) {
  // Calculate order revenue
  const orderRevenue = orders.reduce((total, order) => {
    return total + (order.totalAmount || 0);
  }, 0);

  // Calculate subscription revenue
  const subscriptionRevenue = subscriptions.reduce((total, subscription) => {
    // If subscription was created in the period, count the full amount
    if (
      subscription.createdAt >= dateFrom &&
      subscription.createdAt <= dateTo
    ) {
      return total + (subscription.plan.price || 0);
    }
    
    // If renewal date is in the period, count the renewal amount
    if (
      subscription.renewalDate >= dateFrom &&
      subscription.renewalDate <= dateTo
    ) {
      return total + (subscription.plan.price || 0);
    }
    
    return total;
  }, 0);

  // Calculate revenue by product category
  const revenueByCategory: Record<string, number> = {};
  orders.forEach(order => {
    order.orderItems.forEach((item: OrderItem) => {
      const category = item.product.category || "Uncategorized";
      const amount = (item.price || 0) * (item.quantity || 0);
      revenueByCategory[category] = (revenueByCategory[category] || 0) + amount;
    });
  });

  return {
    total: orderRevenue + subscriptionRevenue,
    bySource: {
      orders: orderRevenue,
      subscriptions: subscriptionRevenue,
    },
    byCategory: revenueByCategory,
    dailyData: getDailyBreakdown(orders, subscriptions, dateFrom, dateTo),
  };
}

// Helper function to calculate costs
function calculateCosts(
  orders: Order[],
  dateFrom: Date,
  dateTo: Date
) {
  // Calculate product costs
  const productCosts = orders.reduce((total, order) => {
    return total + order.orderItems.reduce((itemTotal: number, item: OrderItem) => {
      return itemTotal + ((item.product.cost || 0) * (item.quantity || 0));
    }, 0);
  }, 0);

  // Calculate delivery costs
  const deliveryCosts = orders.reduce((total, order) => {
    return total + order.deliveries.reduce((deliveryTotal: number, delivery: Delivery) => {
      return deliveryTotal + (delivery.cost || 0);
    }, 0);
  }, 0);

  // Calculate operational costs (estimate based on orders)
  const operationalCosts = orders.length * 5; // Assume $5 operational cost per order

  return {
    total: productCosts + deliveryCosts + operationalCosts,
    byType: {
      products: productCosts,
      delivery: deliveryCosts,
      operational: operationalCosts,
    },
    dailyData: getDailyCostBreakdown(orders, dateFrom, dateTo),
  };
}

// Helper function to calculate profit
function calculateProfit(
  revenueData: { total: number; dailyData: Record<string, number> },
  costData: { total: number; dailyData: Record<string, number> }
) {
  const dailyProfit: Record<string, number> = {};
  
  // Calculate daily profit
  const allDays = new Set([
    ...Object.keys(revenueData.dailyData),
    ...Object.keys(costData.dailyData),
  ]);
  
  allDays.forEach(day => {
    const dayRevenue = revenueData.dailyData[day] || 0;
    const dayCost = costData.dailyData[day] || 0;
    dailyProfit[day] = dayRevenue - dayCost;
  });
  
  return {
    total: revenueData.total - costData.total,
    dailyData: dailyProfit,
  };
}

// Helper function to get daily breakdown of revenue
function getDailyBreakdown(
  orders: Order[],
  subscriptions: Subscription[],
  dateFrom: Date,
  dateTo: Date
) {
  const dailyRevenue: Record<string, number> = {};
  
  // Initialize all days in the range
  const currentDate = new Date(dateFrom);
  while (currentDate <= dateTo) {
    const dateKey = currentDate.toISOString().split("T")[0];
    dailyRevenue[dateKey] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Add order revenue by day
  orders.forEach(order => {
    const orderDate = new Date(order.createdAt);
    const dateKey = orderDate.toISOString().split("T")[0];
    dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (order.totalAmount || 0);
  });
  
  // Add subscription revenue by day
  subscriptions.forEach(subscription => {
    // For new subscriptions
    if (subscription.createdAt >= dateFrom && subscription.createdAt <= dateTo) {
      const subDate = new Date(subscription.createdAt);
      const dateKey = subDate.toISOString().split("T")[0];
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (subscription.plan.price || 0);
    }
    
    // For renewals
    if (subscription.renewalDate >= dateFrom && subscription.renewalDate <= dateTo) {
      const renewalDate = new Date(subscription.renewalDate);
      const dateKey = renewalDate.toISOString().split("T")[0];
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (subscription.plan.price || 0);
    }
  });
  
  return dailyRevenue;
}

// Helper function to get daily breakdown of costs
function getDailyCostBreakdown(
  orders: Order[],
  dateFrom: Date,
  dateTo: Date
) {
  const dailyCosts: Record<string, number> = {};
  
  // Initialize all days in the range
  const currentDate = new Date(dateFrom);
  while (currentDate <= dateTo) {
    const dateKey = currentDate.toISOString().split("T")[0];
    dailyCosts[dateKey] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Add order costs by day
  orders.forEach(order => {
    const orderDate = new Date(order.createdAt);
    const dateKey = orderDate.toISOString().split("T")[0];
    
    // Product costs
    const productCost = order.orderItems.reduce((total: number, item: OrderItem) => {
      return total + ((item.product.cost || 0) * (item.quantity || 0));
    }, 0);
    
    // Delivery costs
    const deliveryCost = order.deliveries.reduce((total: number, delivery: Delivery) => {
      return total + (delivery.cost || 0);
    }, 0);
    
    // Operational costs (estimate)
    const operationalCost = 5; // Assume $5 per order
    
    const totalOrderCost = productCost + deliveryCost + operationalCost;
    dailyCosts[dateKey] = (dailyCosts[dateKey] || 0) + totalOrderCost;
  });
  
  return dailyCosts;
}

// Helper function to group financial data by time period
function groupFinancialData(
  revenueData: { dailyData: Record<string, number> },
  costData: { dailyData: Record<string, number> },
  profitData: { dailyData: Record<string, number> },
  groupBy: string
) {
  const allDates = Object.keys(revenueData.dailyData).sort();
  
  switch (groupBy) {
    case "day":
      // Already grouped by day
      return allDates.map(date => ({
        date,
        revenue: revenueData.dailyData[date] || 0,
        cost: costData.dailyData[date] || 0,
        profit: profitData.dailyData[date] || 0,
      }));
      
    case "week": {
      const weeklyData: Record<string, { revenue: number; cost: number; profit: number }> = {};
      
      allDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const weekNumber = getWeekNumber(date);
        const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { revenue: 0, cost: 0, profit: 0 };
        }
        
        weeklyData[weekKey].revenue += revenueData.dailyData[dateStr] || 0;
        weeklyData[weekKey].cost += costData.dailyData[dateStr] || 0;
        weeklyData[weekKey].profit += profitData.dailyData[dateStr] || 0;
      });
      
      return Object.entries(weeklyData).map(([week, data]) => ({
        week,
        ...data,
      }));
    }
      
    case "month": {
      const monthlyData: Record<string, { revenue: number; cost: number; profit: number }> = {};
      
      allDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyData[yearMonth]) {
          monthlyData[yearMonth] = { revenue: 0, cost: 0, profit: 0 };
        }
        
        monthlyData[yearMonth].revenue += revenueData.dailyData[dateStr] || 0;
        monthlyData[yearMonth].cost += costData.dailyData[dateStr] || 0;
        monthlyData[yearMonth].profit += profitData.dailyData[dateStr] || 0;
      });
      
      return Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data,
      }));
    }
      
    default:
      return [];
  }
}

// Helper function to get the week number of a date
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