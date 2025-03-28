import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  period: z.enum(["week", "month", "quarter", "year"]).default("month"),
  segment: z.enum(["all", "active", "new", "loyal"]).default("all"),
  includeDemographics: z.enum(["true", "false"]).default("false"),
});

// GET: Analyze customer data
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
      segment: searchParams.get("segment") || "all",
      includeDemographics: searchParams.get("includeDemographics") || "false",
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { period, segment, includeDemographics } = validatedParams.data;
    const showDemographics = includeDemographics === "true";

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

    // Build customer filter based on segment
    const customerFilter: Record<string, unknown> = {
      isDeleted: false,
    };

    // Adjust date filter for 'new' segment
    let userFilter: Record<string, unknown> = {};
    
    if (segment === "new") {
      userFilter = {
        createdAt: {
          gte: dateFrom,
          lte: now,
        },
      };
    }

    // Get customers with their user data and related entities
    const customers = await prisma.customer.findMany({
      where: customerFilter,
      include: {
        user: {
          where: userFilter,
          select: {
            id: true,
            name: true,
            email: true,
            city: true,
            country: true,
            createdAt: true,
            lastLogin: true,
          },
        },
        loyaltyTransactions: {
          where: {
            createdAt: {
              gte: dateFrom,
              lte: now,
            },
          },
        },
        deliveries: {
          where: {
            createdAt: {
              gte: dateFrom,
              lte: now,
            },
          },
        },
        announcements: {
          where: {
            datePosted: {
              gte: dateFrom,
              lte: now,
            },
          },
        },
      },
    });

    // Filter out customers without associated user (shouldn't happen in normal operation)
    const validCustomers = customers.filter(c => c.user && Object.keys(c.user).length > 0);

    // Filter for active customers (had activity in the period)
    const activeCustomers = validCustomers.filter(customer => 
      (customer.user.lastLogin && customer.user.lastLogin >= dateFrom) ||
      customer.deliveries.length > 0 ||
      customer.announcements.length > 0 ||
      customer.loyaltyTransactions.length > 0
    );

    // Filter for loyal customers (define as having loyalty tier above BRONZE)
    const loyalCustomers = validCustomers.filter(customer => 
      customer.loyaltyTier !== "BRONZE"
    );

    // Determine customers to analyze based on segment
    let customersToAnalyze;
    
    switch (segment) {
      case "active":
        customersToAnalyze = activeCustomers;
        break;
      case "new":
        customersToAnalyze = validCustomers; // Already filtered by creation date
        break;
      case "loyal":
        customersToAnalyze = loyalCustomers;
        break;
      case "all":
      default:
        customersToAnalyze = validCustomers;
    }

    // Calculate metrics
    const totalCustomers = customersToAnalyze.length;
    const totalDeliveries = customersToAnalyze.reduce((sum, c) => sum + c.deliveries.length, 0);
    const totalAnnouncements = customersToAnalyze.reduce((sum, c) => sum + c.announcements.length, 0);
    
    // Calculate average orders per customer
    const avgDeliveriesPerCustomer = totalCustomers > 0 
      ? totalDeliveries / totalCustomers 
      : 0;
    
    // Calculate loyalty distribution
    const loyaltyDistribution = {
      BRONZE: customersToAnalyze.filter(c => c.loyaltyTier === "BRONZE").length,
      SILVER: customersToAnalyze.filter(c => c.loyaltyTier === "SILVER").length,
      GOLD: customersToAnalyze.filter(c => c.loyaltyTier === "GOLD").length,
      PLATINUM: customersToAnalyze.filter(c => c.loyaltyTier === "PLATINUM").length,
    };
    
    // Calculate subscription plan distribution
    const subscriptionDistribution = {
      FREE: customersToAnalyze.filter(c => c.subscriptionPlan === "FREE").length,
      STARTER: customersToAnalyze.filter(c => c.subscriptionPlan === "STARTER").length,
      PREMIUM: customersToAnalyze.filter(c => c.subscriptionPlan === "PREMIUM").length,
    };
    
    // Calculate activity metrics
    const activePercentage = validCustomers.length > 0 
      ? (activeCustomers.length / validCustomers.length) * 100 
      : 0;
      
    const loyalPercentage = validCustomers.length > 0
      ? (loyalCustomers.length / validCustomers.length) * 100
      : 0;
    
    // Build the response
    const response: Record<string, unknown> = {
      summary: {
        totalCustomers,
        activeCustomers: activeCustomers.length,
        loyalCustomers: loyalCustomers.length,
        newCustomers: validCustomers.filter(c => c.user.createdAt >= dateFrom).length,
        totalDeliveries,
        totalAnnouncements,
        avgDeliveriesPerCustomer,
        activePercentage,
        loyalPercentage,
      },
      distribution: {
        loyaltyTiers: loyaltyDistribution,
        subscriptionPlans: subscriptionDistribution,
      },
      meta: {
        period,
        segment,
        dateRange: {
          from: dateFrom,
          to: now,
        },
      },
    };
    
    // Add demographics if requested
    if (showDemographics) {
      // Calculate city distribution
      const cityDistribution: Record<string, number> = {};
      customersToAnalyze.forEach(customer => {
        if (customer.user.city) {
          const city = customer.user.city;
          cityDistribution[city] = (cityDistribution[city] || 0) + 1;
        }
      });
      
      // Calculate country distribution
      const countryDistribution: Record<string, number> = {};
      customersToAnalyze.forEach(customer => {
        if (customer.user.country) {
          const country = customer.user.country;
          countryDistribution[country] = (countryDistribution[country] || 0) + 1;
        }
      });
      
      response.demographics = {
        cities: Object.entries(cityDistribution)
          .map(([city, count]) => ({
            city,
            count,
            percentage: (count / totalCustomers) * 100,
          }))
          .sort((a, b) => b.count - a.count),
        countries: Object.entries(countryDistribution)
          .map(([country, count]) => ({
            country,
            count,
            percentage: (count / totalCustomers) * 100,
          }))
          .sort((a, b) => b.count - a.count),
      };
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Error analyzing customer data:", error);
    return NextResponse.json(
      { error: "Failed to analyze customer data" },
      { status: 500 }
    );
  }
} 